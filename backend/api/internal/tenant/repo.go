package tenant

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TenantRepo struct {
	pool *pgxpool.Pool
}

// package wide variable used for when a tenant cannot be found 
var ErrTenantNotFound = errors.New("tenant not found")

func NewTenantRepo(pool *pgxpool.Pool) *TenantRepo {
	return &TenantRepo{
		pool: pool,
	}
}

func (r *TenantRepo) GetByDomain(ctx context.Context, domain string) (*Tenant, error) {
    query := `
        SELECT id, name, slug, domain, email, phone, instagram, stripe_connect_id, status, opens_at, created_at, updated_at
        FROM tenants
        WHERE domain = $1
    `

    t := &Tenant{}

    err := r.pool.QueryRow(ctx, query, domain).Scan(
        &t.ID,
        &t.Name,
        &t.Slug,
        &t.Domain,
        &t.Email,
        &t.Phone,
        &t.Instagram,
        &t.StripeConnectID,
        &t.Status,
        &t.OpensAt,
        &t.CreatedAt,
        &t.UpdatedAt,
    )

    if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTenantNotFound
		}
        return nil, fmt.Errorf("failed to get tenant by domain: %w", err)
    }

    return t, nil
}