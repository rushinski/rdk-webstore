package middleware

import (
	"log/slog"
	"context"
	"net/http"
	"errors"

	"github.com/rushinski/snkreco-api/internal/tenant"
)

type TenantMiddleware struct {
	tenantService *tenant.TenantService
}

type contextKey string
const tenantKey contextKey = "tenant"

func NewTenantMiddleware(s *tenant.TenantService) *TenantMiddleware {
	return &TenantMiddleware{
		tenantService: s,
	}
}

func (m *TenantMiddleware) Handle(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Host

		t, err := m.tenantService.Resolve(r.Context(), h)

		if err != nil {
			if errors.Is(err, tenant.ErrTenantNotFound) {
				http.Error(w, "not found", http.StatusNotFound)
				return  // critical, stops the request going further
			}
			if errors.Is(err, tenant.ErrTenantInactive) {
				http.Error(w, "store is inactive", http.StatusForbidden)
				return
			}
			// unexpected error
			slog.Error("failed to resolve tenant", "error", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
		
		ctx := context.WithValue(r.Context(), tenantKey, t)
		r = r.WithContext(ctx)
        next.ServeHTTP(w, r)
    })
}

func TenantFromContext(ctx context.Context) (*tenant.Tenant, bool) {
    t, ok := ctx.Value(tenantKey).(*tenant.Tenant)
    return t, ok
}