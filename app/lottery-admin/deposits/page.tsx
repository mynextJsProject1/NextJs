/* app/lottery-admin/deposits/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../lottery-admin.css";

type DepositTxn = {
  id: string;
  user_id: string;
  method_code: string;
  amount: number;
  transaction_reference: string;
  description: string | null; 
  created_at: string;
  profiles: {
    full_name: string;
    mobile: string;
  } | null;
};

const methodImages: Record<string, string> = {
  bkash: "bkash.png", nagad: "nagad.png", rocket: "rocket.png", usdt: "usdt.png",
};

// ইমেজ পাথ
const paymentImageBase = ""; 

export default function LotteryAdminDepositsPage() {
  const [deposits, setDeposits] = useState<DepositTxn[]>([]);
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    
    try {
      const { data: methodData } = await supabase.from("payment_methods").select("method_code, method_name");
      if (methodData) {
        const methodMap: Record<string, string> = {};
        methodData.forEach(m => methodMap[m.method_code] = m.method_name);
        setMethods(methodMap);
      }

      const { data: txnData, error: txnError } = await supabase
        .from("lottery_transactions")
        .select("id, user_id, method_code, amount, transaction_reference, description, created_at")
        .eq("transaction_type", "deposit")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (txnError) throw txnError;

      if (txnData && txnData.length > 0) {
        const userIds = [...new Set(txnData.map(t => t.user_id))];

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, mobile")
          .in("id", userIds);

        if (profileError) throw profileError;

        const profileMap: Record<string, { full_name: string, mobile: string }> = {};
        profileData?.forEach(p => {
          profileMap[p.id] = { full_name: p.full_name, mobile: p.mobile };
        });

        const mergedData = txnData.map(txn => ({
          ...txn,
          profiles: profileMap[txn.user_id] || null
        }));

        setDeposits(mergedData as DepositTxn[]);
      } else {
        setDeposits([]);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`Error loading data: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (txn: DepositTxn) => {
    setActionLoading(txn.id);
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("lottery_transactions")
        .update({ status: "completed" })
        .eq("id", txn.id);

      if (updateError) throw updateError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("lottery_balance")
        .eq("id", txn.user_id)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        const { error: updateProfileError } = await supabase
          .from("profiles")
          .update({
            lottery_balance: Number(profile.lottery_balance || 0) + Number(txn.amount)
          })
          .eq("id", txn.user_id);
          
        if (updateProfileError) throw updateProfileError;
      }

      setMessage(`Approved! ৳${txn.amount} added to user's lottery balance.`);
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this lottery deposit?")) return;
    setActionLoading(id);
    setMessage("");

    const { error } = await supabase
      .from("lottery_transactions")
      .update({ status: "rejected" })
      .eq("id", id);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Deposit rejected.");
      loadData();
    }
    setActionLoading(null);
  };

  return (
    <div>
      <h1 className="la-title">Lottery Deposits</h1>
      
      {message && <div className="la-alert">{message}</div>}

      {loading ? (
        <div className="la-loading"><i className="fa-solid fa-circle-notch fa-spin" /> Loading...</div>
      ) : deposits.length === 0 ? (
        <div className="la-empty">No pending lottery deposits found.</div>
      ) : (
        <div className="la-list">
          {deposits.map((txn) => (
            <div className="la-card" key={txn.id}>
              <div className="la-card-header">
                <div>
                  <strong className="la-amount">৳ {txn.amount}</strong>
                  <div className="la-method">
                    {methodImages[txn.method_code] && (
                      <img 
                        src={`${paymentImageBase}/images/payment/${methodImages[txn.method_code]}`} 
                        alt="logo" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                      />
                    )}
                    <span>{methods[txn.method_code] || txn.method_code.toUpperCase()}</span>
                  </div>
                </div>
                <div className="la-date">{new Date(txn.created_at).toLocaleString()}</div>
              </div>

              <div className="la-user-info">
                <p><strong>User:</strong> {txn.profiles?.full_name || "Unknown"}</p>
                <p><strong>Mobile:</strong> {txn.profiles?.mobile || "N/A"}</p>
                <p><strong>TrxID:</strong> <span className="la-trx">{txn.transaction_reference}</span></p>
              </div>

              <div className="la-actions">
                <button className="la-btn-reject" onClick={() => handleReject(txn.id)} disabled={actionLoading === txn.id}>Reject</button>
                <button className="la-btn-approve" onClick={() => handleApprove(txn)} disabled={actionLoading === txn.id}>
                  {actionLoading === txn.id ? "Processing..." : "Approve Deposit"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
