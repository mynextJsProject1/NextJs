/* app/sub-admin/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import "./sub-admin.css";

export default function SubAdminDashboardPage() {
  const [stats, setStats] = useState({ football: 0, cricket: 0, nba: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const loadStats = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("live_matches").select("sport_type").eq("match_status", "live");
    if (data) {
      const counts = { football: 0, cricket: 0, nba: 0 };
      data.forEach(m => {
        if (m.sport_type === "football") counts.football++;
        else if (m.sport_type === "cricket") counts.cricket++;
        else if (m.sport_type === "nba") counts.nba++;
      });
      setStats(counts);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div>
      <h1 className="sa-title">Live Sports Dashboard</h1>
      <p style={{ color: "#9ca9a3", marginBottom: "24px" }}>Select a sport to manage live matches quickly.</p>
      
      {loading ? <p>Loading...</p> : (
        /* এখানে গ্রিড ৩ কলাম করা হয়েছে */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          
          <div onClick={() => router.push("/sub-admin/matches?sport=football&status=live")} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px 10px", cursor: "pointer", textAlign: "center", transition: "0.2s" }}>
            <i className="fa-solid fa-futbol" style={{ fontSize: "24px", color: "#00e701", marginBottom: "10px" }} />
            <h2 style={{ color: "#fff", margin: "0 0 6px", fontSize: "14px" }}>Football</h2>
            <strong style={{ fontSize: "18px", color: "#f58220" }}>{stats.football} Live</strong>
          </div>

          <div onClick={() => router.push("/sub-admin/matches?sport=cricket&status=live")} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px 10px", cursor: "pointer", textAlign: "center", transition: "0.2s" }}>
            <i className="fa-solid fa-baseball" style={{ fontSize: "24px", color: "#00e701", marginBottom: "10px" }} />
            <h2 style={{ color: "#fff", margin: "0 0 6px", fontSize: "14px" }}>Cricket</h2>
            <strong style={{ fontSize: "18px", color: "#f58220" }}>{stats.cricket} Live</strong>
          </div>

          <div onClick={() => router.push("/sub-admin/matches?sport=nba&status=live")} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "16px 10px", cursor: "pointer", textAlign: "center", transition: "0.2s" }}>
            <i className="fa-solid fa-basketball" style={{ fontSize: "24px", color: "#00e701", marginBottom: "10px" }} />
            <h2 style={{ color: "#fff", margin: "0 0 6px", fontSize: "14px" }}>NBA</h2>
            <strong style={{ fontSize: "18px", color: "#f58220" }}>{stats.nba} Live</strong>
          </div>

        </div>
      )}
    </div>
  );
}
