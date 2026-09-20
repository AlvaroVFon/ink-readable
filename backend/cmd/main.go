package main

import (
	"context"
	"fmt"
	"ink-readable/internal/api"
	"ink-readable/internal/config"
	"ink-readable/internal/database"
	"ink-readable/internal/documents"
	"ink-readable/internal/vaults"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	health "ink-readable/internal"

	sqlc "ink-readable/internal/sqlc/generated"
)

const defaultVaultURL = "http://localhost:8080"

func main() {
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

	fmt.Println(*cfg)

	db, err := database.NewDatabase(cfg.DatabaseConfig)
	if err != nil {
		log.Fatal(err)
	}
	queries := sqlc.New(db)
	vaultsService := vaults.NewVaultsService(vaults.NewVaultRepository(*queries, db))
	documentsService := documents.NewDocumentsService(documents.NewDocumentsRepository(*queries, db))

	startedAt := time.Now()
	mux := http.NewServeMux()
	mux.Handle("/health", health.NewHandler(db, startedAt))
	mux.Handle("/", api.NewHandler(vaultsService, documentsService))

	addr := fmt.Sprintf("%s:%s", cfg.AppConfig.BaseURL, cfg.AppConfig.Port)
	log.Printf("API listening on http://%s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
