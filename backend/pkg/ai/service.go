package ai

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"k8s-ai-ide-backend/internal/models"
	"k8s-ai-ide-backend/pkg/ai/providers"
)

type Service interface {
	AnalyzePod(podName, namespace string, podData interface{}) (*models.AIAnalysis, error)
	AnalyzeCluster(nodes []models.Node, pods []models.Pod) (*models.AIAnalysis, error)
	Chat(message string, context interface{}) (*models.ChatResponse, error)
	EditResourceWithAI(resourceType, currentYAML, instructions string) (interface{}, error)
}

type service struct {
	provider AIProvider
}

type AIProvider interface {
	Complete(prompt string, systemPrompt string) (string, error)
	IsConfigured() bool
}

func NewService() Service {
	var provider AIProvider

	aiProvider := os.Getenv("AI_PROVIDER")
	switch strings.ToLower(aiProvider) {
	case "openai":
		openai := providers.NewOpenAIProvider()
		if openai.IsConfigured() {
			provider = openai
		} else {
			provider = providers.NewMockProvider()
		}
	case "anthropic":
		anthropic := providers.NewAnthropicProvider()
		if anthropic.IsConfigured() {
			provider = anthropic
		} else {
			provider = providers.NewMockProvider()
		}
	default:
		// Try to auto-detect based on available API keys
		if os.Getenv("OPENAI_API_KEY") != "" {
			provider = providers.NewOpenAIProvider()
		} else if os.Getenv("ANTHROPIC_API_KEY") != "" {
			provider = providers.NewAnthropicProvider()
		} else {
			provider = providers.NewMockProvider()
		}
	}

	return &service{provider: provider}
}

func (s *service) AnalyzePod(podName, namespace string, podData interface{}) (*models.AIAnalysis, error) {
	podJSON, err := json.MarshalIndent(podData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal pod data: %v", err)
	}

	systemPrompt := `You are a Kubernetes expert. Analyze the pod data and provide:
1. A brief summary of the issue
2. The root cause  
3. Severity level (Low/Medium/High/Critical)
4. Specific actionable recommendations to fix the issue
5. Confidence level (0-100)

Respond in JSON format with the following structure:
{
  "type": "Pod Error Analysis",
  "summary": "Brief summary of the issue",
  "rootCause": "Detailed root cause",
  "severity": "High",
  "recommendations": ["recommendation1", "recommendation2"],
  "confidence": 85
}`

	prompt := fmt.Sprintf(`Analyze this Kubernetes pod that appears to be having issues:

Pod Name: %s
Namespace: %s
Pod Data:
%s

Provide a detailed analysis of what's wrong and how to fix it.`, podName, namespace, string(podJSON))

	response, err := s.provider.Complete(prompt, systemPrompt)
	if err != nil {
		return nil, fmt.Errorf("AI analysis failed: %v", err)
	}

	var analysis models.AIAnalysis
	if err := json.Unmarshal([]byte(response), &analysis); err != nil {
		// If JSON parsing fails, create a structured response from the text
		analysis = models.AIAnalysis{
			Type:      "Pod Error Analysis",
			Summary:   response,
			RootCause: "Analysis completed",
			Severity:  "Medium",
			Recommendations: []string{
				"Review the analysis above for detailed recommendations",
			},
			Confidence: 85,
		}
	}

	analysis.Timestamp = time.Now().UTC()
	return &analysis, nil
}

