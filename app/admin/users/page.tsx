/* app/admin/users/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./users.css";

type UserProfile = {
  id: string;
  full_name: string;
  mobile: string;
  game_id: string;
  balance: number;
  role: string;
  account_status: string;
  status_reason: string | null;
  total_required_turnover: number;
  total_completed_turnover: number;
  created_at: string;
  total_deposit?: number;
  total_withdraw?: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [newStatus, setNewStatus] = useState("active");
  const [statusReason, setStatusReason] = useState("");
  
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      // ১. ইউজার লোড করা
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`mobile.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const userList = data as UserProfile[];

      // ২. প্রতিটি ইউজারের মোট ডিপোজিট ও উইথড্র হিসাব বের করা
      for (let i = 0; i < userList.length; i++) {
        const user = userList[i];
        
        // মোট ডিপোজিট (approved)
        const { data: depData } = await supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("transaction_type", "deposit")
          .eq("status", "approved");
          
        // মোট উইথড্র (approved)
        const { data: witData } = await supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("transaction_type", "withdrawal")
          .eq("status", "approved");

        user.total_deposit = depData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
        user.total_withdraw = witData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      }

      setUsers(userList);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setNewBalance(user.balance.toString());
    setNewStatus(user.account_status || "active");
    setStatusReason(user.status_reason || "");
    setMessage("");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setActionLoading(true);
    setMessage("");

    try {
      const balanceNum = Number(newBalance);
      if (isNaN(balanceNum) || balanceNum < 0) throw new Error("Invalid balance amount.");

      const { error } = await supabase
        .from("profiles")
        .update({ 
          balance: balanceNum,
          account_status: newStatus,
          status_reason: statusReason || null
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      setMessage("User updated successfully!");
      
      // লোকাল স্টেট আপডেট
      setUsers(users.map(u => u.id === editingUser.id ? { 
        ...u, 
        balance: balanceNum, 
        account_status: newStatus,
        status_reason: statusReason 
      } : u));
      
      setEditingUser(null);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // স্ট্যাটাস অনুযায়ী কালার নির্ধারণ
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'rgba(0, 231, 1, 0.1)', color: '#00e701', border: 'rgba(0, 231, 1, 0.3)' };
      case 'blocked': return { bg: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: 'rgba(255, 77, 77, 0.3)' };
      case 'restricted': return { bg: 'rgba(245, 130, 32, 0.1)', color: '#f58220', border: 'rgba(245, 130, 32, 0.3)' };
      case 'temporary_block': return { bg: 'rgba(255, 193, 7, 0.1)', color: '#ffc107', border: 'rgba(255, 193, 7, 0.3)' };
      case 'withdraw_hold': return { bg: 'rgba(156, 39, 176, 0.1)', color: '#ce93d8', border: 'rgba(156, 39, 176, 0.3)' };
      default: return { bg: 'rgba(255, 255, 255, 0.1)', color: '#9ca9a3', border: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Users Management</h1>
      </div>
      
      {message && <div className="admin-alert">{message}</div>}

      <div className="users-search-wrap">
        <input 
          type="text" 
          placeholder="Search by mobile number or name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <i className="fa-solid fa-magnifying-glass"></i>
      </div>

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-circle-notch fa-spin" /> Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="admin-empty">No users found.</div>
      ) : (
        <div className="users-list">
          {users.map((user) => {
            const statusColor = getStatusColor(user.account_status || 'active');
            return (
              <div className="user-card" key={user.id}>
                <div className="user-card-header">
                  <div>
                    <h3>
                      {user.full_name} 
                      {user.role === "admin" && <span className="admin-badge">Admin</span>}
                    </h3>
                    <span className="user-mobile"><i className="fa-solid fa-phone"></i> {user.mobile}</span>
                    
                    {/* স্ট্যাটাস ব্যাজ */}
                    <div style={{ marginTop: "6px" }}>
                      <span style={{ 
                        background: statusColor.bg, 
                        color: statusColor.color, 
                        border: `1px solid ${statusColor.border}`,
                        padding: "2px 8px", 
                        borderRadius: "4px", 
                        fontSize: "10px", 
                        fontWeight: 700,
                        textTransform: "uppercase"
                      }}>
                        {user.account_status || 'active'}
                      </span>
                    </div>
                  </div>
                  <div className="user-balance">
                    ৳ {Number(user.balance).toLocaleString()}
                  </div>
                </div>

                <div className="user-card-body">
                  <div className="user-stat">
                    <span>Total Deposit</span>
                    <strong className="text-green">৳ {Number(user.total_deposit || 0).toLocaleString()}</strong>
                  </div>
                  <div className="user-stat">
                    <span>Total Withdraw</span>
                    <strong className="text-orange">৳ {Number(user.total_withdraw || 0).toLocaleString()}</strong>
                  </div>
                  <div className="user-stat">
                    <span>Turnover (Req/Comp)</span>
                    <strong>৳ {Number(user.total_required_turnover).toLocaleString()} / <span className="text-green">৳ {Number(user.total_completed_turnover).toLocaleString()}</span></strong>
                  </div>
                </div>

                <div className="user-card-footer">
                  <button className="edit-user-btn" onClick={() => handleEditClick(user)}>
                    <i className="fa-solid fa-pen"></i> Manage User
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="pm-modal-overlay">
          <div className="pm-modal">
            <div className="pm-modal-header">
              <h2>Manage: {editingUser.full_name}</h2>
              <button onClick={() => setEditingUser(null)} className="pm-modal-close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="pm-form">
              <div className="pm-field">
                <label>Balance (৳)</label>
                <input 
                  type="number" 
                  value={newBalance}
                  onChange={e => setNewBalance(e.target.value)}
                  required
                />
              </div>

              <div className="pm-field">
                <label>Account Status</label>
                <select 
                  value={newStatus} 
                  onChange={e => setNewStatus(e.target.value)}
                  className="pm-select"
                >
                  <option value="active">Active (Normal)</option>
                  <option value="blocked">Blocked (Cannot login/play)</option>
                  <option value="restricted">Restricted</option>
                  <option value="temporary_block">Temporary Block</option>
                  <option value="withdraw_hold">Withdraw Hold (Cannot withdraw)</option>
                </select>
              </div>

              <div className="pm-field">
                <label>Status Reason (Optional)</label>
                <input 
                  type="text" 
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  placeholder="e.g. Suspicious activity"
                />
              </div>

              <button type="submit" className="pm-save-btn" disabled={actionLoading}>
                {actionLoading ? "Updating..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
