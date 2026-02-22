package main

import (
    "context"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/go-chi/chi/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/rushinski/snkreco-api/internal/platform/config"
)

type server struct {
    http *http.Server
}

func newServer(cfg *config.Config, pool *pgxpool.Pool) *server {
    router := chi.NewRouter()
    registerRoutes(router, cfg, pool)

    return &server{
        http: &http.Server{
            Addr:         ":" + cfg.App.Port,
            Handler:      router,
            ReadTimeout:  cfg.Security.ReadTimeout,
            WriteTimeout: cfg.Security.WriteTimeout,
            IdleTimeout:  cfg.Security.IdleTimeout,
        },
    }
}

func (s *server) run() {
    go func() {
        slog.Info("starting server", "addr", s.http.Addr)
        if err := s.http.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("server error", "error", err)
            os.Exit(1)
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    slog.Info("shutting down server")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := s.http.Shutdown(ctx); err != nil {
        slog.Error("server forced to shutdown", "error", err)
        os.Exit(1)
    }

    slog.Info("server exited")
}