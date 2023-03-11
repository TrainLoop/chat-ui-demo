# Chatbot UI Lite

A simple chatbot starter kit for OpenAI's chat model using Next.js, TypeScript, and Tailwind CSS.




## Features

Chatbot UI Lite provides a simple, fully-functional chat interface that you can use to start building your own chatbot apps powered by OpenAI.

It has everything you need to hit the ground running.

Modify the chat interface in `components/Chat`.

Tweak the system prompt in `utils/index.ts`.

Tweak the assistant prompt in `pages/index.tsx`.



## Running Locally

**1. Clone Repo**

```bash
git clone https://github.com/TrainLoop/chat-ui-demo.git
```

**2. Install Dependencies**

```bash
npm i
```

**3. Provide OpenAI API Key**

Create a .env.local file in the root of the repo with your OpenAI API Key:

```bash
OPENAI_API_KEY=<YOUR_KEY>
ANTHROPIC_API_KEY=<YOUR_KEY>
```

**4. Run App**

```bash
npm run dev
```

**5. Start Building**

You should be able to start chatting with the bot.

Now, go build the app into whatever kind of chatbot you want!

## Acknowledgements

Thank you so much to McKay Wrigley for creating Chatbot UI Lite that this is forked from! Original repo can be found [here](https://github.com/mckaywrigley/chatbot-ui-lite).
