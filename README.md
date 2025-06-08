# K8s AI IDE

A modern Kubernetes management interface with AI assistance.

## 🚀 Quick Start

### Demo Mode (No Real Cluster Required)
```bash
make demo
```
Visit http://localhost:3000 to see demo data.

### Production Mode (With Real Cluster)
```bash
make up
```

### Development Mode (Hot Reload)
```bash
make dev
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `make up` | Start all services (production mode) |
| `make down` | Stop all services |
| `make dev` | Start in development mode with hot reload |
| `make demo` | Start in demo mode (no real cluster needed) |
| `make logs` | Show logs from all services |
| `make restart` | Restart all services |
| `make build` | Build all Docker images |
| `make clean` | Remove all containers, images, and volumes |
| `make health` | Check if services are running |

## 🏗️ Architecture

- **Frontend**: React app running on port 3000
- **Backend**: Go API server running on port 3001
- **Demo Mode**: Mock Kubernetes data for testing
- **Real Mode**: Connects to your kubeconfig

## 🔧 Configuration

### Demo Mode
Demo mode uses mock data and doesn't require a real Kubernetes cluster.

### Real Cluster Mode
Mount your kubeconfig file (default behavior):
```yaml
volumes:
  - ~/.kube:/root/.kube:ro
```

### Environment Variables
- `ENVIRONMENT`: Set to `development` or `production`
- `PORT`: Backend port (default: 3001)
- `KUBECONFIG`: Set to `/nonexistent/path` to force demo mode

## 🐳 Docker Structure

```
k8s-ai/
├── docker-compose.yml    # Main compose file
├── Makefile             # Simple commands
├── backend/
│   ├── Dockerfile       # Production build
│   ├── Dockerfile.dev   # Development with hot reload
│   └── .air.toml        # Hot reload configuration
└── frontend/
    ├── Dockerfile       # Production build
    └── Dockerfile.dev   # Development with hot reload
```

## 🛠️ Development

### Hot Reload Development
```bash
make dev
```
This starts both services with hot reload:
- Go backend with Air
- React frontend with npm start

### Building for Production
```bash
make build
make up
```

## 🩺 Health Checks

Services include health checks:
- Backend: `GET /api/v1/health`
- Frontend: `GET /`

Check status manually:
```bash
make health
```

## 🧹 Cleanup

Remove all Docker resources:
```bash
make clean
```

## 📝 Logs

View logs from all services:
```bash
make logs
```

## 🔍 Troubleshooting

1. **Port conflicts**: Make sure ports 3000 and 3001 are available
2. **Docker issues**: Run `make clean` to reset everything
3. **Demo mode not working**: Use `make demo` to force demo mode
4. **Real cluster access**: Ensure your kubeconfig is in `~/.kube/` 