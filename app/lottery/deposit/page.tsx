/* app/lottery/deposit/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./deposit.css";

type PaymentMethod = {
  id: number;
  method_code: string;
  method_name: string;
  payment_number: string | null;
  usdt_address: string | null;
};

const methodImages: Record<string, string> = {
  bkash: "bkash.png",
  nagad: "nagad.png",
  rocket: "rocket.png",
  usdt: "usdt.png",
};
const paymentImageBase = process.env.NODE_ENV === "production" ? "/NextJs" : "";

export default function LotteryDepositPage() {
  const supabase = useMemo(() => createClient(), []);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [trxId, setTrxId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchMethods = async () => {
      const { data } = await supabase.from("payment_methods").select("*").eq("is_enabled", true).eq("deposit_enabled", true);
      if (data) setMethods(data);
      setLoading(false);
    };
    void fetchMethods();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;

    const numAmount = Number(amount);
    if (numAmount < 50) {
      setMessage({ type: "error", text: "Minimum deposit is 50 BDT." });
      return;
    }
    if (trxId.trim().length < 5) {
      setMessage({ type: "error", text: "Please enter a valid TrxID." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        transaction_type: "deposit",
        method_code: selectedMethod.method_code,
        amount: numAmount,
        transaction_reference: trxId.toUpperCase(),
        status: "pending",
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Deposit request submitted! Please wait for admin approval." });
      setAmount("");
      setTrxId("");
      setSelectedMethod(null);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="lot-loading">Loading...</div>;

  return (
    <div className="lot-deposit-page">
      <h1 className="lot-page-title">Deposit Funds</h1>
      
      {message.text && (
        <div className={`lot-alert ${message.type}`}>{message.text}</div>
      )}

      {!selectedMethod ? (
        <div className="lot-method-grid">
          {methods.map(m => (
            <button key={m.id} className="lot-method-card" onClick={() => setSelectedMethod(m)}>
              <div className="lot-method-img">
                <img src={`${paymentImageBase}/images/payment/${methodImages[m.method_code]}`} alt={m.method_name} onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
              <span>{m.method_name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="lot-deposit-form-card">
          <div className="lot-form-header">
            <button className="lot-back-btn" onClick={() => setSelectedMethod(null)}>
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h2>Pay via {selectedMethod.method_name}</h2>
          </div>

          <div className="lot-payment-instruction">
            <p>Send money to this number:</p>
            <div className="lot-number-box">
              <strong>{selectedMethod.payment_number || selectedMethod.usdt_address || "Not set"}</strong>
              <button onClick={() => navigator.clipboard.writeText(selectedMethod.payment_number || selectedMethod.usdt_address || "")}>
                <i className="fa-regular fa-copy"></i>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="lot-form">
            <div className="lot-input-group">
              <label>Amount (৳)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500" required />
            </div>
            <div className="lot-input-group">
              <label>Transaction ID (TrxID)</label>
              <input type="text" value={trxId} onChange={e => setTrxId(e.target.value.toUpperCase())} placeholder="Enter TrxID" required />
            </div>
            <button type="submit" className="lot-submit-btn" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Deposit"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
