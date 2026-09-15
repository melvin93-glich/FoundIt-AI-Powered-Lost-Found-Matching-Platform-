"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User, FileText, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "../lib/api";

interface DraftReport {
  title: string;
  category: string;
  location: string;
  date_time: string;
  description: string;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  draftReport?: DraftReport;
  sources?: string[];
  timestamp: Date;
}

export function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hi! I'm your FoundIt AI Assistant. How can I help you today? You can ask me to search for lost/found items, draft a report, or check match status!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem("foundit_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Don't render chat widget if user is not logged in
  if (!user) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsgText = input.trim();
    setInput("");

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: userMsgText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post("/assistant/chat", { message: userMsgText });
      const botReply = res.data;

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: "bot",
        text: botReply.reply,
        draftReport: botReply.draft_report,
        sources: botReply.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: `error_${Date.now()}`,
        sender: "bot",
        text: err.response?.data?.detail || "Sorry, I ran into an issue connecting to the backend. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const navigateToReport = (type: "lost" | "found", draft: DraftReport) => {
    const params = new URLSearchParams({
      title: draft.title || "",
      category: draft.category || "Other",
      location: draft.location || "",
      date_time: draft.date_time || "",
      description: draft.description || "",
    });
    setIsOpen(false);
    router.push(`/${type}/new?${params.toString()}`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#2E4A3E] hover:bg-[#233A30] text-white p-4 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
          title="Open AI Assistant"
        >
          <Bot size={24} className="group-hover:rotate-12 transition-transform" />
          <span className="font-display font-semibold text-sm pr-1">AI Assistant</span>
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white border border-[#E5E2DC] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#2E4A3E] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm tracking-tight">FoundIt AI Assistant</h3>
                <p className="text-[10px] text-emerald-100/80 font-mono">Grounded Database AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#FAF8F5]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    msg.sender === "user" ? "bg-[#1E2022] text-white" : "bg-[#2E4A3E] text-white"
                  }`}
                >
                  {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>

                <div className={`max-w-[80%] space-y-2`}>
                  <div
                    className={`p-3 rounded-xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#2E4A3E] text-white rounded-tr-none"
                        : "bg-white text-[#1E2022] border border-[#E5E2DC] rounded-tl-none shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>

                  {/* Draft Report Card */}
                  {msg.draftReport && (
                    <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs space-y-2 shadow-sm">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900 border-b border-amber-100 pb-1.5">
                        <FileText size={14} />
                        <span>Draft Report Preview</span>
                      </div>
                      <div className="space-y-1 text-[#4A5056]">
                        <p><strong className="text-[#1E2022]">Title:</strong> {msg.draftReport.title}</p>
                        <p><strong className="text-[#1E2022]">Category:</strong> {msg.draftReport.category}</p>
                        <p><strong className="text-[#1E2022]">Location:</strong> {msg.draftReport.location}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-1">
                        <button
                          onClick={() => navigateToReport("lost", msg.draftReport!)}
                          className="w-full bg-[#2E4A3E] hover:bg-[#233A30] text-white py-1.5 px-2.5 rounded text-[11px] font-semibold flex items-center justify-between transition-colors"
                        >
                          <span>Use for Lost Report</span>
                          <ArrowRight size={12} />
                        </button>
                        <button
                          onClick={() => navigateToReport("found", msg.draftReport!)}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-1.5 px-2.5 rounded text-[11px] font-semibold flex items-center justify-between transition-colors"
                        >
                          <span>Use for Found Report</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sources Chips */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center text-[10px] text-[#72787E]">
                      <span className="font-semibold">Based on:</span>
                      {msg.sources.map((srcId) => (
                        <button
                          key={srcId}
                          onClick={() => {
                            setIsOpen(false);
                            router.push(`/item/${srcId}`);
                          }}
                          className="inline-flex items-center gap-1 bg-white hover:bg-emerald-50 border border-[#E5E2DC] hover:border-emerald-300 text-[#2E4A3E] px-1.5 py-0.5 rounded transition-colors"
                        >
                          <span>Item #{srcId.substring(0, 6)}</span>
                          <ExternalLink size={10} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-[#72787E] bg-white p-2.5 rounded-lg border border-[#E5E2DC] w-max">
                <Loader2 size={14} className="animate-spin text-[#2E4A3E]" />
                <span>Thinking & querying database...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#E5E2DC] flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about items, reports, matches..."
              className="flex-1 text-xs border border-[#E5E2DC] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2E4A3E] bg-[#FAF8F5]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-[#2E4A3E] hover:bg-[#233A30] disabled:bg-[#A2A8AE] text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
