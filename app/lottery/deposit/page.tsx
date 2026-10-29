/* app/admin/deposits/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./deposits.css";

type DepositTxn = {
  id: string;
  user_id: string;
  method_code: string;
  amount: number;
  claimed_bonus_amount: number;
  required_turnover: number;
  transaction_reference: string;
  destination_details: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    mobile: string;
  } | null;
};

const methodImages: Record<string, string> = {
  bkash: "bkash.png", nagad: "nagad.png", rocket: "rocket.png", usdt: "usdt.png",
};
const paymentImageBase = process.env.NODE_ENV === "production" ? "/NextJs" : "";

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<DepositTxn[]>([]);
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    
    const { data: methodData } = await supabase.from("payment_methods").select("method_code, method_name");
    if (methodData) {
      const methodMap: Record<string, string> = {};
      methodData.forEach(m => methodMap[m.method_code] = m.method_name);
      setMethods(methodMap);
    }

    const { data: txnData, error } = await supabase
      .from("wallet_transactions")
      .select(`
        id, user_id, method_code, amount, claimed_bonus_amount, required_turnover, transaction_reference, destination_details, created_at,
        profiles ( full_name, mobile )
      `)
      .eq("transaction_type", "deposit")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && txnData) {
      setDeposits(txnData as unknown as DepositTxn[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (txn: DepositTxn) => {
    setActionLoading(txn.id);
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("wallet_transactions")
        .update({ status: "approved" })
        .eq("id", txn.id);

      if (updateError) throw updateError;

      // ✅ এখানে প্রোফাইল থেকে lottery_balance ও নেওয়া হচ্ছে
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("balance, total_required_turnover, lottery_balance")
        .eq("id", txn.user_id)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        // ✅ চেক করা হচ্ছে এটি লটারি ডিপোজিট কি না
        if (txn.destination_details === "LOTTERY_DEPOSIT") {
          await supabase
            .from("profiles")
            .update({
              lottery_balance: Number(profile.lottery_balance || 0) + Number(txn.amount)
            })
            .eq("id", txn.user_id);
        } else {
          // ক্যাসিনোর সাধারণ ডিপোজিট
          const totalCredit = Number(txn.amount) + Number(txn.claimed_bonus_amount || 0);
          await supabase
            .from("profiles")
            .update({
              balance: Number(profile.balance) + totalCredit,
              total_required_turnover: Number(profile.total_required_turnover) + Number(txn.required_turnover),
            })
            .eq("id", txn.user_id);
        }
      }

      setMessage("Deposit approved successfully!");
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this deposit?")) return;
    setActionLoading(id);
    setMessage("");

    const { error } = await supabase
      .from("wallet_transactions")
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
      <h1 className="admin-page-title">Pending Deposits</h1>
      {message && <div className="admin-alert">{message}</div>}

      {loading ? (
        <div className="admin-loading"><i className="fa-solid fa-circle-notch fa-spin" /> Loading deposits...</div>
      ) : deposits.length === 0 ? (
        <div className="admin-empty">No pending deposits found.</div>
      ) : (
        <div className="deposit-list">
          {deposits.map((txn) => {
            const isLottery = txn.destination_details === "LOTTERY_DEPOSIT";
            return (
              <div className="deposit-card" key={txn.id} style={{ borderColor: isLottery ? "#ffd700" : "#26352e" }}>
                <div className="deposit-header">
                  <div>
                    <strong className="deposit-amount">৳ {txn.amount}</strong>
                    {isLottery && <span style={{ fontSize: "10px", background: "#ffd700", color: "#000", padding: "2px 6px", borderRadius: "4px", marginLeft: "8px", fontWeight: "bold" }}>LOTTERY</span>}
                    <div className="deposit-method-wrap">
                      {methodImages[txn.method_code] && (
                        <img src={`${paymentImageBase}/images/payment/${methodImages[txn.method_code]}`} alt={txn.method_code} className="deposit-method-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      )}
                      <span className="deposit-method">{methods[txn.method_code] || txn.method_code.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="deposit-date">{new Date(txn.created_at).toLocaleString()}</div>
                </div>

                <div className="deposit-user-info">
                  <p><strong>User:</strong> {txn.profiles?.full_name || "Unknown"}</p>
                  <p><strong>Mobile:</strong> {txn.profiles?.mobile || "N/A"}</p>
                  <p><strong>TrxID:</strong> <span className="trx-text">{txn.transaction_reference}</span></p>
                </div>

                {txn.claimed_bonus_amount > 0 && !isLottery && (
                  <div className="deposit-bonus">
                    <span>Bonus: ৳ {txn.claimed_bonus_amount}</span>
                    <span>Req. Turnover: ৳ {txn.required_turnover}</span>
                  </div>
                )}

                <div className="deposit-actions">
                  <button className="btn-reject" onClick={() => handleReject(txn.id)} disabled={actionLoading === txn.id}>Reject</button>
                  <button className="btn-approve" onClick={() => handleApprove(txn)} disabled={actionLoading === txn.id}>
                    {actionLoading === txn.id ? "Processing..." : "Approve"}
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
