/* app/live-support/page.tsx */
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "../../lib/supabase/client";
import "./live-support.css";

type Message = {
  id: string;
  session_id: string;
  sender_type: "user" | "admin";
  message: string;
  created_at: string;
};

export default function LiveSupportPage() {
  const [supabase] = useState(() => createClient());
  
  // States
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // অটো স্ক্রল ফাংশন
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // চ্যাট শুরু করার ফাংশন
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !registerNumber.trim()) return;

    setLoading(true);
    try {
      // সেশন তৈরি করা
      const { data, error } = await supabase
        .from("support_sessions")
        .insert({
          user_name: userName.trim(),
          register_number: registerNumber.trim(),
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
    } catch (err: any) {
      alert("Failed to start chat: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // চ্যাট শেষ করার এবং ডেটা ডিলিট করার ফাংশন
  const handleEndChat = async () => {
    if (!sessionId) return;
    if (!confirm("Are you sure you want to end the chat? All messages will be deleted.")) return;

    setIsEnding(true);
    try {
      // সেশন ডিলিট করলেই মেসেজগুলো ক্যাসকেড ডিলিট হয়ে যাবে
      const { error } = await supabase
        .from("support_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      // স্টেট রিসেট
      setSessionId(null);
      setMessages([]);
      setUserName("");
      setRegisterNumber("");
    } catch (err: any) {
      alert("Failed to end chat: " + err.message);
    } finally {
      setIsEnding(false);
    }
  };

  // মেসেজ পাঠানোর ফাংশন
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !sessionId) return;

    const msgText = newMessage.trim();
    setNewMessage(""); // সাথে সাথে ইনপুট খালি করা

    try {
      const { error } = await supabase
        .from("support_messages")
        .insert({
          session_id: sessionId,
          sender_type: "user",
          message: msgText,
        });

      if (error) throw error;
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    }
  };

  // রিয়েল-টাইম লিসেনার (মেসেজ আসা বা ডিলিট হওয়া)
  useEffect(() => {
    if (!sessionId) return;

    // ১. পুরনো মেসেজ লোড করা
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      
      if (data) setMessages(data as Message[]);
    };
    void fetchMessages();

    // ২. নতুন মেসেজ সাবস্ক্রাইব করা
    const channel = supabase
      .channel(`chat_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  // UI Render
  return (
    <div className="live-support-page">
      
      {/* ১. চ্যাট শুরুর ফর্ম */}
      {!sessionId ? (
        <div className="ls-start-container">
          <div className="ls-start-card">
            <h2>Live Support</h2>
            <form onSubmit={handleStartChat}>
              <div className="ls-form-group">
                <label>Your Name</label>
                <input 
                  type="text" 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)} 
                  placeholder="Enter your full name" 
                  required
                />
              </div>
              <div className="ls-form-group">
                <label>Register Number / Mobile</label>
                <input 
                  type="text" 
                  value={registerNumber} 
                  onChange={(e) => setRegisterNumber(e.target.value)} 
                  placeholder="Enter your mobile number" 
                  required
                />
              </div>
              <button type="submit" className="ls-btn" disabled={loading}>
                {loading ? "Starting..." : "Start Chat"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        
        /* ২. চ্যাট ইন্টারফেস */
        <div className="ls-chat-container">
          <div className="ls-chat-header">
            <div>
              <h3>Support Agent</h3>
              <p>{userName} ({registerNumber})</p>
            </div>
            <button 
              className="ls-end-btn" 
              onClick={handleEndChat}
              disabled={isEnding}
            >
              {isEnding ? "Ending..." : "End Chat"}
            </button>
          </div>

          <div className="ls-chat-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "#A0ADB0", marginTop: "20px", fontSize: "0.85rem" }}>
                Connecting to an agent... Please wait.
              </div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} className={`ls-msg ${msg.sender_type}`}>
                {msg.message}
                <span className="ls-msg-time">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="ls-chat-input-area">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              required
            />
            <button type="submit" disabled={!newMessage.trim()}>
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
