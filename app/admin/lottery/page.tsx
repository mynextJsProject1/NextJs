/* app/admin/lottery/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./lottery-admin.css";

type Draw = {
  id: string;
  draw_name: string;
  ticket_price: number;
  total_tickets: number;
  jackpot_amount: number;
  draw_type: string;
  draw_time: string;
  status: string;
  winning_number: number | null;
};

export default function AdminLotteryPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Create Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    draw_name: "",
    ticket_price: "50",
    total_tickets: "100",
    jackpot_amount: "",
    draw_type: "auto",
    draw_time: "",
  });
  const [creating, setCreating] = useState(false);

  // Manual Draw State
  const [manualDrawId, setManualDrawId] = useState<string | null>(null);
  const [manualNumber, setManualNumber] = useState("");
  const [executing, setExecuting] = useState<string | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lottery_draws")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setDraws(data as Draw[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage({ type: "", text: "" });

    const { error } = await supabase.from("lottery_draws").insert({
      draw_name: formData.draw_name,
      ticket_price: Number(formData.ticket_price),
      total_tickets: Number(formData.total_tickets),
      jackpot_amount: Number(formData.jackpot_amount),
      draw_type: formData.draw_type,
      draw_time: new Date(formData.draw_time).toISOString(),
      status: "upcoming"
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Draw created successfully!" });
      setShowForm(false);
      setFormData({ draw_name: "", ticket_price: "50", total_tickets: "100", jackpot_amount: "", draw_type: "auto", draw_time: "" });
      loadData();
    }
    setCreating(false);
  };

  const handleExecuteDraw = async (drawId: string, type: string) => {
    let winningNumber = null;

    if (type === "manual") {
      if (!manualNumber) {
        setMessage({ type: "error", text: "Please enter a manual winning number." });
        return;
      }
      winningNumber = Number(manualNumber);
    }

    if (!confirm(`Are you sure you want to ${type === 'auto' ? 'AUTO' : 'MANUAL'} draw for this lottery?`)) return;

    setExecuting(drawId);
    setMessage({ type: "", text: "" });

    const { data, error } = await supabase.rpc("execute_lottery_draw", {
      p_draw_id: drawId,
      p_winning_number: winningNumber
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else if (data && data.success) {
      setMessage({ type: "success", text: `Draw completed! Winning Number: ${data.winning_number}. Jackpot ৳${data.jackpot_amount} added to winner.` });
      setManualDrawId(null);
      setManualNumber("");
      loadData();
    } else {
      setMessage({ type: "error", text: data?.error || "Failed to execute draw." });
    }
    setExecuting(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 className="admin-page-title" style={{ margin: 0 }}>Lottery Management</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ background: "#ffd700", color: "#000", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
        >
          {showForm ? "Close Form" : "+ Create Draw"}
        </button>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'error' ? 'rgba(255,77,77,0.1)' : 'rgba(0,231,1,0.1)', color: message.type === 'error' ? '#ff4d4d' : '#00e701', padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", border: `1px solid ${message.type === 'error' ? 'rgba(255,77,77,0.3)' : 'rgba(0,231,1,0.3)'}` }}>
          {message.text}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreateDraw} className="admin-form-card" style={{ marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 16px", color: "#fff" }}>Create New Lottery Draw</h3>
          
          <div className="admin-field">
            <label>Draw Name</label>
            <input type="text" placeholder="e.g. 50 Taka Mega Draw" value={formData.draw_name} onChange={e => setFormData({...formData, draw_name: e.target.value})} required />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Ticket Price (৳)</label>
              <input type="number" value={formData.ticket_price} onChange={e => setFormData({...formData, ticket_price: e.target.value})} required />
            </div>
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Total Tickets</label>
              <input type="number" value={formData.total_tickets} onChange={e => setFormData({...formData, total_tickets: e.target.value})} required />
            </div>
          </div>

          <div className="admin-field">
            <label>Jackpot Amount (৳)</label>
            <input type="number" value={formData.jackpot_amount} onChange={e => setFormData({...formData, jackpot_amount: e.target.value})} placeholder="e.g. 5000" required />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Draw Type</label>
              <select value={formData.draw_type} onChange={e => setFormData({...formData, draw_type: e.target.value})}>
                <option value="auto">Auto (Random)</option>
                <option value="manual">Manual (Admin Selects)</option>
              </select>
            </div>
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Draw Time</label>
              <input type="datetime-local" value={formData.draw_time} onChange={e => setFormData({...formData, draw_time: e.target.value})} required />
            </div>
          </div>

          <button type="submit" className="admin-submit-btn" disabled={creating}>
            {creating ? "Creating..." : "Create Draw"}
          </button>
        </form>
      )}

      {/* Draw List */}
      {loading ? (
        <p style={{ color: "#9ca9a3" }}>Loading draws...</p>
      ) : draws.length === 0 ? (
        <p style={{ color: "#9ca9a3" }}>No lottery draws created yet.</p>
      ) : (
        <div className="admin-lottery-list">
          {draws.map(draw => (
            <div className="admin-draw-card" key={draw.id}>
              <div className="draw-header">
                <div>
                  <strong style={{ color: "#fff", display: "block", fontSize: "16px" }}>{draw.draw_name}</strong>
                  <span style={{ fontSize: "12px", color: "#9ca9a3" }}>Price: ৳{draw.ticket_price} | Jackpot: ৳{draw.jackpot_amount}</span>
                </div>
                <span className={`draw-status ${draw.status}`}>{draw.status.toUpperCase()}</span>
              </div>

              <div className="draw-info">
                <span><strong>Type:</strong> {draw.draw_type.toUpperCase()}</span>
                <span><strong>Time:</strong> {new Date(draw.draw_time).toLocaleString()}</span>
                {draw.status === "finished" && (
                  <span style={{ color: "#00e701" }}><strong>Winning Number:</strong> #{draw.winning_number}</span>
                )}
              </div>

              {draw.status === "upcoming" && (
                <div className="draw-actions">
                  {draw.draw_type === "auto" ? (
                    <button 
                      className="btn-execute"
                      onClick={() => handleExecuteDraw(draw.id, "auto")}
                      disabled={executing === draw.id}
                    >
                      {executing === draw.id ? "Executing..." : "Execute Auto Draw"}
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                      {manualDrawId === draw.id ? (
                        <>
                          <input 
                            type="number" 
                            placeholder="Winning No" 
                            value={manualNumber} 
                            onChange={e => setManualNumber(e.target.value)}
                            style={{ flex: 1, background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }}
                          />
                          <button 
                            className="btn-execute"
                            onClick={() => handleExecuteDraw(draw.id, "manual")}
                            disabled={executing === draw.id}
                            style={{ flex: 1 }}
                          >
                            {executing === draw.id ? "Wait..." : "Confirm"}
                          </button>
                          <button 
                            onClick={() => setManualDrawId(null)}
                            style={{ background: "transparent", border: "none", color: "#ff4d4d", cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn-execute"
                          onClick={() => setManualDrawId(draw.id)}
                          style={{ width: "100%" }}
                        >
                          Execute Manual Draw
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
