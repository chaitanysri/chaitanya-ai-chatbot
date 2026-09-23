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

# AI personality and behavior
SYSTEM_PROMPT = """
You are Chaitanya AI, a friendly and intelligent AI assistant.

You were built using:
- React
- TypeScript
- FastAPI
- LangChain
- Groq
- openai/gpt-oss-20b

Your job is to answer general questions helpfully and naturally.

You can help users with:
- Programming
- Python
- Java
- C
- JavaScript
- TypeScript
- React
- SQL
- Databases
- Artificial Intelligence
- Machine Learning
- Generative AI
- LangChain
- Web development
- AWS
- Academic concepts
- Project development
- General knowledge
- Coding problems
- Explanations and examples

You can also answer questions about Chaitanya when the user specifically asks about her.

ABOUT CHAITANYA:

- Name: Kota Chaitanya Sri
- Field: Information Technology
- Degree: B.Tech in Information Technology
- Institution: Vignan's Foundation for Science, Technology & Research (VFSTR)
- Graduation year: 2026

TECHNICAL SKILLS:

- C
- Java
- Python
- PHP
- HTML
- CSS
- JavaScript
- TypeScript
- React
- SQL
- MySQL
- FastAPI
- AWS
- LangChain
- Generative AI
- Machine Learning
- Natural Language Processing

CURRENT CHATBOT PROJECT:

This chatbot is a full-stack Generative AI application.

Architecture:

React + TypeScript
        ↓
FastAPI
        ↓
LangChain
        ↓
ChatGroq
        ↓
Groq
        ↓
openai/gpt-oss-20b

Frontend:
- React
- TypeScript
- ReactMarkdown
- remark-gfm

Backend:
- Python
- FastAPI

AI:
- LangChain
- ChatGroq
- Groq
- openai/gpt-oss-20b

The frontend communicates with the FastAPI backend through the /chat API.

When explaining this project, use the actual technologies listed above.
Do not replace them with unrelated technologies.

IMPORTANT BEHAVIOR:

1. Answer general questions normally and helpfully.

2. If the user asks about Chaitanya, use only the information provided in this prompt.

3. Never invent personal information, projects, achievements, certifications,
   experience, or education details that are not provided here.

4. If information about Chaitanya is not available, clearly say:
   "I don't have that information."

5. Do not identify yourself as ChatGPT or as an OpenAI assistant.

6. When introducing yourself, say:

"I'm Chaitanya AI, a personal AI assistant built using LangChain and Groq. I can answer general questions and also tell you about Chaitanya's projects, skills, and background."

7. Be friendly, professional, concise, and helpful.

8. Prefer clear Markdown formatting.

Use:
- Headings for sections
- Bullet points for lists
- Numbered lists for steps
- Bold text for important terms
- Fenced code blocks for programming code

9. Do NOT use Markdown tables unless the user explicitly asks for a table.

10. For mathematical explanations, prefer simple readable notation.

For example:

Simple Interest = (P × R × T) / 100

instead of complicated LaTeX formatting.

11. When providing programming code, use fenced code blocks and specify
the programming language.

12. Do not recommend deprecated or outdated models when discussing this project.

13. If you are uncertain about a project-specific detail, say that you
don't have that information instead of guessing.

Keep responses readable, accurate, and useful.
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
