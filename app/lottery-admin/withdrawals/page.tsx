/* app/lottery-admin/withdrawals/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../lottery-admin.css";

type WithdrawalVerification = {
  id: string;
  user_id: string;
  withdrawal_amount: number;
  total_fee: number;
  sender_number: string;
  bank_trx_id: string;
  account_holder_name: string;
  account_number: string;
  routing_number: string;
  branch_name: string;
  bank_name: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    mobile: string;
    game_id: string;
    lottery_balance: number;
  } | null;
};

export default function LotteryAdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    
    try {
      // ১. পেন্ডিং উইথড্র ভেরিফিকেশন লোড করা
      const { data: verifyData, error: verifyError } = await supabase
        .from("withdrawal_verifications")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (verifyError) throw verifyError;

      if (verifyData && verifyData.length > 0) {
        // ২. ইউজারদের প্রোফাইল লোড করা
        const userIds = [...new Set(verifyData.map(v => v.user_id))];
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, mobile, game_id, lottery_balance")
          .in("id", userIds);

        const profileMap: Record<string, any> = {};
        profileData?.forEach(p => { profileMap[p.id] = p; });

        // ৩. ডাটা মার্জ করা
        const merged = verifyData.map(v => ({
          ...v,
          profiles: profileMap[v.user_id] || null
        }));

        setRequests(merged);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleApprove = async (req: WithdrawalVerification) => {
    setActionLoading(req.id);
    setMessage("");

    try {
      // ১. চেক করা ইউজারের কাছে পর্যাপ্ত লটারি ব্যালেন্স আছে কি না
      const currentBalance = Number(req.profiles?.lottery_balance || 0);
      if (currentBalance < req.withdrawal_amount) {
        throw new Error("User does not have sufficient lottery balance to complete this withdrawal.");
      }

      // ২. ইউজারের lottery_balance থেকে টাকা কাটা
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ lottery_balance: currentBalance - req.withdrawal_amount })
        .eq("id", req.user_id);
      
      if (profileError) throw profileError;

      // ৩. স্ট্যাটাস approved করা
      const { error: verifyError } = await supabase
        .from("withdrawal_verifications")
        .update({ status: "approved", processed_at: new Date().toISOString() })
        .eq("id", req.id);
      
      if (verifyError) throw verifyError;

      // ৪. লটারি উইথড্র এর হিস্ট্রি রাখা (wallet_transactions)
      await supabase.from("wallet_transactions").insert({
        user_id: req.user_id,
        transaction_type: "withdrawal",
        method_code: "bank",
        amount: req.withdrawal_amount,
        transaction_reference: `LOTTERY_WITHDRAW_${req.bank_trx_id}`,
        destination_details: `${req.bank_name} - ${req.account_number} (${req.account_holder_name})`,
        status: "approved",
      });

      setMessage(`Withdrawal of ৳${req.withdrawal_amount} approved and deducted from user's lottery balance.`);
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this withdrawal request?")) return;
    setActionLoading(id);
    setMessage("");

    try {
      const { error } = await supabase
        .from("withdrawal_verifications")
        .update({ status: "rejected", processed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      
      setMessage("Withdrawal request rejected.");
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <h1 className="la-title">Withdrawal Requests</h1>
      
      {message && <div className="la-alert">{message}</div>}

      {loading ? (
        <div className="la-loading"><i className="fa-solid fa-circle-notch fa-spin" /> Loading...</div>
      ) : requests.length === 0 ? (
        <div className="la-empty">No pending withdrawal requests found.</div>
      ) : (
        <div className="la-list">
          {requests.map((req) => (
            <div className="la-card" key={req.id}>
              <div className="la-card-header">
                <div>
                  <strong className="la-amount">৳ {Number(req.withdrawal_amount).toLocaleString()}</strong>
                  <span style={{ display: "block", fontSize: "12px", color: "#b1bad3", marginTop: "4px" }}>
                    Fee Paid: ৳ {Number(req.total_fee).toFixed(2)}
                  </span>
                </div>
                <div className="la-date">{new Date(req.created_at).toLocaleString()}</div>
              </div>

              <div className="la-user-info">
                <p><strong>User:</strong> {req.profiles?.full_name || "Unknown"} ({req.profiles?.game_id})</p>
                <p><strong>Mobile:</strong> {req.profiles?.mobile || "N/A"}</p>
                <p><strong>Lottery Balance:</strong> <span style={{ color: (req.profiles?.lottery_balance || 0) >= req.withdrawal_amount ? "#00e701" : "#ff4d4d" }}>৳ {Number(req.profiles?.lottery_balance || 0).toFixed(2)}</span></p>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #3a1f6b" }}>
                <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#ffd700", fontWeight: "bold" }}>Bank Details:</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", color: "#b1bad3" }}>
                  <span><strong>Bank:</strong> {req.bank_name}</span>
                  <span><strong>Holder:</strong> {req.account_holder_name}</span>
                  <span><strong>Acc No:</strong> {req.account_number}</span>
                  <span><strong>Routing:</strong> {req.routing_number}</span>
                  <span><strong>Branch:</strong> {req.branch_name}</span>
                  <span><strong>TrxID:</strong> {req.bank_trx_id}</span>
                  <span><strong>Sender No:</strong> {req.sender_number}</span>
                </div>
              </div>

              <div className="la-actions">
                <button className="la-btn-reject" onClick={() => handleReject(req.id)} disabled={actionLoading === req.id}>
                  Reject
                </button>
                <button 
                  className="la-btn-approve" 
                  onClick={() => handleApprove(req)} 
                  disabled={actionLoading === req.id || Number(req.profiles?.lottery_balance || 0) < req.withdrawal_amount}
                >
                  {actionLoading === req.id ? "Processing..." : "Approve Withdrawal"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
