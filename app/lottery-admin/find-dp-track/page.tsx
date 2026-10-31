/* app/lottery-admin/find-dp-track/page.tsx */
"use client";

import { useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../lottery-admin.css";

export default function FindTrackIdPage() {
  const supabase = useMemo(() => createClient(), []);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setResult(null);

    const queryId = searchQuery.trim().toUpperCase();

    try {
      // ১. প্রথমে lottery_transactions টেবিলে খোঁজা (ডিপোজিট, টিকিট, উইন)
      let { data: txData } = await supabase
        .from("lottery_transactions")
        .select("*")
        .eq("track_id", queryId)
        .maybeSingle();

      let type = "transaction";

      // ২. যদি ওখানে না পাওয়া যায়, তবে lottery_withdraw_request এ খোঁজা
      if (!txData) {
        const { data: wdData } = await supabase
          .from("lottery_withdraw_request")
          .select("*")
          .eq("track_id", queryId)
          .maybeSingle();
        
        if (wdData) {
          txData = wdData;
          type = "withdraw";
        }
      }

      // ৩. যদি কোনো টেবিলেই না পাওয়া যায়
      if (!txData) {
        setErrorMsg("No transaction found with this Track ID.");
        setLoading(false);
        return;
      }

      // ৪. ট্রানজেকশন পাওয়া গেলে, ইউজারের প্রোফাইল ও KYC ডাটা আনা
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, mobile, lottery_balance, lottery_winnings")
        .eq("id", txData.user_id)
        .maybeSingle();

      const { data: kycData } = await supabase
        .from("lottery_user_details")
        .select("*")
        .eq("user_id", txData.user_id)
        .maybeSingle();

      setResult({
        type,
        transaction: txData,
        profile: profileData,
        kyc: kycData
      });

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Something went wrong while searching.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="la-title">Find by Track ID</h1>
      
      {/* সার্চ ফর্ম */}
      <div className="la-card" style={{ marginBottom: "24px" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px" }}>
          <input 
            type="text" 
            placeholder="Enter Track ID (e.g. DEP-A1B2C3 or WDR-X9Y8Z7)" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            required 
            style={{ flex: 1, background: "#0f0a1a", border: "1px solid #3a1f6b", padding: "12px", borderRadius: "8px", color: "#fff", textTransform: "uppercase" }}
          />
          <button 
            type="submit" 
            className="la-btn-approve" 
            disabled={loading} 
            style={{ padding: "0 20px", borderRadius: "8px", fontWeight: "bold" }}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
        {errorMsg && <p style={{ color: "#ff4d4d", marginTop: "12px", fontSize: "14px", fontWeight: "bold" }}>{errorMsg}</p>}
      </div>

      {/* সার্চ রেজাল্ট */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* ট্রানজেকশন ডিটেইলস */}
          <div className="la-card" style={{ borderLeft: "4px solid #d4af37" }}>
            <h2 style={{ color: "#fff", fontSize: "18px", margin: "0 0 16px 0", borderBottom: "1px dashed #3a1f6b", paddingBottom: "8px" }}>
              Transaction Details
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px", color: "#b1bad3" }}>
              <div><strong>Track ID:</strong> <br/><span style={{ color: "#d4af37", fontWeight: "bold" }}>{result.transaction.track_id}</span></div>
              <div><strong>Status:</strong> <br/><span style={{ 
                color: result.transaction.status === "pending" ? "#f58220" : result.transaction.status === "completed" || result.transaction.status === "approved" ? "#00e701" : "#ff4d4d",
                fontWeight: "bold", textTransform: "uppercase"
              }}>{result.transaction.status}</span></div>
              <div><strong>Amount:</strong> <br/><span style={{ color: "#fff", fontWeight: "bold" }}>৳{result.transaction.amount}</span></div>
              <div><strong>Type:</strong> <br/><span style={{ color: "#fff" }}>{result.transaction.transaction_type || "Withdraw Request"}</span></div>
              <div><strong>Date:</strong> <br/><span style={{ color: "#fff" }}>{new Date(result.transaction.created_at).toLocaleString()}</span></div>
              
              {result.type === "transaction" && result.transaction.method_code && (
                <>
                  <div><strong>Method:</strong> <br/><span style={{ color: "#fff", textTransform: "uppercase" }}>{result.transaction.method_code}</span></div>
                  <div><strong>TrxID:</strong> <br/><span style={{ color: "#fff" }}>{result.transaction.transaction_reference}</span></div>
                </>
              )}

              {result.type === "withdraw" && (
                <>
                  <div><strong>Bank Name:</strong> <br/><span style={{ color: "#fff" }}>{result.transaction.bank_name}</span></div>
                  <div><strong>Account Number:</strong> <br/><span style={{ color: "#fff" }}>{result.transaction.bank_account_number}</span></div>
                </>
              )}
            </div>
          </div>

          {/* ইউজার প্রোফাইল */}
          {result.profile && (
            <div className="la-card" style={{ borderLeft: "4px solid #00e701" }}>
              <h2 style={{ color: "#fff", fontSize: "18px", margin: "0 0 16px 0", borderBottom: "1px dashed #3a1f6b", paddingBottom: "8px" }}>
                User Profile
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px", color: "#b1bad3" }}>
                <div><strong>Name:</strong> <br/><span style={{ color: "#fff", fontWeight: "bold" }}>{result.profile.full_name || "N/A"}</span></div>
                <div><strong>Mobile:</strong> <br/><span style={{ color: "#fff" }}>{result.profile.mobile || "N/A"}</span></div>
                <div><strong>Lottery Balance:</strong> <br/><span style={{ color: "#d4af37", fontWeight: "bold" }}>৳{result.profile.lottery_balance}</span></div>
                <div><strong>Lottery Winnings:</strong> <br/><span style={{ color: "#00e701", fontWeight: "bold" }}>৳{result.profile.lottery_winnings}</span></div>
              </div>
            </div>
          )}

          {/* ইউজার KYC ডিটেইলস (যদি থাকে) */}
          {result.kyc && (
            <div className="la-card" style={{ borderLeft: "4px solid #6a82fb" }}>
              <h2 style={{ color: "#fff", fontSize: "18px", margin: "0 0 16px 0", borderBottom: "1px dashed #3a1f6b", paddingBottom: "8px" }}>
                User KYC Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px", color: "#b1bad3" }}>
                <div><strong>NID Number:</strong> <br/><span style={{ color: "#fff", fontWeight: "bold" }}>{result.kyc.nid_number || "N/A"}</span></div>
                <div><strong>Father's Name:</strong> <br/><span style={{ color: "#fff" }}>{result.kyc.father_name || "N/A"}</span></div>
                <div><strong>Mother's Name:</strong> <br/><span style={{ color: "#fff" }}>{result.kyc.mother_name || "N/A"}</span></div>
                <div><strong>District:</strong> <br/><span style={{ color: "#fff" }}>{result.kyc.district || "N/A"}</span></div>
                <div style={{ gridColumn: "span 2" }}><strong>Full Address:</strong> <br/><span style={{ color: "#fff" }}>{result.kyc.full_address || "N/A"}</span></div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
