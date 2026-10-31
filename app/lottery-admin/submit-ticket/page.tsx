/* app/lottery-admin/submit-ticket/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../lottery-admin.css";

type Ticket = {
  id: string;
  ticket_support_id: string;
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
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
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

  // রিপ্লাই পাঠানো এবং স্ট্যাটাস আপডেট করা
  const handleReply = async (ticketId: string) => {
    const reply = replyText[ticketId];
    if (!reply || reply.trim() === "") return alert("Please write a reply first.");

    setActionLoading(ticketId);
    const { error } = await supabase
      .from("lottery_support_tickets")
      .update({ 
        admin_reply: reply, 
        status: "replied", // ✅ অটো স্ট্যাটাস আপডেট
        replied_at: new Date().toISOString()
      })
      .eq("id", ticketId);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Reply sent successfully!");
      setReplyText(prev => ({ ...prev, [ticketId]: "" }));
      setEditingTicketId(null);
      loadData();
    }
    setActionLoading(null);
  };

  // এডিট বাটনে ক্লিক করলে পুরনো রিপ্লাই লোড হবে
  const handleEditReply = (ticket: Ticket) => {
    setReplyText(prev => ({ ...prev, [ticket.id]: ticket.admin_reply || "" }));
    setEditingTicketId(ticket.id);
  };

  // ডিলিট করা
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this ticket?")) return;
    setActionLoading(id);
    const { error } = await supabase.from("lottery_support_tickets").delete().eq("id", id);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Ticket deleted successfully.");
      loadData();
    }
    setActionLoading(null);
  };

  // হাইড করা (স্ট্যাটাস 'hidden' করা)
  const handleHide = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("lottery_support_tickets")
      .update({ status: "hidden" })
      .eq("id", id);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Ticket hidden.");
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
            <div className="la-card" key={t.id} style={{ opacity: t.status === "hidden" ? 0.6 : 1 }}>
              <div className="la-card-header">
                <div>
                  {/* ✅ টিকিট সাপোর্ট আইডি */}
                  <span style={{ fontSize: "11px", background: "#3a1f6b", color: "#fff", padding: "2px 6px", borderRadius: "4px", display: "inline-block", marginBottom: "4px" }}>
                    {t.ticket_support_id || "TKT-XXXX"}
                  </span>
                  <strong style={{ color: "#fff", fontSize: "16px", display: "block" }}>{t.subject}</strong>
                  <span style={{ fontSize: "12px", color: "#b1bad3", display: "block", marginTop: "4px" }}>
                    {new Date(t.created_at).toLocaleString()}
                  </span>
                </div>
                <span style={{ 
                  fontSize: "11px", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px", 
                  background: t.status === "pending" ? "rgba(245,130,32,0.15)" : t.status === "replied" ? "rgba(0,231,1,0.15)" : "rgba(255,255,255,0.1)", 
                  color: t.status === "pending" ? "#f58220" : t.status === "replied" ? "#00e701" : "#aaa" 
                }}>
                  {t.status.toUpperCase()}
                </span>
              </div>

              <div className="la-user-info" style={{ marginBottom: "12px" }}>
                <p><strong>User:</strong> {t.profiles?.full_name || "Unknown"}</p>
                <p><strong>Mobile:</strong> {t.profiles?.mobile || "N/A"}</p>
              </div>

              <div style={{ background: "#0f0a1a", padding: "10px", borderRadius: "8px", border: "1px dashed #3a1f6b", marginBottom: "12px" }}>
                <p style={{ margin: 0, color: "#ddd", fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{t.message}</p>
              </div>

              {t.admin_reply && editingTicketId !== t.id && (
                <div style={{ background: "rgba(0,231,1,0.05)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,231,1,0.2)", marginBottom: "12px" }}>
                  <p style={{ margin: 0, color: "#00e701", fontSize: "12px", fontWeight: "bold" }}>Admin Reply:</p>
                  <p style={{ margin: "4px 0 0 0", color: "#fff", fontSize: "13px", whiteSpace: "pre-wrap" }}>{t.admin_reply}</p>
                </div>
              )}

              {/* রিপ্লাই বক্স (এডিট মোডে থাকলে পুরনো রিপ্লাই দেখাবে) */}
              {(!t.admin_reply || editingTicketId === t.id) && t.status !== "hidden" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <textarea 
                    placeholder="Write your reply here..." 
                    value={replyText[t.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [t.id]: e.target.value })}
                    style={{ width: "100%", background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff", minHeight: "80px", fontFamily: "inherit" }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    {editingTicketId === t.id && (
                      <button 
                        className="la-btn-reject" 
                        onClick={() => setEditingTicketId(null)} 
                        style={{ flex: 1, padding: "10px" }}
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      className="la-btn-approve" 
                      onClick={() => handleReply(t.id)} 
                      disabled={actionLoading === t.id}
                      style={{ flex: 2, padding: "10px", borderRadius: "6px", fontWeight: "bold" }}
                    >
                      {actionLoading === t.id ? "Sending..." : editingTicketId === t.id ? "Update Reply" : "Send Reply"}
                    </button>
                  </div>
                </div>
              )}

              {/* অ্যাকশন বাটন (Edit, Hide, Delete) */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #3a1f6b" }}>
                {t.admin_reply && (
                  <button 
                    onClick={() => handleEditReply(t)} 
                    style={{ flex: 1, padding: "8px", borderRadius: "6px", fontWeight: "bold", background: "rgba(0,231,1,0.15)", color: "#00e701", border: "1px solid #00e701" }}
                  >
                    Edit
                  </button>
                )}
                <button 
                  onClick={() => handleHide(t.id)} 
                  disabled={t.status === "hidden"}
                  style={{ flex: 1, padding: "8px", borderRadius: "6px", fontWeight: "bold", background: "rgba(245,130,32,0.15)", color: "#f58220", border: "1px solid #f58220", opacity: t.status === "hidden" ? 0.5 : 1 }}
                >
                  Hide
                </button>
                <button 
                  onClick={() => handleDelete(t.id)} 
                  style={{ flex: 1, padding: "8px", borderRadius: "6px", fontWeight: "bold", background: "rgba(255,77,77,0.15)", color: "#ff4d4d", border: "1px solid #ff4d4d" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
