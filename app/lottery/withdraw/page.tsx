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
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  
  // মডাল ওপেন/ক্লোজ করার স্টেট
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ফর্ম ডাটা
  const [formData, setFormData] = useState({
    account_number: "", // sender_number এর জায়গায় account_number করা হলো
    bank_trx_id: "", 
    method: ""
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // ফিক্সড উইথড্র অ্যামাউন্ট
  const withdrawalAmount = 500; 

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup/"); return; }

      // ১. ব্যালেন্স চেক
      const { data: profile } = await supabase.from("profiles").select("lottery_balance").eq("id", user.id).single();
      if (profile) setBalance(Number(profile.lottery_balance) || 0);

      // ২. ফি সেটিংস (আপনার টেবিলের নাম platform_settings)
      const { data: feeData } = await supabase.from("platform_settings").select("*").eq("id", 1).single();
      if (feeData) setFees(feeData);

      // ৩. পেমেন্ট মেথড (বিকাশ/নগদ ডিপোজিট নাম্বারের জন্য)
      const { data: methods } = await supabase.from("payment_methods").select("*").eq("deposit_enabled", true);
      if (methods) setPaymentMethods(methods);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  // ফি ক্যালকুলেশন
  const vatAmount = (withdrawalAmount * (Number(fees.vat_percentage) / 100));
  const totalFee = Number(fees.managing_cost) + Number(fees.team_cost) + Number(fees.processing_cost) + vatAmount;

  // মডাল সাবমিট হ্যান্ডলার
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_number || !formData.bank_trx_id || !formData.method) {
      setMessage({ type: "error", text: "Please fill all fields." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // withdrawal_verifications টেবিলে ডাটা ইনসার্ট
      const { error } = await supabase.from("withdrawal_verifications").insert({
        user_id: user.id,
        amount: withdrawalAmount,
        total_fee: totalFee,
        net_amount: withdrawalAmount - totalFee,
        managing_cost: fees.managing_cost,
        team_cost: fees.team_cost,
        processing_cost: fees.processing_cost,
        vat: vatAmount,
        account_number: formData.account_number, // sender_number এর জায়গায় account_number
        bank_trx_id: formData.bank_trx_id,
        method: formData.method,
        status: "pending"
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Verification submitted successfully! Admin will verify your payment." });
      setIsModalOpen(false);
      setFormData({ account_number: "", bank_trx_id: "", method: "" });
      
    } catch (err: any) {
      // যদি কোনো এরর হয় তবে মডালের ভেতরেই মেসেজটি দেখাবে
      setMessage({ type: "error", text: err.message || "Something went wrong!" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="lot-loading">Loading...</div>;

  return (
    <div className="lot-withdraw-page">
      <h1 className="lot-page-title">Withdraw Funds</h1>
      
      {/* পেইজের উপরের মেসেজ (সাকসেস হলে) */}
      {message.text && !isModalOpen && (
        <div className={`lot-alert ${message.type}`}>{message.text}</div>
      )}

      <div className="lot-balance-display">
        <span>Lottery Available Balance</span>
        <strong>৳ {balance.toFixed(2)}</strong>
      </div>

      <div className="lot-form-card">
        
        <div className="lot-fee-breakdown">
          <h4><i className="fa-solid fa-circle-info"></i> Verification Fee Breakdown</h4>
          <div className="fee-row"><span>Managing Cost:</span> <span>৳{fees.managing_cost}</span></div>
          <div className="fee-row"><span>Team Cost:</span> <span>৳{fees.team_cost}</span></div>
          <div className="fee-row"><span>Processing Cost:</span> <span>৳{fees.processing_cost}</span></div>
          <div className="fee-row"><span>VAT ({fees.vat_percentage}%):</span> <span>৳{vatAmount.toFixed(2)}</span></div>
          <div className="fee-row total"><span>Total Fee:</span> <span className="text-gold">৳{totalFee.toFixed(2)}</span></div>
          <p style={{marginTop: '10px', fontSize: '14px', color: '#ccc'}}>
            Withdrawal Amount: ৳{withdrawalAmount}
          </p>
        </div>

        <button 
          onClick={() => { setMessage({ type: "", text: "" }); setIsModalOpen(true); }} 
          className="lot-submit-btn"
          style={{ marginTop: '20px' }}
        >
          Complete Verification
        </button>
      </div>

      {/* পেমেন্ট মডাল (Popup) */}
      {isModalOpen && (
        <div className="lot-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="lot-modal-content" style={{
            backgroundColor: '#2a1f3d', padding: '20px', borderRadius: '10px', width: '90%', maxWidth: '400px',
            border: '1px solid #d4af37', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ color: '#d4af37', marginBottom: '15px' }}>Payment Verification</h3>
            
            {/* মডালের ভেতরে এরর মেসেজ দেখানোর ব্যবস্থা */}
            {message.text && (
              <div className={`lot-alert ${message.type}`} style={{ marginBottom: '10px', color: message.type === 'error' ? '#ff6b6b' : '#51cf66', fontSize: '14px' }}>
                {message.text}
              </div>
            )}

            <p style={{ fontSize: '14px', marginBottom: '15px' }}>
              Please send <strong>৳{totalFee.toFixed(2)}</strong> to our bKash/Nagad number:
            </p>

            <div style={{ marginBottom: '15px' }}>
              {paymentMethods.map((pm) => (
                <div key={pm.id} style={{ backgroundColor: '#1a1129', padding: '10px', borderRadius: '5px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{pm.method_name}</span>
                  <strong style={{ color: '#d4af37' }}>{pm.payment_number}</strong>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="lot-input-group">
                <label>Select Method</label>
                <select 
                  value={formData.method} 
                  onChange={e => setFormData({...formData, method: e.target.value})} 
                  required
                  style={{ padding: '10px', borderRadius: '5px', width: '100%', marginBottom: '10px', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }}
                >
                  <option value="">Select Method</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.method_code}>{pm.method_name}</option>
                  ))}
                </select>
              </div>

              <div className="lot-input-group">
                <label>Sender Number (bKash/Nagad)</label>
                <input 
                  type="text" 
                  value={formData.account_number} 
                  onChange={e => setFormData({...formData, account_number: e.target.value})} 
                  placeholder="01XXXXXXXXX" 
                  required 
                  style={{ padding: '10px', borderRadius: '5px', width: '100%', marginBottom: '10px', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }}
                />
              </div>

              <div className="lot-input-group">
                <label>Transaction ID (TrxID)</label>
                <input 
                  type="text" 
                  value={formData.bank_trx_id} 
                  onChange={e => setFormData({...formData, bank_trx_id: e.target.value})} 
                  placeholder="TrxID" 
                  required 
                  style={{ padding: '10px', borderRadius: '5px', width: '100%', marginBottom: '10px', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#555', color: 'white', borderRadius: '5px', border: 'none' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '10px', backgroundColor: '#d4af37', color: 'black', fontWeight: 'bold', borderRadius: '5px', border: 'none' }}>
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
