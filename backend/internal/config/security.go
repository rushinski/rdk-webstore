package config

import (
	"log/slog"
	"strings"
	"fmt"
	"os"
	"strconv"
	"time"
)

type SecurityConfig struct {
	// CORS (Corss-Origin Ressource Sharing) Fields
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
	ExposedHeaders []string
	AllowCredentials bool
	CORSMaxAge int

	// Security Header Fields
	EnableHSTS bool
	HSTSMaxAge int
	FrameOptions string
	ContentTypeNoSniff bool
	XSSProtection bool
	ContentSecurityPolicy string

	// Timeout Fields
	ReadTimeout time.Duration
	WriteTimeout time.Duration
	IdleTimeout time.Duration

	// Rate Limiting Fields
	RateLimitEnabled bool
	RateLimitRequestsPer time.Duration
	RateLimitBurst int
}

func LoadSecurityConfig(appConfig *AppConfig) (*SecurityConfig, error) {
	originsRaw := os.Getenv("ALLOWED_ORIGINS")
	if originsRaw == "" {
		return nil, fmt.Errorf("ALLOWED_ORIGINS enviorment variable is required")
	}

	origins := strings.Split(originsRaw, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	enabledRaw := os.Getenv("RATE_LIMIT_ENABLED")
	if enabledRaw == "" {
		slog.Warn("enviorment variable not set, using default",
    		"key", "RATE_LIMIT_ENABLED",
    		"default", true,
		)
		enabledRaw = "true"
	}

	enabled, err := strconv.ParseBool(enabledRaw)
	if err != nil {
		return nil, err
	}

	return &SecurityConfig{
		AllowedOrigins: origins,
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID"},
		ExposedHeaders: []string{"Link", "X-Total-Count"},
		AllowCredentials: true,
		CORSMaxAge: 300,

		EnableHSTS: appConfig.IsProduction(),
		HSTSMaxAge: 31536000, // 1 year
		FrameOptions: "DENY",
		ContentTypeNoSniff: true,
		XSSProtection: true,
		ContentSecurityPolicy: "default-src 'self'",

		ReadTimeout: 15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout: 60 * time.Second,

		RateLimitEnabled: enabled,
		RateLimitRequestsPer: time.Minute,
		RateLimitBurst: 100,
	}, nil
}