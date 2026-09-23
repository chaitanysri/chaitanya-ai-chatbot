import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Paperclip,
  Send,
  Sparkles,
  Bot,
  User,
  Circle,
} from "lucide-react";

import "./App.css";


/* =========================
   AUTOMATIC AGE CALCULATOR
========================= */

const calculateAge = (
  birthYear: number,
  birthMonth: number,
  birthDay: number
) => {
  const today = new Date();

  let age = today.getFullYear() - birthYear;

  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth &&
      currentDay < birthDay)
  ) {
    age--;
  }

  return age;
};


type Message = {
  sender: "user" | "assistant";
  text: string;
};


export default function App() {

  const [input, setInput] = useState("");

  /* Your birthday: August 23, 2005 */
  const age = calculateAge(2005, 8, 23);


  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "assistant",
      text:
        "I'm Chaitanya, a personal AI assistant built using LangChain and Groq. I can tell you about Chaitanya's projects, skills, education, and experience. How can I help you today?",
    },
  ]);


  const [loading, setLoading] = useState(false);

  const chatBodyRef =
    useRef<HTMLDivElement>(null);


  /* =========================
     AUTOMATIC SCROLL
  ========================= */

  useEffect(() => {

    if (chatBodyRef.current) {

      chatBodyRef.current.scrollTop =
        chatBodyRef.current.scrollHeight;

    }

  }, [messages, loading]);


  /* =========================
     SEND MESSAGE
  ========================= */

  const sendMessage = async () => {

    const message = input.trim();

    if (!message || loading) return;


    /* Add user's message immediately */

    setMessages((prev) => [

      ...prev,

      {
        sender: "user",
        text: message,
      },

    ]);


    setInput("");
    setLoading(true);


    try {

      /* Previous conversation */

      const history = messages.map((msg) => ({

        role: msg.sender,
        content: msg.text,

      }));


      /* Send request to FastAPI */

      const response = await fetch(
  `${import.meta.env.VITE_API_URL}/chat`,

        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({

            message,
            history,

          }),

        }

      );


      if (!response.ok) {

        throw new Error(
          "Backend request failed"
        );

      }


      const data = await response.json();


      /* Add AI response */

      setMessages((prev) => [

        ...prev,

        {
          sender: "assistant",
          text: data.response,
        },

      ]);

    }


    catch (error) {

      console.error(error);


      setMessages((prev) => [

        ...prev,

        {
          sender: "assistant",
          text:
            "I couldn't connect to the backend. Please make sure the FastAPI server is running.",
        },

      ]);

    }


    finally {

      setLoading(false);

    }

  };


  return (

    <main className="app">


      {/* =========================
          LEFT PORTFOLIO
      ========================= */}

      <section className="portfolio">


        <div className="profileInfo">


          <div className="name">
            Kota.Chaitanya Sri
          </div>


          {/* AUTOMATIC AGE */}

          <div className="age">
            {age} Years Old
          </div>


          <div className="tagline">
            Youthful | Intelligent & Dynamic AI
          </div>


        </div>


        {/* =========================
            HERO
        ========================= */}

        <div className="hero">


          <h1>

            Generative AI

            <br />

            <span>
              Project
            </span>

          </h1>


          <p className="description">

            Hi, I'm Chaitanya Sri — an Information
            Technology student passionate about
            Artificial Intelligence, Generative AI,
            web development, and intelligent
            applications.

          </p>


        </div>


        {/* =========================
            SKILLS
        ========================= */}

        <section className="skillsSection">


          <h2>
            I've learnt:
          </h2>


          <div className="skills">


            <div className="skill">

              <span className="skillIcon python">
                🐍
              </span>

              Python

            </div>


            <div className="skill">

              <span className="skillIcon java">
                ☕
              </span>

              Java

            </div>


            <div className="skill">

              <span className="skillIcon react">
                ⚛
              </span>

              React

            </div>


            <div className="skill">

              <span className="skillIcon ts">
                TS
              </span>

              TypeScript

            </div>


            <div className="skill">

              <span className="skillIcon sql">
                🗄
              </span>

              SQL

            </div>


            <div className="skill">

              <span className="skillIcon aws">
                aws
              </span>

              AWS

            </div>


            <div className="skill">

              <span className="skillIcon chain">
                🔗
              </span>

              LangChain

            </div>


            <div className="skill">

              <span className="skillIcon genai">
                ✦
              </span>

              Generative AI

            </div>


          </div>


        </section>


        {/* =========================
            QUOTE
        ========================= */}

        <div className="quote">

          <span></span>

          <em>
            "Building intelligent solutions for a better tomorrow."
          </em>

        </div>


      </section>


      {/* =========================
          RIGHT CHATBOT
      ========================= */}

      <section className="chatCard">


        {/* CHAT HEADER */}

        <header className="chatHeader">


          <div className="assistantLogo">

            <Sparkles size={28} />

          </div>


          <div className="assistantTitle">

            <h2>
              Chaitanya
            </h2>

            <p>
              Powered by LangChain + Groq
            </p>

          </div>


          <div className="online">

            <Circle
              size={10}
              fill="currentColor"
            />

            Online

          </div>


        </header>


        {/* =========================
            CHAT BODY
        ========================= */}

        <div
          className="chatBody"
          ref={chatBodyRef}
        >


          {messages.map(
            (message, index) => (

              <div
                key={index}
                className={`messageRow ${message.sender}`}
              >


                {/* AVATAR */}

                <div className="messageAvatar">

                  {message.sender ===
                  "assistant" ? (

                    <Bot size={20} />

                  ) : (

                    <User size={20} />

                  )}

                </div>


                {/* MESSAGE */}

                <div className="messageBubble">


                  <strong>

                    {message.sender ===
                    "assistant"

                      ? "Chaitanya"

                      : "You"}

                  </strong>


                  <div className="messageText">


                    {message.sender ===
                    "assistant" ? (

                      <ReactMarkdown
                        remarkPlugins={[
                          remarkGfm,
                        ]}
                      >

                        {message.text}

                      </ReactMarkdown>

                    ) : (

                      <p>
                        {message.text}
                      </p>

                    )}


                  </div>


                </div>


              </div>

            )
          )}


          {/* =========================
              TYPING INDICATOR
          ========================= */}

          {loading && (

            <div className="messageRow assistant">


              <div className="messageAvatar">

                <Bot size={20} />

              </div>


              <div className="messageBubble typingBubble">


                <strong>
                  Chaitanya
                </strong>


                <div className="typing">

                  <span></span>
                  <span></span>
                  <span></span>

                </div>


              </div>


            </div>

          )}


        </div>


        {/* =========================
            CHAT INPUT
        ========================= */}

        <div className="chatFooter">


          <button
            className="attachButton"
            type="button"
            aria-label="Attach file"
          >

            <Paperclip size={23} />

          </button>


          <input

            value={input}

            onChange={(e) =>
              setInput(e.target.value)
            }


            onKeyDown={(e) => {

              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {

                e.preventDefault();

                sendMessage();

              }

            }}


            placeholder="Ask me about Chaitanya..."

            disabled={loading}

          />


          <button

            className="sendButton"

            onClick={sendMessage}

            disabled={
              loading ||
              !input.trim()
            }

            type="button"

          >

            <Send size={20} />

            Send

          </button>


        </div>


      </section>


    </main>

  );

}