"""
Streamlit Chatbot Application
=============================
A local chatbot interface using Streamlit and OpenRouter API.
This application provides a simple, elegant way to chat with various LLM models
through OpenRouter's unified API with streaming support.
"""

import streamlit as st
import os
import requests
import re
from openai import OpenAI
from dotenv import load_dotenv
from typing import List, Dict, Optional

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

def perform_search(query: str) -> List[Dict[str, str]]:
    """
    Perform web search using Exa AI API.
    
    Args:
        query: Search query string
        
    Returns:
        List of search results with title, url, and summary
    """
    api_key = os.getenv("EXA_API_KEY")
    if not api_key:
        st.warning("⚠️ EXA_API_KEY not found. Search functionality disabled.")
        return []
    
    try:
        response = requests.post(
            "https://api.exa.ai/search",
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
            },
            json={
                "query": query,
                "num_results": 5,
                "contents": {
                    "text": True,
                    "summary": True,
                },
            },
            timeout=10,
        )
        
        if response.status_code == 200:
            data = response.json()
            results = []
            for result in data.get("results", []):
                results.append({
                    "title": result.get("title", "Untitled"),
                    "url": result.get("url", ""),
                    "summary": result.get("text", result.get("summary", ""))[:300] if result.get("text") or result.get("summary") else "",
                    "published_date": result.get("published_date", ""),
                })
            return results
        else:
            st.warning(f"Search API returned status {response.status_code}")
            return []
    except Exception as e:
        st.warning(f"Search error: {str(e)}")
        return []

def render_markdown_with_latex(content: str):
    """
    Render markdown content with LaTeX support.
    Handles both inline math ($...$) and block math ($$...$$), as well as square bracket notation [...].
    """
    # Convert TeX delimiters to standard forms
    content = re.sub(r"\\\[([\s\S]*?)\\\]", lambda m: f"$${m.group(1).strip()}$$", content)
    content = re.sub(r"\\\(([\s\S]*?)\\\)", lambda m: f"${m.group(1).strip()}$", content)

    # Safely convert only outside existing $$...$$ or $...$ blocks
    def transform_outside_math(text: str) -> str:
        # [ ... ] not a markdown link and looks like LaTeX
        def replace_square(match):
            inner = match.group(1).strip()
            indicators = [
                '\\', 'frac', 'cdot', 'text', 'sqrt', 'sum', 'int', 'alpha', 'beta', 'gamma', 'delta',
                'theta', 'pi', 'sigma', 'mu', 'lambda', 'omega', 'sin', 'cos', 'tan', 'log', 'exp',
                'partial', 'nabla', 'leq', 'geq', 'neq', 'approx', 'equiv', 'rightarrow', 'leftarrow',
                'infty', 'forall', 'exists', 'cup', 'cap', 'setminus', 'subset', 'subseteq', 'superset',
                'wedge', 'vee', 'oplus', 'otimes', 'pm', 'cdot', 'times', 'div', 'prod', 'lim', 'det', 'ker', 'dim', 'Re', 'Im'
            ]
            return f"$${inner}$$" if any(cmd in inner for cmd in indicators) else match.group(0)

        out = re.sub(r"\[([\s\S]+?)\](?!\()", replace_square, text, flags=re.DOTALL)
        # Bare LaTeX commands like \tan x → inline $...$
        out = re.sub(r"\\[A-Za-z]+[A-Za-z0-9^_{}\\\s]*?(?=(?:[.,;:!?)]|\s{2,}|$))", lambda m: f"${m.group(0).strip()}$", out)
        return out

    segments = re.split(r"(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)", content)
    content = "".join([seg if (seg.startswith("$$") and seg.endswith("$$")) or (seg.startswith("$") and seg.endswith("$")) else transform_outside_math(seg) for seg in segments])

    # Split content by block math ($$...$$)
    block_math_pattern = r'\$\$(.*?)\$\$'
    parts = re.split(block_math_pattern, content, flags=re.DOTALL)
    
    for i, part in enumerate(parts):
        if i % 2 == 0:
            # Regular markdown content - process inline math
            inline_math_pattern = r'(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)'
            inline_parts = re.split(inline_math_pattern, part)
            
            for j, inline_part in enumerate(inline_parts):
                if j % 2 == 0:
                    # Regular text - render as markdown
                    if inline_part.strip():
                        st.markdown(inline_part, unsafe_allow_html=True)
                else:
                    # Inline math - render with LaTeX
                    try:
                        st.latex(inline_part)
                    except:
                        # Fallback if LaTeX fails
                        st.markdown(f"${inline_part}$", unsafe_allow_html=True)
        else:
            # Block math - render with LaTeX
            try:
                st.latex(part)
            except:
                # Fallback if LaTeX fails
                st.markdown(f"$${part}$$", unsafe_allow_html=True)

