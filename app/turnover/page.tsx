"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./turnover.css";

type DepositTransaction = {
  id: string;
  amount: number;
  claimed_bonus_amount: number;
  required_turnover: number;
  completed_turnover: number;
  turnover_status: string;
  status: string;
  created_at: string;
};

export default function TurnoverPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [overallReq, setOverallReq] = useState(0);
  const [overallComp, setOverallComp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadTurnoverData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/signup/");
        return;
      }

      // ১. ইউজারের সামগ্রিক টার্নওভার লোড করা
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_required_turnover, total_completed_turnover")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setOverallReq(Number(profile.total_required_turnover || 0));
        setOverallComp(Number(profile.total_completed_turnover || 0));
      }

      // ২. ইউজারের ডিপোজিট ট্রানজেকশন লোড করা (যেখানে টার্নওভার আছে)
      const { data: transactions } = await supabase
        .from("wallet_transactions")
        .select("id, amount, claimed_bonus_amount, required_turnover, completed_turnover, turnover_status, status, created_at")
        .eq("user_id", user.id)
        .eq("transaction_type", "deposit")
        .gt("required_turnover", 0) // শুধু যেগুলোতে টার্নওভার আছে
        .order("created_at", { ascending: false });

      if (transactions) {
        setDeposits(transactions as DepositTransaction[]);
      }
    } catch (error) {
      console.error("Error loading turnover data", error);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadTurnoverData();
  }, [loadTurnoverData]);

  const navigate = (page: string) => {
    const routes: Record<string, string> = {
      home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/", wallet: "/wallets/"
    };
    router.push(routes[page] ?? "/");
  };

  // Overall Progress Percentage
  const overallProgress = overallReq > 0 ? Math.min((overallComp / overallReq) * 100, 100) : 100;
  const remainingOverall = Math.max(overallReq - overallComp, 0);

  return (
    <div className="stake-app turnover-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main turnover-main">
        <div className="turnover-header">
          <h1>Turnover Progress</h1>
          <p>Track your deposit turnover requirements</p>
        </div>

        {loading ? (
          <div className="turnover-loading">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <span>Loading turnover details...</span>
          </div>
        ) : (
          <>
            {/* Overall Turnover Summary */}
            <div className="turnover-summary-card">
              <div className="turnover-summary-top">
                <div>
                  <span className="turnover-label">Total Required</span>
                  <strong className="turnover-value">৳ {overallReq.toLocaleString()}</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="turnover-label">Total Completed</span>
                  <strong className="turnover-value text-green">৳ {overallComp.toLocaleString()}</strong>
                </div>
              </div>

              <div className="turnover-progress-bar">
                <div className="turnover-progress-fill" style={{ width: `${overallProgress}%` }}></div>
              </div>

              <div className="turnover-summary-bottom">
                <span>Progress: {overallProgress.toFixed(1)}%</span>
                <span className="text-orange">Remaining: ৳ {remainingOverall.toLocaleString()}</span>
              </div>
            </div>

            {/* Deposit List */}
            <h2 className="turnover-section-title">Deposit Details</h2>
            
            {deposits.length === 0 ? (
              <div className="turnover-empty">
                <i className="fa-solid fa-chart-pie"></i>
                <p>No active turnover found. Make a deposit to start.</p>
              </div>
            ) : (
              <div className="turnover-list">
                {deposits.map((txn) => {
                  const req = Number(txn.required_turnover);
                  const comp = Number(txn.completed_turnover);
                  const remaining = Math.max(req - comp, 0);
                  const progress = req > 0 ? Math.min((comp / req) * 100, 100) : 100;
                  const isCompleted = txn.turnover_status === "completed" || comp >= req;

                  return (
                    <div className="turnover-item-card" key={txn.id}>
                      <div className="turnover-item-header">
                        <div>
                          <span className="turnover-date">
                            {new Date(txn.created_at).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric"
                            })}
                          </span>
                          <strong className="turnover-deposit-amount">৳ {Number(txn.amount).toLocaleString()}</strong>
                        </div>
                        <span className={`turnover-status-badge ${isCompleted ? "completed" : "pending"}`}>
                          {isCompleted ? "Completed" : "Pending"}
                        </span>
                      </div>

                      <div className="turnover-item-details">
                        <div className="turnover-detail-row">
                          <span>Bonus Claimed:</span>
                          <span>৳ {Number(txn.claimed_bonus_amount).toLocaleString()}</span>
                        </div>
                        <div className="turnover-detail-row">
                          <span>Required Turnover:</span>
                          <span>৳ {req.toLocaleString()}</span>
                        </div>
                        <div className="turnover-detail-row">
                          <span>Completed Turnover:</span>
                          <span className="text-green">৳ {comp.toLocaleString()}</span>
                        </div>
                        <div className="turnover-detail-row">
                          <span>Remaining Turnover:</span>
                          <span className="text-orange">৳ {remaining.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="turnover-progress-bar small">
                        <div className={`turnover-progress-fill ${isCompleted ? "completed" : ""}`} style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <Footer activePage="turnover" onNavigate={navigate} />
    </div>
  );
}
