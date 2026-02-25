package middleware

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rushinski/snkreco-api/internal/tenant"
)

// Wires up all of our different middleware in order to attach it easily all together
func Setup(r chi.Router, pool *pgxpool.Pool) {
	// attching the tenant middleware
    repo := tenant.NewTenantRepo(pool)
    service := tenant.NewTenantService(repo)
    tm := NewTenantMiddleware(service)
    r.Use(tm.Handle)
}
