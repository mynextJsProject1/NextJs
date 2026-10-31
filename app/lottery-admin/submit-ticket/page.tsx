/* app/lottery-admin/submit-ticket/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../lottery-admin.css";

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  profiles?: { full_name: string; mobile: string } | null;
};

export default function AdminTicketsPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // শুধু pending বা replied টিকিটগুলো আনা
      const { data: txnData, error } = await supabase
        .from("lottery_support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (txnData && txnData.length > 0) {
        const userIds = [...new Set(txnData.map(t => t.user_id))];
        const { data: profileData } = await supabase.from("profiles").select("id, full_name, mobile").in("id", userIds);
        
        const profileMap: Record<string, any> = {};
        profileData?.forEach(p => { profileMap[p.id] = p; });

        setTickets(txnData.map(t => ({ ...t, profiles: profileMap[t.user_id] || null })));
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReply = async (ticketId: string) => {
    const reply = replyText[ticketId];
    if (!reply || reply.trim() === "") return alert("Please write a reply first.");

    setActionLoading(ticketId);
    const { error } = await supabase
      .from("lottery_support_tickets")
      .update({ 
        admin_reply: reply, 
        status: "replied",
        replied_at: new Date().toISOString()
      })
      .eq("id", ticketId);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Reply sent successfully!");
      setReplyText(prev => ({ ...prev, [ticketId]: "" }));
      loadData();
    }
    setActionLoading(null);
  };

  return (
    <div>
      <h1 className="la-title">User Support Tickets</h1>
      {message && <div className="la-alert">{message}</div>}

      {loading ? (
        <div className="la-loading"><i className="fa-solid fa-circle-notch fa-spin" /> Loading...</div>
      ) : tickets.length === 0 ? (
        <div className="la-empty">No support tickets found.</div>
      ) : (
        <div className="la-list">
          {tickets.map((t) => (
            <div className="la-card" key={t.id}>
              <div className="la-card-header">
                <div>
                  <strong style={{ color: "#fff", fontSize: "16px" }}>{t.subject}</strong>
                  <span style={{ fontSize: "12px", color: "#b1bad3", display: "block", marginTop: "4px" }}>
                    {new Date(t.created_at).toLocaleString()}
                  </span>
                </div>
                <span style={{ 
                  fontSize: "11px", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px", 
                  background: t.status === "pending" ? "rgba(245,130,32,0.15)" : "rgba(0,231,1,0.15)", 
                  color: t.status === "pending" ? "#f58220" : "#00e701" 
                }}>
                  {t.status.toUpperCase()}
                </span>
              </div>

              <div className="la-user-info" style={{ marginBottom: "12px" }}>
                <p><strong>User:</strong> {t.profiles?.full_name || "Unknown"}</p>
                <p><strong>Mobile:</strong> {t.profiles?.mobile || "N/A"}</p>
              </div>

              <div style={{ background: "#0f0a1a", padding: "10px", borderRadius: "8px", border: "1px dashed #3a1f6b", marginBottom: "12px" }}>
                <p style={{ margin: 0, color: "#ddd", fontSize: "13px", lineHeight: "1.5" }}>{t.message}</p>
              </div>

              {t.admin_reply && (
                <div style={{ background: "rgba(0,231,1,0.05)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,231,1,0.2)", marginBottom: "12px" }}>
                  <p style={{ margin: 0, color: "#00e701", fontSize: "12px", fontWeight: "bold" }}>Your Reply:</p>
                  <p style={{ margin: "4px 0 0 0", color: "#fff", fontSize: "13px" }}>{t.admin_reply}</p>
                </div>
              )}

              {!t.admin_reply && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <textarea 
                    placeholder="Write your reply here..." 
                    value={replyText[t.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [t.id]: e.target.value })}
                    style={{ width: "100%", background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff", minHeight: "60px" }}
                  />
                  <button 
                    className="la-btn-approve" 
                    onClick={() => handleReply(t.id)} 
                    disabled={actionLoading === t.id}
                    style={{ padding: "10px", borderRadius: "6px", fontWeight: "bold" }}
                  >
                    {actionLoading === t.id ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
