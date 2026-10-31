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
        const { data: draws, error: drawError } = await supabase
          .from("lottery_draws")
          .select("*")
          .not("winning_number", "is", null)
          .order("draw_time", { ascending: false })
          .limit(10);

        if (drawError) {
          console.error("Draw Fetch Error:", drawError);
          throw drawError;
        }

        if (!draws || draws.length === 0) {
          setWinners([]);
          return;
        }

        const winnersData = await Promise.all(
          draws.map(async (draw) => {
            const { data: ticket, error: ticketError } = await supabase
              .from("lottery_tickets")
              .select("*")
              .eq("draw_id", draw.id)
              .eq("ticket_number", draw.winning_number.toString())
              .maybeSingle();

            if (ticketError) {
              console.error(`Ticket Error for draw ${draw.id}:`, ticketError);
              return null;
            }

            if (!ticket) {
              console.warn(`No ticket found for winning number ${draw.winning_number}`);
              return null;
            }

            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("full_name, mobile")
              .eq("id", ticket.user_id)
              .maybeSingle();

            if (profileError) {
              console.error(`Profile Error for user ${ticket.user_id}:`, profileError);
            }

            return {
              ...draw,
              winning_ticket: {
                ...ticket,
                profiles: profile || { full_name: "Unknown User", mobile: "N/A" }
              }
            };
          })
        );

        setWinners(winnersData.filter((w) => w !== null));
      } catch (err) {
        console.error("Error fetching winners:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, [supabase]);

  // মোবাইল নাম্বার মাস্ক (Mask) করার ফাংশন
  const maskMobile = (mobile: string) => {
    if (!mobile || mobile.length < 8) return mobile;
    return mobile.slice(0, 5) + "***" + mobile.slice(-3);
  };

  // ✅ নতুন ফাংশন: ড্র-এর তারিখ ও সময় ফরম্যাট করার জন্য (যেমন: 12 Oct 2023, 11:59 PM)
  const formatDrawTime = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // ================= লোডিং অ্যানিমেশন (Full Screen + Small Font) =================
  if (loading) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#130a24', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', zIndex: 9999
      }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '40px', color: '#d4af37', marginBottom: '15px' }}></i>
        <h2 style={{ color: 'white', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textAlign: 'center', margin: 0 }}>
          Win Data Loading..
        </h2>
      </div>
    );
  }

  return (
    <div className="lot-winner-page" style={{ padding: '15px', paddingBottom: '80px' }}>
      
      {/* ✅ Recent Winners শিরোনাম সবার উপরে */}
      <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '20px', fontSize: '22px', fontWeight: 'bold' }}>
        🏆 Recent Winners 🏆
      </h1>

      {winners.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>
          No winners announced yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {winners.map((winner, index) => {
            const theme = CARD_COLORS[index % CARD_COLORS.length];
            
            const ticket = winner.winning_ticket; 
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
                {/* টপ সেকশন: ড্র-এর নাম, তারিখ এবং প্রাইজ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  
                  {/* বাম দিকে ড্র-এর নাম ও নিচে নতুন তারিখ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: '5px 12px', borderRadius: '20px', color: '#000', fontWeight: 'bold', fontSize: '12px', alignSelf: 'flex-start' }}>
                      {winner.draw_name || `Draw #${winner.winning_number}`}
                    </div>
                    {/* ✅ নতুন যোগ করা ড্র-এর তারিখ ও সময় */}
                    <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '11px', fontWeight: 'bold', paddingLeft: '4px' }}>
                      <i className="fa-regular fa-calendar-days" style={{ marginRight: '4px' }}></i>
                      {formatDrawTime(winner.draw_time)}
                    </div>
                  </div>
                  
                  {/* ডান দিকে টিকিট প্রাইস */}
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '5px 10px', borderRadius: '10px' }}>
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
                  
                  {/* মানি ব্যাগ ইমোজি */}
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
                    {/* ✅ মোবাইল আইকন সরিয়ে ফেলা হয়েছে */}
                    <p style={{ margin: '4px 0 0 0', color: 'rgba(0,0,0,0.7)', fontSize: '13px', fontWeight: '600' }}>
                      {user?.mobile ? maskMobile(user.mobile) : "N/A"}
                    </p>
                    
                    <p style={{ margin: '2px 0 0 0', color: 'rgba(0,0,0,0.5)', fontSize: '11px' }}>
                      Winning Ticket: {ticket?.ticket_number || winner.winning_number}
                    </p>
                    
                    <p style={{ margin: '2px 0 0 0', color: 'rgba(0,0,0,0.5)', fontSize: '11px', fontWeight: 'bold' }}>
                      Ticket Code: {ticket?.ticket_code || "N/A"}
                    </p>
                  </div>

                  {/* QR Code */}
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
