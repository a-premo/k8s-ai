# AI Configuration Setup

## Environment Variables

Create a `.env` file in the `backend/` directory with the following configuration:

### Option 1: OpenAI Configuration
```bash
# AI Provider Configuration
AI_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Other settings
ENVIRONMENT=development
PORT=3001
```

### Option 2: Anthropic (Claude) Configuration
```bash
# AI Provider Configuration  
AI_PROVIDER=anthropic

# Anthropic Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-opus-20240229

# Other settings
ENVIRONMENT=development
PORT=3001
```

### Option 3: Auto-Detection (Recommended)
```bash
# Leave AI_PROVIDER unset for auto-detection
# The system will automatically use the first available API key

# OpenAI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic Configuration (optional)  
ANTHROPIC_API_KEY=your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-opus-20240229

# Other settings
ENVIRONMENT=development
PORT=3001
```

## Getting API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and add it to your `.env` file

### Anthropic API Key
1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key and add it to your `.env` file

## Available Models

### OpenAI Models
- `gpt-4-turbo-preview` (recommended)
- `gpt-4`
- `gpt-3.5-turbo`

### Anthropic Models
- `claude-3-opus-20240229` (most capable)
- `claude-3-sonnet-20240229` (balanced)
- `claude-3-haiku-20240307` (fastest)

## Fallback Behavior

If no API keys are configured, the system will automatically fall back to mock responses that demonstrate the AI functionality without requiring real AI services.

## Testing the Setup

1. Start the backend: `cd backend && go run cmd/server/main.go`
2. Check the logs for AI provider initialization
3. Open the frontend and try the AI assistant
4. Test AI analysis on pods or other resources

## Troubleshooting

### "AI provider not configured" errors
- Check that your API key is correctly set in the `.env` file
- Ensure the `.env` file is in the `backend/` directory
- Restart the backend service after changing environment variables

### Rate limiting
- OpenAI and Anthropic have rate limits on their APIs
- Consider using different models for different use cases
- Implement caching for repeated queries (already built-in)

### Cost Management
- Monitor your API usage in the provider dashboards
- Set usage limits in your provider accounts
- Use less expensive models for simple queries

## Features Enabled with AI

1. **Pod Error Analysis**: AI analyzes failing pods and provides troubleshooting recommendations
2. **YAML Editing Assistance**: AI helps modify Kubernetes YAML configurations
3. **Cluster Optimization**: AI reviews cluster resources and suggests improvements
4. **Interactive Chat**: Ask questions about Kubernetes concepts and your cluster
5. **Smart Suggestions**: Context-aware recommendations throughout the interface 