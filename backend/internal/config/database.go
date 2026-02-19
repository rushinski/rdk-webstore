package config

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
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

// function used to create the initial database connection
func NewPool(cfg *DatabaseConfig) (*pgxpool.Pool, error) {
	// parsing the url from our DatabaseConfig struct 
	poolConfig, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database url: %w", err)
	}

	// adding the additional fields from our DatabaseConfig struct
	poolConfig.MaxConns = int32(cfg.MaxConnections)
	poolConfig.MinConns = int32(cfg.MinConnections)
	poolConfig.MaxConnLifetime = cfg.MaxConnLifetime
	poolConfig.MaxConnIdleTime = cfg.MaxConnIdleTime
	poolConfig.HealthCheckPeriod = cfg.HealthCheckPeriod

	// context has a deadline/timeout and a cancellation signal 
	// context.Background() has no deadline/timeout and never cancels
	// we hand context.background() the 5 second timeout window
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// creating the actual pool using our 5 second window
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig) 
	if err != nil {
		return nil, fmt.Errorf("failed to create pgxpool: %w", err)
	}

	// pinging database to confirm its healthy
	err = pool.Ping(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	return pool, nil
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