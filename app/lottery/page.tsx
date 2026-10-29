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
  ticket_number: string;
  user_id: string;
};

type MyTicketData = {
  id: string;
  ticket_number: string;
  ticket_code: string;
  created_at: string;
  lottery_draws: {
    draw_name: string;
    ticket_price: number;
    draw_time: string;
    status: string;
  } | null;
};

type KycData = {
  mobile: string;
  full_name: string;
  father_name: string;
  mother_name: string;
  full_address: string;
};

const TICKET_PRICES = [50, 100, 250, 500, 1000];

export default function LotteryPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<"buy" | "my-tickets">("buy");
  const [selectedPrice, setSelectedPrice] = useState(50);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [soldTickets, setSoldTickets] = useState<Ticket[]>([]);
  const [myTickets, setMyTickets] = useState<string[]>([]);
  const [allMyTickets, setAllMyTickets] = useState<MyTicketData[]>([]);
  
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);

  // KYC State
  const [hasKyc, setHasKyc] = useState(false);
  const [showKycForm, setShowKycForm] = useState(false);
  const [kycData, setKycData] = useState<KycData>({
    mobile: "", full_name: "", father_name: "", mother_name: "", full_address: ""
  });
  const [savingKyc, setSavingKyc] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    setSelectedNumbers([]);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup/"); return; }

      // ১. ব্যালেন্স এবং KYC চেক
      const { data: profile } = await supabase.from("profiles").select("balance, mobile, full_name").eq("id", user.id).single();
      if (profile) {
        setBalance(Number(profile.balance));
        setKycData(prev => ({ ...prev, mobile: profile.mobile || "", full_name: profile.full_name || "" }));
      }

      const { data: kyc } = await supabase.from("lottery_user_details").select("user_id").eq("user_id", user.id).maybeSingle();
      setHasKyc(!!kyc);

      // ২. আমার সব টিকিট
      const { data: myTicketsData } = await supabase
        .from("lottery_tickets")
        .select("id, ticket_number, ticket_code, created_at, lottery_draws(draw_name, ticket_price, draw_time, status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (myTicketsData) setAllMyTickets(myTicketsData as unknown as MyTicketData[]);

      // ৩. চলমান ড্র
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
        const { data: tickets } = await supabase.from("lottery_tickets").select("ticket_number, user_id").eq("draw_id", drawData.id);
        if (tickets) {
          setSoldTickets(tickets as Ticket[]);
          setMyTickets(tickets.filter(t => t.user_id === user.id).map(t => t.ticket_number));
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

  // টাইমার
  useEffect(() => {
    if (!draw) return;
    const timer = setInterval(() => {
      const distance = new Date(draw.draw_time).getTime() - new Date().getTime();
      if (distance < 0) { setTimeLeft("Drawing..."); clearInterval(timer); return; }
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [draw]);

  const navigate = (page: string) => {
    const routes: Record<string, string> = { home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/", wallet: "/wallets/" };
    router.push(routes[page] ?? "/");
  };

  const toggleNumber = (num: string) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const handleProceedToCheckout = () => {
    if (selectedNumbers.length === 0) {
      setMessage({ type: "error", text: "Please select at least one ticket." });
      return;
    }
    setShowCheckout(true);
  };

  const handleConfirmBuy = async () => {
    if (!draw) return;
    setBuying(true);
    setMessage({ type: "", text: "" });

    // ডাটাবেসের আপডেট করা ফাংশন কল
    const { data, error } = await supabase.rpc("buy_lottery_tickets_bulk", {
      p_draw_id: draw.id,
      p_ticket_numbers: selectedNumbers
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setShowCheckout(false);
    } else if (data && data.success) {
      setMessage({ type: "success", text: `${data.total_tickets} Tickets purchased successfully!` });
      setShowCheckout(false);
      loadData();
    } else {
      setMessage({ type: "error", text: data?.error || "Failed to buy tickets." });
      setShowCheckout(false);
    }
    setBuying(false);
  };

  const handleSaveKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKyc(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("lottery_user_details").upsert({
      user_id: user.id,
      mobile: kycData.mobile,
      full_name: kycData.full_name,
      father_name: kycData.father_name,
      mother_name: kycData.mother_name,
      full_address: kycData.full_address
    });

    if (!error) {
      setHasKyc(true);
      setShowKycForm(false);
    } else {
      setMessage({ type: "error", text: error.message });
    }
    setSavingKyc(false);
  };

  const isSold = (num: string) => soldTickets.some(t => t.ticket_number === num);
  const isMine = (num: string) => myTickets.includes(num);
  const totalWorth = allMyTickets.reduce((sum, t) => sum + (t.lottery_draws?.ticket_price || 0), 0);

  return (
    <div className="stake-app lottery-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main lottery-main">
        {loading ? (
          <div className="lottery-loading"><i className="fa-solid fa-circle-notch fa-spin"></i><span>Loading...</span></div>
        ) : (
          <>
            <div className="main-tabs">
              <button className={activeTab === "buy" ? "active" : ""} onClick={() => setActiveTab("buy")}>Buy Tickets</button>
              <button className={activeTab === "my-tickets" ? "active" : ""} onClick={() => setActiveTab("my-tickets")}>My Tickets</button>
            </div>

            {activeTab === "buy" ? (
              <>
                <div className="jackpot-banner">
                  <div className="jackpot-label">MEGA JACKPOT</div>
                  <div className="jackpot-amount">৳ {draw ? Number(draw.jackpot_amount).toLocaleString() : "0"}</div>
                  <div className="jackpot-timer"><i className="fa-regular fa-clock"></i> Next Draw In: <strong>{timeLeft}</strong></div>
                </div>

                <div className="price-tabs">
                  {TICKET_PRICES.map(price => (
                    <button key={price} className={selectedPrice === price ? "active" : ""} onClick={() => setSelectedPrice(price)}>৳{price}</button>
                  ))}
                </div>

                {message.text && <div className={`lottery-alert ${message.text.includes("success") ? "success" : "error"}`}>{message.text}</div>}

                {!draw ? (
                  <div className="lottery-empty"><i className="fa-solid fa-ticket"></i><p>No upcoming draw for ৳{selectedPrice}.</p></div>
                ) : (
                  <div className="lottery-body">
                    <div className="lottery-info-row">
                      <span><i className="fa-solid fa-ticket"></i> Price: <strong>৳{draw.ticket_price}</strong></span>
                      <span><i className="fa-solid fa-wallet"></i> Balance: <strong>৳{balance.toFixed(2)}</strong></span>
                    </div>

                    {/* ১০ কলামের ছোট গ্রিড */}
                    <div className="number-grid">
                      {Array.from({ length: draw.total_tickets }, (_, i) => (i + 1).toString()).map(num => {
                        const sold = isSold(num);
                        const mine = isMine(num);
                        const selected = selectedNumbers.includes(num);
                        
                        return (
                          <button
                            key={num}
                            className={`num-btn ${sold ? "sold" : ""} ${mine ? "mine" : ""} ${selected ? "selected" : ""}`}
                            onClick={() => !sold && toggleNumber(num)}
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
                      <span><div className="dot mine"></div> Mine</span>
                      <span><div className="dot selected"></div> Selected</span>
                    </div>

                    <div className="buy-action-card">
                      <div>
                        <span>Selected Tickets:</span>
                        <strong>{selectedNumbers.length > 0 ? selectedNumbers.join(", ") : "None"}</strong>
                      </div>
                      <div>
                        <span>Total Price:</span>
                        <strong className="text-green">৳ {draw.ticket_price * selectedNumbers.length}</strong>
                      </div>
                      <button 
                        className="buy-btn" 
                        onClick={() => { if (!hasKyc) setShowKycForm(true); else handleProceedToCheckout(); }} 
                        disabled={selectedNumbers.length === 0 || buying || balance < (draw.ticket_price * selectedNumbers.length)}
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* My Tickets Tab */
              <div className="my-tickets-wrapper">
                <div className="total-worth-card">
                  <div><span>Total Worth</span><strong>৳ {totalWorth.toLocaleString()}</strong></div>
                  <div className="worth-icon">💰</div>
                </div>

                {allMyTickets.length === 0 ? (
                  <div className="lottery-empty" style={{ marginTop: "20px" }}><i className="fa-solid fa-ticket"></i><p>You haven't bought any tickets yet.</p></div>
                ) : (
                  <div className="ticket-cards-list">
                    {allMyTickets.map((t) => (
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
            )}
          </>
        )}
      </main>

      <Footer activePage="lottery" onNavigate={navigate} />

      {/* Checkout Modal */}
      {showCheckout && draw && (
        <div className="lottery-modal-overlay">
          <div className="lottery-modal">
            <h3>Confirm Payment</h3>
            <div className="modal-row"><span>Selected Numbers:</span> <strong>{selectedNumbers.join(", ")}</strong></div>
            <div className="modal-row"><span>Total Tickets:</span> <strong>{selectedNumbers.length}</strong></div>
            <div className="modal-row"><span>Price per ticket:</span> <strong>৳{draw.ticket_price}</strong></div>
            <div className="modal-row total"><span>Total Amount:</span> <strong>৳{draw.ticket_price * selectedNumbers.length}</strong></div>
            <div className="modal-row"><span>Current Balance:</span> <strong>৳{balance.toFixed(2)}</strong></div>
            <div className="modal-row"><span>Balance After Payment:</span> <strong className="text-green">৳{(balance - (draw.ticket_price * selectedNumbers.length)).toFixed(2)}</strong></div>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCheckout(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleConfirmBuy} disabled={buying}>{buying ? "Processing..." : "Confirm & Pay"}</button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Modal */}
      {showKycForm && (
        <div className="lottery-modal-overlay">
          <div className="lottery-modal">
            <h3>KYC Verification</h3>
            <p style={{ fontSize: "12px", color: "#9ca9a3", marginBottom: "16px" }}>Please fill up these details before buying a ticket.</p>
            <form onSubmit={handleSaveKyc} className="kyc-form">
              <input type="text" placeholder="Mobile Number" value={kycData.mobile} onChange={e => setKycData({...kycData, mobile: e.target.value})} required />
              <input type="text" placeholder="Full Name" value={kycData.full_name} onChange={e => setKycData({...kycData, full_name: e.target.value})} required />
              <input type="text" placeholder="Father's Name" value={kycData.father_name} onChange={e => setKycData({...kycData, father_name: e.target.value})} required />
              <input type="text" placeholder="Mother's Name" value={kycData.mother_name} onChange={e => setKycData({...kycData, mother_name: e.target.value})} required />
              <textarea placeholder="Full Address" value={kycData.full_address} onChange={e => setKycData({...kycData, full_address: e.target.value})} required />
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowKycForm(false)}>Cancel</button>
                <button type="submit" className="btn-confirm" disabled={savingKyc}>{savingKyc ? "Saving..." : "Save & Continue"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
