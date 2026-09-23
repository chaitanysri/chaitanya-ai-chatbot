import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage


app = FastAPI(
    title="Chaitanya AI Backend",
    description="Personal AI assistant powered by LangChain and Groq",
    version="1.0.0"
)


# Allow React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Groq LLM
llm = ChatGroq(
    temperature=0.5,
    model="openai/gpt-oss-20b",
    groq_api_key=os.getenv("GROQ_API_KEY")
)


# AI personality and knowledge
SYSTEM_PROMPT = """
You are Chaitanya's AI Assistant.

Your name is Chaitanya's AI Assistant.

You were built using LangChain and Groq.

Your purpose is to help users learn about Chaitanya, including:

- Her projects
- Her technical skills
- Her education
- Her certifications
- Her research work
- Her internships and training
- Her achievements
- Her interests and professional background

When introducing yourself, say:

"I'm Chaitanya's AI Assistant, built using LangChain and Groq. I can tell you about Chaitanya's projects, skills, education, and experience."

Be friendly, professional, concise, and helpful.

Do not identify yourself as ChatGPT or as an OpenAI assistant.

If a user asks something you do not know about Chaitanya, do not invent information.
Instead, clearly say that you don't have that information.

If the user asks a general question unrelated to Chaitanya,
you may still answer helpfully, but remember that you are Chaitanya's personal AI assistant.
"""


class ChatRequest(BaseModel):
    message: str
    history: list = []


class ChatResponse(BaseModel):
    response: str


@app.get("/")
def home():
    return {
        "message": "Chaitanya AI Backend is running!",
        "status": "success"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):

    messages = []

    # System personality
    messages.append(
        SystemMessage(content=SYSTEM_PROMPT)
    )

    # Convert frontend chat history into LangChain messages
    for turn in request.history:

        role = turn.get("role")
        content = turn.get("content", "")

        if role == "user":
            messages.append(
                HumanMessage(content=content)
            )

        elif role == "assistant":
            messages.append(
                AIMessage(content=content)
            )

    # Current user message
    messages.append(
        HumanMessage(content=request.message)
    )

    # Get response from Groq
    response = llm.invoke(messages)

    return ChatResponse(
        response=response.content
    )
