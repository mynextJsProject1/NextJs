/* app/lottery/winner/page.tsx */
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./winner.css";

// কার্ডের রঙের জন্য একটি অ্যারে
const CARD_COLORS = [
  { bg: "linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)", pillBg: "#437a22" }, // Green
  { bg: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)", pillBg: "#3061a3" }, // Blue
  { bg: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", pillBg: "#c75c5c" }, // Orange/Pink
  { bg: "linear-gradient(135deg, #d16ba5 0%, #c777b9 50%, #6a82fb 100%)", pillBg: "#59328a" }, // Purple
];

export default function WinnerPage() {
  const supabase = useMemo(() => createClient(), []);
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWinners = async () => {
      setLoading(true);
      try {
        // ডাটাবেস থেকে বিজয়ীদের তথ্য আনা (নিরাপদ SELECT কুয়েরি)
        // এখানে lottery_draws, lottery_tickets এবং profiles টেবিল JOIN করা হয়েছে
        const { data, error } = await supabase
          .from("lottery_draws")
          .select(`
            id,
            draw_name,
            jackpot_amount,
            draw_time,
            winning_number,
            ticket_price,
            lottery_tickets!inner (
              ticket_number,
              user_id,
              profiles!inner (
                full_name,
                mobile
              )
            )
          `)
          .not("winning_number", "is", null)
          .order("draw_time", { ascending: false })
          .limit(10); // সর্বশেষ ১০টি ড্র দেখাবে

        if (error) throw error;
        if (data) setWinners(data);
      } catch (err) {
        console.error("Error fetching winners:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, [supabase]);

  // মোবাইল নাম্বার মাস্ক (Mask) করার ফাংশন (যেমন: 01712***678)
  const maskMobile = (mobile: string) => {
    if (!mobile || mobile.length < 8) return mobile;
    return mobile.slice(0, 5) + "***" + mobile.slice(-3);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#d4af37' }}>
        <h2>Loading Winners...</h2>
      </div>
    );
  }

  return (
    <div className="lot-winner-page" style={{ padding: '15px', paddingBottom: '80px' }}>
      <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '20px', fontSize: '24px' }}>
        🏆 Recent Winners 🏆
      </h1>

      {winners.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>
          No winners announced yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {winners.map((winner, index) => {
            // প্রতিটি কার্ডের জন্য আলাদা রঙ নির্বাচন
            const theme = CARD_COLORS[index % CARD_COLORS.length];
            // টিকিট টেবিল থেকে প্রথম ডাটাটি নেওয়া হচ্ছে
            const ticket = winner.lottery_tickets[0]; 
            const user = ticket?.profiles;

            return (
              <div 
                key={winner.id} 
                style={{ 
                  background: theme.bg, 
                  borderRadius: '24px', 
                  padding: '20px', 
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* টপ সেকশন: ড্র-এর নাম ও প্রাইজ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: '5px 12px', borderRadius: '20px', color: '#000', fontWeight: 'bold', fontSize: '12px' }}>
                    {winner.draw_name || `Draw #${winner.winning_number}`}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
                    Ticket: ৳{winner.ticket_price}
                  </div>
                </div>

                {/* মাঝখানের সেকশন: Jackpot Amount এবং মানি ব্যাগ আইকন */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, color: 'rgba(0,0,0,0.6)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Prize Pool</p>
                    <div style={{ 
                      backgroundColor: theme.pillBg, 
                      color: 'white', 
                      padding: '10px 20px', 
                      borderRadius: '30px', 
                      fontSize: '26px', 
                      fontWeight: '900',
                      display: 'inline-block',
                      marginTop: '5px',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      ৳{winner.jackpot_amount}
                    </div>
                  </div>
                  
                  {/* মানি ব্যাগ ইমোজি (ছবির মতো) */}
                  <div style={{ fontSize: '50px', filter: 'drop-shadow(0px 5px 5px rgba(0,0,0,0.3))' }}>
                    💰
                  </div>
                </div>

                {/* বটম সেকশন: বিজয়ীর তথ্য এবং QR কোড */}
                <div style={{ 
                  marginTop: '20px', 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  borderRadius: '15px', 
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#1a1129', fontSize: '16px', fontWeight: 'bold' }}>
                      {user?.full_name || "Anonymous User"}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', color: 'rgba(0,0,0,0.7)', fontSize: '13px', fontWeight: '600' }}>
                      📱 {user?.mobile ? maskMobile(user.mobile) : "N/A"}
                    </p>
                    <p style={{ margin: '2px 0 0 0', color: 'rgba(0,0,0,0.5)', fontSize: '11px' }}>
                      Winning Ticket: {ticket?.ticket_number || winner.winning_number}
                    </p>
                  </div>

                  {/* QR Code (Trust বাড়ানোর জন্য) */}
                  <div style={{ backgroundColor: 'white', padding: '5px', borderRadius: '8px' }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=Winner-${winner.id}`} 
                      alt="QR" 
                      style={{ width: '50px', height: '50px', display: 'block' }}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
