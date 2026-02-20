package models

import (
	"time"
)

type Tenant struct {
	BaseModel
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