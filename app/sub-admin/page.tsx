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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
          
          {/* এখানে URL-এ status=live যুক্ত করা হয়েছে */}
          <div onClick={() => router.push("/sub-admin/matches?sport=football&status=live")} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "24px", cursor: "pointer", transition: "0.2s" }}>
            <i className="fa-solid fa-futbol" style={{ fontSize: "32px", color: "#00e701", marginBottom: "16px" }} />
            <h2 style={{ color: "#fff", margin: "0 0 8px" }}>Football Live</h2>
            <strong style={{ fontSize: "24px", color: "#f58220" }}>{stats.football} Matches</strong>
          </div>

          <div onClick={() => router.push("/sub-admin/matches?sport=cricket&status=live")} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "24px", cursor: "pointer", transition: "0.2s" }}>
            <i className="fa-solid fa-baseball" style={{ fontSize: "32px", color: "#00e701", marginBottom: "16px" }} />
            <h2 style={{ color: "#fff", margin: "0 0 8px" }}>Cricket Live</h2>
            <strong style={{ fontSize: "24px", color: "#f58220" }}>{stats.cricket} Matches</strong>
          </div>

          <div onClick={() => router.push("/sub-admin/matches?sport=nba&status=live")} style={{ background: "#111d19", border: "1px solid #26352e", borderRadius: "12px", padding: "24px", cursor: "pointer", transition: "0.2s" }}>
            <i className="fa-solid fa-basketball" style={{ fontSize: "32px", color: "#00e701", marginBottom: "16px" }} />
            <h2 style={{ color: "#fff", margin: "0 0 8px" }}>NBA Live</h2>
            <strong style={{ fontSize: "24px", color: "#f58220" }}>{stats.nba} Matches</strong>
          </div>

        </div>
      )}
    </div>
  );
}
