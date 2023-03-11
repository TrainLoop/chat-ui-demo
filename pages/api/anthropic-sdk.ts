import { Message } from "@/types";
import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from "@anthropic-ai/sdk";

// This endpoint uses the Anthropic SDK with Claude Sonnet (Server-side API route, not Edge)

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// This handler uses the actual Anthropic SDK
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { messages, model = "claude-3-5-sonnet-20241022", systemPrompt = "You are a helpful, friendly, assistant.", temperature = 0.0, maxTokens = 800 } = req.body as {
      messages: Message[];
      model?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    };

    const charLimit = 12000;
    let charCount = 0;
    let messagesToSend = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (charCount + message.content.length > charLimit) {
        break;
      }
      charCount += message.content.length;
      messagesToSend.push(message);
    }

    // Convert messages to Anthropic format
    const anthropicMessages = messagesToSend.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content
    }));

    // Use the Anthropic SDK directly with streaming
    const stream = await anthropic.messages.create({
      model: model,
      messages: anthropicMessages,
      system: systemPrompt,
      max_tokens: maxTokens,
      temperature: temperature,
      stream: true,
    });

    // Set appropriate headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    // Process the stream events
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        // Safely access delta content
        const deltaContent = chunk.delta as any;
        if (deltaContent && deltaContent.text) {
          const text = deltaContent.text;
          // Write data in the format expected by the client
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
    }

    // End the response when the stream is complete
    res.end('data: [DONE]\n\n');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during the request' });
  }
}
