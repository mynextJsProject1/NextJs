/* app/lottery/submit-ticket/page.tsx */
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase/client";
import { useRouter } from "next/navigation";
import "./submit-ticket.css";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

export default function SubmitTicketPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [wordCount, setWordCount] = useState(0);
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // টিকিট লিস্ট লোড করা
  const loadTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup"); return; }

      const { data, error } = await supabase
        .from("lottery_support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setTickets(data);
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();

    // রিয়েল-টাইম আপডেট: অ্যাডমিন রিপ্লাই দিলে সাথে সাথে দেখা যাবে
    const channel = supabase
      .channel("realtime-tickets")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lottery_support_tickets" }, () => {
        void loadTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, router]);

  // মেসেজ লেখার সময় শব্দ গোনা (Max 200 Words)
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMessage(text);
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
    setWordCount(words);
  };

  // টিকিট সাবমিট করা
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!subject.trim() || !message.trim()) {
      setErrorMsg("Please fill in both subject and message.");
      return;
    }

    if (wordCount > 200) {
      setErrorMsg("Message cannot exceed 200 words.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase.from("lottery_support_tickets").insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        status: "pending",
      });

      if (error) throw error;

      // সফল হলে ফর্ম ক্লিয়ার করা
      setSubject("");
      setMessage("");
      setWordCount(0);
      void loadTickets(); 
      
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true
    });
  };

  return (
    <div className="ticket-page">
      <div className="ticket-header">
        <h1>Support Tickets</h1>
        <p>Submit your issue and our team will reply soon.</p>
      </div>

      {/* নতুন টিকিট সাবমিট ফর্ম */}
      <div className="ticket-form-card">
        <form onSubmit={handleSubmit}>
          {errorMsg && <div className="ticket-error">{errorMsg}</div>}

          <div className="input-group">
            <label>Subject</label>
            <input 
              type="text" 
              placeholder="e.g., Deposit not showing" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Describe your problem</label>
            <textarea 
              placeholder="Explain your issue here (Max 200 words)" 
              value={message}
              onChange={handleMessageChange}
              rows={4}
              required
            />
            <span className={`word-count ${wordCount > 200 ? 'limit-exceeded' : ''}`}>
              {wordCount} / 200 words
            </span>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting || wordCount > 200}>
            {submitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </form>
      </div>

      {/* পুরনো টিকিটের লিস্ট */}
      <div className="ticket-list-section">
        <h2>My Tickets</h2>
        {loading ? (
          <p className="loading-text">Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="empty-text">You haven't submitted any tickets yet.</p>
        ) : (
          <div className="ticket-list">
            {tickets.map((t) => (
              <div key={t.id} className="ticket-card">
                <div className="ticket-card-top">
                  <h3 className="ticket-subject">{t.subject}</h3>
                  <span className={`ticket-status ${t.status === 'replied' ? 'replied' : 'pending'}`}>
                    {t.status.toUpperCase()}
                  </span>
                </div>
                <p className="ticket-date">{formatDate(t.created_at)}</p>
                <p className="ticket-message">{t.message}</p>

                {/* অ্যাডমিন রিপ্লাই থাকলে দেখাবে */}
                {t.admin_reply && (
                  <div className="admin-reply-box">
                    <div className="reply-header">
                      <i className="fa-solid fa-headset"></i> Admin Reply:
                    </div>
                    <p className="reply-text">{t.admin_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
