package handlers

import (
    "context"
    "encoding/json"
    "net/http"
    
    "github.com/liushuangls/go-anthropic/v2"
    "github.com/mlpierce22/chatbot-ui-go-server/models"
    "github.com/mlpierce22/chatbot-ui-go-server/services"
)

func AnthropicSDKHandler(apiKey string, charLimit int) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req models.ChatRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }
        
        req.SetDefaults("anthropic-sdk")
        
        client := anthropic.NewClient(apiKey)
        
        var messages []anthropic.Message
        processed := processMessages(req.Messages, charLimit)
        for _, msg := range processed {
            role := anthropic.RoleUser
            if msg.Role == "assistant" {
                role = anthropic.RoleAssistant
            }
            messages = append(messages, anthropic.Message{
                Role:    role,
                Content: []anthropic.MessageContent{
                    anthropic.NewTextMessageContent(msg.Content),
                },
            })
        }
        
        sseWriter := services.NewSSEWriter(w)
        
        temp := float32(req.Temperature)
        _, err := client.CreateMessagesStream(
            context.Background(),
            anthropic.MessagesStreamRequest{
                MessagesRequest: anthropic.MessagesRequest{
                    Model:       anthropic.Model(req.Model),
                    Messages:    messages,
                    MaxTokens:   req.MaxTokens,
                    Temperature: &temp,
                    System:      req.SystemPrompt,
                },
                OnContentBlockDelta: func(data anthropic.MessagesEventContentBlockDeltaData) {
                    if data.Delta.Text != nil && *data.Delta.Text != "" {
                        sseWriter.WriteChunk(models.StreamChunk{
                            Text: *data.Delta.Text,
                        })
                    }
                },
            },
        )
        
        if err != nil {
            sseWriter.WriteChunk(models.StreamChunk{Error: err.Error()})
            sseWriter.WriteDone()
            return
        }
        
        sseWriter.WriteDone()
    }
}
