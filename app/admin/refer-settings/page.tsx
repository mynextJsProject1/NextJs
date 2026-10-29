/* app/admin/refer-settings/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./refer-settings.css";

type CommissionSetting = {
  id: number;
  bonus_type: string;
  commission_value: number;
  min_deposit_required: number;
  is_active: boolean;
};

export default function AdminReferSettingsPage() {
  const [setting, setSetting] = useState<CommissionSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("refer_commission_control")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) setSetting(data as CommissionSetting);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setting) return;

    setSaving(true);
    setMessage({ type: "", text: "" });

    const { error } = await supabase
      .from("refer_commission_control")
      .update({
        bonus_type: setting.bonus_type,
        commission_value: setting.commission_value,
        min_deposit_required: setting.min_deposit_required,
        is_active: setting.is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", setting.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Settings updated successfully!" });
    }
    setSaving(false);
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  if (loading) return <div className="admin-loading">Loading settings...</div>;

  return (
    <div>
      <h1 className="admin-page-title">Referral Settings</h1>
      
      {message.text && (
        <div className={`admin-alert ${message.type}`} style={{ background: message.type === 'error' ? 'rgba(255,77,77,0.1)' : 'rgba(0,231,1,0.1)', color: message.type === 'error' ? '#ff4d4d' : '#00e701' }}>
          {message.text}
        </div>
      )}

      {setting && (
        <form onSubmit={handleSave} className="admin-form-card">
          
          <div className="admin-field">
            <label>Bonus Type</label>
            <select 
              value={setting.bonus_type} 
              onChange={(e) => setSetting({ ...setting, bonus_type: e.target.value })}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (৳)</option>
            </select>
            <small className="field-help">Choose if you want to give a percentage of the deposit or a fixed amount.</small>
          </div>

          <div className="admin-field">
            <label>Commission Value</label>
            <input 
              type="number" 
              step="0.01" 
              value={setting.commission_value} 
              onChange={(e) => setSetting({ ...setting, commission_value: Number(e.target.value) })}
              required
            />
            <small className="field-help">Example: 5 (for 5%) or 100 (for 100 BDT).</small>
          </div>

          <div className="admin-field">
            <label>Minimum Deposit Required (৳)</label>
            <input 
              type="number" 
              value={setting.min_deposit_required} 
              onChange={(e) => setSetting({ ...setting, min_deposit_required: Number(e.target.value) })}
              required
            />
          </div>

          <div className="admin-toggle-row">
            <span>System Active?</span>
            <button 
              type="button"
              className={`admin-toggle-btn ${setting.is_active ? "on" : "off"}`}
              onClick={() => setSetting({ ...setting, is_active: !setting.is_active })}
            >
              {setting.is_active ? "ON" : "OFF"}
            </button>
          </div>

          <button type="submit" className="admin-submit-btn" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      )}
    </div>
  );
}
