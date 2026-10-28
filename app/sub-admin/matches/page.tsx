/* app/sub-admin/matches/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../sub-admin.css";

export default function SubAdminMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [sportType, setSportType] = useState("football");
  const [leagueName, setLeagueName] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [startTime, setStartTime] = useState("");
  const [oddsA, setOddsA] = useState("1.80");
  const [oddsDraw, setOddsDraw] = useState("3.50");
  const [oddsB, setOddsB] = useState("2.10");
  const [formLoading, setFormLoading] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("live_matches").select("*").neq("match_status", "finished").order("start_time");
    if (data) setMatches(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage("");

    try {
      const newMatch = {
        id: `manual_${Date.now()}`, // ম্যানুয়াল ম্যাচের জন্য ইউনিক আইডি
        sport_type: sportType,
        league_name: leagueName,
        team_a: teamA,
        team_b: teamB,
        live_score_a: "0",
        live_score_b: "0",
        match_status: "upcoming",
        odds_a: Number(oddsA),
        odds_draw: sportType === "football" ? Number(oddsDraw) : null,
        odds_b: Number(oddsB),
        start_time: new Date(startTime).toISOString(),
        is_betting_open: true,
        control_type: "manual",
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase.from("live_matches").insert([newMatch]);
      if (error) throw error;

      setMessage("Match added successfully!");
      setShowForm(false);
      // Reset form
      setLeagueName(""); setTeamA(""); setTeamB(""); setStartTime("");
      setOddsA("1.80"); setOddsDraw("3.50"); setOddsB("2.10");
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 className="sa-title" style={{ margin: 0 }}>Match Control</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ background: "#00e701", color: "#000", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
        >
          {showForm ? "Close Form" : "+ Add Manual Match"}
        </button>
      </div>

      {message && <div style={{ background: "rgba(0,231,1,0.1)", color: "#00e701", padding: "10px", borderRadius: "6px", marginBottom: "16px" }}>{message}</div>}

      {/* Manual Add Form */}
      {showForm && (
        <form onSubmit={handleAddMatch} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ margin: "0 0 10px", color: "#fff" }}>Create New Match</h3>
          
          <select value={sportType} onChange={(e) => setSportType(e.target.value)} style={{ background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }}>
            <option value="football">Football</option>
            <option value="cricket">Cricket</option>
            <option value="nba">NBA (Basketball)</option>
          </select>

          <input type="text" placeholder="League Name (e.g. BPL, IPL)" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required style={{ background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
          
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" placeholder="Team A" value={teamA} onChange={(e) => setTeamA(e.target.value)} required style={{ flex: 1, background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
            <input type="text" placeholder="Team B" value={teamB} onChange={(e) => setTeamB(e.target.value)} required style={{ flex: 1, background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Start Time</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={{ background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Team A Odds</label>
              <input type="number" step="0.01" value={oddsA} onChange={(e) => setOddsA(e.target.value)} required style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
            </div>
            {sportType === "football" && (
              <div style={{ flex: 1 }}>
                <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Draw Odds</label>
                <input type="number" step="0.01" value={oddsDraw} onChange={(e) => setOddsDraw(e.target.value)} required style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Team B Odds</label>
              <input type="number" step="0.01" value={oddsB} onChange={(e) => setOddsB(e.target.value)} required style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
            </div>
          </div>

          <button type="submit" disabled={formLoading} style={{ background: "#00e701", color: "#000", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", marginTop: "8px", cursor: "pointer" }}>
            {formLoading ? "Saving..." : "Save Match"}
          </button>
        </form>
      )}
      
      {loading ? <p style={{ color: "#9ca9a3" }}>Loading matches...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {matches.map(m => (
            <div key={m.id} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <strong style={{ color: "#fff", display: "block" }}>{m.team_a} vs {m.team_b}</strong>
                  <span style={{ fontSize: "12px", color: "#9ca9a3" }}>{m.league_name} ({m.sport_type.toUpperCase()})</span>
                </div>
                <span style={{ color: m.is_betting_open ? "#00e701" : "#ff4d4d", fontSize: "11px", fontWeight: "bold" }}>
                  {m.is_betting_open ? "OPEN" : "LOCKED"}
                </span>
              </div>
              
              <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: "#9ca9a3" }}>Team A Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_a} onBlur={(e) => updateOdds(m.id, "odds_a", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", marginTop: "4px" }} />
                </div>
                {m.sport_type === "football" && (
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "11px", color: "#9ca9a3" }}>Draw Odds</label>
                    <input type="number" step="0.01" defaultValue={m.odds_draw} onBlur={(e) => updateOdds(m.id, "odds_draw", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", marginTop: "4px" }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: "#9ca9a3" }}>Team B Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_b} onBlur={(e) => updateOdds(m.id, "odds_b", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", marginTop: "4px" }} />
                </div>
              </div>

              <button onClick={() => toggleLock(m.id, m.is_betting_open)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "none", background: m.is_betting_open ? "rgba(255,77,77,0.15)" : "rgba(0,231,1,0.15)", color: m.is_betting_open ? "#ff4d4d" : "#00e701", fontWeight: "bold", cursor: "pointer" }}>
                {m.is_betting_open ? "Lock Betting" : "Unlock Betting"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
