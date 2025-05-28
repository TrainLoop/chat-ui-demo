package handlers

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "bufio"
    "strings"
    "time"
    
    "github.com/mlpierce22/chatbot-ui-go-server/models"
    "github.com/mlpierce22/chatbot-ui-go-server/services"
)

func OpenAIFetchHandler(apiKey string, charLimit int) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req models.ChatRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }
        
        req.SetDefaults("openai-fetch")
        
        // Process messages with character limit
        messages := processMessages(req.Messages, charLimit)
        
        // Prepare OpenAI request
        openAIMessages := []map[string]string{
            {"role": "system", "content": req.SystemPrompt},
        }
        for _, msg := range messages {
            openAIMessages = append(openAIMessages, map[string]string{
                "role": msg.Role,
                "content": msg.Content,
            })
        }
        
        payload := map[string]interface{}{
            "model":       req.Model,
            "messages":    openAIMessages,
            "max_tokens":  req.MaxTokens,
            "temperature": req.Temperature,
            "stream":      true,
        }
        
        sseWriter := services.NewSSEWriter(w)
        
        reqBody, _ := json.Marshal(payload)
        httpReq, err := http.NewRequest("POST", 
            "https://api.openai.com/v1/chat/completions",
            bytes.NewReader(reqBody))
        if err != nil {
            sseWriter.WriteChunk(models.StreamChunk{Error: err.Error()})
            sseWriter.WriteDone()
            return
        }
        
        httpReq.Header.Set("Content-Type", "application/json")
        httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))
        
        client := &http.Client{Timeout: 60 * time.Second}
        resp, err := client.Do(httpReq)
        if err != nil {
            sseWriter.WriteChunk(models.StreamChunk{Error: err.Error()})
            sseWriter.WriteDone()
            return
        }
        defer resp.Body.Close()
        
        if resp.StatusCode != http.StatusOK {
            body, _ := io.ReadAll(resp.Body)
            sseWriter.WriteChunk(models.StreamChunk{Error: fmt.Sprintf("OpenAI API error: %s", body)})
            sseWriter.WriteDone()
            return
        }
        
        scanner := bufio.NewScanner(resp.Body)
        for scanner.Scan() {
            line := scanner.Text()
            if strings.HasPrefix(line, "data: ") {
                data := strings.TrimPrefix(line, "data: ")
                if data == "[DONE]" {
                    sseWriter.WriteDone()
                    return
                }
                
                var chunk map[string]interface{}
                if err := json.Unmarshal([]byte(data), &chunk); err == nil {
                    if choices, ok := chunk["choices"].([]interface{}); ok && len(choices) > 0 {
                        if choice, ok := choices[0].(map[string]interface{}); ok {
                            if delta, ok := choice["delta"].(map[string]interface{}); ok {
                                if content, ok := delta["content"].(string); ok {
                                    sseWriter.WriteChunk(models.StreamChunk{Text: content})
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

func processMessages(messages []models.Message, charLimit int) []models.Message {
    var processed []models.Message
    charCount := 0
    
    for _, msg := range messages {
        if charCount + len(msg.Content) > charLimit {
            break
        }
        charCount += len(msg.Content)
        processed = append(processed, msg)
    }
    
    return processed
}
