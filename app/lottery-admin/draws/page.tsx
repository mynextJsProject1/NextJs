/* app/lottery-admin/draws/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../lottery-admin.css";

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

export default function LotteryAdminDrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  // Create Form State
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    draw_name: "",
    ticket_price: "50",
    total_tickets: "100",
    jackpot_amount: "",
    draw_type: "auto",
    draw_time: "",
  });

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
    setFormLoading(true);
    setMessage("");

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
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Draw created successfully!");
      setShowForm(false);
      setFormData({ draw_name: "", ticket_price: "50", total_tickets: "100", jackpot_amount: "", draw_type: "auto", draw_time: "" });
      loadData();
    }
    setFormLoading(false);
  };

  const handleExecuteDraw = async (drawId: string, type: string) => {
    let winningNumber = null;

    if (type === "manual") {
      if (!manualNumber) {
        setMessage("Please enter a manual winning number.");
        return;
      }
      winningNumber = Number(manualNumber);
    }

    if (!confirm(`Are you sure you want to execute this ${type.toUpperCase()} draw?`)) return;

    // নতুন ড্র তৈরি করার জন্য বর্তমান ড্র-এর ডিটেইলস খুঁজে বের করা হচ্ছে
    const currentDraw = draws.find(d => d.id === drawId);
    if (!currentDraw) return;

    setExecuting(drawId);
    setMessage("");

    // ১. ড্র এক্সিকিউট করা (RPC কল)
    const { data, error } = await supabase.rpc("execute_lottery_draw", {
      p_draw_id: drawId,
      p_winning_number: winningNumber
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else if (data && data.success) {
      
      // ==========================================
      // ✅ নতুন লজিক: আগামীকাল রাত ১১:৫৯ মিনিটের নতুন ড্র তৈরি
      // ==========================================
      const nextDrawTime = new Date();
      nextDrawTime.setDate(nextDrawTime.getDate() + 1); // আগামীকালের তারিখ
      nextDrawTime.setHours(23, 59, 0, 0); // রাত ১১:৫৯:০০ মিনিট

      const { error: nextDrawError } = await supabase.from("lottery_draws").insert({
        draw_name: currentDraw.draw_name, 
        ticket_price: currentDraw.ticket_price,
        total_tickets: currentDraw.total_tickets,
        jackpot_amount: currentDraw.jackpot_amount, 
        draw_type: currentDraw.draw_type,
        draw_time: nextDrawTime.toISOString(), // নতুন তারিখ ও সময়
        status: "upcoming"
      });

      if (nextDrawError) {
        setMessage(`Draw executed, but failed to create next draw: ${nextDrawError.message}`);
      } else {
        setMessage(`Draw executed! Winning No: ${data.winning_number}. Next draw auto-created for Tomorrow 11:59 PM.`);
      }
      // ==========================================

      setManualDrawId(null);
      setManualNumber("");
      loadData();
    } else {
      setMessage(`Error: ${data?.error || "Failed to execute draw."}`);
    }
    setExecuting(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 className="la-title" style={{ margin: 0 }}>Draw Management</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="la-btn-approve"
          style={{ padding: "10px 16px", borderRadius: "8px", fontWeight: "bold" }}
        >
          {showForm ? "Close Form" : "+ Create New Draw"}
        </button>
      </div>

      {message && <div className="la-alert">{message}</div>}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreateDraw} className="la-card" style={{ marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 16px", color: "#fff" }}>Create Lottery Draw</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input 
              type="text" 
              placeholder="Draw Name (e.g. 50 Taka Mega Draw)" 
              value={formData.draw_name} 
              onChange={e => setFormData({...formData, draw_name: e.target.value})} 
              required 
              style={{ background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <input 
                type="number" 
                placeholder="Ticket Price (৳)" 
                value={formData.ticket_price} 
                onChange={e => setFormData({...formData, ticket_price: e.target.value})} 
                required 
                style={{ flex: 1, background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff" }}
              />
              <input 
                type="number" 
                placeholder="Total Tickets" 
                value={formData.total_tickets} 
                onChange={e => setFormData({...formData, total_tickets: e.target.value})} 
                required 
                style={{ flex: 1, background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff" }}
              />
            </div>

            <input 
              type="number" 
              placeholder="Jackpot Amount (৳)" 
              value={formData.jackpot_amount} 
              onChange={e => setFormData({...formData, jackpot_amount: e.target.value})} 
              required 
              style={{ background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <select 
                value={formData.draw_type} 
                onChange={e => setFormData({...formData, draw_type: e.target.value})}
                style={{ flex: 1, background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff" }}
              >
                <option value="auto">Auto (Random Winner)</option>
                <option value="manual">Manual (Admin Selects)</option>
              </select>
              <input 
                type="datetime-local" 
                value={formData.draw_time} 
                onChange={e => setFormData({...formData, draw_time: e.target.value})} 
                required 
                style={{ flex: 1, background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px", color: "#fff" }}
              />
            </div>
          </div>

          <button type="submit" className="la-btn-approve" disabled={formLoading} style={{ width: "100%", padding: "12px", marginTop: "16px", borderRadius: "6px", fontWeight: "bold" }}>
            {formLoading ? "Creating..." : "Create Draw"}
          </button>
        </form>
      )}

      {/* Draw List */}
      {loading ? (
        <div className="la-loading">Loading draws...</div>
      ) : draws.length === 0 ? (
        <div className="la-empty">No lottery draws created yet.</div>
      ) : (
        <div className="la-list">
          {draws.map(draw => (
            <div className="la-card" key={draw.id}>
              <div className="la-card-header">
                <div>
                  <strong style={{ color: "#fff", display: "block", fontSize: "16px" }}>{draw.draw_name}</strong>
                  <span style={{ fontSize: "12px", color: "#b1bad3" }}>Price: ৳{draw.ticket_price} | Jackpot: ৳{draw.jackpot_amount}</span>
                </div>
                <span style={{ 
                  fontSize: "11px", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px", 
                  background: draw.status === "upcoming" ? "rgba(245,130,32,0.15)" : "rgba(0,231,1,0.15)", 
                  color: draw.status === "upcoming" ? "#f58220" : "#00e701" 
                }}>
                  {draw.status.toUpperCase()}
                </span>
              </div>

              <div className="la-user-info" style={{ marginBottom: "16px" }}>
                <span><strong>Type:</strong> {draw.draw_type.toUpperCase()}</span>
                <span><strong>Time:</strong> {new Date(draw.draw_time).toLocaleString()}</span>
                {draw.status === "finished" && (
                  <span style={{ color: "#00e701" }}><strong>Winning Number:</strong> #{draw.winning_number}</span>
                )}
              </div>

              {draw.status === "upcoming" && (
                <div style={{ width: "100%" }}>
                  {draw.draw_type === "auto" ? (
                    <button 
                      className="la-btn-approve"
                      onClick={() => handleExecuteDraw(draw.id, "auto")}
                      disabled={executing === draw.id}
                      style={{ width: "100%", padding: "10px", borderRadius: "6px", fontWeight: "bold" }}
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
                            style={{ flex: 1, background: "#0f0a1a", color: "#fff", border: "1px solid #3a1f6b", padding: "10px", borderRadius: "6px" }}
                          />
                          <button 
                            className="la-btn-approve"
                            onClick={() => handleExecuteDraw(draw.id, "manual")}
                            disabled={executing === draw.id}
                            style={{ flex: 1, padding: "10px", borderRadius: "6px", fontWeight: "bold" }}
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
                          className="la-btn-approve"
                          onClick={() => setManualDrawId(draw.id)}
                          style={{ width: "100%", padding: "10px", borderRadius: "6px", fontWeight: "bold" }}
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
