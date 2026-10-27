/* app/admin/payment-methods/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./payment-methods.css";

type PaymentMethod = {
  id: number;
  method_code: string;
  method_name: string;
  is_enabled: boolean;
  deposit_enabled: boolean;
  withdrawal_enabled: boolean;
  payment_number: string | null;
  usdt_address: string | null;
  usdt_network: string | null;
  usdt_qr_url: string | null;
};

const methodImages: Record<string, string> = {
  bkash: "bkash.png",
  nagad: "nagad.png",
  rocket: "rocket.png",
  usdt: "usdt.png",
};
const paymentImageBase = process.env.NODE_ENV === "production" ? "/NextJs" : "";

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Edit Modal State
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    payment_number: "",
    usdt_address: "",
    usdt_network: "",
    usdt_qr_url: ""
  });

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("id");

      if (error) throw error;
      setMethods(data as PaymentMethod[]);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleStatus = async (id: number, field: keyof PaymentMethod, currentValue: boolean) => {
    setActionLoading(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("payment_methods")
        .update({ [field]: !currentValue })
        .eq("id", id);

      if (error) throw error;
      
      // লোকাল স্টেট আপডেট
      setMethods(methods.map(m => m.id === id ? { ...m, [field]: !currentValue } : m));
      setMessage("Status updated successfully.");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      payment_number: method.payment_number || "",
      usdt_address: method.usdt_address || "",
      usdt_network: method.usdt_network || "",
      usdt_qr_url: method.usdt_qr_url || ""
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("payment_methods")
        .update({
          payment_number: formData.payment_number || null,
          usdt_address: formData.usdt_address || null,
          usdt_network: formData.usdt_network || null,
          usdt_qr_url: formData.usdt_qr_url || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingMethod.id);

      if (error) throw error;
      
      setMessage("Payment details updated!");
      setEditingMethod(null);
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Payment Methods</h1>
      
      {message && <div className="admin-alert">{message}</div>}

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-circle-notch fa-spin" /> Loading methods...
        </div>
      ) : (
        <div className="payment-methods-list">
          {methods.map((method) => (
            <div className="pm-card" key={method.id}>
              
              <div className="pm-header">
                <div className="pm-title-wrap">
                  {methodImages[method.method_code] && (
                    <img 
                      src={`${paymentImageBase}/images/payment/${methodImages[method.method_code]}`} 
                      alt={method.method_name} 
                      className="pm-logo"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <h3>{method.method_name}</h3>
                </div>
                <button className="pm-edit-btn" onClick={() => openEditModal(method)}>
                  Edit Details
                </button>
              </div>

              <div className="pm-toggles">
                <div className="pm-toggle-row">
                  <span>Main Active</span>
                  <button 
                    className={`toggle-btn ${method.is_enabled ? 'on' : 'off'}`}
                    onClick={() => toggleStatus(method.id, 'is_enabled', method.is_enabled)}
                    disabled={actionLoading}
                  >
                    {method.is_enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="pm-toggle-row">
                  <span>Deposit Active</span>
                  <button 
                    className={`toggle-btn ${method.deposit_enabled ? 'on' : 'off'}`}
                    onClick={() => toggleStatus(method.id, 'deposit_enabled', method.deposit_enabled)}
                    disabled={actionLoading}
                  >
                    {method.deposit_enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="pm-toggle-row">
                  <span>Withdraw Active</span>
                  <button 
                    className={`toggle-btn ${method.withdrawal_enabled ? 'on' : 'off'}`}
                    onClick={() => toggleStatus(method.id, 'withdrawal_enabled', method.withdrawal_enabled)}
                    disabled={actionLoading}
                  >
                    {method.withdrawal_enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="pm-details-preview">
                {method.method_code === "usdt" ? (
                  <>
                    <p><strong>Network:</strong> {method.usdt_network || "Not set"}</p>
                    <p><strong>Address:</strong> {method.usdt_address || "Not set"}</p>
                  </>
                ) : (
                  <p><strong>Number:</strong> {method.payment_number || "Not set"}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingMethod && (
        <div className="pm-modal-overlay">
          <div className="pm-modal">
            <div className="pm-modal-header">
              <h2>Edit {editingMethod.method_name}</h2>
              <button onClick={() => setEditingMethod(null)} className="pm-modal-close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="pm-form">
              
              {editingMethod.method_code === "usdt" ? (
                <>
                  <div className="pm-field">
                    <label>USDT Network (e.g. TRC20, ERC20)</label>
                    <input 
                      type="text" 
                      value={formData.usdt_network}
                      onChange={e => setFormData({...formData, usdt_network: e.target.value})}
                      placeholder="Enter network"
                    />
                  </div>
                  <div className="pm-field">
                    <label>USDT Address</label>
                    <input 
                      type="text" 
                      value={formData.usdt_address}
                      onChange={e => setFormData({...formData, usdt_address: e.target.value})}
                      placeholder="Enter address"
                    />
                  </div>
                  <div className="pm-field">
                    <label>QR Code Image URL (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.usdt_qr_url}
                      onChange={e => setFormData({...formData, usdt_qr_url: e.target.value})}
                      placeholder="https://example.com/qr.png"
                    />
                  </div>
                </>
              ) : (
                <div className="pm-field">
                  <label>Payment Number</label>
                  <input 
                    type="text" 
                    value={formData.payment_number}
                    onChange={e => setFormData({...formData, payment_number: e.target.value})}
                    placeholder="e.g. 017XXXXXXXX"
                  />
                </div>
              )}

              <button type="submit" className="pm-save-btn" disabled={actionLoading}>
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
