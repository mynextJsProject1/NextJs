/* app/admin/banners/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./banners.css";

type Banner = {
  id: number;
  image_url: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBanners(data as Banner[]);
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
        .from("banners")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      setBanners(banners.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));
      setMessage("Banner status updated.");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    setActionLoading(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("banners")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setBanners(banners.filter(b => b.id !== id));
      setMessage("Banner deleted successfully.");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;

    setActionLoading(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("banners")
        .insert([{ image_url: imageUrl, is_active: true }]);

      if (error) throw error;
      
      setMessage("New banner added successfully!");
      setIsModalOpen(false);
      setImageUrl("");
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
        <h1 className="admin-page-title">Banner Management</h1>
        <button className="add-bonus-btn" onClick={() => setIsModalOpen(true)}>
          <i className="fa-solid fa-plus"></i> Add Banner
        </button>
      </div>
      
      {message && <div className="admin-alert">{message}</div>}

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-circle-notch fa-spin" /> Loading banners...
        </div>
      ) : banners.length === 0 ? (
        <div className="admin-empty">No banners found. Add one to get started.</div>
      ) : (
        <div className="banner-grid">
          {banners.map((banner) => (
            <div className={`banner-card ${!banner.is_active ? 'inactive' : ''}`} key={banner.id}>
              
              <div className="banner-image-wrap">
                <img 
                  src={banner.image_url} 
                  alt="Banner" 
                  className="banner-img"
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL'; }}
                />
              </div>

              <div className="banner-card-footer">
                <div className="banner-status">
                  <button 
                    className={`toggle-btn ${banner.is_active ? 'on' : 'off'}`}
                    onClick={() => toggleStatus(banner.id, banner.is_active)}
                    disabled={actionLoading}
                  >
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
                
                <button 
                  className="banner-delete-btn"
                  onClick={() => handleDelete(banner.id)}
                  disabled={actionLoading}
                >
                  <i className="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="pm-modal-overlay">
          <div className="pm-modal">
            <div className="pm-modal-header">
              <h2>Add New Banner</h2>
              <button onClick={() => setIsModalOpen(false)} className="pm-modal-close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleAddBanner} className="pm-form">
              <div className="pm-field">
                <label>Image URL (Direct Link)</label>
                <input 
                  type="url" 
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  required
                />
              </div>

              {imageUrl && (
                <div style={{ marginTop: "10px" }}>
                  <label style={{ fontSize: "12px", color: "#9ca9a3", marginBottom: "6px", display: "block" }}>Preview:</label>
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    style={{ width: "100%", borderRadius: "8px", border: "1px solid #26352e" }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}

              <button type="submit" className="pm-save-btn" disabled={actionLoading}>
                {actionLoading ? "Adding..." : "Add Banner"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
