/* app/lottery/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./lottery.css";

type Draw = {
  id: string;
  draw_name: string;
  ticket_price: number;
  total_tickets: number;
  jackpot_amount: number;
  draw_time: string;
  status: string;
};

type Ticket = {
  ticket_number: number;
  user_id: string;
};

const TICKET_PRICES = [50, 100, 250, 500, 1000];

export default function LotteryPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [selectedPrice, setSelectedPrice] = useState(50);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [soldTickets, setSoldTickets] = useState<Ticket[]>([]);
  const [myTickets, setMyTickets] = useState<number[]>([]);
  
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    setSelectedNumber(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup/"); return; }

      // ১. ইউজারের ব্যালেন্স
      const { data: profile } = await supabase.from("profiles").select("balance").eq("id", user.id).single();
      if (profile) setBalance(Number(profile.balance));

      // ২. চলমান ড্র খোঁজা (নির্দিষ্ট দামের জন্য)
      const { data: drawData } = await supabase
        .from("lottery_draws")
        .select("*")
        .eq("ticket_price", selectedPrice)
        .eq("status", "upcoming")
        .order("draw_time", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (drawData) {
        setDraw(drawData as Draw);

        // ৩. বিক্রি হওয়া টিকিট লোড করা
        const { data: tickets } = await supabase
          .from("lottery_tickets")
          .select("ticket_number, user_id")
          .eq("draw_id", drawData.id);
        
        if (tickets) {
          setSoldTickets(tickets as Ticket[]);
          // আমার কেনা টিকিটগুলো আলাদা করা
          const mine = tickets.filter(t => t.user_id === user.id).map(t => t.ticket_number);
          setMyTickets(mine);
        }
      } else {
        setDraw(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase, selectedPrice]);

  useEffect(() => { void loadData(); }, [loadData]);

  // কাউন্টডাউন টাইমার
  useEffect(() => {
    if (!draw) return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(draw.draw_time).getTime() - now;

      if (distance < 0) {
        setTimeLeft("Drawing...");
        clearInterval(timer);
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [draw]);

  const navigate = (page: string) => {
    const routes: Record<string, string> = { home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/", wallet: "/wallets/" };
    router.push(routes[page] ?? "/");
  };

  const handleBuy = async () => {
    if (!draw || !selectedNumber) {
      setMessage({ type: "error", text: "Please select a ticket number first." });
      return;
    }

    setBuying(true);
    setMessage({ type: "", text: "" });

    const { data, error } = await supabase.rpc("buy_lottery_ticket", {
      p_draw_id: draw.id,
      p_ticket_number: selectedNumber
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else if (data && data.success) {
      setMessage({ type: "success", text: `Ticket #${selectedNumber} purchased successfully!` });
      loadData(); // রিফ্রেশ
    } else {
      setMessage({ type: "error", text: data?.error || "Failed to buy ticket." });
    }
    setBuying(false);
  };

  const isSold = (num: number) => soldTickets.some(t => t.ticket_number === num);
  const isMine = (num: number) => myTickets.includes(num);

  return (
    <div className="stake-app lottery-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main lottery-main">
        {loading ? (
          <div className="lottery-loading">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <span>Loading Lottery...</span>
          </div>
        ) : (
          <>
            {/* Jackpot Section */}
            <div className="jackpot-banner">
              <div className="jackpot-label">MEGA JACKPOT</div>
              <div className="jackpot-amount">৳ {draw ? Number(draw.jackpot_amount).toLocaleString() : "0"}</div>
              <div className="jackpot-timer">
                <i className="fa-regular fa-clock"></i> Next Draw In: <strong>{timeLeft}</strong>
              </div>
            </div>

            {/* Tabs */}
            <div className="lottery-tabs">
              {TICKET_PRICES.map(price => (
                <button 
                  key={price} 
                  className={selectedPrice === price ? "active" : ""}
                  onClick={() => setSelectedPrice(price)}
                >
                  ৳{price}
                </button>
              ))}
            </div>

            {message.text && (
              <div className={`lottery-alert ${message.type}`}>{message.text}</div>
            )}

            {!draw ? (
              <div className="lottery-empty">
                <i className="fa-solid fa-ticket"></i>
                <p>No upcoming draw for ৳{selectedPrice}. Please check back later.</p>
              </div>
            ) : (
              <div className="lottery-body">
                <div className="lottery-info-row">
                  <span><i className="fa-solid fa-ticket"></i> Ticket Price: <strong>৳{draw.ticket_price}</strong></span>
                  <span><i className="fa-solid fa-wallet"></i> Balance: <strong>৳{balance.toFixed(2)}</strong></span>
                </div>

                {/* Number Grid */}
                <div className="number-grid">
                  {Array.from({ length: draw.total_tickets }, (_, i) => i + 1).map(num => {
                    const sold = isSold(num);
                    const mine = isMine(num);
                    const selected = selectedNumber === num;
                    
                    return (
                      <button
                        key={num}
                        className={`num-btn ${sold ? "sold" : ""} ${mine ? "mine" : ""} ${selected ? "selected" : ""}`}
                        onClick={() => !sold && setSelectedNumber(num)}
                        disabled={sold}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="legend-row">
                  <span><div className="dot available"></div> Available</span>
                  <span><div className="dot sold"></div> Sold</span>
                  <span><div className="dot mine"></div> My Ticket</span>
                </div>

                {/* Buy Action */}
                <div className="buy-action-card">
                  <div>
                    <span>Selected Ticket:</span>
                    <strong>{selectedNumber ? `#${selectedNumber}` : "None"}</strong>
                  </div>
                  <button 
                    className="buy-btn" 
                    onClick={handleBuy} 
                    disabled={!selectedNumber || buying || balance < draw.ticket_price}
                  >
                    {buying ? "Processing..." : `Buy Ticket ৳${draw.ticket_price}`}
                  </button>
                  {balance < draw.ticket_price && (
                    <p className="insufficient-text">Insufficient balance. Please deposit funds.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer activePage="lottery" onNavigate={navigate} />
    </div>
  );
}
