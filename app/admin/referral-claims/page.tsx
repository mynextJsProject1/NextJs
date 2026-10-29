/* app/admin/referral-claims/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./referral-claims.css";

type Claim = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  deposit_amount: number;
  bonus_amount: number;
  status: string;
  created_at: string;
  referrer_name?: string;
  referrer_game_id?: string;
  referred_name?: string;
  referred_game_id?: string;
};

export default function AdminReferralClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("referral_claims")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const mergedData = await Promise.all(data.map(async (claim) => {
        // রেফারারের ডাটা
        const { data: refUser } = await supabase.from("profiles").select("full_name, game_id").eq("id", claim.referrer_id).maybeSingle();
        // নতুন ইউজারের ডাটা
        const { data: newUser } = await supabase.from("profiles").select("full_name, game_id").eq("id", claim.referred_user_id).maybeSingle();
        
        return {
          ...claim,
          referrer_name: refUser?.full_name,
          referrer_game_id: refUser?.game_id,
          referred_name: newUser?.full_name,
          referred_game_id: newUser?.game_id,
        };
      }));
      setClaims(mergedData);
    } else {
      setClaims([]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleApprove = async (claim: Claim) => {
    setActionLoading(claim.id);
    setMessage("");
    
    try {
      // ১. ক্লেইম স্ট্যাটাস আপডেট
      const { error: claimError } = await supabase
        .from("referral_claims")
        .update({ status: "approved" })
        .eq("id", claim.id);
      if (claimError) throw claimError;

      // ২. রেফারারের bonus_balance বাড়ানো
      const { data: profile } = await supabase
        .from("profiles")
        .select("bonus_balance")
        .eq("id", claim.referrer_id)
        .single();
      
      if (profile) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ bonus_balance: Number(profile.bonus_balance) + Number(claim.bonus_amount) })
          .eq("id", claim.referrer_id);
        if (profileError) throw profileError;
      }

      setMessage("Claim approved! Bonus added to referrer's wallet.");
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this claim?")) return;
    setActionLoading(id);
    setMessage("");

    const { error } = await supabase.from("referral_claims").update({ status: "rejected" }).eq("id", id);
    if (!error) {
      setMessage("Claim rejected.");
      loadData();
    } else {
      setMessage(`Error: ${error.message}`);
    }
    setActionLoading(null);
  };

  return (
    <div>
      <h1 className="admin-page-title">Referral Claims</h1>
      {message && <div className="admin-alert">{message}</div>}

      {loading ? (
        <div className="admin-loading">Loading claims...</div>
      ) : claims.length === 0 ? (
        <div className="admin-empty">No pending referral claims found.</div>
      ) : (
        <div className="claims-list">
          {claims.map((claim) => (
            <div className="claim-card" key={claim.id}>
              <div className="claim-header">
                <span className="claim-date">{new Date(claim.created_at).toLocaleString()}</span>
                <span className="badge-pending">PENDING</span>
              </div>

              <div className="claim-users">
                <div className="user-box">
                  <span className="user-role">Referrer</span>
                  <strong>{claim.referrer_name}</strong>
                  <span className="user-id">{claim.referrer_game_id}</span>
                </div>
                <i className="fa-solid fa-arrow-right"></i>
                <div className="user-box">
                  <span className="user-role">New User</span>
                  <strong>{claim.referred_name}</strong>
                  <span className="user-id">{claim.referred_game_id}</span>
                </div>
              </div>

              <div className="claim-amounts">
                <div>
                  <span>Deposit Amount:</span>
                  <strong>৳ {Number(claim.deposit_amount).toLocaleString()}</strong>
                </div>
                <div>
                  <span>Bonus Amount:</span>
                  <strong className="text-green">৳ {Number(claim.bonus_amount).toLocaleString()}</strong>
                </div>
              </div>

              <div className="claim-actions">
                <button 
                  className="btn-reject" 
                  onClick={() => handleReject(claim.id)}
                  disabled={actionLoading === claim.id}
                >
                  Reject
                </button>
                <button 
                  className="btn-approve" 
                  onClick={() => handleApprove(claim)}
                  disabled={actionLoading === claim.id}
                >
                  {actionLoading === claim.id ? "Processing..." : "Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
