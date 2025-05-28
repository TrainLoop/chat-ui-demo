package services

import (
    "encoding/json"
    "fmt"
    "net/http"
)

type SSEWriter struct {
    w http.ResponseWriter
    f http.Flusher
}

func NewSSEWriter(w http.ResponseWriter) *SSEWriter {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    
    flusher, _ := w.(http.Flusher)
    return &SSEWriter{w: w, f: flusher}
}

func (s *SSEWriter) WriteChunk(chunk interface{}) error {
    data, err := json.Marshal(chunk)
    if err != nil {
        return err
    }
    
    fmt.Fprintf(s.w, "data: %s\n\n", data)
    s.f.Flush()
    return nil
}

func (s *SSEWriter) WriteDone() {
    fmt.Fprintf(s.w, "data: [DONE]\n\n")
    s.f.Flush()
}
