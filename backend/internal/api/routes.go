package api

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rushinski/snkreco-backend/internal/api/handlers"
)

func RegisterRoutes(r *chi.Mux, pool *pgxpool.Pool) {
	r.Route("/v1", func(r chi.Router) {
		r.Get("/health", handlers.Health(pool))
	})
}