package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment string
	Port        int
	KubeConfig  string
	AIProvider  string
	AIAPIKey    string
	CacheTTL    time.Duration
	LogLevel    string
}

func Load() *Config {
	// Load .env file if it exists
	godotenv.Load()
	
	cfg := &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		Port:        getEnvInt("PORT", 3001),
		KubeConfig:  getEnv("KUBECONFIG", ""),
		AIProvider:  getEnv("AI_PROVIDER", "mock"),
		AIAPIKey:    getEnv("AI_API_KEY", ""),
		CacheTTL:    time.Duration(getEnvInt("CACHE_TTL_SECONDS", 30)) * time.Second,
		LogLevel:    getEnv("LOG_LEVEL", "info"),
	}
	
	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
