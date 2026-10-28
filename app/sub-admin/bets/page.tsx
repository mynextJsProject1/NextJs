/* app/sub-admin/bets/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../sub-admin.css";

export default function SubAdminBetsPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_bets")
      .select("*, live_matches (team_a, team_b, match_status)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) setBets(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const settleBet = async (id: string, status: "won" | "lost") => {
    setProcessing(id);
    const { error } = await supabase.rpc("settle_bet", { p_bet_id: id, p_status: status });
    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Bet settled successfully!");
      loadData();
    }
    setProcessing(null);
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div>
      <h1 className="sa-title">Bet Settlement</h1>
      {message && <div style={{ background: "rgba(0,231,1,0.1)", color: "#00e701", padding: "10px", borderRadius: "6px", marginBottom: "16px" }}>{message}</div>}
      
      {loading ? <p>Loading...</p> : bets.length === 0 ? <p style={{ color: "#9ca9a3" }}>No pending bets found.</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {bets.map(b => (
            <div key={b.id} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ margin: "0 0 8px", fontWeight: "bold", fontSize: "15px" }}>{b.live_matches?.team_a} vs {b.live_matches?.team_b}</p>
                <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#9ca9a3" }}>
                  <span>Prediction: <strong style={{ color: "#fff" }}>{b.prediction === "team_a" ? b.live_matches?.team_a : b.prediction === "team_b" ? b.live_matches?.team_b : "Draw"}</strong></span>
                  <span>Odds: <strong style={{ color: "#00e701" }}>{b.odds}</strong></span>
                  <span>Amount: <strong style={{ color: "#fff" }}>৳{b.bet_amount}</strong></span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => settleBet(b.id, "lost")} disabled={processing === b.id} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,77,77,0.3)", background: "rgba(255,77,77,0.1)", color: "#ff4d4d", fontWeight: "bold", cursor: "pointer" }}>Lost</button>
                <button onClick={() => settleBet(b.id, "won")} disabled={processing === b.id} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: "#00e701", color: "#000", fontWeight: "bold", cursor: "pointer" }}>Won</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
