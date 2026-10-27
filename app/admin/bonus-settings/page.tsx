/* app/admin/bonus-settings/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./bonus-settings.css";

type BonusSetting = {
  id: number;
  bonus_name: string;
  bonus_percentage: number;
  turnover_multiplier: number;
  min_deposit: number;
  is_active: boolean;
};

export default function AdminBonusSettingsPage() {
  const [bonuses, setBonuses] = useState<BonusSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Edit & Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<BonusSetting | null>(null);
  
  const [formData, setFormData] = useState({
    bonus_name: "",
    bonus_percentage: "",
    turnover_multiplier: "",
    min_deposit: "",
    is_active: true
  });

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bonus_settings")
        .select("*")
        .order("id");

      if (error) throw error;
      setBonuses(data as BonusSetting[]);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    setActionLoading(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("bonus_settings")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      setBonuses(bonuses.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));
      setMessage("Bonus status updated.");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (bonus?: BonusSetting) => {
    if (bonus) {
      setEditingBonus(bonus);
      setFormData({
        bonus_name: bonus.bonus_name,
        bonus_percentage: bonus.bonus_percentage.toString(),
        turnover_multiplier: bonus.turnover_multiplier.toString(),
        min_deposit: bonus.min_deposit.toString(),
        is_active: bonus.is_active
      });
    } else {
      setEditingBonus(null);
      setFormData({
        bonus_name: "",
        bonus_percentage: "",
        turnover_multiplier: "",
        min_deposit: "",
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage("");

    try {
      const payload = {
        bonus_name: formData.bonus_name,
        bonus_percentage: Number(formData.bonus_percentage),
        turnover_multiplier: Number(formData.turnover_multiplier),
        min_deposit: Number(formData.min_deposit),
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      if (editingBonus) {
        // Update
        const { error } = await supabase
          .from("bonus_settings")
          .update(payload)
          .eq("id", editingBonus.id);
        if (error) throw error;
        setMessage("Bonus updated successfully!");
      } else {
        // Insert
        const { error } = await supabase
          .from("bonus_settings")
          .insert([payload]);
        if (error) throw error;
        setMessage("New bonus created successfully!");
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Bonus Settings</h1>
        <button className="add-bonus-btn" onClick={() => openModal()}>
          <i className="fa-solid fa-plus"></i> Add New Bonus
        </button>
      </div>
      
      {message && <div className="admin-alert">{message}</div>}

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-circle-notch fa-spin" /> Loading bonuses...
        </div>
      ) : bonuses.length === 0 ? (
        <div className="admin-empty">No bonus settings found. Create one!</div>
      ) : (
        <div className="bonus-grid">
          {bonuses.map((bonus) => (
            <div className={`bonus-card ${!bonus.is_active ? 'inactive' : ''}`} key={bonus.id}>
              
              <div className="bonus-card-header">
                <h3>{bonus.bonus_name}</h3>
                <button 
                  className={`toggle-btn ${bonus.is_active ? 'on' : 'off'}`}
                  onClick={() => toggleStatus(bonus.id, bonus.is_active)}
                  disabled={actionLoading}
                >
                  {bonus.is_active ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="bonus-percentage">
                +{bonus.bonus_percentage}%
              </div>

              <div className="bonus-details">
                <div>
                  <span>Min Deposit</span>
                  <strong>৳ {bonus.min_deposit}</strong>
                </div>
                <div>
                  <span>Turnover</span>
                  <strong>{bonus.turnover_multiplier}x</strong>
                </div>
              </div>

              <button className="edit-bonus-btn" onClick={() => openModal(bonus)}>
                <i className="fa-solid fa-pen"></i> Edit Settings
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="pm-modal-overlay">
          <div className="pm-modal">
            <div className="pm-modal-header">
              <h2>{editingBonus ? "Edit Bonus" : "Create New Bonus"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="pm-modal-close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="pm-form">
              <div className="pm-field">
                <label>Bonus Name (e.g. Welcome Bonus)</label>
                <input 
                  type="text" 
                  value={formData.bonus_name}
                  onChange={e => setFormData({...formData, bonus_name: e.target.value})}
                  required
                />
              </div>
              
              <div className="pm-field">
                <label>Bonus Percentage (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.bonus_percentage}
                  onChange={e => setFormData({...formData, bonus_percentage: e.target.value})}
                  placeholder="e.g. 100"
                  required
                />
              </div>

              <div className="pm-field">
                <label>Turnover Multiplier (x)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.turnover_multiplier}
                  onChange={e => setFormData({...formData, turnover_multiplier: e.target.value})}
                  placeholder="e.g. 10"
                  required
                />
              </div>

              <div className="pm-field">
                <label>Minimum Deposit (BDT)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.min_deposit}
                  onChange={e => setFormData({...formData, min_deposit: e.target.value})}
                  placeholder="e.g. 300"
                  required
                />
              </div>

              <div className="pm-field checkbox-field">
                <label>
                  <input 
                    type="checkbox" 
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Active (Visible to Users)
                </label>
              </div>

              <button type="submit" className="pm-save-btn" disabled={actionLoading}>
                {actionLoading ? "Saving..." : "Save Bonus"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
