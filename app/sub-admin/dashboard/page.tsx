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
  odds_a: number;
  odds_draw: number | null;
  odds_b: number;
  toss_odds_a: number | null;
  toss_odds_b: number | null;
  extra_markets: any[] | null;
  start_time: string;
  is_betting_open: boolean;
};

export default function SubAdminLiveDashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [sport, setSport] = useState<"football" | "cricket" | "nba">("football");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
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

    // রিয়েল-টাইম আপডেট (যদি ESPN থেকে স্কোর আপডেট হয়)
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 className="sa-title" style={{ margin: 0 }}>Live Match Dashboard</h1>
      </div>

      {/* Sports Filter Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button 
          onClick={() => setSport("football")} 
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: sport === "football" ? "#00e701" : "#111d19", color: sport === "football" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
        >
          Football
        </button>
        <button 
          onClick={() => setSport("cricket")} 
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: sport === "cricket" ? "#00e701" : "#111d19", color: sport === "cricket" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
        >
          Cricket
        </button>
        <button 
          onClick={() => setSport("nba")} 
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: sport === "nba" ? "#00e701" : "#111d19", color: sport === "nba" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
        >
          NBA
        </button>
      </div>

      {message && <div style={{ background: "rgba(0,231,1,0.1)", color: "#00e701", padding: "10px", borderRadius: "6px", marginBottom: "16px" }}>{message}</div>}

      {loading ? (
        <p style={{ color: "#9ca9a3" }}>Loading live matches...</p>
      ) : matches.length === 0 ? (
        <div style={{ background: "#111d19", padding: "30px", borderRadius: "12px", textAlign: "center", color: "#9ca9a3" }}>
          <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "30px", marginBottom: "10px", display: "block", color: "#26352e" }}></i>
          No live matches currently for {sport.toUpperCase()}.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {matches.map((m) => (
            <div key={m.id} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <strong style={{ color: "#fff", display: "block", fontSize: "16px" }}>{m.team_a} vs {m.team_b}</strong>
                  <span style={{ fontSize: "12px", color: "#9ca9a3" }}>{m.league_name} ({m.sport_type.toUpperCase()})</span>
                </div>
                <span style={{ color: m.is_betting_open ? "#00e701" : "#ff4d4d", fontSize: "12px", fontWeight: "bold", background: m.is_betting_open ? "rgba(0,231,1,0.1)" : "rgba(255,77,77,0.1)", padding: "4px 8px", borderRadius: "4px" }}>
                  {m.is_betting_open ? "OPEN" : "LOCKED"}
                </span>
              </div>

              {/* Score Update Area */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid #26352e" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3", display: "block", marginBottom: "4px" }}>{m.team_a} Score</label>
                  <input type="text" defaultValue={m.live_score_a} onBlur={(e) => updateField(m.id, "live_score_a", e.target.value)} style={{ width: "100%", background: "#07110f", color: "#00e701", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", fontWeight: "bold", textAlign: "center", fontSize: "16px" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3", display: "block", marginBottom: "4px" }}>{m.team_b} Score</label>
                  <input type="text" defaultValue={m.live_score_b} onBlur={(e) => updateField(m.id, "live_score_b", e.target.value)} style={{ width: "100%", background: "#07110f", color: "#00e701", border: "1px solid #26352e", padding: "10px", borderRadius: "6px", fontWeight: "bold", textAlign: "center", fontSize: "16px" }} />
                </div>
              </div>

              {/* Odds Update Area */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3" }}>1 (A) Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_a} onBlur={(e) => updateField(m.id, "odds_a", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", marginTop: "4px" }} />
                </div>
                {m.sport_type === "football" && (
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#9ca9a3" }}>X (Draw) Odds</label>
                    <input type="number" step="0.01" defaultValue={m.odds_draw || ""} onBlur={(e) => updateField(m.id, "odds_draw", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", marginTop: "4px" }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3" }}>2 (B) Odds</label>
                  <input type="number" step="0.01" defaultValue={m.odds_b} onBlur={(e) => updateField(m.id, "odds_b", Number(e.target.value))} style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "8px", borderRadius: "6px", marginTop: "4px" }} />
                </div>
              </div>

              {/* Toss & Extra Markets Info */}
              {(m.toss_odds_a || m.toss_odds_b || (m.extra_markets && m.extra_markets.length > 0)) && (
                <div style={{ background: "rgba(0,231,1,0.05)", padding: "10px", borderRadius: "8px", marginBottom: "16px", border: "1px solid rgba(0,231,1,0.1)" }}>
                  <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#00e701", fontWeight: "bold" }}>Active Extra Markets</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "11px", color: "#9ca9a3" }}>
                    {m.toss_odds_a && <span style={{ background: "#07110f", padding: "4px 8px", borderRadius: "4px" }}>Toss A: {m.toss_odds_a}</span>}
                    {m.toss_odds_b && <span style={{ background: "#07110f", padding: "4px 8px", borderRadius: "4px" }}>Toss B: {m.toss_odds_b}</span>}
                    {m.extra_markets?.map((em, idx) => (
                      <span key={idx} style={{ background: "#07110f", padding: "4px 8px", borderRadius: "4px" }}>{em.name}: {em.odds}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => toggleLock(m.id, m.is_betting_open)} 
                  style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: m.is_betting_open ? "rgba(255,77,77,0.15)" : "rgba(0,231,1,0.15)", color: m.is_betting_open ? "#ff4d4d" : "#00e701", fontWeight: "bold", cursor: "pointer" }}
                >
                  {m.is_betting_open ? "Lock Betting" : "Unlock Betting"}
                </button>
                <button 
                  onClick={() => finishMatch(m.id)} 
                  style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid rgba(255, 193, 7, 0.3)", background: "rgba(255, 193, 7, 0.1)", color: "#ffc107", fontWeight: "bold", cursor: "pointer" }}
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
