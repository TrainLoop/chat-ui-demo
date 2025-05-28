package models

type StreamChunk struct {
    Text  string `json:"text,omitempty"`
    Error string `json:"error,omitempty"`
}
