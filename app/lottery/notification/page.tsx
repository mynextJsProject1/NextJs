/* app/lottery/transaction/page.tsx */
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase/client";
import { useRouter } from "next/navigation";
import "./notification.css";

type CombinedTransaction = {
  id: string;
  amount: number;
  type: string;
  status: string;
  date: string;
  description: string;
};

export default function TransactionPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  
  const [transactions, setTransactions] = useState<CombinedTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup"); return; }

      const { data: txData } = await supabase
        .from("lottery_transactions")
        .select("*")
        .eq("user_id", user.id);

      const { data: withdrawData } = await supabase
        .from("lottery_withdraw_request")
        .select("*")
        .eq("user_id", user.id);

      const formattedTx: CombinedTransaction[] = (txData || []).map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.transaction_type, 
        status: t.status,
        date: t.created_at,
        description: t.description || "Wallet Transaction"
      }));

      const formattedWithdraw: CombinedTransaction[] = (withdrawData || []).map(w => ({
        id: w.id,
        amount: w.amount,
        type: "withdraw_request",
        status: w.status,
        date: w.created_at,
        description: `Bank: ${w.bank_name} (${w.bank_account_number})`
      }));

      const allData = [...formattedTx, ...formattedWithdraw].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(allData);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllData();

    // ✅ নতুন লজিক: রিয়েল-টাইম আপডেট (অ্যাডমিন অ্যাপ্রুভ করলে সাথে সাথে UI আপডেট হবে)
    const channel = supabase
      .channel("realtime_transactions")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lottery_transactions" },
        () => { void fetchAllData(); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lottery_withdraw_request" },
        () => { void fetchAllData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, router]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
    });
  };

  const getTxMeta = (type: string, status: string) => {
    switch (type) {
      case "ticket_buy":
        return { icon: "fa-ticket", color: "#ff4d4d", title: "Ticket Purchase", sign: "-" };
      case "deposit":
        return { icon: "fa-wallet", color: "#00e701", title: "Deposit", sign: "+" };
      case "win":
        return { icon: "fa-trophy", color: "#ffd700", title: "Lottery Win", sign: "+" };
      case "withdraw_request":
        return { icon: "fa-money-bill-transfer", color: "#f58220", title: "Withdraw Request", sign: "-" };
      default:
        return { icon: "fa-circle-info", color: "#b1bad3", title: "Transaction", sign: "" };
    }
  };

  if (loading) {
    return (
      <div className="tx-loading">
        <i className="fa-solid fa-circle-notch fa-spin"></i>
        <p>Loading Transactions...</p>
      </div>
    );
  }

  return (
    <div className="tx-page">
      <div className="tx-header">
        <h1>Transaction History</h1>
        <p>All your deposits, purchases, winnings, and withdrawals.</p>
      </div>

      {transactions.length === 0 ? (
        <div className="tx-empty">
          <i className="fa-solid fa-receipt"></i>
          <h3>No Transactions Yet</h3>
          <p>Your transaction history will appear here.</p>
        </div>
      ) : (
        <div className="tx-list">
          {transactions.map((tx) => {
            const meta = getTxMeta(tx.type, tx.status);
            return (
              <div key={tx.id} className="tx-card">
                <div className="tx-icon" style={{ color: meta.color, backgroundColor: `${meta.color}15` }}>
                  <i className={`fa-solid ${meta.icon}`}></i>
                </div>
                
                <div className="tx-details">
                  <div className="tx-top">
                    <h4 className="tx-title">{meta.title}</h4>
                    <span className="tx-amount" style={{ color: meta.sign === "+" ? "#00e701" : "#fff" }}>
                      {meta.sign} ৳{Number(tx.amount).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className="tx-desc">{tx.description}</p>
                  
                  <div className="tx-bottom">
                    <span className="tx-date">{formatDate(tx.date)}</span>
                    <span className={`tx-status ${tx.status}`}>
                      {tx.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
