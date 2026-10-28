/* app/sports/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./sports.css";

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
  start_time: string;
  last_updated: string;
};

type SportCategory = "football" | "nba" | "cricket";

export default function SportsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [matches, setMatches] = useState<Match[]>([]);
  const [category, setCategory] = useState<SportCategory>("football");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ডাটা লোড করার ফাংশন
  const loadMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("live_matches")
        .select("*")
        .eq("sport_type", category)
        .in("match_status", ["live", "upcoming"]) // শুধু লাইভ এবং আপকামিং ম্যাচ দেখাবে
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
    loadMatches();

    // Supabase Realtime সাবস্ক্রিপশন (লাইভ আপডেটের জন্য)
    const channel = supabase
      .channel("live_matches_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_matches" },
        (payload) => {
          // কোনো ডাটা আপডেট হলে সাথে সাথে রি-লোড করবে
          loadMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadMatches, category]);

  const navigate = (page: string) => {
    const routes: Record<string, string> = {
      home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/", wallet: "/wallets/"
    };
    router.push(routes[page] ?? "/");
  };

  // লাইভ এবং আপকামিং ম্যাচ আলাদা করা
  const liveMatches = matches.filter((m) => m.match_status === "live");
  const upcomingMatches = matches.filter((m) => m.match_status === "upcoming");

  const renderMatchCard = (match: Match) => {
    const isLive = match.match_status === "live";
    
    return (
      <div className="sports-match-card" key={match.id}>
        <div className="match-header">
          <span className="match-league">{match.league_name}</span>
          <span className={`match-status ${isLive ? "live" : "upcoming"}`}>
            {isLive ? <><span className="live-dot"></span> LIVE</> : new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

        {/* অডস বাটন */}
        <div className="match-odds">
          <button className="odd-btn">
            <span>1</span>
            <strong>{match.odds_a}</strong>
          </button>
          {match.sport_type === "football" && match.odds_draw && (
            <button className="odd-btn">
              <span>X</span>
              <strong>{match.odds_draw}</strong>
            </button>
          )}
          <button className="odd-btn">
            <span>2</span>
            <strong>{match.odds_b}</strong>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="stake-app sports-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main sports-main">
        <h1 className="sports-title">Sports Betting</h1>

        {/* স্পোর্টস ক্যাটাগরি ট্যাব */}
        <div className="sports-tabs">
          <button
            className={category === "football" ? "active" : ""}
            onClick={() => setCategory("football")}
          >
            <i className="fa-solid fa-futbol" /> Football
          </button>
          <button
            className={category === "nba" ? "active" : ""}
            onClick={() => setCategory("nba")}
          >
            <i className="fa-solid fa-basketball" /> NBA
          </button>
          <button
            className={category === "cricket" ? "active" : ""}
            onClick={() => setCategory("cricket")}
          >
            <i className="fa-solid fa-baseball" /> Cricket
          </button>
        </div>

        {loading ? (
          <div className="sports-loading">
            <i className="fa-solid fa-circle-notch fa-spin" />
            <span>Loading matches...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="sports-empty">
            <i className="fa-solid fa-calendar-xmark" />
            <p>No matches available right now. Please check back later.</p>
          </div>
        ) : (
          <>
            {/* লাইভ ম্যাচ সেকশন */}
            {liveMatches.length > 0 && (
              <div className="match-section">
                <h2 className="section-title">
                  <span className="live-dot"></span> Live Matches
                </h2>
                <div className="match-list">
                  {liveMatches.map(renderMatchCard)}
                </div>
              </div>
            )}

            {/* আপকামিং ম্যাচ সেকশন */}
            {upcomingMatches.length > 0 && (
              <div className="match-section">
                <h2 className="section-title">Upcoming Matches</h2>
                <div className="match-list">
                  {upcomingMatches.map(renderMatchCard)}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer activePage="sports" onNavigate={navigate} />
    </div>
  );
}
