/* app/refer/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./refer.css";

type Profile = {
  id: string;
  game_id: string;
  bonus_balance: number;
  referral_earnings: number;
};

type Claim = {
  id: string;
  deposit_amount: number;
  bonus_amount: number;
  status: string;
  created_at: string;
};

type TransferRequest = {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
};

// ✅ নতুন যোগ করা হলো: basePath চেক
const basePath = process.env.NODE_ENV === "production" ? "/NextJs" : "";

export default function ReferPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/signup/");
        return;
      }

      // ১. প্রোফাইল ডাটা
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, game_id, bonus_balance, referral_earnings")
        .eq("id", user.id)
        .single();
      
      if (profileData) setProfile(profileData as Profile);

      // ২. রেফারেল ক্লেইমস
      const { data: claimData } = await supabase
        .from("referral_claims")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      
      if (claimData) setClaims(claimData as Claim[]);

      // ৩. ট্রান্সফার রিকোয়েস্ট
      const { data: transferData } = await supabase
        .from("bonus_transfer_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false });
      
      if (transferData) setTransfers(transferData as TransferRequest[]);

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

  const copyReferralLink = () => {
    if (!profile) return;
    // ✅ এখানে basePath এবং শেষে / যোগ করা হয়েছে
    const link = `${window.location.origin}${basePath}/signup/?ref=${profile.game_id}`;
    navigator.clipboard.writeText(link);
    setMessage({ type: "success", text: "Referral link copied to clipboard!" });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const amount = Number(transferAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount." });
      return;
    }
    if (amount > Number(profile.bonus_balance)) {
      setMessage({ type: "error", text: "Insufficient bonus balance." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      // ১. রিকোয়েস্ট তৈরি
      const { error: reqError } = await supabase
        .from("bonus_transfer_requests")
        .insert({
          user_id: profile.id,
          amount: amount,
          status: "pending"
        });

      if (reqError) throw reqError;

      // ২. বোনাস ব্যালেন্স থেকে টাকা কেটে নেওয়া (যাতে ডাবল স্পেন্ড না হয়)
      const newBonusBalance = Number(profile.bonus_balance) - amount;
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ bonus_balance: newBonusBalance })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      setProfile({ ...profile, bonus_balance: newBonusBalance });
      setMessage({ type: "success", text: "Transfer request submitted! Please wait 24 hours for admin verification." });
      setShowTransferModal(false);
      setTransferAmount("");
      loadData();

    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return <span className="badge pending">Pending</span>;
    if (s === "approved") return <span className="badge approved">Approved</span>;
    if (s === "rejected") return <span className="badge rejected">Rejected</span>;
    return <span className="badge">{status}</span>;
  };

  const totalReferrals = claims.length;
  const pendingClaims = claims.filter(c => c.status === "pending").length;

  return (
    <div className="stake-app refer-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main refer-main">
        <h1 className="refer-title">Refer & Earn</h1>

        {message.text && (
          <div className={`refer-alert ${message.type}`}>{message.text}</div>
        )}

        {loading ? (
          <div className="refer-loading">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <span>Loading referral data...</span>
          </div>
        ) : profile && (
          <>
            {/* Stats */}
            <div className="refer-stats-grid">
              <div className="refer-stat-card">
                <span>Total Referrals</span>
                <strong>{totalReferrals}</strong>
              </div>
              <div className="refer-stat-card">
                <span>Pending Claims</span>
                <strong className="text-orange">{pendingClaims}</strong>
              </div>
              <div className="refer-stat-card">
                <span>Total Earnings</span>
                <strong className="text-green">৳ {Number(profile.referral_earnings).toFixed(2)}</strong>
              </div>
            </div>

            {/* Referral Link Box */}
            <div className="refer-link-card">
              <h3>Your Referral Link</h3>
              <p>Share this link with your friends. When they sign up and deposit at least ৳300, you will earn a commission.</p>
              <div className="refer-link-box">
                <input 
                  type="text" 
                  readOnly 
                  /* ✅ এখানেও basePath এবং / যোগ করা হয়েছে */
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}${basePath}/signup/?ref=${profile.game_id}`} 
                />
                <button onClick={copyReferralLink}>
                  <i className="fa-regular fa-copy"></i> Copy
                </button>
              </div>
            </div>

            {/* Bonus Balance Section */}
            <div className="refer-bonus-card">
              <div>
                <span>Bonus Wallet Balance</span>
                <strong>৳ {Number(profile.bonus_balance).toFixed(2)}</strong>
              </div>
              <button 
                className="transfer-btn"
                onClick={() => {
                  if (Number(profile.bonus_balance) <= 0) {
                    setMessage({ type: "error", text: "No bonus available to transfer." });
                    return;
                  }
                  setShowTransferModal(true);
                }}
              >
                Transfer to Main
              </button>
            </div>

            {/* Claim History */}
            <h2 className="refer-section-title">Referral History</h2>
            {claims.length === 0 ? (
              <div className="refer-empty">
                <i className="fa-solid fa-users"></i>
                <p>No referrals yet. Share your link to get started!</p>
              </div>
            ) : (
              <div className="refer-list">
                {claims.map(c => (
                  <div className="refer-item" key={c.id}>
                    <div className="refer-item-left">
                      <i className="fa-solid fa-user-plus"></i>
                      <div>
                        <strong>New User Referred</strong>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="refer-item-right">
                      <span className="claim-amount">+ ৳{Number(c.bonus_amount).toFixed(2)}</span>
                      {getStatusBadge(c.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Transfer History */}
            {transfers.length > 0 && (
              <>
                <h2 className="refer-section-title" style={{ marginTop: "24px" }}>Transfer Requests</h2>
                <div className="refer-list">
                  {transfers.map(t => (
                    <div className="refer-item" key={t.id}>
                      <div className="refer-item-left">
                        <i className="fa-solid fa-money-bill-transfer"></i>
                        <div>
                          <strong>Transfer to Main Balance</strong>
                          <span>{new Date(t.requested_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="refer-item-right">
                        <span className="claim-amount">৳{Number(t.amount).toFixed(2)}</span>
                        {getStatusBadge(t.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <Footer activePage="refer" onNavigate={navigate} />

      {/* Transfer Modal */}
      {showTransferModal && profile && (
        <div className="refer-modal-overlay">
          <div className="refer-modal">
            <div className="refer-modal-header">
              <h3>Transfer Bonus</h3>
              <button onClick={() => setShowTransferModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleTransferRequest}>
              <p style={{ fontSize: "0.85rem", color: "#9ca9a3", marginBottom: "16px" }}>
                Enter the amount you want to transfer to your main balance. 
                Please note: It will take 24 hours for admin verification before the funds are added to your main balance.
              </p>
              
              <div className="refer-input-group">
                <label>Amount (Max: ৳{Number(profile.bonus_balance).toFixed(2)})</label>
                <input 
                  type="number" 
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Enter amount"
                  max={profile.bonus_balance}
                  required
                />
              </div>

              <button type="submit" className="refer-modal-submit" disabled={submitting}>
                {submitting ? "Processing..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
