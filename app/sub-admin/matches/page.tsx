/* app/sub-admin/matches/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import "../sub-admin.css";

type ExtraMarket = { name: string; odds: string };

export default function SubAdminMatchesPage() {
  const searchParams = useSearchParams();
  const initialSport = searchParams.get("sport") || "football";
  const initialStatus = searchParams.get("status") || ""; // ড্যাশবোর্ড থেকে status আসবে
  
  const [matches, setMatches] = useState<any[]>([]);
  const [sport, setSport] = useState(initialSport);
  const [filterStatus, setFilterStatus] = useState(initialStatus); // live নাকি all
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  // Form State
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
  const [extraMarkets, setExtraMarkets] = useState<ExtraMarket[]>([]);
  
  const [formLoading, setFormLoading] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    
    // কুয়েরি তৈরি করা
    let query = supabase.from("live_matches").select("*").eq("sport_type", sport).order("start_time", { ascending: false });
    
    // যদি ড্যাশবোর্ড থেকে live সিলেক্ট করা থাকে, তবে শুধু live ম্যাচ আসবে
    if (filterStatus === "live") {
      query = query.eq("match_status", "live");
    }

    const { data } = await query;
    if (data) setMatches(data);
    setLoading(false);
  }, [supabase, sport, filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setLeagueName(""); setTeamA(""); setTeamB(""); setStartTime("");
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
        sport_type: sport,
        league_name: leagueName,
        team_a: teamA,
        team_b: teamB,
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

  const toggleHide = async (id: string, current: boolean) => {
    await supabase.from("live_matches").update({ is_hidden: !current }).eq("id", id);
    loadData();
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 className="sa-title" style={{ margin: 0 }}>
            Manage {sport.toUpperCase()} {filterStatus === "live" && "(Live Only)"}
          </h1>
          {filterStatus === "live" && (
            <button onClick={() => setFilterStatus("")} style={{ background: "transparent", border: "none", color: "#00e701", fontSize: "12px", cursor: "pointer", marginTop: "4px", padding: 0 }}>
              ← Show All Matches
            </button>
          )}
        </div>
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

          <div style={{ display: "flex", gap: "10px", borderTop: "1px dashed #26352e", paddingTop: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Toss: {teamA || "Team A"} Odds</label>
              <input type="number" step="0.01" value={tossOddsA} onChange={(e) => setTossOddsA(e.target.value)} placeholder="Optional" style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#9ca9a3", fontSize: "12px" }}>Toss: {teamB || "Team B"} Odds</label>
              <input type="number" step="0.01" value={tossOddsB} onChange={(e) => setTossOddsB(e.target.value)} placeholder="Optional" style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }} />
            </div>
          </div>

          {/* Extra Markets with Clear Labels */}
          <div style={{ borderTop: "1px dashed #26352e", paddingTop: "10px" }}>
            <label style={{ color: "#00e701", fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "8px" }}>Extra Markets (Optional)</label>
            {extraMarkets.map((em, index) => (
              <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                <div style={{ flex: 2 }}>
                  <input 
                    type="text" 
                    placeholder="Market Name (e.g. Over 2.5)" 
                    value={em.name} 
                    onChange={(e) => {
                      const newArr = [...extraMarkets]; newArr[index].name = e.target.value; setExtraMarkets(newArr);
                    }} 
                    style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Odds" 
                    value={em.odds} 
                    onChange={(e) => {
                      const newArr = [...extraMarkets]; newArr[index].odds = e.target.value; setExtraMarkets(newArr);
                    }} 
                    style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px" }} 
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
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", width: "100%" }}
            >
              + Add Extra Market
            </button>
          </div>

          <button type="submit" disabled={formLoading} style={{ background: "#00e701", color: "#000", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", marginTop: "8px", cursor: "pointer" }}>
            {formLoading ? "Saving..." : "Save Match"}
          </button>
        </form>
      )}
      
      {loading ? <p>Loading...</p> : matches.length === 0 ? <p style={{ color: "#9ca9a3" }}>No matches found.</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {matches.map(m => (
            <div key={m.id} style={{ background: m.is_hidden ? "rgba(255,255,255,0.02)" : "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px", opacity: m.is_hidden ? 0.6 : 1 }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <strong style={{ color: "#fff", display: "block" }}>{m.team_a} vs {m.team_b}</strong>
                  <span style={{ fontSize: "12px", color: "#9ca9a3" }}>{m.league_name} ({m.match_status.toUpperCase()})</span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => handleEditClick(m)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => toggleHide(m.id, m.is_hidden)} style={{ background: m.is_hidden ? "rgba(0,231,1,0.2)" : "rgba(255,255,255,0.1)", border: "none", color: m.is_hidden ? "#00e701" : "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>
                    {m.is_hidden ? "Unhide" : "Hide"}
                  </button>
                </div>
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
                {m.sport_type === "football" && (
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
