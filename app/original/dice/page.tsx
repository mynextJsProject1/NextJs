/* app/original/dice/page.tsx */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { createClient } from "../../../lib/supabase/client";
import "./dice.css";

export default function DiceGamePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("0.00");
  const [rollOver, setRollOver] = useState(50.50);
  const [isOver, setIsOver] = useState(true); 
  const [multiplier, setMultiplier] = useState(2.0000);
  const [chance, setChance] = useState(49.5000);

  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [activeTab, setActiveTab] = useState<"manual" | "auto" | "advanced">("manual");

  // ✅ পেইজ লোড হলে আসল ব্যালেন্স আনা
  useEffect(() => {
    const fetchBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("balance").eq("id", user.id).single();
        if (data) setBalance(Number(data.balance) || 0);
      }
    };
    void fetchBalance();
  }, [supabase]);

  const handleSliderChange = (value: number) => {
    setRollOver(value);
    const newChance = isOver ? 100 - value : value;
    setChance(newChance);
    setMultiplier(99 / newChance); 
  };

  const handleToggleMode = () => {
    setIsOver(!isOver);
    const newChance = !isOver ? 100 - rollOver : rollOver;
    setChance(newChance);
    setMultiplier(99 / newChance);
  };

  const handleMultiplierChange = (val: number) => {
    setMultiplier(val);
    if (val <= 1) return;
    const newChance = 99 / val;
    setChance(newChance);
    setRollOver(isOver ? 100 - newChance : newChance);
  };

  // ✅ আসল গেম লজিক (Supabase RPC কল)
  const handleRoll = async () => {
    const amount = Number(betAmount);
    if (amount <= 0) return;
    if (amount > balance) {
      setErrorMsg("Insufficient balance.");
      return;
    }
    
    setIsRolling(true);
    setResult(null);
    setIsWin(null);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.rpc("play_dice_bet", {
        p_bet_amount: amount,
        p_target: rollOver,
        p_is_over: isOver,
        p_multiplier: multiplier
      });

      if (error) throw error;

      if (data) {
        setResult(data.roll);
        setIsWin(data.is_win);
        setBalance(data.new_balance);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to place bet.");
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <div className="stake-app">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="stake-main" style={{ paddingBottom: '80px' }}>
        <div className="dice-game-container">
          <div className="dice-main-area">
            
            {/* এরর মেসেজ */}
            {errorMsg && (
              <div style={{ background: "rgba(255,77,77,0.1)", color: "#ff4d4d", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px", textAlign: "center" }}>
                {errorMsg}
              </div>
            )}

            {/* রেজাল্ট বক্স */}
            <div className="dice-result-container">
              {result !== null && (
                <div className={`dice-result-box ${isWin ? "win" : "lose"}`}>
                  {result.toFixed(2)}
                </div>
              )}
            </div>

            {/* স্লাইডার */}
            <div className="dice-slider-section">
              <div className="dice-slider-track">
                <div className="dice-track-fill" style={{
                  background: isOver 
                    ? `linear-gradient(to right, #ff4d4d ${rollOver}%, #00e701 ${rollOver}%)`
                    : `linear-gradient(to right, #00e701 ${rollOver}%, #ff4d4d ${rollOver}%)`
                }} />
                <input type="range" min="2" max="98" step="0.01" value={rollOver} onChange={(e) => handleSliderChange(Number(e.target.value))} className="dice-slider-input" />
              </div>
              <div className="dice-slider-numbers">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </div>

            {/* ইনপুট গ্রিড */}
            <div className="dice-inputs-grid">
              <div className="dice-input-group">
                <label>Multiplier</label>
                <div className="dice-input-wrapper">
                  <input type="number" value={multiplier.toFixed(4)} onChange={(e) => handleMultiplierChange(Number(e.target.value))} />
                </div>
              </div>
              <div className="dice-input-group">
                <label>Roll {isOver ? "Over" : "Under"}</label>
                <div className="dice-input-wrapper" onClick={handleToggleMode} style={{ cursor: "pointer" }}>
                  <input type="number" value={rollOver.toFixed(2)} readOnly style={{ cursor: "pointer" }} />
                  <i className="fa-solid fa-rotate"></i>
                </div>
              </div>
              <div className="dice-input-group">
                <label>Chance</label>
                <div className="dice-input-wrapper">
                  <input type="number" value={chance.toFixed(4)} readOnly />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* বেট বাটন */}
            <button className={`dice-bet-btn ${isRolling ? "rolling" : ""}`} onClick={handleRoll} disabled={isRolling}>
              {isRolling ? "Rolling..." : "Bet"}
            </button>

            {/* বেট অ্যামাউন্ট ও প্রফিট */}
            <div className="dice-amount-section">
              <div className="dice-amount-group">
                <div className="dice-label-row">
                  <label>Bet Amount</label>
                  <span className="dice-currency">Balance: {balance.toFixed(2)} BDT</span>
                </div>
                <div className="dice-amount-input-wrap">
                  <div className="dice-currency-icon">
                    <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                  </div>
                  <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0.00" />
                  <div className="dice-quick-btns">
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))}>½</button>
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))}>2x</button>
                  </div>
                </div>
              </div>
              <div className="dice-amount-group">
                <div className="dice-label-row">
                  <label>Profit</label>
                  <span className="dice-currency">0.00000000 BDT</span>
                </div>
                <div className="dice-amount-input-wrap">
                  <div className="dice-currency-icon">
                    <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                  </div>
                  <input type="number" value={(Number(betAmount) * multiplier - Number(betAmount)).toFixed(2)} readOnly placeholder="0.00" />
                </div>
              </div>
            </div>

            {/* ট্যাব */}
            <div className="dice-bottom-tabs">
              <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")}>Manual</button>
              <button className={activeTab === "auto" ? "active" : ""} onClick={() => setActiveTab("auto")}>Auto</button>
              <button className={activeTab === "advanced" ? "active" : ""} onClick={() => setActiveTab("advanced")}>Advanced</button>
            </div>
          </div>
        </div>
      </main>

      <Footer activePage="casino" onNavigate={(page) => {
        if (page === "home") router.push("/");
        else if (page === "chat") router.push("/");
        else if (page === "casino") router.push("/");
        else if (page === "sports") router.push("/");
      }} />
    </div>
  );
}
