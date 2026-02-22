package tenant

import (
	"time"

	"github.com/rushinski/snkreco-api/internal/platform/database"
)

type Tenant struct {
	database.Model
	Name string
	Slug string
	Domain string
	Email string
	Phone *string
	Instagram *string
	StripeConnectID *string
	Status string
	OpensAt *time.Time
}