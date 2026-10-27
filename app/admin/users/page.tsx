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
  total_required_turnover: number;
  total_completed_turnover: number;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`mobile.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setUsers(data as UserProfile[]);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase, searchQuery]);

  useEffect(() => {
    // Debounce search (সার্চ করার সময় ১ সেকেন্ড অপেক্ষা করবে)
    const timer = setTimeout(() => {
      loadUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setNewBalance(user.balance.toString());
    setMessage("");
  };

  const handleBalanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setActionLoading(true);
    setMessage("");

    try {
      const balanceNum = Number(newBalance);
      if (isNaN(balanceNum) || balanceNum < 0) throw new Error("Invalid balance amount.");

      // অ্যাডমিন হিসেবে ব্যালেন্স আপডেট করা (RLS এর মাধ্যমে)
      const { error } = await supabase
        .from("profiles")
        .update({ balance: balanceNum })
        .eq("id", editingUser.id);

      if (error) throw error;

      setMessage("User balance updated successfully!");
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, balance: balanceNum } : u));
      setEditingUser(null);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
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
          {users.map((user) => (
            <div className="user-card" key={user.id}>
              <div className="user-card-header">
                <div>
                  <h3>{user.full_name} {user.role === "admin" && <span className="admin-badge">Admin</span>}</h3>
                  <span className="user-mobile"><i className="fa-solid fa-phone"></i> {user.mobile}</span>
                </div>
                <div className="user-balance">
                  ৳ {Number(user.balance).toLocaleString()}
                </div>
              </div>

              <div className="user-card-body">
                <div className="user-stat">
                  <span>Game ID</span>
                  <strong>{user.game_id}</strong>
                </div>
                <div className="user-stat">
                  <span>Required Turnover</span>
                  <strong>৳ {Number(user.total_required_turnover).toLocaleString()}</strong>
                </div>
                <div className="user-stat">
                  <span>Completed Turnover</span>
                  <strong className="text-green">৳ {Number(user.total_completed_turnover).toLocaleString()}</strong>
                </div>
              </div>

              <div className="user-card-footer">
                <button className="edit-user-btn" onClick={() => handleEditClick(user)}>
                  <i className="fa-solid fa-pen"></i> Edit Balance
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Balance Modal */}
      {editingUser && (
        <div className="pm-modal-overlay">
          <div className="pm-modal">
            <div className="pm-modal-header">
              <h2>Edit Balance: {editingUser.full_name}</h2>
              <button onClick={() => setEditingUser(null)} className="pm-modal-close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleBalanceUpdate} className="pm-form">
              <div className="pm-field">
                <label>Current Balance (৳)</label>
                <input 
                  type="number" 
                  value={newBalance}
                  onChange={e => setNewBalance(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="pm-save-btn" disabled={actionLoading}>
                {actionLoading ? "Updating..." : "Update Balance"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
