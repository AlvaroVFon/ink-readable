package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	health "ink-readable/internal"
	"ink-readable/internal/api"
	"ink-readable/internal/config"
	"ink-readable/internal/database"
	"ink-readable/internal/documents"
	sqlc "ink-readable/internal/sqlc/generated"
	"ink-readable/internal/vaults"
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

	client, err := config.NewVaultClient(vaultURL, os.Getenv("VAULT_APIKEY"))
	if err != nil {
		log.Fatal(err)
	}

	cfg, err := config.LoadConfig(ctx, client)
	if err != nil {
		log.Fatal(err)
	}

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
