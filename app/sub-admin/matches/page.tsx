/* app/sub-admin/matches/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../sub-admin.css";

export default function SubAdminMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("live_matches").select("*").neq("match_status", "finished").order("start_time");
    if (data) setMatches(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleLock = async (id: string, current: boolean) => {
    await supabase.from("live_matches").update({ is_betting_open: !current }).eq("id", id);
    loadData();
  };

  const updateOdds = async (id: string, field: string, value: number) => {
    await supabase.from("live_matches").update({ [field]: value }).eq("id", id);
    setMessage("Odds updated!");
    setTimeout(() => setMessage(""), 2000);
    loadData();
  };

  return (
    <div>
      <h1 className="sa-title">Match Control</h1>
      {message && <div style={{ background: "rgba(0,231,1,0.1)", color: "#00e701", padding: "10px", borderRadius: "6px", marginBottom: "16px" }}>{message}</div>}
      
      {loading ? <p>Loading...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {matches.map(m => (
            <div key={m.id} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <strong>{m.team_a} vs {m.team_b}</strong>
                <span style={{ color: m.is_betting_open ? "#00e701" : "#ff4d4d", fontSize: "12px", fontWeight: "bold" }}>
                  {m.is_betting_open ? "BETTING OPEN" : "BETTING LOCKED"}
                </span>
              </div>
              
              <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3" }}>Team A Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_a} onBlur={(e) => updateOdds(m.id, "odds_a", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} />
                </div>
                {m.sport_type === "football" && (
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#9ca9a3" }}>Draw Odds</label>
                    <input type="number" step="0.01" defaultValue={m.odds_draw} onBlur={(e) => updateOdds(m.id, "odds_draw", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3" }}>Team B Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_b} onBlur={(e) => updateOdds(m.id, "odds_b", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} />
                </div>
              </div>

              <button onClick={() => toggleLock(m.id, m.is_betting_open)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "none", background: m.is_betting_open ? "rgba(255,77,77,0.2)" : "rgba(0,231,1,0.2)", color: m.is_betting_open ? "#ff4d4d" : "#00e701", fontWeight: "bold", cursor: "pointer" }}>
                {m.is_betting_open ? "Lock Betting" : "Unlock Betting"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
