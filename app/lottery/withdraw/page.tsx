/* app/lottery/withdraw/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import "./withdraw.css";

export default function LotteryWithdrawPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isVerified, setIsVerified] = useState<boolean | null>(null); // null = loading
  const [balance, setBalance] = useState(0);
  
  // উইথড্র ফর্ম ডাটা (ব্যাংক ডিটেইলস)
  const [formData, setFormData] = useState({
    amount: "",
    bank_name: "",
    bank_holder_name: "",
    bank_account_number: "",
    branch_name: "",
    routing_number: ""
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup/"); return; }

      // ১. ভেরিফিকেশন চেক করা (approved কিনা)
      const { data: verification } = await supabase
        .from("withdrawal_verifications")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .maybeSingle();

      if (!verification) {
        setIsVerified(false);
        setLoading(false);
        return; // ভেরিফাইড না হলে এখানেই থেমে যাবে
      }

      setIsVerified(true);

      // ২. ব্যালেন্স চেক করা (lottery_winnings)
      const { data: profile } = await supabase.from("profiles").select("lottery_winnings").eq("id", user.id).single();
      if (profile) setBalance(Number(profile.lottery_winnings) || 0);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = Number(formData.amount);

    if (withdrawAmount <= 0 || withdrawAmount > balance) {
      setMessage({ type: "error", text: "Invalid amount or insufficient balance." });
      return;
    }

    if (!formData.bank_name || !formData.bank_account_number || !formData.bank_holder_name) {
      setMessage({ type: "error", text: "Please fill all bank details." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // ১. lottery_withdraw_request টেবিলে ডাটা ইনসার্ট করা
      const { error: insertError } = await supabase.from("lottery_withdraw_request").insert({
        user_id: user.id,
        amount: withdrawAmount,
        bank_name: formData.bank_name,
        bank_holder_name: formData.bank_holder_name,
        bank_account_number: formData.bank_account_number,
        branch_name: formData.branch_name,
        routing_number: formData.routing_number,
        status: "pending"
      });

      if (insertError) throw insertError;

      // ২. ডাবল রিকোয়েস্ট আটকাতে profiles থেকে টাকা কেটে নেওয়া
      const newBalance = balance - withdrawAmount;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ lottery_winnings: newBalance })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setShowSuccessPopup(true);
      
      setTimeout(() => {
        setShowSuccessPopup(false);
        setFormData({ amount: "", bank_name: "", bank_holder_name: "", bank_account_number: "", branch_name: "", routing_number: "" });
        setBalance(newBalance); // লোকাল ব্যালেন্স আপডেট
      }, 3000);
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Something went wrong!" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#130a24', color: '#d4af37' }}>
      <div className="custom-spinner"></div>
      <h2 style={{ fontSize: '18px', fontWeight: 'normal', marginTop: '20px' }}>Checking Verification...</h2>
    </div>
  );

  // ================= ভেরিফাইড না হলে এই UI দেখাবে =================
  if (isVerified === false) {
    return (
      <div className="lot-withdraw-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
        <div style={{ backgroundColor: '#2a1f3d', padding: '30px', borderRadius: '10px', textAlign: 'center', maxWidth: '400px' }}>
          <i className="fa-solid fa-shield-halved" style={{ fontSize: '50px', color: '#ff6b6b', marginBottom: '20px' }}></i>
          <h2 style={{ color: 'white', marginBottom: '15px' }}>Not Verified</h2>
          <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', marginBottom: '25px' }}>
            You need to complete your verification process before withdrawing your lottery winnings.
          </p>
          <button 
            onClick={() => router.push("/lottery/verifications-details")} 
            style={{ backgroundColor: '#d4af37', color: '#1a1129', fontWeight: 'bold', padding: '12px 20px', borderRadius: '8px', border: 'none', width: '100%', cursor: 'pointer' }}
          >
            Go to Verification Page
          </button>
        </div>
      </div>
    );
  }

  // ================= ভেরিফাইড হলে এই UI দেখাবে =================
  return (
    <div className="lot-withdraw-page">
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .custom-spinner {
          border: 4px solid rgba(212, 175, 55, 0.2);
          border-top: 4px solid #d4af37;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }
      `}</style>

      <h1 className="lot-page-title" style={{ fontSize: '22px', lineHeight: '1.3', marginBottom: '20px' }}>
        Withdraw Your Winnings
      </h1>
      
      {message.text && (
        <div className={`lot-alert ${message.type}`} style={{ marginBottom: '15px', color: message.type === 'error' ? '#ff6b6b' : '#51cf66', fontSize: '14px' }}>
          {message.text}
        </div>
      )}

      <div className="lot-form-card" style={{ backgroundColor: '#221733', padding: '20px', borderRadius: '10px' }}>
        
        {/* ব্যালেন্স ডিসপ্লে */}
        <div style={{ backgroundColor: '#1a1129', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid #d4af37' }}>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}>Available Lottery Winnings</p>
          <h2 style={{ color: '#d4af37', margin: 0, fontSize: '28px' }}>৳{balance.toFixed(2)}</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lot-input-group" style={{ marginBottom: '15px' }}>
            <label>Withdraw Amount (৳)</label>
            <input 
              type="number" 
              value={formData.amount} 
              onChange={e => setFormData({...formData, amount: e.target.value})} 
              placeholder="Enter amount" 
              max={balance}
              required 
              style={{ padding: '12px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} 
            />
          </div>

          <h3 style={{ color: '#d4af37', fontSize: '16px', marginTop: '20px', marginBottom: '15px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
            Bank Account Details
          </h3>

          <div className="lot-input-group" style={{ marginBottom: '10px' }}>
            <label>Bank Name</label>
            <input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} placeholder="e.g. Dutch Bangla Bank" required style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
          </div>

          <div className="lot-input-group" style={{ marginBottom: '10px' }}>
            <label>Account Holder Name</label>
            <input type="text" value={formData.bank_holder_name} onChange={e => setFormData({...formData, bank_holder_name: e.target.value})} placeholder="Your Name" required style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
          </div>

          <div className="lot-input-group" style={{ marginBottom: '10px' }}>
            <label>Account Number</label>
            <input type="text" value={formData.bank_account_number} onChange={e => setFormData({...formData, bank_account_number: e.target.value})} placeholder="Bank Account Number" required style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div className="lot-input-group" style={{ flex: 1 }}>
              <label>Branch Name</label>
              <input type="text" value={formData.branch_name} onChange={e => setFormData({...formData, branch_name: e.target.value})} placeholder="Branch" required style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
            </div>
            <div className="lot-input-group" style={{ flex: 1 }}>
              <label>Routing Number</label>
              <input type="text" value={formData.routing_number} onChange={e => setFormData({...formData, routing_number: e.target.value})} placeholder="Routing No" required style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting || balance <= 0} 
            style={{ 
              backgroundColor: balance <= 0 ? '#555' : '#d4af37', 
              color: balance <= 0 ? '#aaa' : '#1a1129', 
              fontWeight: 'bold', padding: '14px', borderRadius: '8px', border: 'none', width: '100%', marginTop: '20px', cursor: balance <= 0 ? 'not-allowed' : 'pointer' 
            }}
          >
            {submitting ? "Submitting..." : balance <= 0 ? "No Winnings to Withdraw" : "Submit Withdrawal Request"}
          </button>
        </form>
      </div>

      {/* সাকসেস পপ-আপ অ্যানিমেশন */}
      {showSuccessPopup && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999 
        }}>
          <div style={{ 
            backgroundColor: '#2a1f3d', padding: '40px 30px', borderRadius: '15px', textAlign: 'center', 
            width: '80%', maxWidth: '350px',
            animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
          }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '70px', color: '#51cf66', marginBottom: '20px' }}></i>
            <h2 style={{ color: 'white', marginBottom: '10px', marginTop: 0 }}>Request Submitted!</h2>
            <p style={{ color: '#aaa', margin: 0 }}>Your withdrawal request is pending admin approval.</p>
          </div>
        </div>
      )}

    </div>
  );
}
