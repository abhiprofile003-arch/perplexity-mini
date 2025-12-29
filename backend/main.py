import os
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# LangChain & Groq Imports
from langchain_groq import ChatGroq
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

# --- 1. CONFIGURATION ---
load_dotenv() # Load keys from .env file

# Fallback: If .env fails, you can hardcode keys here (Not recommended for production)
# os.environ["TAVILY_API_KEY"] = "tvly-..."
# os.environ["GROQ_API_KEY"] = "gsk-..."

# Verify keys exist
if not os.getenv("TAVILY_API_KEY") or not os.getenv("GROQ_API_KEY"):
    print("⚠️ WARNING: API Keys are missing. Check your .env file.")

app = FastAPI()

# Enable CORS (Allows frontend to talk to backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. AI AGENT SETUP ---
# Search Tool
search_tool = TavilySearchResults(max_results=3)

# LLM (Groq - Llama 3)
llm = ChatGroq(
    model="llama-3.3-70b-versatile", 
    temperature=0
)

# Prompt Template (Includes History)
template = """
You are a helpful research assistant. 
Answer the user's question based on the following context. 
If the context doesn't contain the answer, say "I couldn't find that information."

Context:
{context}
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", template),
    MessagesPlaceholder(variable_name="chat_history"), # Memory slot
    ("human", "{question}"),
])

# Create the Chain
chain = prompt | llm | StrOutputParser()

# --- 3. DATA MODELS ---
class Message(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    history: List[Message] = []

# --- 4. HELPER FUNCTIONS ---
def format_history(messages: List[Message]):
    """Converts frontend chat history to LangChain format"""
    formatted_history = []
    for msg in messages:
        if msg.role == "user":
            formatted_history.append(HumanMessage(content=msg.content))
        else:
            formatted_history.append(AIMessage(content=msg.content))
    return formatted_history

# --- 5. API ENDPOINTS ---
@app.post("/chat")
async def chat_endpoint(request: QueryRequest):
    try:
        # A. Search the web
        raw_results = search_tool.invoke(request.query)
        context_text = "\n\n".join([r["content"] for r in raw_results])
        
        # B. Format history
        chat_history = format_history(request.history)

        # C. Generate Answer
        response = chain.invoke({
            "context": context_text,
            "question": request.query,
            "chat_history": chat_history
        })
        
        # D. Format sources for UI
        sources = [{"title": res["content"][:40] + "...", "url": res["url"]} for res in raw_results]

        return {"answer": response, "sources": sources}
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    return {"message": "Perplex-Mini Backend is Running!"}

# Run command: uvicorn main:app --reload