package database

import (
	"time"
)

type Model struct {
	ID string
	CreatedAt time.Time
	UpdatedAt time.Time
}