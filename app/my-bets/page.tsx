/* app/my-bets/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./my-bets.css";

type Bet = {
  id: string;
  bet_amount: number;
  odds: number;
  prediction: string;
  status: string;
  payout_amount: number;
  created_at: string;
  live_matches: {
    team_a: string;
    team_b: string;
    match_status: string;
  } | null;
};

export default function MyBetsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadBets = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/signup/");
        return;
      }

      const { data, error } = await supabase
        .from("user_bets")
        .select(`
          id, bet_amount, odds, prediction, status, payout_amount, created_at,
          live_matches ( team_a, team_b, match_status )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBets(data as unknown as Bet[]);
    } catch (err) {
      console.error("Error loading bets:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadBets();
  }, [loadBets]);

  const navigate = (page: string) => {
    const routes: Record<string, string> = { home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/", wallet: "/wallets/" };
    router.push(routes[page] ?? "/");
  };

  return (
    <div className="stake-app my-bets-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main my-bets-main">
        <h1 className="my-bets-title">My Bet History</h1>

        {loading ? (
          <div className="my-bets-loading">
            <i className="fa-solid fa-circle-notch fa-spin" />
            <span>Loading bets...</span>
          </div>
        ) : bets.length === 0 ? (
          <div className="my-bets-empty">
            <i className="fa-solid fa-ticket" />
            <p>You haven't placed any bets yet.</p>
          </div>
        ) : (
          <div className="bets-list">
            {bets.map((bet) => (
              <div className="bet-card" key={bet.id}>
                <div className="bet-header">
                  <span className="bet-date">
                    {new Date(bet.created_at).toLocaleString()}
                  </span>
                  <span className={`bet-status ${bet.status}`}>
                    {bet.status.toUpperCase()}
                  </span>
                </div>

                <div className="bet-match">
                  <strong>{bet.live_matches?.team_a || "Team A"}</strong> vs <strong>{bet.live_matches?.team_b || "Team B"}</strong>
                </div>

                <div className="bet-details-grid">
                  <div>
                    <span>Prediction</span>
                    <strong>{bet.prediction === "team_a" ? "Team A" : bet.prediction === "team_b" ? "Team B" : "Draw"}</strong>
                  </div>
                  <div>
                    <span>Odds</span>
                    <strong>@{bet.odds}</strong>
                  </div>
                  <div>
                    <span>Bet Amount</span>
                    <strong>৳ {bet.bet_amount}</strong>
                  </div>
                  <div>
                    <span>Payout</span>
                    <strong className={bet.status === "won" ? "text-green" : ""}>
                      {bet.status === "won" ? `৳ ${bet.payout_amount}` : "-"}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer activePage="sports" onNavigate={navigate} />
    </div>
  );
}
