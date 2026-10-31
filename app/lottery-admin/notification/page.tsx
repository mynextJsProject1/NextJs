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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  // নতুন নোটিফিকেশন পাঠানো
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

  // নোটিফিকেশন ডিলিট করা
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this notification?")) return;
    setActionLoading(id);
    setMessage("");

    const { error } = await supabase.from("lottery_notifications").delete().eq("id", id);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Notification deleted successfully.");
      loadData();
    }
    setActionLoading(null);
  };

  // নোটিফিকেশন Hide/Show করা (is_active টগল করা)
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    setMessage("");

    const { error } = await supabase
      .from("lottery_notifications")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage(`Notification ${!currentStatus ? "shown" : "hidden"} successfully.`);
      loadData();
    }
    setActionLoading(null);
  };

  return (
    <div>
      <h1 className="la-title">Push Notifications</h1>
      {message && <div className="la-alert">{message}</div>}

      {/* নোটিফিকেশন পাঠানোর ফর্ম */}
      <div className="la-card" style={{ marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#fff" }}>Send New Notification</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input 
            type="text" 
            placeholder="Notification Title (Unlimited text)" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
            style={{ background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff" }}
          />
          <textarea 
            placeholder="Write your message here... (Unlimited text)" 
            value={msg} 
            onChange={e => setMsg(e.target.value)} 
            required 
            rows={4}
            style={{ background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff", fontFamily: "inherit", resize: "vertical" }}
          />
          <button type="submit" className="la-btn-approve" disabled={submitting} style={{ padding: "12px", borderRadius: "6px", fontWeight: "bold" }}>
            {submitting ? "Sending..." : "Send Notification to All Users"}
          </button>
        </form>
      </div>

      {/* নোটিফিকেশন হিস্ট্রি */}
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
                <div style={{ flex: 1 }}>
                  <strong style={{ color: n.is_active ? "#fff" : "#888", fontSize: "15px" }}>
                    {n.title} {!n.is_active && "(Hidden)"}
                  </strong>
                  <p style={{ margin: "6px 0 0 0", color: n.is_active ? "#b1bad3" : "#666", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                    {n.message}
                  </p>
                </div>
                <span style={{ fontSize: "10px", color: "#888", whiteSpace: "nowrap", marginLeft: "10px" }}>
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* অ্যাকশন বাটন (Hide/Show এবং Delete) */}
              <div className="la-actions" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #3a1f6b", display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => handleToggleActive(n.id, n.is_active)} 
                  disabled={actionLoading === n.id}
                  style={{ flex: 1, padding: "8px", borderRadius: "6px", fontWeight: "bold", background: n.is_active ? "rgba(245,130,32,0.15)" : "rgba(0,231,1,0.15)", color: n.is_active ? "#f58220" : "#00e701", border: `1px solid ${n.is_active ? "#f58220" : "#00e701"}` }}
                >
                  {n.is_active ? "Hide" : "Show"}
                </button>
                <button 
                  onClick={() => handleDelete(n.id)} 
                  disabled={actionLoading === n.id}
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
