/* app/lottery/winner/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import "../lottery.css";

type WinnerData = {
  id: string;
  winning_number: number;
  jackpot_amount: number;
  draw_name: string;
  draw_time: string;
  winner_name?: string;
  winner_mobile?: string;
};

export default function WinnersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [winners, setWinners] = useState<WinnerData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWinners = useCallback(async () => {
    setLoading(true);
    // ১. ফিনিশড ড্রগুলো আনা
    const { data: draws } = await supabase
      .from("lottery_draws")
      .select("id, winning_number, jackpot_amount, draw_name, draw_time")
      .eq("status", "finished")
      .order("draw_time", { ascending: false });

    if (draws && draws.length > 0) {
      const merged = await Promise.all(draws.map(async (draw) => {
        // ২. বিজয়ী টিকিটের মালিক খোঁজা
        const { data: ticket } = await supabase
          .from("lottery_tickets")
          .select("user_id")
          .eq("draw_id", draw.id)
          .eq("ticket_number", draw.winning_number)
          .maybeSingle();

        let winnerName = "Unknown";
        let winnerMobile = "***";

        if (ticket) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, mobile")
            .eq("id", ticket.user_id)
            .maybeSingle();
          
          if (profile) {
            // নাম এবং মোবাইল মাস্ক করা
            const name = profile.full_name || "Unknown";
            winnerName = name.length > 3 ? name.substring(0, 3) + "***" : name + "***";
            const mob = profile.mobile || "";
            winnerMobile = mob.length > 4 ? mob.substring(0, 4) + "****" + mob.substring(mob.length - 2) : "***";
          }
        }

        return {
          ...draw,
          winner_name: winnerName,
          winner_mobile: winnerMobile
        };
      }));
      setWinners(merged);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadWinners(); }, [loadWinners]);

  if (loading) return <div className="lottery-loading"><i className="fa-solid fa-circle-notch fa-spin"></i></div>;

  return (
    <div className="lottery-home-page">
      <h2 style={{ color: "#fff", marginBottom: "16px", textAlign: "center" }}>🏆 Recent Winners</h2>
      
      {winners.length === 0 ? (
        <div className="lottery-empty"><i className="fa-solid fa-trophy"></i><p>No winners yet. Stay tuned!</p></div>
      ) : (
        <div className="winner-list">
          {winners.map(w => (
            <div className="winner-card" key={w.id}>
              <div className="winner-icon"><i className="fa-solid fa-crown"></i></div>
              <div className="winner-info">
                <strong>{w.winner_name}</strong>
                <span>{w.winner_mobile}</span>
                <small>{w.draw_name} | Winning No: #{w.winning_number}</small>
                <small>{new Date(w.draw_time).toLocaleDateString()}</small>
              </div>
              <div className="winner-amount">
                <span>Won</span>
                <strong>৳ {Number(w.jackpot_amount).toLocaleString()}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
