package models

import (
	"time"
)

type BaseModel struct {
	ID string
	CreatedAt time.Time
	UpdatedAt time.Time
}