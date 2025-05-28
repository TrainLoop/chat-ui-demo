package handlers

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    
    "cloud.google.com/go/vertexai/genai"
    "github.com/mlpierce22/chatbot-ui-go-server/models"
    "github.com/mlpierce22/chatbot-ui-go-server/services"
)

func GeminiSDKHandler(projectID, location string, charLimit int) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req models.ChatRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }
        
        req.SetDefaults("gemini-sdk")
        
        ctx := context.Background()
        client, err := genai.NewClient(ctx, projectID, location)
        if err != nil {
            http.Error(w, fmt.Sprintf("Failed to create Gemini client: %v", err), http.StatusInternalServerError)
            return
        }
        defer client.Close()
        
        model := client.GenerativeModel(req.Model)
        model.SetTemperature(float32(req.Temperature))
        model.SetMaxOutputTokens(int32(req.MaxTokens))
        
        // Add system instruction
        model.SystemInstruction = &genai.Content{
            Parts: []genai.Part{genai.Text(req.SystemPrompt)},
        }
        
        // Convert messages to Gemini format
        var contents []*genai.Content
        processed := processMessages(req.Messages, charLimit)
        for _, msg := range processed {
            role := "user"
            if msg.Role == "assistant" {
                role = "model"
            }
            contents = append(contents, &genai.Content{
                Role:  role,
                Parts: []genai.Part{genai.Text(msg.Content)},
            })
        }
        
        // Create chat session
        session := model.StartChat()
        if len(contents) > 1 {
            session.History = contents[:len(contents)-1] // All but the last message
        }
        
        sseWriter := services.NewSSEWriter(w)
        
        // Send the last message and stream response
        if len(contents) > 0 {
            lastContent := contents[len(contents)-1]
            iter := session.SendMessageStream(ctx, lastContent.Parts...)
            
            for {
                resp, err := iter.Next()
                if err != nil {
                    if err.Error() != "no more items in iterator" {
                        sseWriter.WriteChunk(models.StreamChunk{Error: err.Error()})
                    }
                    break
                }
                
                for _, candidate := range resp.Candidates {
                    for _, part := range candidate.Content.Parts {
                        if text, ok := part.(genai.Text); ok {
                            sseWriter.WriteChunk(models.StreamChunk{
                                Text: string(text),
                            })
                        }
                    }
                }
            }
        }
        
        sseWriter.WriteDone()
    }
}
