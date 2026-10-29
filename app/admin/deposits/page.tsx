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
  destination_details: string | null; // নতুন যোগ করা হলো
  created_at: string;
  profiles: {
    full_name: string;
    mobile: string;
  } | null;
};

// --- লোগো ম্যাপিং ---
const methodImages: Record<string, string> = {
  bkash: "bkash.png",
  nagad: "nagad.png",
  rocket: "rocket.png",
  usdt: "usdt.png",
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
    setMessage("");
    
    try {
      // ১. পেমেন্ট মেথড লোড করা
      const { data: methodData } = await supabase.from("payment_methods").select("method_code, method_name");
      if (methodData) {
        const methodMap: Record<string, string> = {};
        methodData.forEach(m => methodMap[m.method_code] = m.method_name);
        setMethods(methodMap);
      }

      // ২. শুধু পেন্ডিং ডিপোজিটগুলো লোড করা (লটারি ডিপোজিট বাদ দিয়ে)
      const { data: txnData, error: txnError } = await supabase
        .from("wallet_transactions")
        .select("id, user_id, method_code, amount, claimed_bonus_amount, required_turnover, transaction_reference, destination_details, created_at")
        .eq("transaction_type", "deposit")
        .eq("status", "pending")
        .or('destination_details.neq.LOTTERY_DEPOSIT,destination_details.is.null') // ✅ ফিল্টার: লটারি বাদ দিবে
        .order("created_at", { ascending: false });

      if (txnError) throw txnError;

      if (txnData && txnData.length > 0) {
        // ৩. ইউজারদের আইডি বের করা
        const userIds = [...new Set(txnData.map(t => t.user_id))];

        // ৪. ওই ইউজারদের প্রোফাইল ডাটা আলাদাভাবে লোড করা
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, mobile")
          .in("id", userIds);

        if (profileError) console.error("Profile fetch error:", profileError);

        // ৫. ইউজারদের ডাটা একটি Map-এ সেভ করা
        const profileMap: Record<string, { full_name: string, mobile: string }> = {};
        profileData?.forEach(p => {
          profileMap[p.id] = { full_name: p.full_name, mobile: p.mobile };
        });

        // ৬. ডিপোজিটের সাথে ইউজারের ডাটা মিলিয়ে নেওয়া (Merge)
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (txn: DepositTxn) => {
    setActionLoading(txn.id);
    setMessage("");

    try {
      // ১. ট্রানজেকশন আপডেট (approved)
      const { error: updateError } = await supabase
        .from("wallet_transactions")
        .update({ status: "approved" })
        .eq("id", txn.id);

      if (updateError) throw updateError;

      // ২. ইউজারের ব্যালেন্স ও টার্নওভার আপডেট
      const totalCredit = Number(txn.amount) + Number(txn.claimed_bonus_amount || 0);
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("balance, total_required_turnover")
        .eq("id", txn.user_id)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        const { error: updateProfileError } = await supabase
          .from("profiles")
          .update({
            balance: Number(profile.balance) + totalCredit,
            total_required_turnover: Number(profile.total_required_turnover) + Number(txn.required_turnover),
          })
          .eq("id", txn.user_id);

        if (updateProfileError) throw updateProfileError;
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

    try {
      const { error } = await supabase
        .from("wallet_transactions")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;
      
      setMessage("Deposit rejected.");
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Pending Deposits</h1>
      
      {message && <div className="admin-alert">{message}</div>}

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-circle-notch fa-spin" /> Loading deposits...
        </div>
      ) : deposits.length === 0 ? (
        <div className="admin-empty">No pending deposits found.</div>
      ) : (
        <div className="deposit-list">
          {deposits.map((txn) => (
            <div className="deposit-card" key={txn.id}>
              <div className="deposit-header">
                <div>
                  <strong className="deposit-amount">৳ {txn.amount}</strong>
                  
                  {/* লোগো ও মেথডের নাম */}
                  <div className="deposit-method-wrap">
                    {methodImages[txn.method_code] && (
                      <img
                        src={`${paymentImageBase}/images/payment/${methodImages[txn.method_code]}`}
                        alt={txn.method_code}
                        className="deposit-method-logo"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <span className="deposit-method">
                      {methods[txn.method_code] || txn.method_code.toUpperCase()}
                    </span>
                  </div>

                </div>
                <div className="deposit-date">
                  {new Date(txn.created_at).toLocaleString()}
                </div>
              </div>

              <div className="deposit-user-info">
                <p><strong>User:</strong> {txn.profiles?.full_name || "Unknown User"}</p>
                <p><strong>Mobile:</strong> {txn.profiles?.mobile || "N/A"}</p>
                <p><strong>TrxID:</strong> <span className="trx-text">{txn.transaction_reference}</span></p>
              </div>

              {txn.claimed_bonus_amount > 0 && (
                <div className="deposit-bonus">
                  <span>Bonus: ৳ {txn.claimed_bonus_amount}</span>
                  <span>Req. Turnover: ৳ {txn.required_turnover}</span>
                </div>
              )}

              <div className="deposit-actions">
                <button 
                  className="btn-reject" 
                  onClick={() => handleReject(txn.id)}
                  disabled={actionLoading === txn.id}
                >
                  Reject
                </button>
                <button 
                  className="btn-approve" 
                  onClick={() => handleApprove(txn)}
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
