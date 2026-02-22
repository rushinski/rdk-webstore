package main

import (
    "log/slog"
    "os"
    "github.com/rushinski/snkreco-api/internal/platform/config"
)

func setupLogger(cfg *config.Config) {
    level := slog.LevelInfo
    if cfg.App.IsDevelopment() {
        level = slog.LevelDebug
    }
    slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})))
    slog.Info("config loaded", "env", cfg.App.Env, "port", cfg.App.Port)
}