# Initialize session state
# Session state persists across reruns in Streamlit
if "messages" not in st.session_state:
    st.session_state.messages = []

if "client" not in st.session_state:
    st.session_state.client = initialize_client()

if "search_enabled" not in st.session_state:
    st.session_state.search_enabled = False

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
    st.markdown("---")
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
        render_markdown_with_latex(message["content"])
        
        # Display sources if available (collapsed by default)
        if message.get("sources") and len(message["sources"]) > 0:
            with st.expander(f"📚 Sources ({len(message['sources'])})", expanded=False):
                for idx, source in enumerate(message["sources"], 1):
                    st.markdown(f"**{idx}. [{source['title']}]({source['url']})**")
                    if source.get("summary"):
                        st.caption(source["summary"])
                    st.markdown("---")

# Chat input - handles user message entry
# Streamlit's chat_input provides a modern chat interface
if prompt := st.chat_input("Type your message here..."):
    # Perform search if enabled
    search_sources = []
    if st.session_state.search_enabled:
        with st.spinner("🔍 Searching the web..."):
            search_sources = perform_search(prompt)
    
    # Prepare messages with search context if available
    messages_for_api = [
        {"role": m["role"], "content": m["content"]}
        for m in st.session_state.messages
    ]
    
    # Add user message to chat history (clean, without search context in display)
    user_message = {"role": "user", "content": prompt}
    st.session_state.messages.append(user_message)
    
    # If search is enabled and we have sources, add them to the context for API only
    api_user_content = prompt
    if st.session_state.search_enabled and search_sources:
        search_context = "\n\nSearch Results:\n" + "\n\n".join([
            f"{idx + 1}. {source['title']} ({source['url']})\n   {source['summary']}"
            for idx, source in enumerate(search_sources)
        ])
        api_user_content = prompt + search_context
    
    # Add search context to API messages (but don't display it)
    messages_for_api.append({
        "role": "user",
        "content": api_user_content
    })
    
    # Display user message immediately (clean, without search context)
    with st.chat_message("user"):
        render_markdown_with_latex(prompt)
    
    # Display assistant response with streaming
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        # Stream the response from OpenRouter
        # OpenRouter API supports streaming for real-time response display
        try:
            stream = st.session_state.client.chat.completions.create(
                model=selected_model,
                messages=messages_for_api,
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
                    # For streaming, we'll use markdown but final render will use LaTeX
                    message_placeholder.markdown(full_response + "▌")
            
            # Final message without cursor - render with LaTeX support
            message_placeholder.empty()
            with message_placeholder.container():
                render_markdown_with_latex(full_response)
            
        except Exception as e:
            # Error handling for API failures
            error_message = f"❌ Error: {str(e)}"
            message_placeholder.error(error_message)
            full_response = error_message
    
    # Add assistant response to chat history with sources
    assistant_message = {"role": "assistant", "content": full_response}
    if search_sources:
        assistant_message["sources"] = search_sources
    st.session_state.messages.append(assistant_message)

# Search toggle near input (below messages, above input)
st.markdown("---")
col1, col2 = st.columns([1, 4])
with col1:
    st.session_state.search_enabled = st.toggle(
        "🔍 Web Search",
        value=st.session_state.search_enabled,
        help="Enable web search to enhance responses with up-to-date information from the web",
        label_visibility="visible"
    )

# Footer information
st.markdown("---")
st.caption("Powered by OpenRouter API | Chat with multiple LLM models in one interface")
