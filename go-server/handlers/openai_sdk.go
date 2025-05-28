package handlers

import (
    "context"
    "encoding/json"
    "io"
    "net/http"
    
    openai "github.com/sashabaranov/go-openai"
    "github.com/mlpierce22/chatbot-ui-go-server/models"
    "github.com/mlpierce22/chatbot-ui-go-server/services"
)

func OpenAISDKHandler(apiKey string, charLimit int) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req models.ChatRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }
        
        req.SetDefaults("openai-sdk")
        
        client := openai.NewClient(apiKey)
        
        messages := []openai.ChatCompletionMessage{
            {
                Role:    openai.ChatMessageRoleSystem,
                Content: req.SystemPrompt,
            },
        }
        
        processed := processMessages(req.Messages, charLimit)
        for _, msg := range processed {
            messages = append(messages, openai.ChatCompletionMessage{
                Role:    msg.Role,
                Content: msg.Content,
            })
        }
        
        stream, err := client.CreateChatCompletionStream(
            context.Background(),
            openai.ChatCompletionRequest{
                Model:       req.Model,
                Messages:    messages,
                MaxTokens:   req.MaxTokens,
                Temperature: float32(req.Temperature),
                Stream:      true,
            },
        )
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        defer stream.Close()
        
        sseWriter := services.NewSSEWriter(w)
        
        for {
            response, err := stream.Recv()
            if err == io.EOF {
                sseWriter.WriteDone()
                return
            }
            if err != nil {
                sseWriter.WriteChunk(models.StreamChunk{Error: err.Error()})
                sseWriter.WriteDone()
                return
            }
            
            if len(response.Choices) > 0 && response.Choices[0].Delta.Content != "" {
                sseWriter.WriteChunk(models.StreamChunk{
                    Text: response.Choices[0].Delta.Content,
                })
            }
        }
    }
}
