package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rushinski/snkreco-api/internal/platform/config"
)

// NewPostgres creates a connection to our postgres database and attempts to ping the database to confirm its healthy on connect
func NewPostgres(cfg *config.DatabaseConfig) (*pgxpool.Pool, error) {
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