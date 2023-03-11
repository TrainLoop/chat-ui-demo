import React, { useState, useRef, useEffect } from 'react';
import { Message } from "@/types";
import { Chat } from "./Chat";
import { IconArrowUp } from "@tabler/icons-react";

interface TripleChatProps {
  onReset: () => void;
}

// Shared Chat Input Component
interface SharedChatInputProps {
  onSend: (message: Message) => void;
  loading: boolean;
}

const SharedChatInput: React.FC<SharedChatInputProps> = ({ onSend, loading }) => {
  const [content, setContent] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > 4000) {
      alert("Message limit is 4000 characters");
      return;
    }
    setContent(value);
  };

  const handleSend = () => {
    if (!content || loading) return;
    onSend({ role: "user", content });
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        className="min-h-[60px] rounded-lg pl-4 pr-12 py-3 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 border-2 border-blue-200 text-lg"
        placeholder="Type a message to send to all models..."
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <button
        className={`absolute right-2 bottom-3 rounded-md p-1 ${content ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'} ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
        onClick={handleSend}
        disabled={!content || loading}
      >
        {loading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-t-2 border-white" />
        ) : (
          <IconArrowUp size={20} />
        )}
      </button>
    </div>
  );
};

export const TripleChat: React.FC<TripleChatProps> = ({ onReset }) => {
  // State for API source selection
  const [apiSource, setApiSource] = useState<'nextjs' | 'fastapi'>('fastapi');

  // State for each chat
  const [messages1, setMessages1] = useState<Message[]>([]);
  const [messages2, setMessages2] = useState<Message[]>([]);
  const [messages3, setMessages3] = useState<Message[]>([]);

  const [loading1, setLoading1] = useState<boolean>(false);
  const [loading2, setLoading2] = useState<boolean>(false);
  const [loading3, setLoading3] = useState<boolean>(false);

  // Refs for scrolling to bottom
  const chat1EndRef = useRef<HTMLDivElement>(null);
  const chat2EndRef = useRef<HTMLDivElement>(null);
  const chat3EndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom functions
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Get the appropriate endpoint based on API source
  const getEndpoint = (baseEndpoint: string) => {
    // Extract the endpoint name without the '/api/' prefix
    const endpointName = baseEndpoint.replace('/api/', '');

    // Build the complete URL based on API source
    const endpoint = apiSource === 'nextjs'
      ? baseEndpoint  // Use Next.js API routes
      : `http://localhost:8000/${endpointName}`; // Direct to FastAPI server

    console.log(`Using endpoint: ${endpoint} (API source: ${apiSource})`);
    return endpoint;
  };

  // Handle send for each chat
  const handleSend1 = async (message: Message) => {
    await processMessage(message, setMessages1, setLoading1, getEndpoint("/api/openai-fetch"), chat1EndRef);
  };

  const handleSend2 = async (message: Message) => {
    await processMessage(message, setMessages2, setLoading2, getEndpoint("/api/openai-sdk"), chat2EndRef);
  };

  const handleSend3 = async (message: Message) => {
    await processMessage(message, setMessages3, setLoading3, getEndpoint("/api/anthropic-sdk"), chat3EndRef);
  };

  // Combined message processing logic
  const processMessage = async (
    message: Message,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    endpoint: string,
    endRef: React.RefObject<HTMLDivElement>,
    addUserMessage: boolean = true
  ) => {
    if (addUserMessage) {
      setMessages(prevMessages => [...prevMessages, message]);
    }
    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [...(endpoint.includes("/openai-fetch") ? messages1 : endpoint.includes("/openai-sdk") ? messages2 : messages3), message]
        })
      });

      if (!response.ok) {
        setLoading(false);
        throw new Error(response.statusText);
      }

      // Setup for SSE (Server-Sent Events)
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Create the initial assistant message when we get the first response chunk
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: ""
        }
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Add new chunks to buffer and process any complete messages
        buffer += decoder.decode(value, { stream: true });

        // Process any complete events in the buffer
        const lines = buffer.split(/\r?\n\r?\n/);
        buffer = lines.pop() || ''; // Keep the last incomplete chunk in the buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const data = line.substring(6); // Remove 'data: ' prefix

          if (data === '[DONE]') {
            // Stream is done
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const text = parsed.text || '';

            // Update message content
            setMessages((prevMessages) => {
              const lastMessage = prevMessages[prevMessages.length - 1];
              const updatedMessage = {
                ...lastMessage,
                content: lastMessage.content + text
              };
              return [...prevMessages.slice(0, -1), updatedMessage];
            });
          } catch (e) {
            console.error('Error parsing SSE message', e);
          }
        }
      }
    } catch (error) {
      console.error('Error in API request:', error);
    } finally {
      setLoading(false);
      scrollToBottom(endRef);
    }
  };


  // Function to handle sending to all chats simultaneously
  const handleSendToAll = async (message: Message) => {
    // Add the message to all three chat windows - but only once
    setMessages1(prev => [...prev, message]);
    setMessages2(prev => [...prev, message]);
    setMessages3(prev => [...prev, message]);

    // Set loading states
    setLoading1(true);
    setLoading2(true);
    setLoading3(true);

    // Send the messages in parallel using the version that doesn't add the user message again
    await Promise.all([
      processMessage(message, setMessages1, setLoading1, getEndpoint("/api/openai-fetch"), chat1EndRef, false),
      processMessage(message, setMessages2, setLoading2, getEndpoint("/api/openai-sdk"), chat2EndRef, false),
      processMessage(message, setMessages3, setLoading3, getEndpoint("/api/anthropic-sdk"), chat3EndRef, false)
    ]);
  };

  // Reset functions for each chat
  const handleReset1 = () => {
    setMessages1([{
      role: "assistant",
      content: `Hi there! I'm the OpenAI Fetch bot (GPT-3.5 Turbo). I use direct fetch API calls without the SDK.`
    }]);
  };

  const handleReset2 = () => {
    setMessages2([{
      role: "assistant",
      content: `Hello! I'm the OpenAI GPT-4o bot. I use the OpenAI v4 SDK through a server-side API route.`
    }]);
  };

  const handleReset3 = () => {
    setMessages3([{
      role: "assistant",
      content: `Greetings! I'm the Anthropic Claude Sonnet bot. I use the Anthropic SDK through a server-side API route.`
    }]);
  };

  // Handle global reset
  const handleGlobalReset = () => {
    handleReset1();
    handleReset2();
    handleReset3();
    onReset();
  };

  // Initial messages
  useEffect(() => {
    handleReset1();
    handleReset2();
    handleReset3();
  }, []);

  // Scroll effects
  useEffect(() => {
    scrollToBottom(chat1EndRef);
  }, [messages1]);

  useEffect(() => {
    scrollToBottom(chat2EndRef);
  }, [messages2]);

  useEffect(() => {
    scrollToBottom(chat3EndRef);
  }, [messages3]);

  return (
    <div className="w-full">
      <div className="flex justify-center space-x-4 mb-4">
        <button
          className="flex items-center justify-center rounded-md p-2 text-sm font-medium bg-gray-200 hover:bg-gray-300 focus:outline-none"
          onClick={handleGlobalReset}
        >
          Reset All
        </button>

        {/* API Source Toggle */}
        <div className="flex items-center space-x-2">
          <span className={apiSource === 'nextjs' ? 'font-bold' : ''}>Next.js API</span>
          <button
            className="relative inline-flex items-center h-6 rounded-full w-11 bg-gray-300"
            onClick={() => setApiSource(apiSource === 'nextjs' ? 'fastapi' : 'nextjs')}
          >
            <span
              className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${apiSource === 'fastapi' ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
          <span className={apiSource === 'fastapi' ? 'font-bold' : ''}>FastAPI</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg shadow-sm p-2 max-h-[600px] flex flex-col">
          <h2 className="text-center font-bold mb-2 text-lg">OpenAI Fetch</h2>
          <div className="text-center text-xs text-gray-500 mb-2">GPT-3.5 Turbo via Direct API</div>
          <div className="flex-1 overflow-auto">
            <Chat
              messages={messages1}
              loading={loading1}
              onSend={handleSend1}
              onReset={handleReset1}
            />
            <div ref={chat1EndRef} />
          </div>
        </div>

        <div className="border rounded-lg shadow-sm p-2 max-h-[600px] flex flex-col">
          <h2 className="text-center font-bold mb-2 text-lg">OpenAI GPT-4o</h2>
          <div className="text-center text-xs text-gray-500 mb-2">GPT-4o via OpenAI SDK</div>
          <div className="flex-1 overflow-auto">
            <Chat
              messages={messages2}
              loading={loading2}
              onSend={handleSend2}
              onReset={handleReset2}
            />
            <div ref={chat2EndRef} />
          </div>
        </div>

        <div className="border rounded-lg shadow-sm p-2 max-h-[600px] flex flex-col">
          <h2 className="text-center font-bold mb-2 text-lg">Anthropic Claude</h2>
          <div className="text-center text-xs text-gray-500 mb-2">Claude Sonnet via Anthropic SDK</div>
          <div className="flex-1 overflow-auto">
            <Chat
              messages={messages3}
              loading={loading3}
              onSend={handleSend3}
              onReset={handleReset3}
            />
            <div ref={chat3EndRef} />
          </div>
        </div>
      </div>

      {/* Shared input section */}
      <div className="border-t-2 pt-4 mt-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center font-bold mb-3 text-xl">Send to All Models</h2>
          <div className="text-center text-sm text-gray-500 mb-4">
            Compare responses by sending the same message to all models simultaneously
          </div>

          <SharedChatInput onSend={handleSendToAll} loading={loading1 || loading2 || loading3} />
        </div>
      </div>
    </div>
  );
};
