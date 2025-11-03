# Chatbot Project

A collection of chatbot implementations using different frameworks. Both chatbots provide a local way to chat with LLM models through OpenRouter API with real-time streaming support.

## Projects

### 1. Streamlit Chatbot (`streamlit-chatbot/`)
A Python-based chatbot built with Streamlit. Simple, elegant, and easy to set up.

**Features:**
- Real-time streaming responses
- Model selection from sidebar
- Temperature control
- Clean, modern UI

**Quick Start:**
```bash
cd streamlit-chatbot
pip install -r requirements.txt
# Create .env file with OPENROUTER_API_KEY
streamlit run app.py
```

### 2. Next.js Chatbot (`nextjs-chatbot/`)
A modern web application built with Next.js 14, TypeScript, and shadcn/ui.

**Features:**
- Real-time streaming via Server-Sent Events
- Elegant UI with shadcn/ui components
- Responsive design
- Model selection and temperature control
- Sidebar settings panel

**Quick Start:**
```bash
cd nextjs-chatbot
npm install
# Create .env.local file with OPENROUTER_API_KEY
npm run dev
```

## Getting Your OpenRouter API Key

1. Visit [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up or log in
3. Create a new API key
4. Add it to your `.env` (Streamlit) or `.env.local` (Next.js) file

## Features Comparison

| Feature | Streamlit | Next.js |
|---------|-----------|---------|
| Framework | Python/Streamlit | Next.js/React |
| Language | Python | TypeScript |
| UI Library | Streamlit Components | shadcn/ui |
| Streaming | ✅ | ✅ |
| Model Selection | ✅ | ✅ |
| Temperature Control | ✅ | ✅ |
| Responsive Design | ✅ | ✅ |
| Type Safety | ❌ | ✅ (TypeScript) |

## Requirements

### Streamlit Chatbot
- Python 3.8+
- pip

### Next.js Chatbot
- Node.js 18+
- npm or yarn

## License

MIT
