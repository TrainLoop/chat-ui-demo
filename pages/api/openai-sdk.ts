import { Message } from "@/types";

// This endpoint uses the OpenAI SDK with GPT-4o (Server-side API route, not Edge)

import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// This handler uses the actual OpenAI SDK
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { messages, model = "gpt-4o", systemPrompt = "You are a helpful, friendly, assistant.", temperature = 0.0, maxTokens = 800 } = req.body as {
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

    // Prepare messages including system message
    const openaiMessages = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      ...messagesToSend.map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content
      }))
    ];

    // Use the OpenAI SDK directly with streaming
    const stream = await openai.chat.completions.create({
      model,
      messages: openaiMessages,
      max_tokens: maxTokens,
      temperature,
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
      if (chunk.choices[0]?.delta?.content) {
        const text = chunk.choices[0].delta.content;
        // Write data in the format expected by the client
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // End the response when the stream is complete
    res.end('data: [DONE]\n\n');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during the request' });
  }
}
