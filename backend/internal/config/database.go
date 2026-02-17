package config

import (
	"strconv"
	"fmt"
	"log/slog"
	"os"
	"time"
)

type DatabaseConfig struct {
	URL string
	MaxConnections int
	MinConnections int
	MaxConnLifetime time.Duration
	MaxConnIdleTime time.Duration
	HealthCheckPeriod time.Duration
}

func LoadDatabaseConfig() (*DatabaseConfig, error) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return nil, fmt.Errorf("DATABASE_URL enviorment variable is required")
	}

	maxConnectionsRaw := os.Getenv("DATABASE_MAX_CONNECTIONS")
	if maxConnectionsRaw == "" {
		slog.Warn("DATABASE_MAX_CONNECTIONS enviorment variable not set, defaulting to 25")
		maxConnectionsRaw = "25"
	}

	maxConnections, err := strconv.Atoi(maxConnectionsRaw)
	if err != nil {
		return nil, fmt.Errorf("Error while converting maxConnections to int")
	}

	minConnectionsRaw := os.Getenv("DATABASE_MIN_CONNECTIONS")
	if minConnectionsRaw == "" {
		slog.Warn("DATABASE_MIN_CONNECTIONS enviorment variable not set, defaulting to 5")
		minConnectionsRaw = "5"
	}

	minConnections, err := strconv.Atoi(minConnectionsRaw)
	if err != nil {
		return nil, fmt.Errorf("Error while converting minConnections to int: %err", err)
	}
} 

func getEnvIntWithDefault(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		slog.Warn("%s enviorment variable not set, defaulting to %d", key, fallback)
		return fallback
	} else {
		parsed, err := strconv.Atoi(raw)

		if err == nil {
			return parsed
		}
	}
}
