/* app/sub-admin/matches/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import "../sub-admin.css";

export default function SubAdminMatchesPage() {
  const searchParams = useSearchParams();
  const initialSport = searchParams.get("sport") || "football";
  
  const [matches, setMatches] = useState<any[]>([]);
  const [sport, setSport] = useState(initialSport);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [leagueName, setLeagueName] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [startTime, setStartTime] = useState("");
  const [oddsA, setOddsA] = useState("1.80");
  const [oddsDraw, setOddsDraw] = useState("3.50");
  const [oddsB, setOddsB] = useState("2.10");
  const [tossOddsA, setTossOddsA] = useState("");
  const [tossOddsB, setTossOddsB] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    // শুধু লাইভ এবং আপকামিং ম্যাচ লোড করবে
    const { data } = await supabase.from("live_matches").select("*").eq("sport_type", sport).neq("match_status", "finished").order("start_time");
    if (data) setMatches(data);
    setLoading(false);
  }, [supabase, sport]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setLeagueName(""); setTeamA(""); setTeamB(""); setStartTime("");
    setOddsA("1.80"); setOddsDraw("3.50"); setOddsB("2.10");
    setTossOddsA(""); setTossOddsB("");
    setShowForm(false);
  };

  const handleEditClick = (match: any) => {
    setEditingId(match.id);
    setLeagueName(match.league_name);
    setTeamA(match.team_a);
    setTeamB(match.team_b);
    const d = new Date(match.start_time);
    const localTime = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStartTime(localTime);
    setOddsA(match.odds_a.toString()); 
    setOddsDraw(match.odds_draw ? match.odds_draw.toString() : ""); 
    setOddsB(match.odds_b.toString());
    setTossOddsA(match.toss_odds_a ? match.toss_odds_a.toString() : "");
    setTossOddsB(match.toss_odds_b ? match.toss_odds_b.toString() : "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage("");

    try {
      const matchData = {
        sport_type: sport,
        league_name: leagueName,
        team_a: teamA,
        team_b: teamB,
        odds_a: Number(oddsA),
        odds_draw: sport === "football" && oddsDraw ? Number(oddsDraw) : null,
        odds_b: Number(oddsB),
        toss_odds_a: tossOddsA ? Number(tossOddsA) : null,
        toss_odds_b: tossOddsB ? Number(tossOddsB) : null,
        start_time: new Date(startTime).toISOString(),
        last_updated: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from("live_matches").update(matchData).eq("id", editingId);
        if (error) throw error;
        setMessage("Match updated successfully!");
      } else {
        const newMatch = {
          ...matchData,
          id: `manual_${Date.now()}`,
          live_score_a: "0",
          live_score_b: "0",
          match_status: "upcoming",
          is_betting_open: true,
          is_hidden: false,
          control_type: "manual",
        };
        const { error } = await supabase.from("live_matches").insert([newMatch]);
        if (error) throw error;
        setMessage("Match added successfully!");
      }
      
      resetForm();
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const updateField = async (id: string, field: string, value: any) => {
    await supabase.from("live_matches").update({ [field]: value }).eq("id", id);
    setMessage("Updated!");
    setTimeout(() => setMessage(""), 2000);
    loadData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("live_matches").update({ 
      match_status: status, 
      is_betting_open: status === 'live' || status === 'upcoming' 
    }).eq("id", id);
    loadData();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 className="sa-title" style={{ margin: 0 }}>Manage {sport.toUpperCase()}</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <select value={sport} onChange={(e) => setSport(e.target.value)} style={{ background: "#07110f", color: "#fff", padding: "8px 16px", borderRadius: "8px", border: "1px solid #26352e" }}>
            <option value="football">Football</option>
            <option value="cricket">Cricket</option>
            <option value="nba">NBA</option>
          </select>
          <button 
            onClick={() => { if(showForm) resetForm(); else setShowForm(true); }}
            style={{ background: "#00e701", color: "#000", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
          >
            {showForm ? "Close Form" : "+ Add"}
          </button>
        </div>
      </div>

      {message && <div style={{ background: "rgba(0,231,1,0.1)", color: "#00e701", padding: "10px", borderRadius: "6px", marginBottom: "16px" }}>{message}</div>}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSaveMatch} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ margin: "0 0 10px", color: "#fff" }}>{editingId ? "Edit Match" : "Create New Match"}</h3>
          
          <input type="text" placeholder="League Name" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required style={{ background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
          
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" placeholder="Team A" value={teamA} onChange={(e) => setTeamA(e.target.value)} required style={{ flex: 1, background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
            <input type="text" placeholder="Team B" value={teamB} onChange={(e) => setTeamB(e.target.value)} required style={{ flex: 1, background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
          </div>

          <div>
            <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Start Time</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", marginTop: "4px" }} />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>A Odds</label>
              <input type="number" step="0.01" value={oddsA} onChange={(e) => setOddsA(e.target.value)} required style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
            </div>
            {sport === "football" && (
              <div style={{ flex: 1 }}>
                <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Draw</label>
                <input type="number" step="0.01" value={oddsDraw} onChange={(e) => setOddsDraw(e.target.value)} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>B Odds</label>
              <input type="number" step="0.01" value={oddsB} onChange={(e) => setOddsB(e.target.value)} required style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
            </div>
          </div>

          <button type="submit" disabled={formLoading} style={{ background: "#00e701", color: "#000", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", marginTop: "8px", cursor: "pointer" }}>
            {formLoading ? "Saving..." : "Save Match"}
          </button>
        </form>
      )}
      
      {loading ? <p>Loading...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {matches.map(m => (
            <div key={m.id} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <strong style={{ color: "#fff", display: "block" }}>{m.team_a} vs {m.team_b}</strong>
                  <span style={{ fontSize: "12px", color: "#9ca9a3" }}>{m.league_name} ({m.match_status.toUpperCase()})</span>
                </div>
                <button onClick={() => handleEditClick(m)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", height: "fit-content" }}>Edit</button>
              </div>

              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ fontSize: "12px", color: "#9ca9a3" }}>Status:</label>
                <select value={m.match_status} onChange={(e) => updateStatus(m.id, e.target.value)} style={{ background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "6px", borderRadius: "4px", fontSize: "12px", flex: 1 }}>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="delayed">Delayed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="finished">Finished</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "12px", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: "#9ca9a3" }}>Score A</label>
                  <input type="text" defaultValue={m.live_score_a} onBlur={(e) => updateField(m.id, "live_score_a", e.target.value)} style={{ width: "100%", background: "#07110f", color: "#00e701", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", fontWeight: "bold", textAlign: "center" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: "#9ca9a3" }}>Score B</label>
                  <input type="text" defaultValue={m.live_score_b} onBlur={(e) => updateField(m.id, "live_score_b", e.target.value)} style={{ width: "100%", background: "#07110f", color: "#00e701", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", fontWeight: "bold", textAlign: "center" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: "#9ca9a3" }}>A Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_a} onBlur={(e) => updateField(m.id, "odds_a", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} />
                </div>
                {sport === "football" && (
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "11px", color: "#9ca9a3" }}>Draw</label>
                    <input type="number" step="0.01" defaultValue={m.odds_draw} onBlur={(e) => updateField(m.id, "odds_draw", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: "#9ca9a3" }}>B Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_b} onBlur={(e) => updateField(m.id, "odds_b", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => updateField(m.id, "is_betting_open", !m.is_betting_open)} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: m.is_betting_open ? "rgba(255,77,77,0.15)" : "rgba(0,231,1,0.15)", color: m.is_betting_open ? "#ff4d4d" : "#00e701", fontWeight: "bold", cursor: "pointer" }}>
                  {m.is_betting_open ? "Lock Betting" : "Unlock Betting"}
                </button>
                <button onClick={() => updateStatus(m.id, "finished")} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid rgba(255, 193, 7, 0.3)", background: "rgba(255, 193, 7, 0.1)", color: "#ffc107", fontWeight: "bold", cursor: "pointer" }}>
                  Finish Match
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
