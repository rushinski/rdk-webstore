package main

import (
	"log/slog"
	"os"

	"github.com/rushinski/snkreco-api/internal/platform/config"
	"github.com/rushinski/snkreco-api/internal/platform/database"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        slog.Error("failed to load config", "error", err)
        os.Exit(1)
    }

    setupLogger(cfg)

    pool, err := database.NewPostgres(cfg.Database)
    if err != nil {
        slog.Error("failed to connect to database", "error", err)
        os.Exit(1)
    }
    defer pool.Close()

    srv := newServer(cfg, pool)
    srv.run()
}