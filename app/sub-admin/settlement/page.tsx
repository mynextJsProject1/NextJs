/* app/sub-admin/settlement/page.tsx */
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

export default function SubAdminSettlementPage() {
  const [groupedMatches, setGroupedMatches] = useState<GroupedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorLog, setErrorLog] = useState(""); // ডিবাগ এররের জন্য
  const [selectedPredictions, setSelectedPredictions] = useState<Record<string, string>>({});
  
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setErrorLog("");
    
    // পেন্ডিং বাজিগুলো লোড করা হচ্ছে
    const { data, error } = await supabase
      .from("user_bets")
      .select("*, live_matches (team_a, team_b, match_status)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error);
      setErrorLog(`Database Error: ${error.message} (Code: ${error.code})`);
      setLoading(false);
      return;
    }

    if (data) {
      if (data.length === 0) {
        setErrorLog("No pending bets found in the database (user_bets table is empty for status='pending').");
      }
      
      // ম্যাচ অনুযায়ী গ্রুপ করা
      const grouped: Record<string, GroupedMatch> = {};
      data.forEach((bet) => {
        if (!grouped[bet.match_id]) {
          grouped[bet.match_id] = {
            match_id: bet.match_id,
            team_a: bet.live_matches?.team_a || "Unknown Team A",
            team_b: bet.live_matches?.team_b || "Unknown Team B",
            bets: [],
            predictions: [],
          };
        }
        grouped[bet.match_id].bets.push(bet);
      });

      // প্রতিটি ম্যাচে কী কী প্রেডিকশন আছে তা বের করা
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

    if (!confirm(`Are you sure you want to ${action === 'refund' ? 'REFUND' : 'SETTLE'} all bets for this match?`)) return;

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
      setMessage(`Successfully ${action === 'refund' ? 'refunded' : 'settled'} all bets for this match!`);
      loadData();
    }
    setProcessing(null);
    setTimeout(() => setMessage(""), 4000);
  };

  const formatPredictionName = (pred: string, match: GroupedMatch) => {
    if (pred === "team_a") return match.team_a;
    if (pred === "team_b") return match.team_b;
    if (pred === "draw") return "Draw";
    if (pred === "toss_a") return `Toss: ${match.team_a}`;
    if (pred === "toss_b") return `Toss: ${match.team_b}`;
    return pred;
  };

  return (
    <div>
      <h1 className="sa-title">Match Settlement</h1>
      <p style={{ color: "#9ca9a3", marginBottom: "20px", fontSize: "14px" }}>
        Select the winning outcome to settle all bets for a specific match at once.
      </p>
      
      {message && <div style={{ background: message.includes("Error") ? "rgba(255,77,77,0.1)" : "rgba(0,231,1,0.1)", color: message.includes("Error") ? "#ff4d4d" : "#00e701", padding: "10px", borderRadius: "6px", marginBottom: "16px" }}>{message}</div>}
      
      {loading ? (
        <p style={{ color: "#9ca9a3" }}>Loading pending matches...</p>
      ) : groupedMatches.length === 0 ? (
        <div style={{ background: "#111d19", padding: "30px", borderRadius: "12px", textAlign: "center", color: "#9ca9a3" }}>
          <i className="fa-solid fa-check-circle" style={{ fontSize: "30px", marginBottom: "10px", display: "block", color: "#00e701" }}></i>
          No pending bets found. All caught up!
          
          {/* ডিবাগ এরর এখানে দেখাবে */}
          {errorLog && (
            <div style={{ marginTop: "20px", background: "rgba(255,77,77,0.1)", color: "#ff4d4d", padding: "15px", borderRadius: "8px", fontSize: "12px", textAlign: "left", wordBreak: "break-all" }}>
              <strong>Debug Info:</strong> <br/>
              {errorLog}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {groupedMatches.map((match) => (
            <div key={match.match_id} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px" }}>
              
              <div style={{ marginBottom: "16px", borderBottom: "1px dashed #26352e", paddingBottom: "12px" }}>
                <p style={{ margin: "0 0 8px", fontWeight: "bold", fontSize: "16px", color: "#fff" }}>
                  {match.team_a} vs {match.team_b}
                </p>
                <span style={{ fontSize: "12px", color: "#f58220", fontWeight: "bold", background: "rgba(245,130,32,0.1)", padding: "4px 8px", borderRadius: "4px" }}>
                  {match.bets.length} Pending Bets
                </span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", color: "#9ca9a3", display: "block", marginBottom: "8px" }}>
                  Select Winning Option:
                </label>
                <select 
                  value={selectedPredictions[match.match_id] || ""} 
                  onChange={(e) => handlePredictionChange(match.match_id, e.target.value)}
                  style={{ width: "100%", background: "#07110f", color: "#00e701", border: "1px solid #26352e", padding: "12px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold" }}
                >
                  <option value="">-- Select Winner to Settle --</option>
                  {match.predictions.map(pred => (
                    <option key={pred} value={pred}>
                      {formatPredictionName(pred, match)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => settleMatch(match.match_id, "refund")} 
                  disabled={processing === match.match_id} 
                  style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid rgba(255,193,7,0.3)", background: "rgba(255,193,7,0.1)", color: "#ffc107", fontWeight: "bold", cursor: "pointer" }}
                >
                  Draw / Refund All
                </button>
                <button 
                  onClick={() => settleMatch(match.match_id, "settle")} 
                  disabled={processing === match.match_id} 
                  style={{ flex: 2, padding: "12px", borderRadius: "6px", border: "none", background: "#00e701", color: "#000", fontWeight: "bold", cursor: "pointer" }}
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
