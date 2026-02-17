package config

import (
	"fmt"
	"os"
)

type AppConfig struct {
	Env string
	Port string
}

func LoadAppConfig() (*AppConfig, error) {
	env := os.Getenv("ENV")
	if env == "" {
		return nil, fmt.Errorf("ENV enviorment variable is required")
	}

	port := os.Getenv("API_PORT")
	if port == "" {
		return nil, fmt.Errorf("API_PORT enviorment variable is required")
	}

    return &AppConfig{
        Env:  env,
        Port: port,
    }, nil
}

func (c *AppConfig) IsDevelopment() bool {
	return c.Env == "development"
}

func (c *AppConfig) IsProduction() bool {
	return c.Env == "production"
}