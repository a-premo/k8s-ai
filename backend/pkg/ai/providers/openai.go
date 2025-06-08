package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type OpenAIProvider struct {
	apiKey string
	model  string
}

func NewOpenAIProvider() *OpenAIProvider {
	return &OpenAIProvider{
		apiKey: os.Getenv("OPENAI_API_KEY"),
		model:  getEnvOrDefault("OPENAI_MODEL", "gpt-4-turbo-preview"),
	}
}

func (p *OpenAIProvider) IsConfigured() bool {
	return p.apiKey != ""
}

func (p *OpenAIProvider) Complete(prompt string, systemPrompt string) (string, error) {
	if !p.IsConfigured() {
		return "", fmt.Errorf("OpenAI API key not configured")
	}

	url := "https://api.openai.com/v1/chat/completions"

	messages := []map[string]string{
		{"role": "system", "content": systemPrompt},
		{"role": "user", "content": prompt},
	}

	payload := map[string]interface{}{
		"model":       p.model,
		"messages":    messages,
		"temperature": 0.7,
		"max_tokens":  2000,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %v", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error: %s", resp.Status)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %v", err)
	}

	// Handle API errors
	if errorObj, ok := result["error"]; ok {
		if errorMap, ok := errorObj.(map[string]interface{}); ok {
			if message, ok := errorMap["message"].(string); ok {
				return "", fmt.Errorf("OpenAI API error: %s", message)
			}
		}
		return "", fmt.Errorf("OpenAI API error: %v", errorObj)
	}

	if choices, ok := result["choices"].([]interface{}); ok && len(choices) > 0 {
		if choice, ok := choices[0].(map[string]interface{}); ok {
			if message, ok := choice["message"].(map[string]interface{}); ok {
				if content, ok := message["content"].(string); ok {
					return content, nil
				}
			}
		}
	}

	return "", fmt.Errorf("unexpected response format")
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
