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
  
  // মডাল ওপেন/ক্লোজ করার স্টেট
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // NID ভেরিফিকেশন ফর্ম ডাটা
  const [formData, setFormData] = useState({
    full_name: "",
    father_name: "",
    mother_name: "",
    mobile: "",
    full_address: "",
    birth_date: "",
    zip_code: "",
    district: ""
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

      // ২. ফি সেটিংস
      const { data: feeData } = await supabase.from("platform_settings").select("*").eq("id", 1).single();
      if (feeData) setFees(feeData);

      // ৩. ইউজারের আগের ডিটেইলস থাকলে তা ফর্মে প্রি-ফিল করা (ঐচ্ছিক)
      const { data: userDetails } = await supabase.from("lottery_user_details").select("*").eq("user_id", user.id).maybeSingle();
      if (userDetails) {
        setFormData({
          full_name: userDetails.full_name || "",
          father_name: userDetails.father_name || "",
          mother_name: userDetails.mother_name || "",
          mobile: userDetails.mobile || "",
          full_address: userDetails.full_address || "",
          birth_date: userDetails.birth_date || "",
          zip_code: userDetails.zip_code || "",
          district: userDetails.district || ""
        });
      }
      
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

  // মডাল সাবমিট হ্যান্ডলার (NID সেভ + উইথড্র রিকোয়েস্ট সেভ)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.mobile || !formData.full_address) {
      setMessage({ type: "error", text: "Please fill the required NID details." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // ১. lottery_user_details টেবিলে ডাটা সেভ বা আপডেট করা (Upsert)
      const { error: userError } = await supabase.from("lottery_user_details").upsert({
        user_id: user.id,
        mobile: formData.mobile,
        full_name: formData.full_name,
        father_name: formData.father_name,
        mother_name: formData.mother_name,
        full_address: formData.full_address,
        birth_date: formData.birth_date || null,
        zip_code: formData.zip_code,
        district: formData.district,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (userError) throw new Error("Failed to save user details: " + userError.message);

      // ২. withdrawal_verifications টেবিলে ডাটা ইনসার্ট
      const { error: withdrawError } = await supabase.from("withdrawal_verifications").insert({
        user_id: user.id,
        amount: withdrawalAmount,
        total_fee: totalFee,
        net_amount: withdrawalAmount - totalFee,
        managing_cost: fees.managing_cost,
        team_cost: fees.team_cost,
        processing_cost: fees.processing_cost,
        vat: vatAmount,
        method: "NID Verification", // যেহেতু এখন TrxID নেই, তাই মেথড NID করা হলো
        account_number: formData.mobile, // ইউজারের মোবাইল নম্বরটি একাউন্ট নাম্বার হিসেবে সেভ হলো
        status: "pending"
      });

      if (withdrawError) throw withdrawError;

      setMessage({ type: "success", text: "Verification submitted successfully! Admin will verify your details." });
      setIsModalOpen(false);
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Something went wrong!" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="lot-loading">Loading...</div>;

  return (
    <div className="lot-withdraw-page">
      <h1 className="lot-page-title">Withdraw Funds</h1>
      
      {/* সাকসেস মেসেজ */}
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

      {/* NID ভেরিফিকেশন মডাল (Popup) */}
      {isModalOpen && (
        <div className="lot-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="lot-modal-content" style={{
            backgroundColor: '#2a1f3d', padding: '20px', borderRadius: '10px', width: '90%', maxWidth: '400px',
            border: '1px solid #d4af37', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ color: '#d4af37', marginBottom: '15px' }}>NID Verification</h3>
            
            {message.text && (
              <div className={`lot-alert ${message.type}`} style={{ marginBottom: '10px', color: message.type === 'error' ? '#ff6b6b' : '#51cf66', fontSize: '14px' }}>
                {message.text}
              </div>
            )}

            <p style={{ fontSize: '14px', marginBottom: '15px', color: '#aaa' }}>
              Please provide your real NID information. This information is required to process your withdrawal.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="lot-input-group" style={{ marginBottom: '10px' }}>
                <label>Full Name (as per NID)</label>
                <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Your Full Name" required style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
              </div>

              <div className="lot-input-group" style={{ marginBottom: '10px' }}>
                <label>Mobile Number</label>
                <input type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="01XXXXXXXXX" required style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
              </div>

              <div className="lot-input-group" style={{ marginBottom: '10px' }}>
                <label>Father's Name</label>
                <input type="text" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} placeholder="Father's Name" style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
              </div>

              <div className="lot-input-group" style={{ marginBottom: '10px' }}>
                <label>Mother's Name</label>
                <input type="text" value={formData.mother_name} onChange={e => setFormData({...formData, mother_name: e.target.value})} placeholder="Mother's Name" style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
              </div>

              <div className="lot-input-group" style={{ marginBottom: '10px' }}>
                <label>Birth Date</label>
                <input type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div className="lot-input-group" style={{ flex: 1 }}>
                  <label>District</label>
                  <input type="text" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} placeholder="District" style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
                </div>
                <div className="lot-input-group" style={{ flex: 1 }}>
                  <label>Zip Code</label>
                  <input type="text" value={formData.zip_code} onChange={e => setFormData({...formData, zip_code: e.target.value})} placeholder="Zip Code" style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
                </div>
              </div>

              <div className="lot-input-group" style={{ marginBottom: '10px' }}>
                <label>Full Address</label>
                <textarea value={formData.full_address} onChange={e => setFormData({...formData, full_address: e.target.value})} placeholder="Your Full Address" required rows={2} style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }} />
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
