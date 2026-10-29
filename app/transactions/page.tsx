/* app/transactions/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./transactions.css";

type Transaction = {
  id: string;
  transaction_type: "deposit" | "withdrawal";
  method_code: string;
  amount: number;
  transaction_reference: string | null;
  destination_details: string | null;
  status: string;
  created_at: string;
};

type UserBet = {
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
  } | null;
};

type TabType = "all" | "fiat" | "crypto" | "bets";

// --- ইমেজ ম্যাপিং ---
const methodImages: Record<string, string> = {
  bkash: "bkash.png",
  nagad: "nagad.png",
  rocket: "rocket.png",
  usdt: "usdt.png",
};
const paymentImageBase = process.env.NODE_ENV === "production" ? "/NextJs" : "";

export default function TransactionsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bets, setBets] = useState<UserBet[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/signup/");
        return;
      }

      // ১. ট্রানজেকশন লোড করা
      const { data: txnData } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (txnData) setTransactions(txnData as Transaction[]);

      // ২. বাজির হিস্ট্রি লোড করা
      const { data: betData } = await supabase
        .from("user_bets")
        .select("*, live_matches(team_a, team_b)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (betData) setBets(betData as unknown as UserBet[]);

    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      // ডাটা লোড হতে একটু সময় নিলে স্পিনার সুন্দরভাবে দেখা যাবে
      setTimeout(() => {
        setLoading(false);
      }, 500); 
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const navigate = (page: string) => {
    const routes: Record<string, string> = { home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/", wallet: "/wallets/" };
    router.push(routes[page] ?? "/");
  };

  // ফিল্টারিং লজিক
  const filteredTransactions = transactions.filter(txn => {
    if (activeTab === "fiat") return txn.method_code !== "usdt";
    if (activeTab === "crypto") return txn.method_code === "usdt";
    return true; // 'all'
  });

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return <span className="badge pending">Pending</span>;
    if (s === "approved") return <span className="badge approved">Approved</span>;
    if (s === "rejected") return <span className="badge rejected">Rejected</span>;
    if (s === "won") return <span className="badge won">Won</span>;
    if (s === "lost") return <span className="badge lost">Lost</span>;
    if (s === "refunded") return <span className="badge refunded">Refunded</span>;
    return <span className="badge">{status}</span>;
  };

  return (
    <div className="stake-app transactions-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main transactions-main">
        {/* ফুল স্ক্রিন লোডিং অ্যানিমেশন */}
        {loading ? (
          <div className="txn-full-loading">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <span>Loading history...</span>
          </div>
        ) : (
          <>
            <h1 className="transactions-title">My History</h1>

            {/* Tabs */}
            <div className="txn-tabs">
              <button className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")}>All</button>
              <button className={activeTab === "fiat" ? "active" : ""} onClick={() => setActiveTab("fiat")}>Fiat</button>
              <button className={activeTab === "crypto" ? "active" : ""} onClick={() => setActiveTab("crypto")}>Crypto</button>
              <button className={activeTab === "bets" ? "active" : ""} onClick={() => setActiveTab("bets")}>My Bets</button>
            </div>

            {activeTab !== "bets" ? (
              /* Transaction List */
              filteredTransactions.length === 0 ? (
                <div className="txn-empty">
                  <i className="fa-solid fa-receipt" />
                  <p>No transactions found for this category.</p>
                </div>
              ) : (
                <div className="txn-list">
                  {filteredTransactions.map((txn) => (
                    <div className="txn-card" key={txn.id}>
                      <div className="txn-icon-wrap">
                        {txn.transaction_type === "deposit" ? (
                          <i className="fa-solid fa-arrow-down text-green" />
                        ) : (
                          <i className="fa-solid fa-arrow-up text-red" />
                        )}
                      </div>
                      <div className="txn-info">
                        <strong className="txn-type">{txn.transaction_type.toUpperCase()}</strong>
                        
                        {/* মেথডের নাম ও লোগো */}
                        <div className="txn-method-wrap">
                          {methodImages[txn.method_code] && (
                            <img
                              src={`${paymentImageBase}/images/payment/${methodImages[txn.method_code]}`}
                              alt={txn.method_code}
                              className="txn-method-logo"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <span className="txn-method">{txn.method_code.toUpperCase()}</span>
                        </div>
                        
                        <span className="txn-date">{new Date(txn.created_at).toLocaleString()}</span>
                        {txn.transaction_type === "deposit" ? (
                          <span className="txn-ref">TrxID: {txn.transaction_reference || "N/A"}</span>
                        ) : (
                          <span className="txn-ref">To: {txn.destination_details || "N/A"}</span>
                        )}
                      </div>
                      <div className="txn-right">
                        <strong className="txn-amount">৳ {Number(txn.amount).toLocaleString()}</strong>
                        {getStatusBadge(txn.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Bets List */
              bets.length === 0 ? (
                <div className="txn-empty">
                  <i className="fa-solid fa-ticket" />
                  <p>No bets placed yet.</p>
                </div>
              ) : (
                <div className="txn-list">
                  {bets.map((bet) => (
                    <div className="txn-card bet-card" key={bet.id}>
                      <div className="bet-header">
                        <span className="bet-match">{bet.live_matches?.team_a} vs {bet.live_matches?.team_b}</span>
                        <span className="bet-date">{new Date(bet.created_at).toLocaleString()}</span>
                      </div>
                      <div className="bet-details">
                        <div><span>Prediction:</span> <strong>{bet.prediction}</strong></div>
                        <div><span>Odds:</span> <strong className="text-green">{bet.odds}</strong></div>
                        <div><span>Amount:</span> <strong>৳ {Number(bet.bet_amount).toLocaleString()}</strong></div>
                        <div><span>Payout:</span> <strong className={bet.status === "won" ? "text-green" : ""}>{bet.status === "won" ? `৳ ${Number(bet.payout_amount).toLocaleString()}` : "-"}</strong></div>
                      </div>
                      <div className="bet-footer">
                        {getStatusBadge(bet.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </main>

      <Footer activePage="transactions" onNavigate={navigate} />
    </div>
  );
}
