/* app/sub-admin/dashboard/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../sub-admin.css";

type Match = {
  id: string;
  sport_type: string;
  league_name: string;
  team_a: string;
  team_b: string;
  live_score_a: string;
  live_score_b: string;
  match_status: string;
  match_time: string | null; // নতুন: ম্যাচের টাইম
  odds_a: number;
  odds_draw: number | null;
  odds_b: number;
  toss_odds_a: number | null;
  toss_odds_b: number | null;
  extra_markets: any[] | null;
  start_time: string;
  is_betting_open: boolean;
};

type ExtraMarket = { name: string; odds: string };

export default function SubAdminLiveDashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [sport, setSport] = useState<"football" | "cricket" | "nba">("football");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  // Form State (Match Control এর মতো)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [startTime, setStartTime] = useState("");
  const [matchTime, setMatchTime] = useState(""); // নতুন স্টেট
  const [oddsA, setOddsA] = useState("1.80");
  const [oddsDraw, setOddsDraw] = useState("3.50");
  const [oddsB, setOddsB] = useState("2.10");
  const [tossOddsA, setTossOddsA] = useState("");
  const [tossOddsB, setTossOddsB] = useState("");
  const [extraMarkets, setExtraMarkets] = useState<ExtraMarket[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    // শুধুমাত্র 'live' স্ট্যাটাসের ম্যাচগুলো লোড করা হবে
    const { data, error } = await supabase
      .from("live_matches")
      .select("*")
      .eq("sport_type", sport)
      .eq("match_status", "live")
      .order("start_time", { ascending: true });

    if (!error && data) {
      setMatches(data as Match[]);
    }
    setLoading(false);
  }, [supabase, sport]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("live_dashboard_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_matches" }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData, supabase]);

  const updateField = async (id: string, field: string, value: any) => {
    await supabase.from("live_matches").update({ [field]: value }).eq("id", id);
    setMessage("Updated successfully!");
    setTimeout(() => setMessage(""), 2000);
    loadData();
  };

  const toggleLock = async (id: string, current: boolean) => {
    await supabase.from("live_matches").update({ is_betting_open: !current }).eq("id", id);
    loadData();
  };

  const finishMatch = async (id: string) => {
    if (!confirm("Are you sure you want to finish this match? This will move it to finished.")) return;
    await supabase.from("live_matches").update({ match_status: "finished", is_betting_open: false }).eq("id", id);
    setMessage("Match finished!");
    loadData();
  };

  // --- Edit Functions ---
  const resetForm = () => {
    setEditingId(null);
    setLeagueName(""); setTeamA(""); setTeamB(""); setStartTime("");
    setMatchTime(""); // রিসেট
    setOddsA("1.80"); setOddsDraw("3.50"); setOddsB("2.10");
    setTossOddsA(""); setTossOddsB("");
    setExtraMarkets([]);
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
    setMatchTime(match.match_time || ""); // টাইম লোড
    setOddsA(match.odds_a.toString()); 
    setOddsDraw(match.odds_draw ? match.odds_draw.toString() : ""); 
    setOddsB(match.odds_b.toString());
    setTossOddsA(match.toss_odds_a ? match.toss_odds_a.toString() : "");
    setTossOddsB(match.toss_odds_b ? match.toss_odds_b.toString() : "");
    
    if (match.extra_markets && Array.isArray(match.extra_markets)) {
      setExtraMarkets(match.extra_markets.map((m: any) => ({ name: m.name, odds: m.odds.toString() })));
    } else {
      setExtraMarkets([]);
    }
    
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage("");

    try {
      const formattedExtraMarkets = extraMarkets
        .filter(em => em.name.trim() !== "" && em.odds !== "")
        .map(em => ({ name: em.name, odds: Number(em.odds) }));

      const matchData = {
        league_name: leagueName,
        team_a: teamA,
        team_b: teamB,
        match_time: matchTime, // নতুন: টাইম সেভ
        odds_a: Number(oddsA),
        odds_draw: sport === "football" && oddsDraw ? Number(oddsDraw) : null,
        odds_b: Number(oddsB),
        toss_odds_a: tossOddsA ? Number(tossOddsA) : null,
        toss_odds_b: tossOddsB ? Number(tossOddsB) : null,
        extra_markets: formattedExtraMarkets,
        start_time: new Date(startTime).toISOString(),
        last_updated: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from("live_matches").update(matchData).eq("id", editingId);
        if (error) throw error;
        setMessage("Match updated successfully!");
      }
      
      resetForm();
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 className="sa-title" style={{ margin: 0 }}>Live Dashboard</h1>
      </div>

      {/* Sports Filter Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button 
          onClick={() => { setSport("football"); resetForm(); }} 
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: sport === "football" ? "#00e701" : "#111d19", color: sport === "football" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
        >
          Football
        </button>
        <button 
          onClick={() => { setSport("cricket"); resetForm(); }} 
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: sport === "cricket" ? "#00e701" : "#111d19", color: sport === "cricket" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
        >
          Cricket
        </button>
        <button 
          onClick={() => { setSport("nba"); resetForm(); }} 
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: sport === "nba" ? "#00e701" : "#111d19", color: sport === "nba" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
        >
          NBA
        </button>
      </div>

      {message && <div style={{ background: "rgba(0,231,1,0.1)", color: "#00e701", padding: "10px", borderRadius: "6px", marginBottom: "16px" }}>{message}</div>}

      {/* Edit Form */}
      {showForm && (
        <form onSubmit={handleSaveMatch} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px", boxSizing: "border-box", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: "#fff" }}>Edit Match</h3>
            <button type="button" onClick={resetForm} style={{ background: "transparent", border: "none", color: "#ff4d4d", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
          </div>
          
          <input type="text" placeholder="League Name" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
          
          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <input type="text" placeholder="Team A" value={teamA} onChange={(e) => setTeamA(e.target.value)} required style={{ flex: 1, minWidth: 0, boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
            <input type="text" placeholder="Team B" value={teamB} onChange={(e) => setTeamB(e.target.value)} required style={{ flex: 1, minWidth: 0, boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
          </div>

          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Start Time</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", marginTop: "4px" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Match Time</label>
              <input type="text" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} placeholder="e.g. 45', HT" style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#ff4d4d", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", marginTop: "4px", fontWeight: "bold" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>A Odds</label>
              <input type="number" step="0.01" value={oddsA} onChange={(e) => setOddsA(e.target.value)} required style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", marginTop: "4px" }} />
            </div>
            {sport === "football" && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Draw</label>
                <input type="number" step="0.01" value={oddsDraw} onChange={(e) => setOddsDraw(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", marginTop: "4px" }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>B Odds</label>
              <input type="number" step="0.01" value={oddsB} onChange={(e) => setOddsB(e.target.value)} required style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", marginTop: "4px" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", borderTop: "1px dashed #26352e", paddingTop: "10px", width: "100%" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Toss: {teamA || "Team A"} Odds</label>
              <input type="number" step="0.01" value={tossOddsA} onChange={(e) => setTossOddsA(e.target.value)} placeholder="Optional" style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", marginTop: "4px" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Toss: {teamB || "Team B"} Odds</label>
              <input type="number" step="0.01" value={tossOddsB} onChange={(e) => setTossOddsB(e.target.value)} placeholder="Optional" style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", marginTop: "4px" }} />
            </div>
          </div>

          {/* Extra Markets */}
          <div style={{ borderTop: "1px dashed #26352e", paddingTop: "10px", width: "100%" }}>
            <label style={{ color: "#00e701", fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "8px" }}>Extra Markets (Optional)</label>
            {extraMarkets.map((em, index) => (
              <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "8px", width: "100%" }}>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <input 
                    type="text" 
                    placeholder="Market Name (e.g. Over 2.5)" 
                    value={em.name} 
                    onChange={(e) => {
                      const newArr = [...extraMarkets]; newArr[index].name = e.target.value; setExtraMarkets(newArr);
                    }} 
                    style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} 
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Odds" 
                    value={em.odds} 
                    onChange={(e) => {
                      const newArr = [...extraMarkets]; newArr[index].odds = e.target.value; setExtraMarkets(newArr);
                    }} 
                    style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    const newArr = extraMarkets.filter((_, i) => i !== index); setExtraMarkets(newArr);
                  }} 
                  style={{ background: "rgba(255,77,77,0.2)", color: "#ff4d4d", border: "none", padding: "0 12px", borderRadius: "6px", cursor: "pointer" }}
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            <button 
              type="button" 
              onClick={() => setExtraMarkets([...extraMarkets, { name: "", odds: "" }])} 
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", width: "100%", boxSizing: "border-box" }}
            >
              + Add Extra Market
            </button>
          </div>

          <button type="submit" disabled={formLoading} style={{ background: "#00e701", color: "#000", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", marginTop: "8px", cursor: "pointer", width: "100%" }}>
            {formLoading ? "Saving..." : "Save Match"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#9ca9a3" }}>Loading live matches...</p>
      ) : matches.length === 0 ? (
        <div style={{ background: "#111d19", padding: "30px", borderRadius: "12px", textAlign: "center", color: "#9ca9a3" }}>
          <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "30px", marginBottom: "10px", display: "block", color: "#26352e" }}></i>
          No live matches currently for {sport.toUpperCase()}.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
          {matches.map((m) => (
            <div key={m.id} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px", width: "100%", boxSizing: "border-box" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <strong style={{ color: "#fff", display: "block", fontSize: "16px" }}>{m.team_a} vs {m.team_b}</strong>
                  <span style={{ fontSize: "12px", color: "#9ca9a3" }}>{m.league_name} ({m.sport_type.toUpperCase()})</span>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                  <button onClick={() => handleEditClick(m)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>Edit</button>
                  <span style={{ color: m.is_betting_open ? "#00e701" : "#ff4d4d", fontSize: "12px", fontWeight: "bold", background: m.is_betting_open ? "rgba(0,231,1,0.1)" : "rgba(255,77,77,0.1)", padding: "4px 8px", borderRadius: "4px" }}>
                    {m.is_betting_open ? "OPEN" : "LOCKED"}
                  </span>
                </div>
              </div>

              {/* Score Update Area (Match Time সহ) */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid #26352e", width: "100%", boxSizing: "border-box", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "30%" }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3", display: "block", marginBottom: "4px" }}>{m.team_a} Score</label>
                  <input type="text" defaultValue={m.live_score_a} onBlur={(e) => updateField(m.id, "live_score_a", e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#00e701", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", fontWeight: "bold", textAlign: "center", fontSize: "16px" }} />
                </div>
                <div style={{ flex: 1, minWidth: "30%" }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3", display: "block", marginBottom: "4px" }}>{m.team_b} Score</label>
                  <input type="text" defaultValue={m.live_score_b} onBlur={(e) => updateField(m.id, "live_score_b", e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#00e701", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", fontWeight: "bold", textAlign: "center", fontSize: "16px" }} />
                </div>
                <div style={{ flex: 1, minWidth: "30%" }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3", display: "block", marginBottom: "4px" }}>Match Time</label>
                  <input type="text" defaultValue={m.match_time || ""} onBlur={(e) => updateField(m.id, "match_time", e.target.value)} placeholder="e.g. 45'" style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#ff4d4d", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", fontWeight: "bold", textAlign: "center", fontSize: "16px" }} />
                </div>
              </div>

              {/* Odds Update Area */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px", width: "100%", boxSizing: "border-box" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3" }}>1 (A) Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_a} onBlur={(e) => updateField(m.id, "odds_a", Number(e.target.value))} style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", marginTop: "4px" }} />
                </div>
                {m.sport_type === "football" && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: "12px", color: "#9ca9a3" }}>X (Draw) Odds</label>
                    <input type="number" step="0.01" defaultValue={m.odds_draw || ""} onBlur={(e) => updateField(m.id, "odds_draw", Number(e.target.value))} style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", marginTop: "4px" }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3" }}>2 (B) Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_b} onBlur={(e) => updateField(m.id, "odds_b", Number(e.target.value))} style={{ width: "100%", boxSizing: "border-box", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", marginTop: "4px" }} />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                <button 
                  onClick={() => toggleLock(m.id, m.is_betting_open)} 
                  style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: m.is_betting_open ? "rgba(255,77,77,0.15)" : "rgba(0,231,1,0.15)", color: m.is_betting_open ? "#ff4d4d" : "#00e701", fontWeight: "bold", cursor: "pointer", boxSizing: "border-box" }}
                >
                  {m.is_betting_open ? "Lock Betting" : "Unlock Betting"}
                </button>
                <button 
                  onClick={() => finishMatch(m.id)} 
                  style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid rgba(255, 193, 7, 0.3)", background: "rgba(255, 193, 7, 0.1)", color: "#ffc107", fontWeight: "bold", cursor: "pointer", boxSizing: "border-box" }}
                >
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
