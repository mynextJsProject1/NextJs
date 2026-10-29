/* app/admin/bonus-transfers/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./bonus-transfers.css";

type TransferRequest = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  requested_at: string;
  full_name?: string;
  game_id?: string;
};

export default function AdminBonusTransfersPage() {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bonus_transfer_requests")
      .select("*")
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    if (data && data.length > 0) {
      const merged = await Promise.all(data.map(async (req) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, game_id")
          .eq("id", req.user_id)
          .maybeSingle();
        
        return {
          ...req,
          full_name: profile?.full_name || "Unknown",
          game_id: profile?.game_id || "Unknown"
        };
      }));
      setRequests(merged);
    } else {
      setRequests([]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleApprove = async (req: TransferRequest) => {
    setActionLoading(req.id);
    setMessage("");

    try {
      // ১. স্ট্যাটাস আপডেট
      const { error: reqError } = await supabase
        .from("bonus_transfer_requests")
        .update({ status: "approved", processed_at: new Date().toISOString() })
        .eq("id", req.id);
      if (reqError) throw reqError;

      // ২. প্রোফাইলে মেইন ব্যালেন্স এবং টার্নওভার আপডেট
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, total_required_turnover")
        .eq("id", req.user_id)
        .single();
      
      if (profile) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            balance: Number(profile.balance) + Number(req.amount),
            total_required_turnover: Number(profile.total_required_turnover) + Number(req.amount) // ১ গুণ টার্নওভার
          })
          .eq("id", req.user_id);
        if (profileError) throw profileError;
      }

      setMessage("Transfer approved successfully!");
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req: TransferRequest) => {
    if (!confirm("Reject this transfer? The bonus will be returned to the user's bonus wallet.")) return;
    setActionLoading(req.id);
    setMessage("");

    try {
      // ১. স্ট্যাটাস আপডেট
      const { error: reqError } = await supabase
        .from("bonus_transfer_requests")
        .update({ status: "rejected", processed_at: new Date().toISOString() })
        .eq("id", req.id);
      if (reqError) throw reqError;

      // ২. বোনাস ব্যালেন্স ফেরত দেওয়া
      const { data: profile } = await supabase
        .from("profiles")
        .select("bonus_balance")
        .eq("id", req.user_id)
        .single();
      
      if (profile) {
        await supabase
          .from("profiles")
          .update({ bonus_balance: Number(profile.bonus_balance) + Number(req.amount) })
          .eq("id", req.user_id);
      }

      setMessage("Transfer rejected and funds returned.");
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // ২৪ ঘণ্টা পার হয়েছে কি না চেক (শুধু ব্যাজ দেখানোর জন্য)
  const is24HoursPassed = (requestedAt: string) => {
    const requestTime = new Date(requestedAt).getTime();
    const now = new Date().getTime();
    return (now - requestTime) >= 24 * 60 * 60 * 1000;
  };

  return (
    <div>
      <h1 className="admin-page-title">Bonus Transfers</h1>
      {message && <div className="admin-alert">{message}</div>}

      {loading ? (
        <div className="admin-loading">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="admin-empty">No pending transfer requests found.</div>
      ) : (
        <div className="transfer-list">
          {requests.map((req) => {
            const isReady = is24HoursPassed(req.requested_at);
            return (
              <div className="transfer-card" key={req.id}>
                <div className="transfer-header">
                  <div>
                    <strong>{req.full_name}</strong>
                    <span className="transfer-id">{req.game_id}</span>
                  </div>
                  <span className="transfer-amount">৳ {Number(req.amount).toFixed(2)}</span>
                </div>
                
                <div className="transfer-time">
                  <i className="fa-regular fa-clock"></i>
                  Requested: {new Date(req.requested_at).toLocaleString()}
                  {!isReady && <span className="wait-badge">Wait 24h</span>}
                  {isReady && <span className="ready-badge">Ready</span>}
                </div>

                <div className="transfer-actions">
                  <button 
                    className="btn-reject" 
                    onClick={() => handleReject(req)}
                    disabled={actionLoading === req.id}
                  >
                    Reject
                  </button>
                  <button 
                    className="btn-approve" 
                    onClick={() => handleApprove(req)}
                    disabled={actionLoading === req.id} // <-- এখানে ডিজেবল সরিয়ে দেওয়া হয়েছে
                  >
                    {actionLoading === req.id ? "Processing..." : "Approve"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
