package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
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
        return nil, fmt.Errorf("DATABASE_URL environment variable is required")
    }

    maxConnections := getEnvIntWithDefault("DATABASE_MAX_CONNECTIONS", 25)
    minConnections := getEnvIntWithDefault("DATABASE_MIN_CONNECTIONS", 5)

    return &DatabaseConfig{
        URL:               url,
        MaxConnections:    maxConnections,
        MinConnections:    minConnections,
        MaxConnLifetime:   time.Hour,
        MaxConnIdleTime:   30 * time.Minute,
        HealthCheckPeriod: time.Minute,
    }, nil
}

// helper function used to convert the string enviorment variable to integers
// gracefully fallsback to the default value if an error occurs 
func getEnvIntWithDefault(key string, fallback int) int {
    raw := os.Getenv(key)
    if raw == "" {
        slog.Warn("environment variable not set, using default",
            "key", key,
            "default", fallback,
        )
        return fallback
    }

    parsed, err := strconv.Atoi(raw)
    if err != nil {
        slog.Warn("failed to parse environment variable, using default",
            "key", key,
            "value", raw,
            "default", fallback,
            "error", err,
        )
        return fallback
    }

    return parsed
}