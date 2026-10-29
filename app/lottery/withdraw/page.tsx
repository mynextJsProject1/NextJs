/* app/lottery/withdraw/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import "./withdraw.css";

export default function LotteryWithdrawPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [balance, setBalance] = useState(0);
  const [fees, setFees] = useState({
    managing_cost: 0, team_cost: 0, processing_cost: 0, vat_percentage: 0
  });
  
  const [amount, setAmount] = useState("");
  const [formData, setFormData] = useState({
    sender_number: "", bank_trx_id: "", account_holder_name: "", 
    account_number: "", routing_number: "", branch_name: "", bank_name: ""
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup/"); return; }

      const { data: profile } = await supabase.from("profiles").select("balance").eq("id", user.id).single();
      if (profile) setBalance(Number(profile.balance));

      const { data: feeData } = await supabase.from("withdrawal_fee_settings").select("*").eq("is_active", true).maybeSingle();
      if (feeData) setFees(feeData);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (numAmount < 500) {
      setMessage({ type: "error", text: "Minimum withdrawal amount is 500 BDT." });
      return;
    }
    if (numAmount > balance) {
      setMessage({ type: "error", text: "Insufficient balance." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const totalFee = Number(fees.managing_cost) + Number(fees.team_cost) + Number(fees.processing_cost) + (numAmount * (Number(fees.vat_percentage) / 100));

      const { error } = await supabase.from("withdrawal_verifications").insert({
        user_id: user.id,
        withdrawal_amount: numAmount,
        total_fee: totalFee,
        sender_number: formData.sender_number,
        bank_trx_id: formData.bank_trx_id,
        account_holder_name: formData.account_holder_name,
        account_number: formData.account_number,
        routing_number: formData.routing_number,
        branch_name: formData.branch_name,
        bank_name: formData.bank_name,
        status: "pending"
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Verification submitted successfully! Admin will verify your payment and process the withdrawal." });
      setAmount("");
      setFormData({ sender_number: "", bank_trx_id: "", account_holder_name: "", account_number: "", routing_number: "", branch_name: "", bank_name: "" });
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const totalFee = amount ? (Number(fees.managing_cost) + Number(fees.team_cost) + Number(fees.processing_cost) + (Number(amount) * (Number(fees.vat_percentage) / 100))).toFixed(2) : "0.00";

  if (loading) return <div className="lot-loading">Loading...</div>;

  return (
    <div className="lot-withdraw-page">
      <h1 className="lot-page-title">Withdraw Funds</h1>
      
      {message.text && (
        <div className={`lot-alert ${message.type}`}>{message.text}</div>
      )}

      <div className="lot-balance-display">
        <span>Available Balance</span>
        <strong>৳ {balance.toFixed(2)}</strong>
      </div>

      <form onSubmit={handleSubmit} className="lot-form-card">
        <div className="lot-input-group">
          <label>Withdrawal Amount (৳)</label>
          <input 
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            placeholder="Min 500 BDT" 
            required 
          />
        </div>

        {amount && Number(amount) >= 500 && (
          <div className="lot-fee-breakdown">
            <h4><i className="fa-solid fa-circle-info"></i> Verification Fee Breakdown</h4>
            <div className="fee-row"><span>Managing Cost:</span> <span>৳{fees.managing_cost}</span></div>
            <div className="fee-row"><span>Team Cost:</span> <span>৳{fees.team_cost}</span></div>
            <div className="fee-row"><span>Processing Cost:</span> <span>৳{fees.processing_cost}</span></div>
            <div className="fee-row"><span>VAT ({fees.vat_percentage}%):</span> <span>৳{(Number(amount) * (Number(fees.vat_percentage) / 100)).toFixed(2)}</span></div>
            <div className="fee-row total"><span>Total Fee:</span> <span className="text-gold">৳{totalFee}</span></div>
            
            <p className="fee-instruction">
              Please send <strong>৳{totalFee}</strong> to our bKash/Nagad number: <strong>017XXXXXXXX</strong> (Agent).
              After sending, fill up the details below.
            </p>
          </div>
        )}

        <div className="lot-bank-details">
          <h4>Verification Details</h4>
          
          <div className="lot-input-group">
            <label>Sender Number (bKash/Nagad)</label>
            <input type="text" value={formData.sender_number} onChange={e => setFormData({...formData, sender_number: e.target.value})} placeholder="01XXXXXXXXX" required />
          </div>
          <div className="lot-input-group">
            <label>Bank TrxID</label>
            <input type="text" value={formData.bank_trx_id} onChange={e => setFormData({...formData, bank_trx_id: e.target.value})} placeholder="Transaction ID" required />
          </div>
          <div className="lot-input-group">
            <label>Bank Name</label>
            <input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} placeholder="e.g. Dutch Bangla Bank" required />
          </div>
          <div className="lot-input-group">
            <label>Account Holder Name</label>
            <input type="text" value={formData.account_holder_name} onChange={e => setFormData({...formData, account_holder_name: e.target.value})} required />
          </div>
          <div className="lot-input-group">
            <label>Account Number</label>
            <input type="text" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} required />
          </div>
          <div className="lot-input-group">
            <label>Routing Number</label>
            <input type="text" value={formData.routing_number} onChange={e => setFormData({...formData, routing_number: e.target.value})} required />
          </div>
          <div className="lot-input-group">
            <label>Branch Name</label>
            <input type="text" value={formData.branch_name} onChange={e => setFormData({...formData, branch_name: e.target.value})} required />
          </div>
        </div>

        <button type="submit" className="lot-submit-btn" disabled={submitting || !amount || Number(amount) < 500}>
          {submitting ? "Submitting..." : "Complete Verification"}
        </button>
      </form>
    </div>
  );
}
