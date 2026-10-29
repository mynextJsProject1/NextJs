/* app/redeem/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./redeem.css";

type RedeemHistory = {
  id: string;
  bonus_amount: number;
  claimed_at: string;
  redeem_codes: {
    code: string;
  } | null;
};

export default function RedeemPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [code, setCode] = useState("");
  const [history, setHistory] = useState<RedeemHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/signup/");
        return;
      }

      const { data } = await supabase
        .from("redem_codes_for_user")
        .select("id, bonus_amount, claimed_at, redeem_codes(code)")
        .eq("user_id", user.id)
        .order("claimed_at", { ascending: false });

      if (data) setHistory(data as unknown as RedeemHistory[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const navigate = (page: string) => {
    const routes: Record<string, string> = { home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/", wallet: "/wallets/" };
    router.push(routes[page] ?? "/");
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      // RPC ফাংশন কল করা
      const { data, error } = await supabase.rpc("redeem_code", {
        p_code: code.trim()
      });

      if (error) throw error;

      if (data && data.success) {
        setMessage({ 
          type: "success", 
          text: `Success! You received ৳${data.bonus_amount} bonus. ${data.required_turnover} turnover added.` 
        });
        setCode("");
        loadData(); // হিস্ট্রি রিফ্রেশ
      } else {
        setMessage({ type: "error", text: data?.error || "Failed to redeem code." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stake-app redeem-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main redeem-main">
        <h1 className="redeem-title">Redeem Code</h1>

        {message.text && (
          <div className={`redeem-alert ${message.type}`}>{message.text}</div>
        )}

        {loading ? (
          <div className="redeem-loading">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <span>Loading...</span>
          </div>
        ) : (
          <>
            {/* Redeem Form */}
            <div className="redeem-form-card">
              <p className="redeem-desc">
                Enter your promo code below to claim your bonus. 
                <br/><br/>
                <strong>Requirement:</strong> You must have at least 10,000 turnover in the last 7 days.
              </p>
              <form onSubmit={handleRedeem} className="redeem-form">
                <input 
                  type="text" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter Code (e.g. EID500)"
                  required 
                />
                <button type="submit" disabled={submitting}>
                  {submitting ? "Checking..." : "Redeem Code"}
                </button>
              </form>
            </div>

            {/* History */}
            <h2 className="redeem-section-title">Redeem History</h2>
            {history.length === 0 ? (
              <div className="redeem-empty">
                <i className="fa-solid fa-ticket"></i>
                <p>No codes redeemed yet.</p>
              </div>
            ) : (
              <div className="redeem-list">
                {history.map((item) => (
                  <div className="redeem-item" key={item.id}>
                    <div className="redeem-item-left">
                      <i className="fa-solid fa-gift"></i>
                      <div>
                        <strong>{item.redeem_codes?.code || "Unknown Code"}</strong>
                        <span>{new Date(item.claimed_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="redeem-item-right">
                      <span className="redeem-amount">+ ৳{Number(item.bonus_amount).toFixed(2)}</span>
                      <span className="badge approved">Claimed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer activePage="redeem" onNavigate={navigate} />
    </div>
  );
}
