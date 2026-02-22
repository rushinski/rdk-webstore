package config

import (
	"fmt"
)

type Config struct {
	App *AppConfig
	Security *SecurityConfig
	Database *DatabaseConfig
}

func Load() (*Config, error) {
	appConfig, err := LoadAppConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load app config: %w", err)
	}

	securityConfig, err := LoadSecurityConfig(appConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to load security config : %w", err)
	}

	databaseConfig, err := LoadDatabaseConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load database config : %w", err)
	}

	return &Config{
		App: appConfig,
		Security: securityConfig,
		Database: databaseConfig,
	}, nil
}