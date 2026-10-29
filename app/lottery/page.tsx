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

type MyTicketData = {
  id: string;
  ticket_number: number;
  created_at: string;
  lottery_draws: {
    draw_name: string;
    ticket_price: number;
    draw_time: string;
    status: string;
  } | null;
};

const TICKET_PRICES = [50, 100, 250, 500, 1000];

export default function LotteryPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<"buy" | "my-tickets">("buy");
  const [selectedPrice, setSelectedPrice] = useState(50);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [soldTickets, setSoldTickets] = useState<Ticket[]>([]);
  const [myTickets, setMyTickets] = useState<number[]>([]);
  const [allMyTickets, setAllMyTickets] = useState<MyTicketData[]>([]);
  
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

      // ২. ইউজারের সব কেনা টিকিট লোড করা (My Tickets)
      const { data: myTicketsData } = await supabase
        .from("lottery_tickets")
        .select("id, ticket_number, created_at, lottery_draws(draw_name, ticket_price, draw_time, status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (myTicketsData) setAllMyTickets(myTicketsData as unknown as MyTicketData[]);

      // ৩. চলমান ড্র খোঁজা (Buy Tickets এর জন্য)
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

        // ৪. বিক্রি হওয়া টিকিট লোড করা
        const { data: tickets } = await supabase
          .from("lottery_tickets")
          .select("ticket_number, user_id")
          .eq("draw_id", drawData.id);
        
        if (tickets) {
          setSoldTickets(tickets as Ticket[]);
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
      loadData(); 
    } else {
      setMessage({ type: "error", text: data?.error || "Failed to buy ticket." });
    }
    setBuying(false);
  };

  const isSold = (num: number) => soldTickets.some(t => t.ticket_number === num);
  const isMine = (num: number) => myTickets.includes(num);

  // Total Worth Calculation
  const totalWorth = allMyTickets.reduce((sum, t) => sum + (t.lottery_draws?.ticket_price || 0), 0);

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
            {/* Top Tabs */}
            <div className="main-tabs">
              <button className={activeTab === "buy" ? "active" : ""} onClick={() => setActiveTab("buy")}>Buy Tickets</button>
              <button className={activeTab === "my-tickets" ? "active" : ""} onClick={() => setActiveTab("my-tickets")}>My Tickets</button>
            </div>

            {activeTab === "buy" ? (
              <>
                {/* Jackpot Section */}
                <div className="jackpot-banner">
                  <div className="jackpot-label">MEGA JACKPOT</div>
                  <div className="jackpot-amount">৳ {draw ? Number(draw.jackpot_amount).toLocaleString() : "0"}</div>
                  <div className="jackpot-timer">
                    <i className="fa-regular fa-clock"></i> Next Draw In: <strong>{timeLeft}</strong>
                  </div>
                </div>

                {/* Price Tabs */}
                <div className="price-tabs">
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
                    <p>No upcoming draw for ৳{selectedPrice}. Check back later.</p>
                  </div>
                ) : (
                  <div className="lottery-body">
                    <div className="lottery-info-row">
                      <span><i className="fa-solid fa-ticket"></i> Price: <strong>৳{draw.ticket_price}</strong></span>
                      <span><i className="fa-solid fa-wallet"></i> Balance: <strong>৳{balance.toFixed(2)}</strong></span>
                    </div>

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

                    <div className="legend-row">
                      <span><div className="dot available"></div> Available</span>
                      <span><div className="dot sold"></div> Sold</span>
                      <span><div className="dot mine"></div> My Ticket</span>
                    </div>

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
            ) : (
              /* MY TICKETS TAB (Image Style) */
              <div className="my-tickets-wrapper">
                {/* Total Worth Card */}
                <div className="total-worth-card">
                  <div>
                    <span>Total Worth</span>
                    <strong>৳ {totalWorth.toLocaleString()}</strong>
                  </div>
                  <div className="worth-icon">💰</div>
                </div>

                {allMyTickets.length === 0 ? (
                  <div className="lottery-empty" style={{ marginTop: "20px" }}>
                    <i className="fa-solid fa-ticket"></i>
                    <p>You haven't bought any tickets yet.</p>
                  </div>
                ) : (
                  <div className="ticket-cards-list">
                    {allMyTickets.map((t) => (
                      <div className="physical-ticket" key={t.id}>
                        
                        <div className="ticket-top">
                          <div>
                            <span className="t-label">Ticket Number</span>
                            <strong className="t-number">{t.ticket_number.toString().padStart(6, '0')}</strong>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span className="t-label">Date</span>
                            <strong className="t-date">{new Date(t.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                          </div>
                        </div>

                        <div className="ticket-middle">
                          <div>
                            <span className="t-label">Draw Name</span>
                            <strong className="t-draw">{t.lottery_draws?.draw_name}</strong>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span className="t-label">Price</span>
                            <strong className="t-price">৳ {t.lottery_draws?.ticket_price}</strong>
                          </div>
                        </div>

                        <div className="ticket-cutout-line">
                          <div className="circle left"></div>
                          <div className="dashed"></div>
                          <div className="circle right"></div>
                        </div>

                        <div className="ticket-bottom">
                          {/* Barcode Image using API */}
                          <img 
                            src={`https://barcode.tec-it.com/barcode.ashx?data=${t.id.replace(/-/g, '')}&code=Code128&dpi=96`} 
                            alt="Barcode" 
                            className="barcode-img" 
                          />
                          <span className="download-text"><i className="fa-solid fa-download"></i> Download Ticket</span>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <Footer activePage="lottery" onNavigate={navigate} />
    </div>
  );
}
