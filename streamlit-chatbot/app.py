"""
Streamlit Chatbot Application
=============================
A local chatbot interface using Streamlit and OpenRouter API.
This application provides a simple, elegant way to chat with various LLM models
through OpenRouter's unified API with streaming support.
"""

import streamlit as st
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Page configuration - Set page title, icon, and layout
st.set_page_config(
    page_title="AI Chatbot",
    page_icon="💬",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Initialize OpenAI client configured for OpenRouter
# OpenRouter provides a unified API for accessing multiple LLM models
def initialize_client():
    """
    Initialize the OpenAI client with OpenRouter configuration.
    
    Returns:
        OpenAI: Configured client instance pointing to OpenRouter API
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        st.error("⚠️ OPENROUTER_API_KEY not found in environment variables!")
        st.info("Please create a .env file with your OpenRouter API key: OPENROUTER_API_KEY=your_key_here")
        st.stop()
    
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )

# Initialize session state
# Session state persists across reruns in Streamlit
if "messages" not in st.session_state:
    st.session_state.messages = []

if "client" not in st.session_state:
    st.session_state.client = initialize_client()

# Custom CSS for elegant styling
st.markdown("""
    <style>
    /* Main container styling */
    .main {
        padding: 2rem 1rem;
    }
    
    /* Chat message styling */
    .stChatMessage {
        padding: 1rem;
        border-radius: 10px;
        margin-bottom: 1rem;
    }
    
    /* User message styling */
    .stChatMessage[data-testid="user"] {
        background-color: #f0f2f6;
    }
    
    /* Assistant message styling */
    .stChatMessage[data-testid="assistant"] {
        background-color: #ffffff;
    }
    
    /* Input area styling */
    .stTextInput > div > div > input {
        border-radius: 20px;
    }
    
    /* Button styling */
    .stButton > button {
        border-radius: 20px;
        width: 100%;
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    </style>
""", unsafe_allow_html=True)

# Sidebar for model selection and settings
with st.sidebar:
    st.title("⚙️ Settings")
    
    # Model selection dropdown
    # OpenRouter supports multiple models - default to GPT-OSS-120B
    model_options = [
        "openai/gpt-oss-120b",
        "openai/gpt-4o",
        "openai/gpt-4-turbo",
        "openai/gpt-3.5-turbo",
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3-opus",
        "google/gemini-pro-1.5",
        "meta-llama/llama-3.1-70b-instruct",
    ]
    
    selected_model = st.selectbox(
        "🤖 Select Model",
        model_options,
        index=0,
        help="Choose which LLM model to use for conversations"
    )
    
    # Temperature slider for response creativity
    temperature = st.slider(
        "🌡️ Temperature",
        min_value=0.0,
        max_value=2.0,
        value=0.7,
        step=0.1,
        help="Controls randomness in responses. Higher = more creative, Lower = more focused"
    )
    
    # Clear chat button
    if st.button("🗑️ Clear Chat", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

# Main chat interface
st.title("💬 AI Chatbot")
st.markdown("---")

# Display chat history
# Show all previous messages in the conversation
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat input - handles user message entry
# Streamlit's chat_input provides a modern chat interface
if prompt := st.chat_input("Type your message here..."):
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # Display user message immediately
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Display assistant response with streaming
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        # Stream the response from OpenRouter
        # OpenRouter API supports streaming for real-time response display
        try:
            stream = st.session_state.client.chat.completions.create(
                model=selected_model,
                messages=[
                    {"role": m["role"], "content": m["content"]}
                    for m in st.session_state.messages
                ],
                temperature=temperature,
                stream=True,  # Enable streaming for real-time updates
                extra_headers={
                    "HTTP-Referer": "https://github.com/yourusername/chatbot",  # Optional: for OpenRouter rankings
                    "X-Title": "Local Chatbot",  # Optional: for OpenRouter rankings
                }
            )
            
            # Process streaming chunks
            # Each chunk contains partial text that we append to build the full response
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    full_response += chunk.choices[0].delta.content
                    # Update the display in real-time as chunks arrive
                    message_placeholder.markdown(full_response + "▌")
            
            # Final message without cursor
            message_placeholder.markdown(full_response)
            
        except Exception as e:
            # Error handling for API failures
            error_message = f"❌ Error: {str(e)}"
            message_placeholder.error(error_message)
            full_response = error_message
    
    # Add assistant response to chat history
    st.session_state.messages.append({"role": "assistant", "content": full_response})

# Footer information
st.markdown("---")
st.caption("Powered by OpenRouter API | Chat with multiple LLM models in one interface")
