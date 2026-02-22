package main

import (
    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    "github.com/go-chi/cors"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/rushinski/snkreco-api/internal/platform/config"
    "github.com/rushinski/snkreco-api/internal/platform/health"
)

func registerRoutes(r *chi.Mux, cfg *config.Config, pool *pgxpool.Pool) {
    r.Use(
        middleware.RequestID,
        middleware.RealIP,
        middleware.Recoverer,
        middleware.Logger,
        cors.Handler(cors.Options{
            AllowedOrigins:   cfg.Security.AllowedOrigins,
            AllowedMethods:   cfg.Security.AllowedMethods,
            AllowedHeaders:   cfg.Security.AllowedHeaders,
            ExposedHeaders:   cfg.Security.ExposedHeaders,
            AllowCredentials: cfg.Security.AllowCredentials,
            MaxAge:           cfg.Security.CORSMaxAge,
        }),
    )

    r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", health.Handler(pool))
    })
}