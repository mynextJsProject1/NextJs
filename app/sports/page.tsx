/* app/sports/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./sports.css";

type ExtraMarket = { name: string; odds: number };

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
  extra_markets: ExtraMarket[] | null;
  start_time: string;
  is_betting_open: boolean;
};

type SportCategory = "football" | "nba" | "cricket";
type MatchTab = "live" | "upcoming" | "finished";

type BetSlipData = {
  match: Match;
  prediction: string;
  odds: number;
};

export default function SportsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [matches, setMatches] = useState<Match[]>([]);
  const [category, setCategory] = useState<SportCategory>("football");
  const [activeTab, setActiveTab] = useState<MatchTab>("live");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [balance, setBalance] = useState(0);
  const [commissionPct, setCommissionPct] = useState(10);

  const [betSlip, setBetSlip] = useState<BetSlipData | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [placingBet, setPlacingBet] = useState(false);
  const [betMessage, setBetMessage] = useState({ type: "", text: "" });

  const [expandedMarkets, setExpandedMarkets] = useState<string[]>([]);
  
  // নতুন স্টেট: মডাল কন্ট্রোলের জন্য
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance, bet_commission_percentage")
          .eq("id", user.id)
          .single();
        if (profile) {
          setBalance(Number(profile.balance));
          setCommissionPct(Number(profile.bet_commission_percentage || 10));
        }
      }

      const { data, error } = await supabase
        .from("live_matches")
        .select("*")
        .eq("sport_type", category)
        .eq("is_hidden", false) 
        .order("start_time", { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (err) {
      console.error("Error loading matches:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, category]);

  useEffect(() => {
    setLoading(true);
    loadData();

    const channel = supabase
      .channel("live_matches_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_matches" }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadData, category]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const navigate = (page: string) => {
    const routes: Record<string, string> = { home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/", wallet: "/wallets/" };
    router.push(routes[page] ?? "/");
  };

  const isBettingLocked = (match: Match) => {
    if (match.match_status === "finished" || match.match_status === "cancelled") return true;
    if (!match.is_betting_open) return true; 
    
    const startTime = new Date(match.start_time).getTime();
    const now = new Date().getTime();
    const minsElapsed = (now - startTime) / 60000;

    if (match.match_status === "live") {
      if (match.sport_type === "football" && minsElapsed >= 95) return true;
      if (match.sport_type !== "football" && minsElapsed > 10) return true; 
    }
    return false;
  };

  const handleOddsClick = (match: Match, prediction: string, odds: number) => {
    if (isBettingLocked(match)) return;
    setBetSlip({ match, prediction, odds });
    setBetAmount("");
    setBetMessage({ type: "", text: "" });
  };

  const toggleExtraMarkets = (matchId: string) => {
    if (expandedMarkets.includes(matchId)) {
      setExpandedMarkets(expandedMarkets.filter(id => id !== matchId));
    } else {
      setExpandedMarkets([...expandedMarkets, matchId]);
    }
  };

  const handlePlaceBet = async () => {
    if (!betSlip || !betAmount || Number(betAmount) <= 0) {
      setBetMessage({ type: "error", text: "Please enter a valid amount." });
      return;
    }
    const amount = Number(betAmount);
    if (amount > balance) {
      setBetMessage({ type: "error", text: "Insufficient balance." });
      return;
    }

    setPlacingBet(true);
    setBetMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const commission = (amount * commissionPct) / 100;
      const newBalance = balance - amount;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", user.id);
      
      if (profileError) throw profileError;

      const { error: betError } = await supabase
        .from("user_bets")
        .insert({
          user_id: user.id,
          match_id: betSlip.match.id,
          bet_amount: amount,
          odds: betSlip.odds,
          prediction: betSlip.prediction,
          status: "pending",
          commission_amount: commission
        });

      if (betError) throw betError;

      setBalance(newBalance);
      setBetMessage({ type: "success", text: "Bet placed successfully!" });
      setTimeout(() => setBetSlip(null), 2000);

    } catch (err: any) {
      setBetMessage({ type: "error", text: err.message || "Failed to place bet" });
    } finally {
      setPlacingBet(false);
    }
  };

  const filteredMatches = matches.filter((m) => {
    const isTimeToLive = m.match_status === "upcoming" && new Date(m.start_time) <= currentTime;
    const displayStatus = isTimeToLive ? "live" : m.match_status;

    if (activeTab === "live") return displayStatus === "live";
    if (activeTab === "upcoming") return displayStatus === "upcoming" || displayStatus === "delayed" || displayStatus === "cancelled";
    if (activeTab === "finished") return displayStatus === "finished";
    return true;
  });

  const renderMatchCard = (match: Match) => {
    const isTimeToLive = match.match_status === "upcoming" && new Date(match.start_time) <= currentTime;
    const displayStatus = isTimeToLive ? "live" : match.match_status;
    const isLive = displayStatus === "live";
    const isLocked = isBettingLocked(match);
    const hasExtraMarkets = match.extra_markets && match.extra_markets.length > 0;
    const isExpanded = expandedMarkets.includes(match.id);
    
    return (
      <div className="sports-match-card" key={match.id}>
        <div className="match-header">
          <span className="match-league">{match.league_name}</span>
          <span className={`match-status ${displayStatus}`}>
            {isLive ? <><span className="live-dot blink"></span> LIVE</> : 
             displayStatus === "delayed" ? "DELAYED" :
             displayStatus === "cancelled" ? "CANCELLED" :
             new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="match-teams">
          <div className="team-row">
            <span className="team-name">{match.team_a}</span>
            <span className={`team-score ${isLive ? "text-green" : ""}`}>{match.live_score_a}</span>
          </div>
          <div className="team-row">
            <span className="team-name">{match.team_b}</span>
            <span className={`team-score ${isLive ? "text-green" : ""}`}>{match.live_score_b}</span>
          </div>
        </div>

        {/* Main Odds */}
        <div className="match-odds">
          <button className={`odd-btn ${isLocked ? 'locked' : ''}`} onClick={() => handleOddsClick(match, "team_a", match.odds_a)} disabled={isLocked}>
            <span>1</span>
            <strong>{match.odds_a}</strong>
            {isLocked && <i className="fa-solid fa-lock lock-icon"></i>}
          </button>
          
          {match.sport_type === "football" && match.odds_draw && (
            <button className={`odd-btn ${isLocked ? 'locked' : ''}`} onClick={() => handleOddsClick(match, "draw", match.odds_draw!)} disabled={isLocked}>
              <span>X</span>
              <strong>{match.odds_draw}</strong>
              {isLocked && <i className="fa-solid fa-lock lock-icon"></i>}
            </button>
          )}
          
          <button className={`odd-btn ${isLocked ? 'locked' : ''}`} onClick={() => handleOddsClick(match, "team_b", match.odds_b)} disabled={isLocked}>
            <span>2</span>
            <strong>{match.odds_b}</strong>
            {isLocked && <i className="fa-solid fa-lock lock-icon"></i>}
          </button>
        </div>

        {/* Toss Odds (Side by Side) */}
        {(match.toss_odds_a || match.toss_odds_b) && (
          <div className="match-odds" style={{ marginTop: "8px" }}>
            {match.toss_odds_a && (
              <button className={`odd-btn ${isLocked ? 'locked' : ''}`} onClick={() => handleOddsClick(match, "toss_a", match.toss_odds_a!)} disabled={isLocked}>
                <span>Toss: {match.team_a.substring(0, 3).toUpperCase()}</span>
                <strong>{match.toss_odds_a}</strong>
                {isLocked && <i className="fa-solid fa-lock lock-icon"></i>}
              </button>
            )}
            {match.toss_odds_b && (
              <button className={`odd-btn ${isLocked ? 'locked' : ''}`} onClick={() => handleOddsClick(match, "toss_b", match.toss_odds_b!)} disabled={isLocked}>
                <span>Toss: {match.team_b.substring(0, 3).toUpperCase()}</span>
                <strong>{match.toss_odds_b}</strong>
                {isLocked && <i className="fa-solid fa-lock lock-icon"></i>}
              </button>
            )}
          </div>
        )}

        {/* Extra Markets Toggle Button */}
        {hasExtraMarkets && (
          <button 
            onClick={() => toggleExtraMarkets(match.id)}
            style={{ width: "100%", marginTop: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid #26352e", color: "#00e701", padding: "8px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
          >
            {isExpanded ? "- Hide More Markets" : "+ View More Markets"}
          </button>
        )}

        {/* Extra Markets List (Grid Layout) */}
        {hasExtraMarkets && isExpanded && (
          <div className="match-odds" style={{ marginTop: "10px", flexWrap: "wrap" }}>
            {match.extra_markets!.map((market, idx) => (
              <button 
                key={idx} 
                className={`odd-btn ${isLocked ? 'locked' : ''}`} 
                onClick={() => handleOddsClick(match, market.name, market.odds)} 
                disabled={isLocked}
                style={{ minWidth: "45%", flex: 1 }}
              >
                <span>{market.name}</span>
                <strong>{market.odds}</strong>
                {isLocked && <i className="fa-solid fa-lock lock-icon"></i>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="stake-app sports-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main sports-main">
        <h1 className="sports-title">Sports Betting</h1>

        {/* নতুন টপ বার */}
        <div className="sports-top-bar">
          <button 
            onClick={() => setIsLiveModalOpen(true)} 
            className={`sports-tab-btn live-btn ${activeTab === 'live' ? 'active' : ''}`}
          >
            Live
          </button>
          <button 
            onClick={() => setCategory("football")} 
            className={`sports-tab-btn ${category === "football" ? "active" : ""}`}
          >
            Football
          </button>
          <button 
            onClick={() => setCategory("nba")} 
            className={`sports-tab-btn ${category === "nba" ? "active" : ""}`}
          >
            NBA
          </button>
          <button 
            onClick={() => setCategory("cricket")} 
            className={`sports-tab-btn ${category === "cricket" ? "active" : ""}`}
          >
            Cricket
          </button>
          
          {/* History Icon */}
          <button onClick={() => router.push("/my-bets")} className="history-btn" aria-label="My Bets">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="sports-loading"><i className="fa-solid fa-circle-notch fa-spin" /><span>Loading...</span></div>
        ) : filteredMatches.length === 0 ? (
          <div className="sports-empty"><i className="fa-solid fa-calendar-xmark" /><p>No {activeTab} matches available.</p></div>
        ) : (
          <div className="match-list">
            {filteredMatches.map(renderMatchCard)}
          </div>
        )}
      </main>

      <Footer activePage="sports" onNavigate={navigate} />

      {/* Live/Upcoming/Finished Modal */}
      {isLiveModalOpen && (
        <div className="sports-modal-overlay" onClick={() => setIsLiveModalOpen(false)}>
          <div className="sports-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="sports-modal-title">Select Match Status</h3>
            <div className="sports-modal-options">
              <button 
                onClick={() => { setActiveTab("live"); setIsLiveModalOpen(false); }} 
                className={`modal-option ${activeTab === "live" ? "active" : ""}`}
              >
                Live Match
              </button>
              <button 
                onClick={() => { setActiveTab("upcoming"); setIsLiveModalOpen(false); }} 
                className={`modal-option ${activeTab === "upcoming" ? "active" : ""}`}
              >
                Upcoming Match
              </button>
              <button 
                onClick={() => { setActiveTab("finished"); setIsLiveModalOpen(false); }} 
                className={`modal-option ${activeTab === "finished" ? "active" : ""}`}
              >
                Finished Match
              </button>
            </div>
          </div>
        </div>
      )}

      {betSlip && (
        <div className="bet-slip-overlay">
          <div className="bet-slip">
            <div className="slip-header">
              <h3>Bet Slip</h3>
              <button onClick={() => setBetSlip(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="slip-match-info">
              <p className="slip-teams">{betSlip.match.team_a} vs {betSlip.match.team_b}</p>
              <div className="slip-prediction">
                <span>Prediction: <strong>
                  {betSlip.prediction === "team_a" ? betSlip.match.team_a : 
                   betSlip.prediction === "team_b" ? betSlip.match.team_b : 
                   betSlip.prediction === "toss_a" ? `Toss: ${betSlip.match.team_a}` :
                   betSlip.prediction === "toss_b" ? `Toss: ${betSlip.match.team_b}` : 
                   betSlip.prediction === "draw" ? "Draw" : betSlip.prediction} 
                </strong></span>
                <span className="slip-odds">@{betSlip.odds}</span>
              </div>
            </div>

            <div className="slip-input-wrap">
              <label>Bet Amount (৳)</label>
              <input 
                type="number" 
                value={betAmount} 
                onChange={(e) => setBetAmount(e.target.value)} 
                placeholder="Enter amount"
                min="1"
              />
              <div className="slip-quick-amounts">
                {[100, 500, 1000, 5000].map(amt => (
                  <button key={amt} onClick={() => setBetAmount(amt.toString())}>৳{amt}</button>
                ))}
              </div>
            </div>

            <div className="slip-summary">
              <div><span>Commission ({commissionPct}%):</span> <span>৳ {((Number(betAmount) || 0) * commissionPct / 100).toFixed(2)}</span></div>
              <div><span>Potential Payout:</span> <span className="text-green">৳ {((Number(betAmount) || 0) * betSlip.odds).toFixed(2)}</span></div>
            </div>

            {betMessage.text && (
              <div className={`slip-message ${betMessage.type}`}>{betMessage.text}</div>
            )}

            <button className="slip-place-btn" onClick={handlePlaceBet} disabled={placingBet}>
              {placingBet ? "Processing..." : "Place Bet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