func (s *service) AnalyzeCluster(nodes []models.Node, pods []models.Pod) (*models.AIAnalysis, error) {
	clusterData := map[string]interface{}{
		"nodes": nodes,
		"pods":  pods,
		"stats": map[string]int{
			"totalNodes": len(nodes),
			"totalPods":  len(pods),
		},
	}

	clusterJSON, err := json.MarshalIndent(clusterData, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal cluster data: %v", err)
	}

	systemPrompt := `You are a Kubernetes cluster optimization expert. Analyze the cluster data and provide:
1. Overall cluster health summary
2. Resource utilization insights
3. Performance optimization recommendations
4. Security and reliability suggestions
5. Confidence score (0-100)

Respond in JSON format with the following structure:
{
  "type": "Cluster Health Analysis",
  "summary": "Overall cluster assessment",
  "insights": ["insight1", "insight2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "confidence": 85
}`

	prompt := fmt.Sprintf(`Analyze this Kubernetes cluster for optimization opportunities:

Cluster Data:
%s

Provide recommendations for improving cluster efficiency, reliability, and security.`, string(clusterJSON))

	response, err := s.provider.Complete(prompt, systemPrompt)
	if err != nil {
		return nil, fmt.Errorf("AI cluster analysis failed: %v", err)
	}

	var analysis models.AIAnalysis
	if err := json.Unmarshal([]byte(response), &analysis); err != nil {
		// If JSON parsing fails, create a structured response
		analysis = models.AIAnalysis{
			Type:    "Cluster Health Analysis",
			Summary: response,
			Insights: []string{
				"Cluster analysis completed",
			},
			Recommendations: []string{
				"Review the analysis above for detailed recommendations",
			},
			Confidence: 78,
		}
	}

	analysis.Timestamp = time.Now().UTC()
	return &analysis, nil
}

func (s *service) Chat(message string, context interface{}) (*models.ChatResponse, error) {
	systemPrompt := `You are a helpful Kubernetes assistant integrated into a K8s IDE. 
You have access to the current cluster state and can help with:
- Explaining Kubernetes concepts
- Troubleshooting issues
- Suggesting best practices
- Writing YAML configurations
- Optimizing resource usage

Be concise but thorough. Use markdown formatting for code examples.
Always provide actionable advice when possible.`

	// Summarize context to prevent large payloads
	summarizedContext := s.summarizeContext(context)
	contextJSON, _ := json.MarshalIndent(summarizedContext, "", "  ")

	prompt := fmt.Sprintf(`Context from the current Kubernetes cluster:
%s

User Question: %s

Please provide a helpful and detailed response.`, string(contextJSON), message)

	response, err := s.provider.Complete(prompt, systemPrompt)
	if err != nil {
		return nil, fmt.Errorf("AI chat failed: %v", err)
	}

	return &models.ChatResponse{
		Answer:  response,
		Context: "Kubernetes cluster management",
		FollowUpQuestions: []string{
			"Would you like me to analyze a specific resource?",
			"Do you need help with YAML configuration?",
			"Should I check for optimization opportunities?",
		},
		Timestamp: time.Now().UTC(),
	}, nil
}

