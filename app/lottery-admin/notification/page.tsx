/* app/lottery-admin/notification/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../lottery-admin.css";

export default function AdminNotificationPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lottery_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setNotifications(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !msg.trim()) return;
    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.from("lottery_notifications").insert({
      title: title.trim(),
      message: msg.trim(),
      is_active: true
    });

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Notification sent successfully!");
      setTitle(""); setMsg("");
      loadData();
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h1 className="la-title">Push Notifications</h1>
      {message && <div className="la-alert">{message}</div>}

      <div className="la-card" style={{ marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#fff" }}>Send New Notification</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input 
            type="text" 
            placeholder="Notification Title (e.g. Big Jackpot Alert!)" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
            style={{ background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff" }}
          />
          <textarea 
            placeholder="Write your message here..." 
            value={msg} 
            onChange={e => setMsg(e.target.value)} 
            required 
            rows={3}
            style={{ background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff", fontFamily: "inherit" }}
          />
          <button type="submit" className="la-btn-approve" disabled={submitting} style={{ padding: "12px", borderRadius: "6px", fontWeight: "bold" }}>
            {submitting ? "Sending..." : "Send Notification to All Users"}
          </button>
        </form>
      </div>

      <h2 style={{ color: "#fff", fontSize: "18px", marginBottom: "16px" }}>Sent History</h2>
      {loading ? (
        <div className="la-loading"><i className="fa-solid fa-circle-notch fa-spin" /> Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="la-empty">No notifications sent yet.</div>
      ) : (
        <div className="la-list">
          {notifications.map((n) => (
            <div className="la-card" key={n.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong style={{ color: "#fff", fontSize: "15px" }}>{n.title}</strong>
                  <p style={{ margin: "6px 0 0 0", color: "#b1bad3", fontSize: "13px" }}>{n.message}</p>
                </div>
                <span style={{ fontSize: "10px", color: "#888", whiteSpace: "nowrap", marginLeft: "10px" }}>
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
