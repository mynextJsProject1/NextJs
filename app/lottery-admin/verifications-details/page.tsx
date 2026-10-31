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

  // ✅ নতুন স্টেট: সার্চ এবং Reject এর জন্য
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
        
        // ২. ইউজারের প্রোফাইল ও KYC ডিটেইলস লোড
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

  // ✅ Approve করার লজিক
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("withdrawal_verifications")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Verification Approved successfully!");
      loadData();
    }
    setActionLoading(null);
  };

  // ✅ Reject করার লজিক (কারণসহ)
  const handleRejectSubmit = async (id: string) => {
    if (!rejectReason.trim()) {
      return alert("Please provide a reason for rejection.");
    }

    setActionLoading(id);
    const { error } = await supabase
      .from("withdrawal_verifications")
      .update({ 
        status: "rejected",
        admin_note: rejectReason.trim() // কারণটি admin_note কলামে সেভ হবে
      })
      .eq("id", id);

    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage("Verification Rejected.");
      setRejectingId(null);
      setRejectReason("");
      loadData();
    }
    setActionLoading(null);
  };

  // ✅ সার্চ ফিল্টার লজিক
  const filteredVerifications = verifications.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const kyc = v.kyc || {};
    
    return (
      (kyc.nid_number && kyc.nid_number.toLowerCase().includes(query)) ||
      (kyc.father_name && kyc.father_name.toLowerCase().includes(query)) ||
      (kyc.mother_name && kyc.mother_name.toLowerCase().includes(query)) ||
      (kyc.birth_date && kyc.birth_date.toLowerCase().includes(query))
    );
  });

  return (
    <div>
      <h1 className="la-title">KYC Verifications</h1>
      {message && <div className="la-alert">{message}</div>}

      {/* ✅ সার্চ বার */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by NID, Father, Mother, or Birth Date..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            background: "#0f0a1a",
            border: "1px solid #3a1f6b",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "14px"
          }}
        />
      </div>

      {loading ? (
        <div className="la-loading"><i className="fa-solid fa-circle-notch fa-spin" /> Loading...</div>
      ) : filteredVerifications.length === 0 ? (
        <div className="la-empty">
          {searchQuery ? "No matching verifications found." : "No pending verifications found."}
        </div>
      ) : (
        <div className="la-list">
          {filteredVerifications.map((v) => (
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

              {/* ✅ ইউজারের সব তথ্য এখানে দেখানো হচ্ছে */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px", background: "#0f0a1a", padding: "12px", borderRadius: "8px", border: "1px solid #3a1f6b" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>NID Number</span>
                  <div style={{ color: "#d4af37", fontSize: "14px", fontWeight: "bold" }}>{v.kyc?.nid_number || "N/A"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Birth Date</span>
                  <div style={{ color: "#fff", fontSize: "13px" }}>{v.kyc?.birth_date || "N/A"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>District</span>
                  <div style={{ color: "#fff", fontSize: "13px" }}>{v.kyc?.district || "N/A"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Father's Name</span>
                  <div style={{ color: "#fff", fontSize: "13px" }}>{v.kyc?.father_name || "N/A"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Mother's Name</span>
                  <div style={{ color: "#fff", fontSize: "13px" }}>{v.kyc?.mother_name || "N/A"}</div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Full Address</span>
                  <div style={{ color: "#fff", fontSize: "13px" }}>{v.kyc?.full_address || "N/A"}</div>
                </div>
              </div>

              {/* পেমেন্ট তথ্য */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", background: "rgba(0,231,1,0.05)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,231,1,0.2)" }}>
                <div><span style={{ fontSize: "10px", color: "#888" }}>Fee Amount</span><div style={{ color: "#00e701", fontSize: "14px", fontWeight: "bold" }}>৳{v.total_fee}</div></div>
                <div style={{ textAlign: "right" }}><span style={{ fontSize: "10px", color: "#888" }}>TrxID</span><div style={{ color: "#fff", fontSize: "13px" }}>{v.bank_trx_id}</div></div>
              </div>

              {/* ✅ Action Buttons */}
              {rejectingId === v.id ? (
                <div style={{ background: "#0f0a1a", padding: "10px", borderRadius: "8px", border: "1px solid #ff4d4d" }}>
                  <p style={{ margin: "0 0 8px 0", color: "#ff4d4d", fontSize: "12px", fontWeight: "bold" }}>Reason for Rejection:</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Why are you rejecting this verification?"
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#1a0f2e", border: "1px solid #3a1f6b", color: "#fff", minHeight: "60px", marginBottom: "10px" }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setRejectingId(null)} style={{ flex: 1, padding: "8px", borderRadius: "6px", background: "#333", color: "#fff", border: "none" }}>Cancel</button>
                    <button onClick={() => handleRejectSubmit(v.id)} disabled={actionLoading === v.id} style={{ flex: 1, padding: "8px", borderRadius: "6px", background: "#ff4d4d", color: "#fff", fontWeight: "bold", border: "none" }}>
                      {actionLoading === v.id ? "Wait..." : "Confirm Reject"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="la-actions">
                  <button className="la-btn-reject" onClick={() => setRejectingId(v.id)}>Reject</button>
                  <button className="la-btn-approve" onClick={() => handleApprove(v.id)} disabled={actionLoading === v.id}>
                    {actionLoading === v.id ? "Processing..." : "Approve KYC"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
