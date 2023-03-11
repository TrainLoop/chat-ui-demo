import { Message } from "@/types";
import type { NextApiRequest, NextApiResponse } from 'next';
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

// This endpoint uses direct fetch to OpenAI (no SDK) with server-side API route

// This handler uses direct fetch API to OpenAI
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { messages } = req.body as {
      messages: Message[];
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

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      method: "POST",
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a helpful, friendly, assistant.`
          },
          ...messagesToSend
        ],
        max_tokens: 800,
        temperature: 0.0,
        stream: true
      })
    });

    if (response.status !== 200) {
      throw new Error("OpenAI API returned an error");
    }

    // Set appropriate headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    // Process the streaming response with the parser
    const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
      if (event.type === "event") {
        const data = event.data;

        if (data === "[DONE]") {
          res.write(`data: [DONE]\n\n`);
          res.end();
          return;
        }

        try {
          const json = JSON.parse(data);
          const text = json.choices[0].delta.content;
          if (text) {
            // Format the response as expected by the client
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch (e) {
          console.error("Error parsing OpenAI response:", e);
        }
      }
    });

    // Process the response body
    for await (const chunk of response.body as any) {
      parser.feed(decoder.decode(chunk));
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during the request' });
  }
}
