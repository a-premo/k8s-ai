package providers

import (
	"encoding/json"
	"fmt"
	"strings"
)

type MockProvider struct{}

func NewMockProvider() *MockProvider {
	return &MockProvider{}
}

func (p *MockProvider) IsConfigured() bool {
	return true // Mock is always "configured"
}

func (p *MockProvider) Complete(prompt string, systemPrompt string) (string, error) {
	// Analyze the prompt to determine what type of response to generate
	promptLower := strings.ToLower(prompt)

	// Pod analysis
	if strings.Contains(promptLower, "analyze") && strings.Contains(promptLower, "pod") {
		analysis := map[string]interface{}{
			"type":      "Pod Error Analysis",
			"summary":   "Mock analysis: Pod appears to have resource constraints and potential configuration issues.",
			"rootCause": "Container is likely experiencing memory pressure and may need resource limit adjustments.",
			"severity":  "Medium",
			"recommendations": []string{
				"Increase memory limits for the container",
				"Review resource requests vs usage patterns",
				"Check for memory leaks in application code",
				"Consider implementing horizontal pod autoscaling",
			},
			"confidence": 75,
		}
		jsonResponse, _ := json.Marshal(analysis)
		return string(jsonResponse), nil
	}

	// YAML editing
	if strings.Contains(promptLower, "yaml") && (strings.Contains(promptLower, "edit") || strings.Contains(promptLower, "modify")) {
		return generateMockYAMLEdit(prompt), nil
	}

	// Cluster analysis
	if strings.Contains(promptLower, "cluster") && strings.Contains(promptLower, "analy") {
		analysis := map[string]interface{}{
			"type":    "Cluster Health Analysis",
			"summary": "Mock analysis: Cluster is generally healthy with some optimization opportunities.",
			"issues": []map[string]string{
				{"severity": "Low", "description": "Some nodes are underutilized"},
				{"severity": "Medium", "description": "Resource requests could be optimized"},
			},
			"recommendations": []string{
				"Consider implementing cluster autoscaling",
				"Review resource allocation patterns",
				"Optimize pod placement with node affinity",
			},
			"score": 78,
		}
		jsonResponse, _ := json.Marshal(analysis)
		return string(jsonResponse), nil
	}

	// General chat
	if strings.Contains(systemPrompt, "kubernetes assistant") || strings.Contains(systemPrompt, "chat") {
		return generateMockChatResponse(prompt), nil
	}

	// Default response
	return fmt.Sprintf("Mock AI Response: This is a simulated response for your query about: %s\n\nTo enable real AI capabilities, please configure your AI provider API key in the environment variables.",
		truncateString(prompt, 100)), nil
}

func generateMockYAMLEdit(prompt string) string {
	// Extract common YAML editing patterns and return appropriate mock responses
	promptLower := strings.ToLower(prompt)

	if strings.Contains(promptLower, "replicas") {
		return `# Updated replicas count
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-deployment
spec:
  replicas: 3  # Increased from 1 to 3
  selector:
    matchLabels:
      app: example
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
      - name: example
        image: nginx:1.20
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"`
	}

	if strings.Contains(promptLower, "resource") && strings.Contains(promptLower, "limit") {
		return `# Updated with resource limits
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: example
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
      - name: example
        image: nginx:1.20
        resources:
          requests:
            memory: "128Mi"    # Added memory request
            cpu: "250m"        # Added CPU request
          limits:
            memory: "256Mi"    # Added memory limit
            cpu: "500m"        # Added CPU limit`
	}

	return `# Mock YAML edit result
# This is a simulated edit. Configure a real AI provider for actual YAML modifications.
apiVersion: v1
kind: ConfigMap
metadata:
  name: mock-edit-result
data:
  message: "Real AI provider needed for actual YAML editing"`
}

func generateMockChatResponse(prompt string) string {
	promptLower := strings.ToLower(prompt)

	if strings.Contains(promptLower, "pod") && strings.Contains(promptLower, "error") {
		return "**Pod Troubleshooting Guide**\n\nCommon pod issues and solutions:\n\n1. **ImagePullBackOff**: Check if the image exists and is accessible\n2. **CrashLoopBackOff**: Review container logs for application errors\n3. **Pending**: Usually indicates resource constraints or scheduling issues\n\nWould you like me to analyze a specific pod for you?\n\n*Note: This is a mock response. Configure a real AI provider for detailed assistance.*"
	}

	if strings.Contains(promptLower, "yaml") || strings.Contains(promptLower, "configuration") {
		return "**Kubernetes YAML Configuration Help**\n\nHere are some best practices:\n\n- Always specify resource requests and limits\n- Use meaningful labels and annotations\n- Implement health checks (liveness/readiness probes)\n- Follow naming conventions\n\nExample deployment structure:\n```yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: my-app\n```\n\n*Configure a real AI provider for personalized YAML assistance.*"
	}

	return fmt.Sprintf("**Kubernetes Assistant (Mock Mode)**\n\nI received your question: \"%s\"\n\nThis is a simulated response. To get real AI-powered assistance with your Kubernetes cluster, please:\n\n1. Set up an AI provider (OpenAI or Anthropic)\n2. Add your API key to the environment variables\n3. Restart the backend service\n\nI can help you with:\n- Pod troubleshooting\n- YAML configuration\n- Best practices\n- Resource optimization\n- Security recommendations\n\n*Real AI integration coming soon!*", truncateString(prompt, 150))
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
