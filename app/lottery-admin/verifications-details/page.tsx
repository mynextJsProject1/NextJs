/* app/lottery-admin/verifications-details/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../lottery-admin.css";

export default function AdminVerificationsPage() {
  const supabase = createClient();
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // ১. পেন্ডিং ভেরিফিকেশন লোড
      const { data: vData, error: vError } = await supabase
        .from("withdrawal_verifications")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (vError) throw vError;

      if (vData && vData.length > 0) {
        const userIds = [...new Set(vData.map(v => v.user_id))];
        
        // ২. ইউজারের প্রোফাইল ও NID ডিটেইলস লোড
        const { data: pData } = await supabase.from("profiles").select("id, full_name, mobile").in("id", userIds);
        const { data: kycData } = await supabase.from("lottery_user_details").select("*").in("user_id", userIds);

        const pMap: Record<string, any> = {};
        pData?.forEach(p => pMap[p.id] = p);
        const kycMap: Record<string, any> = {};
        kycData?.forEach(k => kycMap[k.user_id] = k);

        const merged = vData.map(v => ({
          ...v,
          profiles: pMap[v.user_id] || null,
          kyc: kycMap[v.user_id] || null
        }));

        setVerifications(merged);
      } else {
        setVerifications([]);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setActionLoading(id);
    const { error } = await supabase
      .from("withdrawal_verifications")
      .update({ status: action })
      .eq("id", id);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage(`Verification ${action} successfully!`);
      loadData();
    }
    setActionLoading(null);
  };

  return (
    <div>
      <h1 className="la-title">KYC Verifications</h1>
      {message && <div className="la-alert">{message}</div>}

      {loading ? (
        <div className="la-loading"><i className="fa-solid fa-circle-notch fa-spin" /> Loading...</div>
      ) : verifications.length === 0 ? (
        <div className="la-empty">No pending verifications found.</div>
      ) : (
        <div className="la-list">
          {verifications.map((v) => (
            <div className="la-card" key={v.id}>
              <div className="la-card-header">
                <div>
                  <strong style={{ color: "#fff", fontSize: "16px" }}>{v.profiles?.full_name || "Unknown User"}</strong>
                  <span style={{ fontSize: "12px", color: "#b1bad3", display: "block", marginTop: "4px" }}>
                    Mobile: {v.profiles?.mobile || "N/A"}
                  </span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px", background: "rgba(245,130,32,0.15)", color: "#f58220" }}>
                  PENDING
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px", background: "#0f0a1a", padding: "10px", borderRadius: "8px" }}>
                <div><span style={{ fontSize: "10px", color: "#888" }}>NID Number</span><div style={{ color: "#fff", fontSize: "13px" }}>{v.kyc?.nid_number || "N/A"}</div></div>
                <div><span style={{ fontSize: "10px", color: "#888" }}>Father's Name</span><div style={{ color: "#fff", fontSize: "13px" }}>{v.kyc?.father_name || "N/A"}</div></div>
                <div style={{ gridColumn: "span 2" }}><span style={{ fontSize: "10px", color: "#888" }}>Address</span><div style={{ color: "#fff", fontSize: "13px" }}>{v.kyc?.full_address || "N/A"}</div></div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", background: "rgba(0,231,1,0.05)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,231,1,0.2)" }}>
                <div><span style={{ fontSize: "10px", color: "#888" }}>Fee Amount</span><div style={{ color: "#00e701", fontSize: "14px", fontWeight: "bold" }}>৳{v.total_fee}</div></div>
                <div style={{ textAlign: "right" }}><span style={{ fontSize: "10px", color: "#888" }}>TrxID</span><div style={{ color: "#fff", fontSize: "13px" }}>{v.bank_trx_id}</div></div>
              </div>

              <div className="la-actions">
                <button className="la-btn-reject" onClick={() => handleAction(v.id, "rejected")} disabled={actionLoading === v.id}>Reject</button>
                <button className="la-btn-approve" onClick={() => handleAction(v.id, "approved")} disabled={actionLoading === v.id}>
                  {actionLoading === v.id ? "Processing..." : "Approve KYC"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
