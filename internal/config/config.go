package config

import (
	"os"
	"time"
)

type Config struct {
	DatabasePath    string
	JWTSecret       string
	JWTExpiry       time.Duration
	RefreshExpiry   time.Duration
	AllowedOrigins  string
	BcryptCost      int
}

func Load() *Config {
	return &Config{
		DatabasePath:    getEnv("DATABASE_PATH", "/data/budget.db"),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-in-production-please"),
		JWTExpiry:       15 * time.Minute,
		RefreshExpiry:   7 * 24 * time.Hour,
		AllowedOrigins:  getEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"),
		BcryptCost:      12,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
