/* app/lottery/my-tickets/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import "../lottery.css";

type MyTicketData = {
  id: string;
  ticket_number: string;
  ticket_code: string;
  created_at: string;
  lottery_draws: {
    draw_name: string;
    ticket_price: number;
  } | null;
};

export default function MyTicketsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tickets, setTickets] = useState<MyTicketData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/signup/"); return; }

    const { data } = await supabase
      .from("lottery_tickets")
      .select("id, ticket_number, ticket_code, created_at, lottery_draws(draw_name, ticket_price)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (data) setTickets(data as unknown as MyTicketData[]);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const totalWorth = tickets.reduce((sum, t) => sum + (t.lottery_draws?.ticket_price || 0), 0);

  if (loading) return <div className="lottery-loading"><i className="fa-solid fa-circle-notch fa-spin"></i></div>;

  return (
    <div className="lottery-home-page">
      <div className="my-tickets-wrapper">
        <div className="total-worth-card">
          <div><span>Total Worth</span><strong>৳ {totalWorth.toLocaleString()}</strong></div>
          <div className="worth-icon">💰</div>
        </div>

        {tickets.length === 0 ? (
          <div className="lottery-empty"><i className="fa-solid fa-ticket"></i><p>You haven't bought any tickets yet.</p></div>
        ) : (
          <div className="ticket-cards-list">
            {tickets.map((t) => (
              <div className="physical-ticket" key={t.id}>
                <div className="ticket-top">
                  <div><span className="t-label">Ticket Code</span><strong className="t-number">{t.ticket_code}</strong></div>
                  <div style={{ textAlign: "right" }}><span className="t-label">Date</span><strong className="t-date">{new Date(t.created_at).toLocaleDateString("en-GB")}</strong></div>
                </div>
                <div className="ticket-middle">
                  <div><span className="t-label">Draw Name</span><strong className="t-draw">{t.lottery_draws?.draw_name} (#{t.ticket_number})</strong></div>
                  <div style={{ textAlign: "right" }}><span className="t-label">Price</span><strong className="t-price">৳ {t.lottery_draws?.ticket_price}</strong></div>
                </div>
                <div className="ticket-cutout-line"><div className="circle left"></div><div className="dashed"></div><div className="circle right"></div></div>
                <div className="ticket-bottom">
                  <img src={`https://barcode.tec-it.com/barcode.ashx?data=${t.ticket_code}&code=Code128&dpi=96`} alt="Barcode" className="barcode-img" />
                  <span className="download-text"><i className="fa-solid fa-download"></i> Download Ticket</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
