package main

import (
    appmiddleware "github.com/rushinski/snkreco-api/internal/platform/middleware"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    "github.com/go-chi/cors"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/rushinski/snkreco-api/internal/platform/config"
    "github.com/rushinski/snkreco-api/internal/platform/health"
)

func registerRoutes(r *chi.Mux, cfg *config.Config, pool *pgxpool.Pool) {
    // attaching middleware and CORS policies to the router
    r.Use(
        middleware.Logger,
        middleware.RequestID,
        middleware.RealIP,
        middleware.Recoverer,
        cors.Handler(cors.Options{
            AllowedOrigins:   cfg.Security.AllowedOrigins,
            AllowedMethods:   cfg.Security.AllowedMethods,
            AllowedHeaders:   cfg.Security.AllowedHeaders,
            ExposedHeaders:   cfg.Security.ExposedHeaders,
            AllowCredentials: cfg.Security.AllowCredentials,
            MaxAge:           cfg.Security.CORSMaxAge,
        }),
    )

    // Outside versioning - infra routes
    r.Get("/health", health.Handler(pool))

    r.Route("/v1", func(r chi.Router) {
        // attaching our custom middleware
        // we only attach to the v1 routes as attac
        appmiddleware.Setup(r, pool)
    })
}