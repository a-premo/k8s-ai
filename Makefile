.PHONY: help build up down dev logs clean restart demo

# Default target
help:
	@echo "🚀 K8s AI IDE - Docker Commands"
	@echo ""
	@echo "Production Commands:"
	@echo "  make up        - Start all services (production mode)"
	@echo "  make down      - Stop all services"
	@echo "  make restart   - Restart all services"
	@echo "  make logs      - Show logs from all services"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev       - Start in development mode (hot reload)"
	@echo "  make demo      - Start in demo mode (no real cluster)"
	@echo ""
	@echo "Maintenance Commands:"
	@echo "  make build     - Build all Docker images"
	@echo "  make clean     - Remove all containers, images, and volumes"

# Build all images
build:
	@echo "🔨 Building Docker images..."
	docker-compose build

# Start all services (production)
up: build
	@echo "🚀 Starting K8s AI IDE..."
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:3001"
	docker-compose --profile prod up -d
	@echo "✅ Services started! Use 'make logs' to view logs"

# Stop all services
down:
	@echo "🛑 Stopping all services..."
	docker-compose down

# Start in development mode (hot reload)
dev:
	@echo "🚀 Starting in development mode with hot reload..."
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:3001"
	docker-compose --profile dev up --build

# Start in demo mode (no real cluster access)
demo:
	@echo "🚀 Starting in demo mode..."
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:3001"
	docker-compose --profile demo up --build -d
	@echo "✅ Demo mode started! Visit http://localhost:3000"

# Show logs
logs:
	@echo "📋 Showing logs (Ctrl+C to exit)..."
	docker-compose logs -f

# Restart services
restart: down up

# Clean everything
clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose down --volumes --remove-orphans
	docker system prune -f
	@echo "✅ Cleanup complete"

# Quick health check
health:
	@echo "🔍 Health check..."
	@curl -f http://localhost:3001/api/v1/health && echo "✅ Backend is healthy" || echo "❌ Backend is down"
	@curl -f http://localhost:3000 && echo "✅ Frontend is healthy" || echo "❌ Frontend is down" 