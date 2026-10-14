package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"ink-readable/internal/api"
	"ink-readable/internal/config"
	"ink-readable/internal/database"
	editorconfig "ink-readable/internal/editor/config"
	"ink-readable/internal/editor/documents"
	"ink-readable/internal/editor/vaults"
	"ink-readable/internal/planner/projects"
	"ink-readable/internal/planner/tasks"
	"ink-readable/migrations"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	health "ink-readable/internal"

	sqlc "ink-readable/internal/sqlc/generated"
)

const defaultVaultURL = "http://localhost:8080"

// readyToken is printed to stdout together with the resolved URL once the
// desktop sidecar is listening. The Tauri shell parses this line to learn which
// port the OS assigned.
const readyToken = "__INK_API_READY__"

func main() {
	desktop := flag.Bool("desktop", false, "run in desktop mode: loopback only, no Vault/.env")
	port := flag.Int("port", 0, "desktop mode port (0 picks a free one)")
	dataDir := flag.String("data-dir", "", "desktop mode data directory (required with --desktop)")
	flag.Parse()

	if *desktop {
		runDesktop(*dataDir, *port)
		return
	}

	runLegacy()
}

// runDesktop starts the sidecar: no .env/Vault, SQLite inside dataDir, embedded
// migrations applied on startup, and a loopback listener. It prints the ready
// line once bound so the parent process knows the port.
func runDesktop(dataDir string, port int) {
	cfg, err := config.LoadDesktopConfig(config.DesktopOptions{DataDir: dataDir, Port: port})
	if err != nil {
		log.Fatal(err)
	}

	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		log.Fatalf("create data dir: %v", err)
	}

	db, err := database.NewDatabase(cfg.DatabaseConfig)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}

	if err := database.Migrate(db, migrations.FS); err != nil {
		log.Fatalf("apply migrations: %v", err)
	}

	listener, err := net.Listen("tcp", net.JoinHostPort(cfg.AppConfig.BaseURL, cfg.AppConfig.Port))
	if err != nil {
		log.Fatalf("listen: %v", err)
	}

	handler := newHandler(db, cfg, time.Now())
	readyURL := fmt.Sprintf("http://%s", listener.Addr().String())

	fmt.Fprintf(os.Stdout, "%s %s\n", readyToken, readyURL)
	log.Printf("API listening on %s", readyURL)

	if err := http.Serve(listener, handler); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

// runLegacy keeps the original behaviour: configuration comes from a .env file
// (ENV=development) or from Vault, and the process listens on the configured
// address. Untouched by the desktop migration except for dropping the config
// dump that leaked secrets to stdout.
func runLegacy() {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file loaded (%v), using environment variables", err)
	}

	ctx := context.Background()

	vaultURL := os.Getenv("VAULT_URL")
	if vaultURL == "" {
		vaultURL = defaultVaultURL
	}

	var cfg *config.Config
	if os.Getenv("ENV") == config.EnvDev {
		c, err := config.LoadEnvConfig()
		if err != nil {
			log.Fatal(err)
		}
		cfg = c
	} else {
		client, err := config.NewVaultClient(vaultURL, os.Getenv("VAULT_APIKEY"))
		if err != nil {
			log.Fatal(err)
		}

		c, err := config.LoadConfig(ctx, client)
		if err != nil {
			log.Fatal(err)
		}
		cfg = c
	}

	db, err := database.NewDatabase(cfg.DatabaseConfig)
	if err != nil {
		log.Fatal(err)
	}

	addr := fmt.Sprintf("%s:%s", cfg.AppConfig.BaseURL, cfg.AppConfig.Port)
	log.Printf("API listening on http://%s", addr)
	log.Fatal(http.ListenAndServe(addr, newHandler(db, cfg, time.Now())))
}

func newHandler(db database.Database, cfg *config.Config, startedAt time.Time) http.Handler {
	queries := sqlc.New(db)
	vaultsService := vaults.NewVaultsService(vaults.NewVaultRepository(*queries, db))
	documentsService := documents.NewDocumentsService(documents.NewDocumentsRepository(*queries, db))
	projectsService := projects.NewProjectsService(projects.NewProjectsRepository(*queries))
	tasksService := tasks.NewTasksService(tasks.NewTasksRepository(*queries))
	editorConfigService := editorconfig.NewEditorConfigService(editorconfig.NewEditorConfigRepository(*queries))
	configService := config.NewConfigService(cfg)

	mux := http.NewServeMux()
	mux.Handle("/health", health.NewHandler(db, startedAt))
	mux.Handle("/", api.NewHandler(vaultsService, documentsService, projectsService, tasksService, editorConfigService, configService))

	return mux
}
