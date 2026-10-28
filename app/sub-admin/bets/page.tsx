/* app/sub-admin/bets/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../sub-admin.css";

type GroupedMatch = {
  match_id: string;
  team_a: string;
  team_b: string;
  bets: any[];
  predictions: string[];
};

export default function SubAdminBetsPage() {
  const [groupedMatches, setGroupedMatches] = useState<GroupedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedPredictions, setSelectedPredictions] = useState<Record<string, string>>({});
  
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    // শুধু পেন্ডিং বাজি লোড করা
    const { data } = await supabase
      .from("user_bets")
      .select("*, live_matches (team_a, team_b, match_status)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data) {
      // ম্যাচ অনুযায়ী গ্রুপ করা
      const grouped: Record<string, GroupedMatch> = {};
      data.forEach((bet) => {
        if (!grouped[bet.match_id]) {
          grouped[bet.match_id] = {
            match_id: bet.match_id,
            team_a: bet.live_matches?.team_a || "Unknown",
            team_b: bet.live_matches?.team_b || "Unknown",
            bets: [],
            predictions: [],
          };
        }
        grouped[bet.match_id].bets.push(bet);
      });

      // প্রতিটি ম্যাচে কী কী প্রেডিকশন (team_a, team_b, draw) আছে তা বের করা
      Object.values(grouped).forEach((match) => {
        const uniquePreds = [...new Set(match.bets.map((b) => b.prediction))];
        match.predictions = uniquePreds;
      });

      setGroupedMatches(Object.values(grouped));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePredictionChange = (matchId: string, value: string) => {
    setSelectedPredictions((prev) => ({ ...prev, [matchId]: value }));
  };

  const settleMatch = async (matchId: string, action: "settle" | "refund") => {
    setMessage("");
    
    if (action === "settle" && !selectedPredictions[matchId]) {
      setMessage("Please select the winning option first.");
      return;
    }

    if (!confirm(`Are you sure you want to ${action} all bets for this match?`)) return;

    setProcessing(matchId);
    const winningPrediction = action === "refund" ? "" : selectedPredictions[matchId];

    const { error } = await supabase.rpc("settle_match_bets", {
      p_match_id: matchId,
      p_winning_prediction: winningPrediction,
      p_action: action,
    });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Match bets settled successfully!");
      loadData();
    }
    setProcessing(null);
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div>
      <h1 className="sa-title">Match Settlement</h1>
      {message && <div style={{ background: "rgba(0,231,1,0.1)", color: "#00e701", padding: "10px", borderRadius: "6px", marginBottom: "16px" }}>{message}</div>}
      
      {loading ? <p>Loading...</p> : groupedMatches.length === 0 ? <p style={{ color: "#9ca9a3" }}>No pending bets found.</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {groupedMatches.map((match) => (
            <div key={match.match_id} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px" }}>
              
              <div style={{ marginBottom: "16px", borderBottom: "1px dashed #26352e", paddingBottom: "12px" }}>
                <p style={{ margin: "0 0 8px", fontWeight: "bold", fontSize: "16px", color: "#fff" }}>
                  {match.team_a} vs {match.team_b}
                </p>
                <span style={{ fontSize: "12px", color: "#f58220", fontWeight: "bold" }}>
                  {match.bets.length} Pending Bets
                </span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#9ca9a3", display: "block", marginBottom: "6px" }}>
                  Select Winning Option:
                </label>
                <select 
                  value={selectedPredictions[match.match_id] || ""} 
                  onChange={(e) => handlePredictionChange(match.match_id, e.target.value)}
                  style={{ width: "100%", background: "#07110f", color: "#fff", border: "1px solid #26352e", padding: "10px", borderRadius: "6px" }}
                >
                  <option value="">-- Select Winner --</option>
                  {match.predictions.map(pred => (
                    <option key={pred} value={pred}>
                      {pred === "team_a" ? match.team_a : 
                       pred === "team_b" ? match.team_b : 
                       pred === "draw" ? "Draw" : 
                       pred === "toss_a" ? `Toss: ${match.team_a}` :
                       pred === "toss_b" ? `Toss: ${match.team_b}` : 
                       pred}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => settleMatch(match.match_id, "refund")} 
                  disabled={processing === match.match_id} 
                  style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,193,7,0.3)", background: "rgba(255,193,7,0.1)", color: "#ffc107", fontWeight: "bold", cursor: "pointer" }}
                >
                  Draw/Refund
                </button>
                <button 
                  onClick={() => settleMatch(match.match_id, "settle")} 
                  disabled={processing === match.match_id} 
                  style={{ flex: 2, padding: "10px", borderRadius: "6px", border: "none", background: "#00e701", color: "#000", fontWeight: "bold", cursor: "pointer" }}
                >
                  {processing === match.match_id ? "Processing..." : "Settle Match"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