// summarizeContext reduces the context size by extracting only key information
func (s *service) summarizeContext(context interface{}) map[string]interface{} {
	summary := make(map[string]interface{})

	// Convert context to map for processing
	contextBytes, _ := json.Marshal(context)
	var contextMap map[string]interface{}
	if err := json.Unmarshal(contextBytes, &contextMap); err != nil {
		// Fallback if context can't be unmarshaled
		return map[string]interface{}{
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"error":     "Could not parse context",
		}
	}

	// Extract cluster info safely
	if cluster, ok := contextMap["cluster"].(map[string]interface{}); ok {
		clusterInfo := make(map[string]interface{})

		// Safely extract cluster fields
		if name, ok := cluster["name"]; ok {
			clusterInfo["name"] = name
		}
		if displayName, ok := cluster["displayName"]; ok {
			clusterInfo["displayName"] = displayName
		}
		if namespace, ok := cluster["namespace"]; ok {
			clusterInfo["namespace"] = namespace
		}
		if status, ok := cluster["status"]; ok {
			clusterInfo["status"] = status
		}

		summary["cluster"] = clusterInfo
	}

	// Handle different resource context structures
	var resources map[string]interface{}

	// Check for resources in different possible locations
	if res, ok := contextMap["resources"].(map[string]interface{}); ok {
		resources = res
	} else if res, ok := contextMap["resourceCounts"].(map[string]interface{}); ok {
		// If already summarized, use as-is
		summary["resources"] = res
		summary["timestamp"] = contextMap["timestamp"]
		if total, ok := contextMap["totalResources"]; ok {
			summary["totalResources"] = total
		}
		return summary
	}

	// Summarize resources if available
	if resources != nil {
		resourceSummary := make(map[string]interface{})
		totalResources := 0

		// Count resources by type
		for resourceType, resourceList := range resources {
			if list, ok := resourceList.([]interface{}); ok {
				count := len(list)
				totalResources += count

				resourceInfo := map[string]interface{}{
					"count": count,
				}

				// Add specific metrics for important resource types
				switch resourceType {
				case "pods":
					statusCounts := make(map[string]int)
					for _, item := range list {
						if pod, ok := item.(map[string]interface{}); ok {
							status := "Unknown"
							if s, ok := pod["status"].(string); ok {
								status = s
							}
							statusCounts[status]++
						}
					}
					if len(statusCounts) > 0 {
						resourceInfo["statusBreakdown"] = statusCounts
					}

				case "nodes":
					readyCount := 0
					for _, item := range list {
						if node, ok := item.(map[string]interface{}); ok {
							if status, ok := node["status"].(string); ok && status == "Ready" {
								readyCount++
							}
						}
					}
					resourceInfo["readyNodes"] = readyCount

				case "deployments":
					healthyCount := 0
					for _, item := range list {
						if deployment, ok := item.(map[string]interface{}); ok {
							ready, readyOk := deployment["ready"]
							desired, desiredOk := deployment["desired"]

							if readyOk && desiredOk {
								// Handle both string and numeric values
								readyVal := parseNumber(ready)
								desiredVal := parseNumber(desired)

								if readyVal == desiredVal && readyVal > 0 {
									healthyCount++
								}
							}
						}
					}
					resourceInfo["healthyDeployments"] = healthyCount
				}

				resourceSummary[resourceType] = resourceInfo
			}
		}

		summary["resources"] = resourceSummary
		summary["totalResources"] = totalResources
	}

	// Add timestamp
	if timestamp, ok := contextMap["timestamp"]; ok {
		summary["timestamp"] = timestamp
	} else {
		summary["timestamp"] = time.Now().UTC().Format(time.RFC3339)
	}

	// Add total resource count if provided
	if totalResources, ok := contextMap["totalResources"]; ok {
		summary["totalResources"] = totalResources
	}

	return summary
}

// Helper function to parse numbers from interface{} (handles both string and numeric values)
func parseNumber(value interface{}) float64 {
	switch v := value.(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case string:
		if parsed, err := fmt.Sscanf(v, "%f", new(float64)); err == nil && parsed == 1 {
			var result float64
			fmt.Sscanf(v, "%f", &result)
			return result
		}
	}
	return 0
}

func (s *service) EditResourceWithAI(resourceType, currentYAML, instructions string) (interface{}, error) {
	systemPrompt := `You are a Kubernetes YAML expert. Edit the provided YAML according to the user's instructions.
Rules:
1. Return ONLY the modified YAML, no explanations or markdown
2. Preserve all fields not mentioned in the instructions
3. Ensure the YAML is valid and follows Kubernetes best practices
4. Add comments to explain significant changes
5. Do not include any text before or after the YAML`

	prompt := fmt.Sprintf(`Current %s YAML:
%s

Instructions: %s

Return the modified YAML:`, resourceType, currentYAML, instructions)

	modifiedYAML, err := s.provider.Complete(prompt, systemPrompt)
	if err != nil {
		return nil, fmt.Errorf("AI YAML editing failed: %v", err)
	}

	// Clean up the response (remove markdown code blocks if present)
	modifiedYAML = strings.TrimPrefix(modifiedYAML, "```yaml")
	modifiedYAML = strings.TrimPrefix(modifiedYAML, "```")
	modifiedYAML = strings.TrimSuffix(modifiedYAML, "```")
	modifiedYAML = strings.TrimSpace(modifiedYAML)

	response := map[string]interface{}{
		"success":       true,
		"message":       fmt.Sprintf("AI has successfully modified the %s resource based on your instructions", resourceType),
		"modified_yaml": modifiedYAML,
		"changes": []string{
			fmt.Sprintf("Applied instructions: %s", instructions),
		},
	}

	return response, nil
}
