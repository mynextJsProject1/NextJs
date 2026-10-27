/* app/admin/turnover/page.tsx */
"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./turnover-admin.css";

type UserProfile = {
  id: string;
  full_name: string;
  mobile: string;
  balance: number;
  total_required_turnover: number;
  total_completed_turnover: number;
};

type DepositTxn = {
  id: string;
  amount: number;
  required_turnover: number;
  completed_turnover: number;
  turnover_status: string;
  status: string;
};

export default function AdminTurnoverPage() {
  const [searchMobile, setSearchMobile] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [deposits, setDeposits] = useState<DepositTxn[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const [addAmount, setAddAmount] = useState("");
  const [note, setNote] = useState("");

  const supabase = createClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchMobile) return;

    setLoading(true);
    setMessage("");
    setUser(null);
    setDeposits([]);

    try {
      // ১. ইউজার খোঁজা
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("mobile", searchMobile)
        .single();

      if (profileError || !profileData) throw new Error("User not found with this mobile number.");
      setUser(profileData as UserProfile);

      // ২. পেন্ডিং ডিপোজিট লোড করা (যেগুলোর টার্নওভার এখনো শেষ হয়নি)
      const { data: txnData, error: txnError } = await supabase
        .from("wallet_transactions")
        .select("id, amount, required_turnover, completed_turnover, turnover_status, status")
        .eq("user_id", profileData.id)
        .eq("transaction_type", "deposit")
        .eq("status", "approved")
        .eq("turnover_status", "pending")
        .order("created_at", { ascending: true }); // পুরোনো থেকে নতুন

      if (txnError) throw txnError;
      setDeposits(txnData as DepositTxn[]);

    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustTurnover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !addAmount || Number(addAmount) <= 0) return;

    setActionLoading(true);
    setMessage("");

    try {
      const adjustValue = Number(addAmount);
      
      // ১. profiles টেবিলে সামগ্রিক completed turnover বাড়ানো
      const newCompleted = Number(user.total_completed_turnover) + adjustValue;
      
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ total_completed_turnover: newCompleted })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // ২. wallet_transactions আপডেট করা (সিরিয়ালি)
      let remainingAdjust = adjustValue;
      const updatedDeposits = [...deposits];

      for (let i = 0; i < updatedDeposits.length; i++) {
        if (remainingAdjust <= 0) break;

        const dep = updatedDeposits[i];
        const depRemaining = Number(dep.required_turnover) - Number(dep.completed_turnover);

        if (remainingAdjust >= depRemaining) {
          // পুরো ডিপোজিটের টার্নওভার শেষ হয়ে গেল
          await supabase
            .from("wallet_transactions")
            .update({
              completed_turnover: dep.required_turnover,
              turnover_status: 'completed'
            })
            .eq("id", dep.id);
          
          remainingAdjust -= depRemaining;
          dep.completed_turnover = dep.required_turnover;
          dep.turnover_status = 'completed';
        } else {
          // আংশিক শেষ হলো
          const newDepCompleted = Number(dep.completed_turnover) + remainingAdjust;
          await supabase
            .from("wallet_transactions")
            .update({ completed_turnover: newDepCompleted })
            .eq("id", dep.id);
          
          dep.completed_turnover = newDepCompleted;
          remainingAdjust = 0;
        }
      }

      // ৩. turnover_history টেবিলে লগ সেভ করা
      await supabase.from("turnover_history").insert({
        user_id: user.id,
        amount: adjustValue,
        turnover_type: 'add',
        source: 'admin_manual',
        description: note || 'Manual turnover addition by admin'
      });

      setMessage(`Successfully added ৳${adjustValue} turnover.`);
      setAddAmount("");
      setNote("");
      
      // ইউজার ডাটা রিফ্রেশ
      setUser({ ...user, total_completed_turnover: newCompleted });
      
      // পেন্ডিং লিস্ট রিফ্রেশ
      const { data: refreshTxn } = await supabase
        .from("wallet_transactions")
        .select("id, amount, required_turnover, completed_turnover, turnover_status, status")
        .eq("user_id", user.id)
        .eq("transaction_type", "deposit")
        .eq("status", "approved")
        .eq("turnover_status", "pending")
        .order("created_at", { ascending: true });
        
      if (refreshTxn) setDeposits(refreshTxn as DepositTxn[]);

    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Turnover Management</h1>
      
      {message && <div className="admin-alert">{message}</div>}

      {/* Search Form */}
      <div className="turnover-search-card">
        <form onSubmit={handleSearch} className="turnover-search-form">
          <input 
            type="text" 
            placeholder="Enter user mobile number (e.g. 017XXXXXXXX)" 
            value={searchMobile}
            onChange={(e) => setSearchMobile(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Search"}
          </button>
        </form>
      </div>

      {/* User Details & Adjust Form */}
      {user && (
        <div className="turnover-user-section">
          
          <div className="turnover-summary-card">
            <h2>User: {user.full_name} ({user.mobile})</h2>
            <div className="summary-stats">
              <div>
                <span>Required Turnover</span>
                <strong>৳ {Number(user.total_required_turnover).toLocaleString()}</strong>
              </div>
              <div>
                <span>Completed Turnover</span>
                <strong className="text-green">৳ {Number(user.total_completed_turnover).toLocaleString()}</strong>
              </div>
              <div>
                <span>Remaining</span>
                <strong className="text-orange">৳ {Math.max(Number(user.total_required_turnover) - Number(user.total_completed_turnover), 0).toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div className="turnover-adjust-card">
            <h3>Add Manual Turnover</h3>
            <form onSubmit={handleAdjustTurnover} className="adjust-form">
              <input 
                type="number" 
                placeholder="Amount to add (৳)" 
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                min="1"
                required
              />
              <input 
                type="text" 
                placeholder="Note (Optional)" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button type="submit" className="btn-approve" disabled={actionLoading}>
                {actionLoading ? "Processing..." : "Add Turnover"}
              </button>
            </form>
          </div>

          {/* Pending Deposits List */}
          <h3 className="section-subtitle">Pending Deposits (Turnover)</h3>
          {deposits.length === 0 ? (
            <div className="admin-empty">No pending turnover found for this user.</div>
          ) : (
            <div className="deposit-list">
              {deposits.map(dep => {
                const req = Number(dep.required_turnover);
                const comp = Number(dep.completed_turnover);
                const remaining = Math.max(req - comp, 0);
                
                return (
                  <div className="deposit-card" key={dep.id}>
                    <div className="deposit-header">
                      <div>
                        <strong className="deposit-amount">Deposit: ৳ {dep.amount}</strong>
                        <span className="deposit-method">Required: ৳ {req}</span>
                      </div>
                      <div className="deposit-date">
                        Remaining: <span className="text-orange">৳ {remaining}</span>
                      </div>
                    </div>
                    <div className="turnover-progress-bar small">
                      <div className="turnover-progress-fill" style={{ width: `${req > 0 ? Math.min((comp / req) * 100, 100) : 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
