/* app/live-support-admin/page.tsx */
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "../../lib/supabase/client";
import "./live-support-admin.css";

type Session = {
  id: string;
  user_name: string;
  register_number: string;
  created_at: string;
};

type Message = {
  id: string;
  session_id: string;
  sender_type: "user" | "admin";
  message: string;
  created_at: string;
};

export default function LiveSupportAdminPage() {
  const [supabase] = useState(() => createClient());
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ১. অ্যাক্টিভ সেশন লোড করা এবং রিয়েল-টাইম লিসেন করা
  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from("support_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setSessions(data as Session[]);
      }
      setLoading(false);
    };

    void fetchSessions();

    // নতুন সেশন তৈরি হলে বা ডিলিট হলে লিস্ট আপডেট হবে
    const channel = supabase
      .channel("admin_sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_sessions" },
        () => {
          void fetchSessions();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  // ২. নির্দিষ্ট সেশনের মেসেজ লোড করা এবং রিয়েল-টাইম লিসেন করা
  useEffect(() => {
    if (!selectedSession) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("session_id", selectedSession.id)
        .order("created_at", { ascending: true });
      
      if (data) setMessages(data as Message[]);
    };
    void fetchMessages();

    const channel = supabase
      .channel(`admin_chat_${selectedSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `session_id=eq.${selectedSession.id}`,
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
  }, [selectedSession, supabase]);

  // মেসেজ পাঠানো (অ্যাডমিন হিসেবে)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSession) return;

    const msgText = newMessage.trim();
    setNewMessage("");

    try {
      const { error } = await supabase
        .from("support_messages")
        .insert({
          session_id: selectedSession.id,
          sender_type: "admin",
          message: msgText,
        });

      if (error) throw error;
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    }
  };

  // চ্যাট ডিলিট করা (End Chat)
  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    if (!confirm("Are you sure you want to delete this chat? All messages will be lost.")) return;

    try {
      const { error } = await supabase
        .from("support_sessions")
        .delete()
        .eq("id", selectedSession.id);

      if (error) throw error;
      setSelectedSession(null);
    } catch (err: any) {
      alert("Failed to delete chat: " + err.message);
    }
  };

  return (
    <div className="ls-admin-page">
      
      {/* হেডার */}
      <div className="ls-admin-header">
        <h1>Live Support Admin</h1>
      </div>

      {/* যদি কোনো সেশন সিলেক্ট করা না থাকে, তবে লিস্ট দেখাবে */}
      {!selectedSession ? (
        <div className="ls-session-list">
          {loading ? (
            <div className="ls-empty">Loading active chats...</div>
          ) : sessions.length === 0 ? (
            <div className="ls-empty">No active chats right now.</div>
          ) : (
            sessions.map((session) => (
              <div 
                key={session.id} 
                className="ls-session-card"
                onClick={() => setSelectedSession(session)}
              >
                <div className="ls-session-info">
                  <h3>{session.user_name}</h3>
                  <p>Reg: {session.register_number}</p>
                </div>
                <div className="ls-session-time">
                  {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        
        /* চ্যাট ইন্টারফেস */
        <div className="ls-admin-chat-container">
          <div className="ls-admin-chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button className="ls-back-btn" onClick={() => setSelectedSession(null)}>
                <i className="fa-solid fa-arrow-left"></i> Back
              </button>
              <div>
                <h3>{selectedSession.user_name}</h3>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                  Reg: {selectedSession.register_number}
                </span>
              </div>
            </div>
            
            <button className="ls-delete-btn" onClick={handleDeleteSession}>
              End Chat
            </button>
          </div>

          <div className="ls-chat-messages">
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
              placeholder="Reply as Admin..."
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
