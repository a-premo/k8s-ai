package main

import (
	"fmt"
	"log"
	"os"

	"k8s-ai-ide-backend/internal/config"
	"k8s-ai-ide-backend/internal/handlers"
	"k8s-ai-ide-backend/internal/middleware"
	"k8s-ai-ide-backend/pkg/ai"
	"k8s-ai-ide-backend/pkg/cache"
	"k8s-ai-ide-backend/pkg/k8s"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	if os.Getenv("ENVIRONMENT") == "development" {
		logger, _ = zap.NewDevelopment()
	}
	defer logger.Sync()

	// Load configuration
	cfg := config.Load()

	// Initialize services
	k8sClient, err := k8s.NewClient()
	if err != nil {
		logger.Warn("Failed to create K8s client, using mock client", zap.Error(err))
		k8sClient = k8s.NewMockClient()
	}

	aiService := ai.NewService(cfg.AIProvider, cfg.AIAPIKey) // Using AI service
	cacheService := cache.NewService(cfg.CacheTTL)

	// Initialize handlers
	h := handlers.New(k8sClient, aiService, cacheService, logger)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Middleware
	r.Use(middleware.Logger(logger))
	r.Use(middleware.CORS())
	r.Use(gin.Recovery())
	r.Use(middleware.Security())

	// API Routes
	api := r.Group("/api/v1")
	{
		// Health check
		api.GET("/health", h.Health)

		// K8s Resources
		k8sAPI := api.Group("/k8s")
		{
			// Workloads
			k8sAPI.GET("/pods", h.GetPods)
			k8sAPI.GET("/deployments", h.GetDeployments)
			k8sAPI.GET("/daemonsets", h.GetDaemonSets)
			k8sAPI.GET("/statefulsets", h.GetStatefulSets)
			k8sAPI.GET("/replicasets", h.GetReplicaSets)
			k8sAPI.GET("/jobs", h.GetJobs)
			k8sAPI.GET("/cronjobs", h.GetCronJobs)

			// Config
			k8sAPI.GET("/configmaps", h.GetConfigMaps)
			k8sAPI.GET("/secrets", h.GetSecrets)

			// Network
			k8sAPI.GET("/services", h.GetServices)
			k8sAPI.GET("/endpoints", h.GetEndpoints)
			k8sAPI.GET("/ingresses", h.GetIngresses)
			k8sAPI.GET("/networkpolicies", h.GetNetworkPolicies)

			// Storage
			k8sAPI.GET("/persistentvolumes", h.GetPersistentVolumes)
			k8sAPI.GET("/persistentvolumeclaims", h.GetPersistentVolumeClaims)
			k8sAPI.GET("/storageclasses", h.GetStorageClasses)

			// Access Control
			k8sAPI.GET("/serviceaccounts", h.GetServiceAccounts)
			k8sAPI.GET("/roles", h.GetRoles)
			k8sAPI.GET("/clusterroles", h.GetClusterRoles)
			k8sAPI.GET("/rolebindings", h.GetRoleBindings)
			k8sAPI.GET("/clusterrolebindings", h.GetClusterRoleBindings)

			// Common
			k8sAPI.GET("/nodes", h.GetNodes)
			k8sAPI.GET("/namespaces", h.GetNamespaces)
			k8sAPI.GET("/events", h.GetEvents)

			// Pod operations
			k8sAPI.GET("/pods/:namespace/:name/logs", h.GetPodLogs)
			k8sAPI.GET("/pods/:namespace/:name/shell", h.PodShell)

			// Resource editing
			k8sAPI.GET("/resource/:resourceType/:namespace/:name", h.GetResource)
			k8sAPI.PUT("/resource", h.UpdateResource)
		}

		// AI endpoints
		aiAPI := api.Group("/ai")
		{
			aiAPI.POST("/analyze/pod", h.AnalyzePod)
			aiAPI.POST("/analyze/cluster", h.AnalyzeCluster)
			aiAPI.POST("/chat", h.AIChat)
			aiAPI.POST("/edit", h.AIEditResource)
		}

		// Cluster management endpoints
		clusterAPI := api.Group("/clusters")
		{
			clusterAPI.GET("/", h.GetClusters)
			clusterAPI.GET("/current", h.GetCurrentCluster)
			clusterAPI.POST("/switch", h.SwitchCluster)
		}

		// WebSocket for real-time updates
		api.GET("/ws", h.WebSocket)
	}

	// Start server
	port := cfg.Port
	if port == 0 {
		port = 3001
	}

	logger.Info("🚀 K8s AI IDE Backend started",
		zap.Int("port", port),
		zap.String("environment", cfg.Environment),
		zap.String("ai_provider", cfg.AIProvider),
	)

	portStr := fmt.Sprintf(":%d", port)
	if err := r.Run(portStr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
