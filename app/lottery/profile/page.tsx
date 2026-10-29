/* app/lottery/profile/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import "./profile.css";

type ProfileData = {
  full_name: string;
  game_id: string;
  mobile: string;
  balance: number;
  lottery_winnings: number;
  email_verified: boolean;
};

export default function LotteryProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup/"); return; }

      const { data } = await supabase.from("profiles").select("full_name, game_id, mobile, balance, lottery_winnings, email_verified").eq("id", user.id).single();
      if (data) setProfile(data as ProfileData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleTransferWinnings = async () => {
    if (!profile || profile.lottery_winnings <= 0) return;

    setTransferring(true);
    setMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const amountToTransfer = Number(profile.lottery_winnings);
      const newBalance = Number(profile.balance) + amountToTransfer;

      // ১. উইনিংস ০ করা এবং মেইন ব্যালেন্সে যোগ করা
      const { error } = await supabase.from("profiles").update({
        balance: newBalance,
        lottery_winnings: 0
      }).eq("id", user.id);

      if (error) throw error;

      // ২. ট্রান্সফারের একটি লগ রাখা (wallet_transactions)
      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        transaction_type: "deposit",
        method_code: "lottery_win",
        amount: amountToTransfer,
        transaction_reference: "LOTTERY_WIN_TRANSFER",
        status: "approved"
      });

      setMessage({ type: "success", text: `Successfully transferred ৳${amountToTransfer.toFixed(2)} to your main balance.` });
      loadData(); // রিফ্রেশ

    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setTransferring(false);
    }
  };

  if (loading) return <div className="lot-loading">Loading...</div>;
  if (!profile) return null;

  return (
    <div className="lot-profile-page">
      <h1 className="lot-page-title">My Profile</h1>

      {message.text && (
        <div className={`lot-alert ${message.type}`}>{message.text}</div>
      )}

      {/* Profile Card */}
      <div className="lot-user-card">
        <div className="lot-avatar"><i className="fa-solid fa-user"></i></div>
        <div className="lot-user-info">
          <h2>{profile.full_name}</h2>
          <span>{profile.game_id}</span>
          <span>📱 {profile.mobile}</span>
        </div>
      </div>

      {/* Lottery Winnings Card */}
      <div className="lot-winnings-card">
        <div>
          <span className="win-label">Lottery Winnings</span>
          <strong className="win-amount">৳ {Number(profile.lottery_winnings).toFixed(2)}</strong>
        </div>
        <button 
          onClick={handleTransferWinnings}
          disabled={profile.lottery_winnings <= 0 || transferring}
          className="lot-transfer-btn"
        >
          {transferring ? "Transferring..." : "Transfer to Main Balance"}
        </button>
      </div>

      {/* Menu List */}
      <div className="lot-profile-menu">
        <button onClick={() => router.push('/lottery/deposit')} className="lot-menu-item">
          <div className="menu-left"><i className="fa-solid fa-wallet text-green"></i> Deposit Funds</div>
          <i className="fa-solid fa-chevron-right"></i>
        </button>
        <button onClick={() => router.push('/lottery/withdraw')} className="lot-menu-item">
          <div className="menu-left"><i className="fa-solid fa-money-bill-transfer text-gold"></i> Withdraw Winnings</div>
          <i className="fa-solid fa-chevron-right"></i>
        </button>
        <button onClick={() => router.push('/lottery')} className="lot-menu-item">
          <div className="menu-left"><i className="fa-solid fa-ticket text-purple"></i> My Tickets</div>
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

    </div>
  );
}
