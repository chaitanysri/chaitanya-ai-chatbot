import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Paperclip,
  Send,
  Sparkles,
  Bot,
  User,
  Circle,
  PanelLeft,
  Plus,
  Trash2,
  X,
  FileText,
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
  attachment?: string; // filename of a document sent with this message
};

const fileExtLabel = (name: string) => {
  const ext = name.includes(".") ? name.split(".").pop() : "";
  return (ext || "FILE").toUpperCase();
};

type UploadedDocument = {
  filename: string;
  text: string;
};

type ChatSession = {
  session_id: string;
  title: string;
  last_updated: number;
};

const DEFAULT_GREETING: Message = {
  sender: "assistant",
  text:
    "I'm Chaitanya, a personal AI assistant built using LangChain and Groq. I can tell you about Chaitanya's projects, skills, education, and experience. How can I help you today?",
};

const generateId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;


export default function App() {

  const [input, setInput] = useState("");

  /* Your birthday: August 23, 2005 */
  const age = calculateAge(2005, 8, 23);


  const [messages, setMessages] = useState<Message[]>([
    DEFAULT_GREETING,
  ]);


  const [loading, setLoading] = useState(false);

  const [uploadedDocument, setUploadedDocument] =
    useState<UploadedDocument | null>(null);

  /* The document from the most recent upload, kept in the background so
     follow-up questions in the same chat can still use it after the
     attachment card has moved out of the input area. */
  const [activeDocument, setActiveDocument] =
    useState<UploadedDocument | null>(null);

  const [uploading, setUploading] = useState(false);

  /* Persisted conversation session id. The backend keeps the actual
     history server-side keyed by this id, so a page reload (same
     browser) picks the conversation back up without resending the
     whole transcript. */
  const [sessionId, setSessionId] = useState<string>(() => {
    const existing = localStorage.getItem("chaitanya_session_id");
    if (existing) return existing;

    const generated = generateId("session");
    localStorage.setItem("chaitanya_session_id", generated);
    return generated;
  });

  /* Persisted per-browser id (separate from sessionId). One browser can
     have many sessions/conversations — this is what past chats are
     grouped under, similar to how Claude's own chat history works. */
  const [browserId] = useState<string>(() => {
    const existing = localStorage.getItem("chaitanya_browser_id");
    if (existing) return existing;

    const generated = generateId("browser");
    localStorage.setItem("chaitanya_browser_id", generated);
    return generated;
  });

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [switchingChat, setSwitchingChat] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

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
     CHAT HISTORY (SIDEBAR)
  ========================= */

  const refreshSessions = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/sessions?browser_id=${browserId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewChat = () => {
    const generated = generateId("session");

    setSessionId(generated);
    localStorage.setItem("chaitanya_session_id", generated);

    setMessages([DEFAULT_GREETING]);
    setUploadedDocument(null);
    setActiveDocument(null);
    setHistoryOpen(false);
  };

  const openSession = async (targetSessionId: string) => {
    if (targetSessionId === sessionId) {
      setHistoryOpen(false);
      return;
    }

    setSwitchingChat(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/sessions/${targetSessionId}/messages`
      );
      const data = await res.json();

      const loaded: Message[] = (data.history ?? []).map(
        (turn: { role: string; content: string; attachment?: string }) => ({
          sender: turn.role === "assistant" ? "assistant" : "user",
          text: turn.content,
          attachment: turn.attachment,
        })
      );

      setMessages(loaded.length ? loaded : [DEFAULT_GREETING]);
      setSessionId(targetSessionId);
      localStorage.setItem("chaitanya_session_id", targetSessionId);
      setUploadedDocument(null);
      setActiveDocument(null);
    } catch (error) {
      console.error(error);
      alert("Couldn't load that conversation.");
    } finally {
      setSwitchingChat(false);
      setHistoryOpen(false);
    }
  };

  const deleteSession = async (
    targetSessionId: string,
    event: MouseEvent
  ) => {
    event.stopPropagation();

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/sessions/${targetSessionId}?browser_id=${browserId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error(`Delete failed (${res.status})`);
      }
    } catch (error) {
      console.error(error);
      alert("Couldn't delete that chat. Please try again.");
      refreshSessions();
      return;
    }

    setSessions((prev) =>
      prev.filter((s) => s.session_id !== targetSessionId)
    );

    if (targetSessionId === sessionId) {
      startNewChat();
    }
  };


  /* =========================
     FILE UPLOAD
  ========================= */

  const handleFileUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Please select a file smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to upload the file."
        );
      }

      setUploadedDocument({
        filename: data.filename,
        text: data.text,
      });
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "File upload failed."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  /* =========================
     SEND MESSAGE
  ========================= */

  const sendMessage = async () => {

    const message = input.trim();

    if (!message || loading) return;

    /* A freshly attached file wins; otherwise keep using the one from
       earlier in this chat so follow-up questions still work. */
    const documentForRequest = uploadedDocument ?? activeDocument;


    /* Add user's message immediately */

    setMessages((prev) => [

      ...prev,

      {
        sender: "user",
        text: message,
        attachment: uploadedDocument?.filename,
      },

    ]);


    setInput("");

    /* Move the attachment out of the input area once it's sent */
    if (uploadedDocument) {
      setActiveDocument(uploadedDocument);
      setUploadedDocument(null);
    }

    setLoading(true);


    try {

      /* Previous conversation */

      const history = messages.map((msg) => ({

        role: msg.sender,
        content: msg.text,
        ...(msg.attachment ? { attachment: msg.attachment } : {}),

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
            filename: documentForRequest?.filename ?? null,
            attachment_name: uploadedDocument?.filename ?? null,
            file_context: documentForRequest?.text ?? null,
            session_id: sessionId,
            browser_id: browserId,

          }),

        }

      );


      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          response.status === 429
            ? "You're sending messages a bit too fast — please wait a moment and try again."
            : data.detail || "Backend request failed"
        );

      }

      /* Backend may hand back a new/confirmed session id */
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem("chaitanya_session_id", data.session_id);
      }


      /* Add AI response */

      setMessages((prev) => [

        ...prev,

        {
          sender: "assistant",
          text: data.response,
        },

      ]);

      refreshSessions();

    }


    catch (error) {

      console.error(error);


      setMessages((prev) => [

        ...prev,

        {
          sender: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "I couldn't connect to the backend. Please make sure the FastAPI server is running.",
        },

      ]);

    }


    finally {

      setLoading(false);

    }

  };


  return (

    <main className="app">

      <style>{`
        .chaitanyaHistoryToggle {
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 6px;
          border-radius: 8px;
          opacity: 0.85;
        }
        .chaitanyaHistoryToggle:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.08);
        }

        .chaitanyaHistoryBackdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          z-index: 15;
        }

        .chaitanyaHistorySidebar {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 260px;
          max-width: 80%;
          background: #14161a;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 20;
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.2s ease;
        }
        .chaitanyaHistorySidebar.open {
          transform: translateX(0);
        }

        .chaitanyaHistoryHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
        }

        .chaitanyaNewChatBtn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: calc(100% - 24px);
          padding: 10px 12px;
          margin: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: inherit;
          cursor: pointer;
          font-size: 14px;
        }
        .chaitanyaNewChatBtn:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .chaitanyaSessionList {
          flex: 1;
          overflow-y: auto;
          padding: 0 8px 12px;
        }

        .chaitanyaSessionItem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding: 9px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 2px;
        }
        .chaitanyaSessionItem:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .chaitanyaSessionItem.active {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .chaitanyaSessionTitle {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .chaitanyaSessionDelete {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          opacity: 0;
        }
        .chaitanyaSessionItem:hover .chaitanyaSessionDelete {
          opacity: 1;
        }
        .chaitanyaSessionDelete:hover {
          color: #ff6b6b;
          background: rgba(255, 255, 255, 0.08);
        }

        .chaitanyaEmptyHistory {
          padding: 16px 12px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
        }
      `}</style>



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

      <section className="chatCard" style={{ position: "relative", overflow: "hidden" }}>


        {/* CHAT HISTORY SIDEBAR */}

        {historyOpen && (
          <div
            className="chaitanyaHistoryBackdrop"
            onClick={() => setHistoryOpen(false)}
          />
        )}

        <aside
          className={`chaitanyaHistorySidebar${historyOpen ? " open" : ""}`}
        >

          <div className="chaitanyaHistoryHeader">
            <strong>Chat history</strong>
            <button
              className="chaitanyaHistoryToggle"
              onClick={() => setHistoryOpen(false)}
              type="button"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <button
            className="chaitanyaNewChatBtn"
            onClick={startNewChat}
            type="button"
          >
            <Plus size={16} />
            New chat
          </button>

          <div className="chaitanyaSessionList">

            {sessions.length === 0 && (
              <div className="chaitanyaEmptyHistory">
                No past chats yet — your conversations will show up
                here.
              </div>
            )}

            {sessions.map((s) => (
              <div
                key={s.session_id}
                className={`chaitanyaSessionItem${
                  s.session_id === sessionId ? " active" : ""
                }`}
                onClick={() => openSession(s.session_id)}
              >
                <span className="chaitanyaSessionTitle">
                  {s.title || "New chat"}
                </span>
                <button
                  className="chaitanyaSessionDelete"
                  onClick={(e) => deleteSession(s.session_id, e)}
                  type="button"
                  title="Delete chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

          </div>

        </aside>


        {/* CHAT HEADER */}

        <header className="chatHeader">


          <button
            className="chaitanyaHistoryToggle"
            onClick={() => setHistoryOpen((v) => !v)}
            type="button"
            title="Chat history"
            aria-label="Chat history"
          >
            <PanelLeft size={20} />
          </button>


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


                  {message.attachment && (
                    <div className="fileCard fileCardInBubble">
                      <div className="fileCardIcon">
                        <FileText size={18} />
                      </div>
                      <div className="fileCardInfo">
                        <span className="fileCardName">
                          {message.attachment}
                        </span>
                        <span className="fileCardType">
                          {fileExtLabel(message.attachment)}
                        </span>
                      </div>
                    </div>
                  )}

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

        {(uploading || uploadedDocument) && (
          <div className="attachmentTray">
            {uploading ? (
              <div className="fileCard fileCardLoading">
                <div className="fileCardIcon">
                  <FileText size={20} />
                </div>
                <div className="fileCardInfo">
                  <span className="fileCardName">
                    Reading your document...
                  </span>
                </div>
              </div>
            ) : (
              uploadedDocument && (
                <div className="fileCard">
                  <div className="fileCardIcon">
                    <FileText size={20} />
                  </div>
                  <div className="fileCardInfo">
                    <span
                      className="fileCardName"
                      title={uploadedDocument.filename}
                    >
                      {uploadedDocument.filename}
                    </span>
                    <span className="fileCardType">
                      {fileExtLabel(uploadedDocument.filename)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="fileCardRemove"
                    onClick={() => setUploadedDocument(null)}
                    aria-label="Remove attached document"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        <div className="chatFooter">

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv,.pptx,.xlsx,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

          <button
            className="attachButton"
            type="button"
            aria-label="Attach file"
            disabled={uploading || loading || switchingChat}
            onClick={() => fileInputRef.current?.click()}
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


            placeholder="Ask me anything..."

            disabled={loading || switchingChat}

          />


          <button

            className="sendButton"

            onClick={sendMessage}

            disabled={
              loading ||
              switchingChat ||
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