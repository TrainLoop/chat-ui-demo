package models

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Messages     []Message `json:"messages"`
	Model        string    `json:"model,omitempty"`
	SystemPrompt string    `json:"systemPrompt,omitempty"`
	Temperature  float64   `json:"temperature,omitempty"`
	MaxTokens    int       `json:"maxTokens,omitempty"`
}

// Default values
func (r *ChatRequest) SetDefaults(endpoint string) {
	if r.SystemPrompt == "" {
		r.SystemPrompt = "You are a helpful, friendly, assistant."
	}
	if r.MaxTokens == 0 {
		r.MaxTokens = 800
	}

	// Set default models based on endpoint
	if r.Model == "" {
		switch endpoint {
		case "openai-fetch":
			r.Model = "gpt-3.5-turbo"
		case "openai-sdk":
			r.Model = "gpt-4o"
		case "anthropic-sdk":
			r.Model = "claude-3-5-sonnet-20241022"
		case "gemini-sdk":
			r.Model = "gemini-2.0-flash"
		}
	}
}
