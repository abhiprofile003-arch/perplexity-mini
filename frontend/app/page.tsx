"use client"; // This tells Next.js this is an interactive component

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Send, User, Bot, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

// Types help TypeScript understand what our data looks like
type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string }[];
};

export default function Home() {
  // --- STATE MANAGEMENT ---
  // query: What the user is currently typing
  const [query, setQuery] = useState("");
  // messages: The full history of the chat
  const [messages, setMessages] = useState<Message[]>([]);
  // loading: Is the AI thinking right now?
  const [loading, setLoading] = useState(false);
  
  // This helps auto-scroll to the bottom when a new message appears
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- THE SEARCH FUNCTION ---
  const handleSearch = async () => {
    if (!query.trim()) return;

    // 1. Show the user's message immediately
    const newMessages = [...messages, { role: "user", content: query } as Message];
    setMessages(newMessages);
    setQuery(""); // Clear the input box
    setLoading(true); // Start loading spinner

    try {
      // 2. Prepare the history to send to the backend
      const historyToSend = messages.map((m) => ({ role: m.role, content: m.content }));

      // 3. Send data to YOUR Python backend
      const res = await axios.post("https://perplexity-mini.onrender.com/chat", {
        query: query, 
        history: historyToSend, 
      });

      // 4. When data comes back, add the AI's answer
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources,
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "⚠️ Error: Check backend console or API keys." },
      ]);
    } finally {
      setLoading(false); // Stop loading spinner
    }
  };

  // Function to clear the chat history
  const handleClearChat = () => {
    setMessages([]);
  };

  // --- THE UI (HTML) ---
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      
      {/* Header Bar */}
      <header className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-md fixed top-0 w-full z-10 px-4 md:px-8">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Bot className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            Perplex-Mini
            </h1>
        </div>
        <button
            onClick={handleClearChat}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all"
            title="Clear History"
        >
            <Trash2 size={20} />
        </button>
      </header>

      {/* Main Chat Area (Where messages appear) */}
      <div className="flex-1 overflow-y-auto p-4 pt-20 pb-32 max-w-3xl mx-auto w-full space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg">Ask me anything...</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            
            {/* Assistant Icon */}
            {msg.role === "assistant" && (
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot size={18} />
              </div>
            )}

            {/* Message Bubble */}
            <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl ${
              msg.role === "user" 
                ? "bg-blue-600 text-white rounded-tr-sm" 
                : "bg-gray-800 border border-gray-700 rounded-tl-sm"
            }`}>
              {/* This renders bold text, code blocks, etc. */}
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {/* Sources Section */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-700 grid grid-cols-1 gap-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Sources</p>
                  {msg.sources.map((source, sIdx) => (
                    <a 
                      key={sIdx} 
                      href={source.url} 
                      target="_blank" 
                      className="text-xs text-teal-400 hover:underline truncate block"
                    >
                      {sIdx + 1}. {source.title}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* User Icon */}
            {msg.role === "user" && (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={18} />
              </div>
            )}
          </div>
        ))}
        
        {/* Loading Spinner */}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
              <Loader2 className="animate-spin" size={18} />
            </div>
            <div className="bg-gray-800 p-4 rounded-2xl rounded-tl-sm border border-gray-700">
              <span className="text-gray-400 text-sm animate-pulse">Thinking & Searching...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Bar */}
      <div className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-800 p-4">
        <div className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Type your question..."
            className="w-full bg-gray-800 text-white border-gray-700 rounded-full py-3 px-5 pr-12 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-600 rounded-full hover:bg-teal-500 disabled:opacity-50 disabled:hover:bg-teal-600 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}