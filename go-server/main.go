package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/mlpierce22/chatbot-ui-go-server/handlers"

	"github.com/TrainLoop/evals/sdk/go/trainloop-llm-logging"
)

type Config struct {
	Port            string
	OpenAIAPIKey    string
	AnthropicAPIKey string
	GoogleProjectID string
	GoogleLocation  string
	CharacterLimit  int
}

func loadConfig() *Config {
	// Load from multiple .env paths
	envPaths := []string{
		"../.env.local",
		"../.env",
	}

	for _, path := range envPaths {
		if _, err := os.Stat(path); err == nil {
			godotenv.Load(path)
			break
		}
	}

	// Get Google location, but override 'global' since Vertex AI needs specific regions
	googleLocation := getEnvOrDefault("GOOGLE_LOCATION", "us-central1")
	if googleLocation == "global" {
		log.Printf("Warning: 'global' is not a valid Vertex AI location, using 'us-central1' instead")
		googleLocation = "us-central1"
	}

	return &Config{
		Port:            getEnvOrDefault("GO_PORT", "8001"), // Different from FastAPI
		OpenAIAPIKey:    os.Getenv("OPENAI_API_KEY"),
		AnthropicAPIKey: os.Getenv("ANTHROPIC_API_KEY"),
		GoogleProjectID: os.Getenv("GOOGLE_PROJECT_ID"),
		GoogleLocation:  googleLocation,
		CharacterLimit:  12000,
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// CORS middleware to handle cross-origin requests
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("CORS: %s %s from %s", r.Method, r.URL.Path, r.Header.Get("Origin"))

		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			log.Printf("CORS: Handling OPTIONS preflight request for %s", r.URL.Path)
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next.ServeHTTP(w, r)
	})
}

// Helper function to wrap handler functions with CORS middleware
func corsHandler(handler http.HandlerFunc) http.Handler {
	return corsMiddleware(http.HandlerFunc(handler))
}

func main() {
	trainloop.Collect("../trainloop/trainloop.config.yaml")
	cfg := loadConfig()

	// Log configuration status
	log.Printf("Starting Go server on port %s", cfg.Port)
	log.Printf("OpenAI API Key configured: %v", cfg.OpenAIAPIKey != "")
	log.Printf("Anthropic API Key configured: %v", cfg.AnthropicAPIKey != "")
	log.Printf("Google Project ID configured: %v", cfg.GoogleProjectID != "")

	// Setup routes with CORS middleware
	http.Handle("/", corsHandler(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message":"Go Chatbot Server"}`))
	}))

	http.Handle("/openai-fetch", corsHandler(handlers.OpenAIFetchHandler(cfg.OpenAIAPIKey, cfg.CharacterLimit)))
	http.Handle("/openai-sdk", corsHandler(handlers.OpenAISDKHandler(cfg.OpenAIAPIKey, cfg.CharacterLimit)))
	http.Handle("/anthropic-sdk", corsHandler(handlers.AnthropicSDKHandler(cfg.AnthropicAPIKey, cfg.CharacterLimit)))
	http.Handle("/gemini-sdk", corsHandler(handlers.GeminiSDKHandler(cfg.GoogleProjectID, cfg.GoogleLocation, cfg.CharacterLimit)))

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server listening on %s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal("Server failed:", err)
	}
}
