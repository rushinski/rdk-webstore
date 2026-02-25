package tenant

import (
	"context"
	"errors"
	"fmt"
)

type TenantService struct {
	repo *TenantRepo
}

var ErrTenantInactive = errors.New("tenant is inactive")

func NewTenantService(r *TenantRepo) *TenantService {
	return &TenantService{
		repo: r,
	}
}

func (s *TenantService) Resolve(ctx context.Context, domain string) (*Tenant, error) {
	t, err := s.repo.GetByDomain(ctx, domain)

	if err != nil {
		return nil, fmt.Errorf("failed to resolve tenant: %w", err)
	}

	if t.Status == "inactive" {
		return nil, ErrTenantInactive
	}

	return t, nil
}