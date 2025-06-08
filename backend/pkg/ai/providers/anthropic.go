package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type AnthropicProvider struct {
	apiKey string
	model  string
}

func NewAnthropicProvider() *AnthropicProvider {
	return &AnthropicProvider{
		apiKey: os.Getenv("ANTHROPIC_API_KEY"),
		model:  getEnvOrDefault("ANTHROPIC_MODEL", "claude-3-opus-20240229"),
	}
}

func (p *AnthropicProvider) IsConfigured() bool {
	return p.apiKey != ""
}

func (p *AnthropicProvider) Complete(prompt string, systemPrompt string) (string, error) {
	if !p.IsConfigured() {
		return "", fmt.Errorf("Anthropic API key not configured")
	}

	url := "https://api.anthropic.com/v1/messages"

	payload := map[string]interface{}{
		"model": p.model,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"system":     systemPrompt,
		"max_tokens": 2000,
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
	req.Header.Set("X-API-Key", p.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

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
				return "", fmt.Errorf("Anthropic API error: %s", message)
			}
		}
		return "", fmt.Errorf("Anthropic API error: %v", errorObj)
	}

	if content, ok := result["content"].([]interface{}); ok && len(content) > 0 {
		if text, ok := content[0].(map[string]interface{}); ok {
			if textContent, ok := text["text"].(string); ok {
				return textContent, nil
			}
		}
	}

	return "", fmt.Errorf("unexpected response format")
}
