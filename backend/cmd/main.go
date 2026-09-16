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
	"ink-readable/internal/config"
	"ink-readable/internal/database"
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

	startedAt := time.Now()
	mux := http.NewServeMux()
	mux.Handle("/health", health.NewHandler(db, startedAt))

	addr := fmt.Sprintf("%s:%s", cfg.AppConfig.BaseURL, cfg.AppConfig.Port)
	log.Printf("API listening on http://%s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
