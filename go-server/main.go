package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    
    "github.com/joho/godotenv"
    "github.com/mlpierce22/chatbot-ui-go-server/handlers"
)

type Config struct {
    Port              string
    OpenAIAPIKey      string
    AnthropicAPIKey   string
    GoogleProjectID   string
    GoogleLocation    string
    CharacterLimit    int
}

func loadConfig() *Config {
    // Load from multiple .env paths
    envPaths := []string{
        "../.env.local",
        "../.env",
        ".env.local",
        ".env",
    }
    
    for _, path := range envPaths {
        if _, err := os.Stat(path); err == nil {
            godotenv.Load(path)
            break
        }
    }
    
    return &Config{
        Port:            getEnvOrDefault("GO_PORT", "8001"), // Different from FastAPI
        OpenAIAPIKey:    os.Getenv("OPENAI_API_KEY"),
        AnthropicAPIKey: os.Getenv("ANTHROPIC_API_KEY"),
        GoogleProjectID: os.Getenv("GOOGLE_PROJECT_ID"),
        GoogleLocation:  getEnvOrDefault("GOOGLE_LOCATION", "us-central1"),
        CharacterLimit:  12000,
    }
}

func getEnvOrDefault(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func main() {
    cfg := loadConfig()
    
    // Log configuration status
    log.Printf("Starting Go server on port %s", cfg.Port)
    log.Printf("OpenAI API Key configured: %v", cfg.OpenAIAPIKey != "")
    log.Printf("Anthropic API Key configured: %v", cfg.AnthropicAPIKey != "")
    log.Printf("Google Project ID configured: %v", cfg.GoogleProjectID != "")
    
    // Setup routes
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.Write([]byte(`{"message":"Go Chatbot Server"}`))
    })
    
    http.HandleFunc("/openai-fetch", handlers.OpenAIFetchHandler(cfg.OpenAIAPIKey, cfg.CharacterLimit))
    http.HandleFunc("/openai-sdk", handlers.OpenAISDKHandler(cfg.OpenAIAPIKey, cfg.CharacterLimit))
    http.HandleFunc("/anthropic-sdk", handlers.AnthropicSDKHandler(cfg.AnthropicAPIKey, cfg.CharacterLimit))
    http.HandleFunc("/gemini-sdk", handlers.GeminiSDKHandler(cfg.GoogleProjectID, cfg.GoogleLocation, cfg.CharacterLimit))
    
    // Start server
    addr := fmt.Sprintf(":%s", cfg.Port)
    log.Printf("Server listening on %s", addr)
    if err := http.ListenAndServe(addr, nil); err != nil {
        log.Fatal("Server failed:", err)
    }
}
