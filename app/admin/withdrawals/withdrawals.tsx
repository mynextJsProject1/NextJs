/* app/admin/withdrawals/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./withdrawals.css";

type WithdrawTxn = {
  id: string;
  user_id: string;
  method_code: string;
  amount: number;
  destination_details: string;
  created_at: string;
  profiles: {
    full_name: string;
    mobile: string;
    balance: number;
  } | null;
  stats: {
    total_deposit: number;
    total_withdraw: number;
  } | null;
};

const methodImages: Record<string, string> = {
  bkash: "bkash.png",
  nagad: "nagad.png",
  rocket: "rocket.png",
  usdt: "usdt.png",
};
const paymentImageBase = process.env.NODE_ENV === "production" ? "/NextJs" : "";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawTxn[]>([]);
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    
    try {
      // ১. মেথড লোড
      const { data: methodData } = await supabase.from("payment_methods").select("method_code, method_name");
      if (methodData) {
        const methodMap: Record<string, string> = {};
        methodData.forEach(m => methodMap[m.method_code] = m.method_name);
        setMethods(methodMap);
      }

      // ২. পেন্ডিং উইথড্র লোড (জয়েন ছাড়া)
      const { data: txnData, error: txnError } = await supabase
        .from("wallet_transactions")
        .select("id, user_id, method_code, amount, destination_details, created_at")
        .eq("transaction_type", "withdrawal")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (txnError) throw txnError;

      if (txnData && txnData.length > 0) {
        const userIds = [...new Set(txnData.map(t => t.user_id))];

        // ৩. ইউজার প্রোফাইল লোড
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, mobile, balance")
          .in("id", userIds);

        const profileMap: Record<string, any> = {};
        profileData?.forEach(p => {
          profileMap[p.id] = { full_name: p.full_name, mobile: p.mobile, balance: p.balance };
        });

        // ৪. ইউজারের মোট ডিপোজিট ও উইথড্র হিসাব বের করা
        const statsMap: Record<string, { total_deposit: number, total_withdraw: number }> = {};
        
        for (const userId of userIds) {
          // মোট ডিপোজিট (approved)
          const { data: depData } = await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("user_id", userId)
            .eq("transaction_type", "deposit")
            .eq("status", "approved");
            
          // মোট উইথড্র (approved)
          const { data: witData } = await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("user_id", userId)
            .eq("transaction_type", "withdrawal")
            .eq("status", "approved");

          const totalDep = depData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
          const totalWit = witData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

          statsMap[userId] = { total_deposit: totalDep, total_withdraw: totalWit };
        }

        // ৫. ডাটা মার্জ
        const mergedData = txnData.map(txn => ({
          ...txn,
          profiles: profileMap[txn.user_id] || null,
          stats: statsMap[txn.user_id] || null
        }));

        setWithdrawals(mergedData as WithdrawTxn[]);
      } else {
        setWithdrawals([]);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`Error: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setMessage("");

    try {
      const { error } = await supabase
        .from("wallet_transactions")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;
      setMessage("Withdrawal approved successfully!");
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (txn: WithdrawTxn) => {
    if (!confirm("Are you sure? This will refund the amount to user's balance.")) return;
    setActionLoading(txn.id);
    setMessage("");

    try {
      // ১. স্ট্যাটাস rejected
      const { error: updateError } = await supabase
        .from("wallet_transactions")
        .update({ status: "rejected" })
        .eq("id", txn.id);

      if (updateError) throw updateError;

      // ২. ব্যালেন্স ফেরত দেওয়া (Reject হলে)
      if (txn.profiles) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ balance: Number(txn.profiles.balance) + Number(txn.amount) })
          .eq("id", txn.user_id);

        if (profileError) throw profileError;
      }

      setMessage("Withdrawal rejected and balance refunded.");
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Pending Withdrawals</h1>
      
      {message && <div className="admin-alert">{message}</div>}

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-circle-notch fa-spin" /> Loading withdrawals...
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="admin-empty">No pending withdrawals found.</div>
      ) : (
        <div className="withdraw-list">
          {withdrawals.map((txn) => (
            <div className="withdraw-card" key={txn.id}>
              
              <div className="withdraw-header">
                <div>
                  <strong className="withdraw-amount">৳ {txn.amount}</strong>
                  <div className="withdraw-method-wrap">
                    {methodImages[txn.method_code] && (
                      <img 
                        src={`${paymentImageBase}/images/payment/${methodImages[txn.method_code]}`} 
                        alt={txn.method_code} 
                        className="withdraw-method-logo"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <span className="withdraw-method">
                      {methods[txn.method_code] || txn.method_code.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="withdraw-date">
                  {new Date(txn.created_at).toLocaleString()}
                </div>
              </div>

              <div className="withdraw-user-info">
                <p><strong>User:</strong> {txn.profiles?.full_name || "Unknown"}</p>
                <p><strong>Mobile:</strong> {txn.profiles?.mobile || "N/A"}</p>
                
                <div className="withdraw-destination">
                  <div>
                    <span className="label">Destination:</span>
                    <span className="value">{txn.destination_details}</span>
                  </div>
                  <button className="copy-btn" onClick={() => copyToClipboard(txn.destination_details)}>
                    <i className="fa-regular fa-copy"></i>
                  </button>
                </div>
              </div>

              <div className="withdraw-stats">
                <div>
                  <span>Total Deposit</span>
                  <strong>৳ {txn.stats?.total_deposit.toLocaleString() || 0}</strong>
                </div>
                <div>
                  <span>Total Withdraw</span>
                  <strong>৳ {txn.stats?.total_withdraw.toLocaleString() || 0}</strong>
                </div>
              </div>

              <div className="withdraw-actions">
                <button 
                  className="btn-reject" 
                  onClick={() => handleReject(txn)}
                  disabled={actionLoading === txn.id}
                >
                  Reject
                </button>
                <button 
                  className="btn-approve" 
                  onClick={() => handleApprove(txn.id)}
                  disabled={actionLoading === txn.id}
                >
                  {actionLoading === txn.id ? "Processing..." : "Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
