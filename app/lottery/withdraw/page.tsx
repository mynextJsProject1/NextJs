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
  const [balance, setBalance] = useState(0); // Lottery Winnings Balance
  
  // উইথড্র ফর্ম ডাটা (ব্যাংক ডিটেইলস)
  const [formData, setFormData] = useState({
    amount: "",
    bank_name: "",
    bank_holder_name: "",
    bank_account_number: "",
    branch_name: "",
    routing_number: ""
  });

  // ✅ নতুন স্টেট: Balance Transfer এর জন্য
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferMessage, setTransferMessage] = useState({ type: "", text: "" });
  const [showTransferSuccess, setShowTransferSuccess] = useState(false);
  
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

  // ✅ নতুন ফাংশন: Balance Transfer Logic
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountToTransfer = Number(transferAmount);

    if (amountToTransfer <= 0 || amountToTransfer > balance) {
      setTransferMessage({ type: "error", text: "Invalid amount or insufficient winnings." });
      return;
    }

    setTransferSubmitting(true);
    setTransferMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // ১. ইউজারের বর্তমান ক্যাসিনো ব্যালেন্স এবং টার্নওভার ডাটা আনা
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("balance, lottery_winnings, total_required_turnover")
        .eq("id", user.id)
        .single();

      if (fetchError || !profile) throw new Error("Failed to fetch profile data");

      const currentBalance = Number(profile.balance) || 0;
      const currentWinnings = Number(profile.lottery_winnings) || 0;
      const currentTurnover = Number(profile.total_required_turnover) || 0;

      // ২. নতুন ব্যালেন্স ক্যালকুলেশন
      const newWinnings = currentWinnings - amountToTransfer;
      const newBalance = currentBalance + amountToTransfer;
      
      // ✅ ১x টার্নওভার যোগ করা হচ্ছে (আপনার রুল অনুযায়ী)
      const newTurnover = currentTurnover + (amountToTransfer * 1);

      // ৩. profiles টেবিল আপডেট করা
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          lottery_winnings: newWinnings,
          balance: newBalance,
          total_required_turnover: newTurnover
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // ৪. lottery_transactions এ হিস্টরি সেভ করা
      await supabase.from("lottery_transactions").insert({
        user_id: user.id,
        amount: amountToTransfer,
        transaction_type: "transfer_out",
        description: "Transferred to Casino Balance",
        status: "completed"
      });

      // ৫. লোকাল স্টেট আপডেট ও সাকসেস মেসেজ
      setBalance(newWinnings);
      setShowTransferSuccess(true);
      
      setTimeout(() => {
        setShowTransferSuccess(false);
        setShowTransferModal(false);
        setTransferAmount("");
      }, 3000);

    } catch (err: any) {
      setTransferMessage({ type: "error", text: err.message || "Transfer failed!" });
    } finally {
      setTransferSubmitting(false);
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
        .quick-amt-btn {
          background: #1a1129;
          color: #d4af37;
          border: 1px solid #3a1f6b;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          flex: 1;
          transition: 0.2s;
        }
        .quick-amt-btn:hover {
          background: #3a1f6b;
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
        
        {/* ✅ ব্যালেন্স ডিসপ্লে এবং ট্রান্সফার বাটন */}
        <div style={{ backgroundColor: '#1a1129', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid #d4af37', position: 'relative' }}>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}>Available Lottery Winnings</p>
          <h2 style={{ color: '#d4af37', margin: 0, fontSize: '28px' }}>৳{balance.toFixed(2)}</h2>
          
          <button 
            onClick={() => setShowTransferModal(true)}
            style={{ 
              marginTop: '12px', backgroundColor: 'rgba(212, 175, 55, 0.15)', 
              color: '#d4af37', border: '1px solid #d4af37', padding: '8px 16px', 
              borderRadius: '20px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}
          >
            <i className="fa-solid fa-money-bill-transfer"></i> Balance Transfer
          </button>
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

      {/* ✅ নতুন যোগ করা Full-Screen Balance Transfer Modal */}
      {showTransferModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#130a24', zIndex: 9999, display: 'flex', flexDirection: 'column'
        }}>
          {/* হেডার */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #3a1f6b', backgroundColor: '#1a1129' }}>
            <button onClick={() => setShowTransferModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', marginRight: '15px', cursor: 'pointer' }}>
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h2 style={{ margin: 0, color: '#d4af37', fontSize: '18px' }}>Transfer to Casino</h2>
          </div>

          {/* বডি */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '5px' }}>Available Winnings</p>
              <h1 style={{ color: '#d4af37', fontSize: '32px', margin: 0 }}>৳{balance.toFixed(2)}</h1>
            </div>

            {transferMessage.text && (
              <div className={`lot-alert ${transferMessage.type}`} style={{ marginBottom: '15px', color: transferMessage.type === 'error' ? '#ff6b6b' : '#51cf66', fontSize: '14px', textAlign: 'center' }}>
                {transferMessage.text}
              </div>
            )}

            <form onSubmit={handleTransferSubmit}>
              <div className="lot-input-group" style={{ marginBottom: '20px' }}>
                <label style={{ color: '#b1bad3', fontSize: '13px', marginBottom: '8px', display: 'block' }}>Enter Amount to Transfer</label>
                <input 
                  type="number" 
                  value={transferAmount} 
                  onChange={e => setTransferAmount(e.target.value)} 
                  placeholder="Enter amount" 
                  max={balance}
                  required 
                  style={{ padding: '15px', borderRadius: '8px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #3a1f6b', fontSize: '18px', textAlign: 'center', fontWeight: 'bold' }} 
                />
              </div>

              {/* কুইক অ্যামাউন্ট বাটন */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '30px' }}>
                {[10000, 20000, 50000, 100000, 200000, 500000].map(amt => (
                  <button 
                    key={amt} 
                    type="button" 
                    onClick={() => setTransferAmount(amt.toString())}
                    className="quick-amt-btn"
                    style={{ flex: '1 1 30%', padding: '12px 0' }}
                  >
                    {amt >= 1000 ? `${amt / 1000}K` : amt}
                  </button>
                ))}
              </div>

              <button 
                type="submit" 
                disabled={transferSubmitting || Number(transferAmount) > balance || Number(transferAmount) <= 0}
                style={{ 
                  backgroundColor: (Number(transferAmount) > balance || Number(transferAmount) <= 0) ? '#3a1f6b' : '#d4af37', 
                  color: (Number(transferAmount) > balance || Number(transferAmount) <= 0) ? '#888' : '#1a1129', 
                  fontWeight: 'bold', padding: '16px', borderRadius: '8px', border: 'none', width: '100%', fontSize: '16px', cursor: (Number(transferAmount) > balance || Number(transferAmount) <= 0) ? 'not-allowed' : 'pointer' 
                }}
              >
                {transferSubmitting ? "Transferring..." : "Confirm Transfer"}
              </button>
              <p style={{ textAlign: 'center', color: '#888', fontSize: '11px', marginTop: '10px' }}>
                *Transferred amount will require 1x turnover to withdraw.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* সাকসেস পপ-আপ অ্যানিমেশন (উইথড্র) */}
      {showSuccessPopup && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10000 
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

      {/* ✅ নতুন যোগ করা সাকসেস পপ-আপ (ব্যালেন্স ট্রান্সফার) */}
      {showTransferSuccess && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10001 
        }}>
          <div style={{ 
            backgroundColor: '#2a1f3d', padding: '40px 30px', borderRadius: '15px', textAlign: 'center', 
            width: '80%', maxWidth: '350px',
            animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
          }}>
            <i className="fa-solid fa-money-bill-transfer" style={{ fontSize: '70px', color: '#00e701', marginBottom: '20px' }}></i>
            <h2 style={{ color: 'white', marginBottom: '10px', marginTop: 0 }}>Transfer Success!</h2>
            <p style={{ color: '#aaa', margin: 0 }}>৳{transferAmount} has been added to your Casino Balance.</p>
          </div>
        </div>
      )}

    </div>
  );
}
