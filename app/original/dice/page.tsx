/* app/game/original/dice/page.tsx */
"use client";

import { useState, useMemo } from "react";
import "./dice.css";

export default function DiceGamePage() {
  // গেমের স্টেট (UI আপডেটের জন্য)
  const [balance, setBalance] = useState(30.69);
  const [betAmount, setBetAmount] = useState("0.00");
  const [rollOver, setRollOver] = useState(50.50);
  const [isOver, setIsOver] = useState(true); // true = Over, false = Under
  const [multiplier, setMultiplier] = useState(2.0000);
  const [chance, setChance] = useState(49.5000);

  // রোল অ্যানিমেশন ও রেজাল্ট
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  
  // ট্যাব স্টেট
  const [activeTab, setActiveTab] = useState<"manual" | "auto" | "advanced">("manual");

  // ✅ স্লাইডার পরিবর্তন হলে অটো ক্যালকুলেশন (UI এর জন্য)
  const handleSliderChange = (value: number) => {
    setRollOver(value);
    const newChance = isOver ? 100 - value : value;
    setChance(newChance);
    setMultiplier(99 / newChance); // ১% হাউজ এজ ধরে UI-তে দেখানো হচ্ছে
  };

  // ✅ Over/Under টগল করা
  const handleToggleMode = () => {
    setIsOver(!isOver);
    const newChance = !isOver ? 100 - rollOver : rollOver;
    setChance(newChance);
    setMultiplier(99 / newChance);
  };

  // ✅ ইনপুট বক্স থেকে Multiplier বা Chance চেঞ্জ করলে অটো আপডেট
  const handleMultiplierChange = (val: number) => {
    setMultiplier(val);
    if (val <= 1) return; // ১ এর নিচে মাল্টিপ্লায়ার হতে পারে না
    const newChance = 99 / val;
    setChance(newChance);
    setRollOver(isOver ? 100 - newChance : newChance);
  };

  // ✅ ডামি রোল ফাংশন (পরে এখানে Supabase RPC যুক্ত হবে)
  const handleRoll = () => {
    if (betAmount === "0.00" || Number(betAmount) <= 0) return;
    
    setIsRolling(true);
    setResult(null);
    setIsWin(null);

    // অ্যানিমেশন এফেক্ট (২ সেকেন্ড)
    setTimeout(() => {
      const randomNumber = Math.random() * 100;
      setResult(randomNumber);
      
      const win = isOver ? randomNumber > rollOver : randomNumber < rollOver;
      setIsWin(win);
      
      // ডেমো ব্যালেন্স আপডেট
      if (win) {
        setBalance(prev => prev + (Number(betAmount) * multiplier) - Number(betAmount));
      } else {
        setBalance(prev => prev - Number(betAmount));
      }
      
      setIsRolling(false);
    }, 1500);
  };

  return (
    <div className="dice-game-container">
      {/* টপ বার: ব্যালেন্স */}
      <div className="dice-top-bar">
        <div className="dice-balance-box">
          <i className="fa-solid fa-coins" style={{ color: "#ffd700", marginRight: "6px" }}></i>
          {balance.toFixed(2)}
        </div>
      </div>

      {/* মেইন গেম এরিয়া */}
      <div className="dice-main-area">
        
        {/* রেজাল্ট বক্স (রোল করার পর দেখা যাবে) */}
        <div className="dice-result-container">
          {result !== null && (
            <div className={`dice-result-box ${isWin ? "win" : "lose"}`}>
              {result.toFixed(2)}
            </div>
          )}
        </div>

        {/* স্লাইডার সেকশন */}
        <div className="dice-slider-section">
          <div className="dice-slider-track">
            {/* লাল এবং সবুজ রঙের ব্যাকগ্রাউন্ড (রোল ওভার এর উপর ভিত্তি করে) */}
            <div className="dice-track-fill" style={{
              background: isOver 
                ? `linear-gradient(to right, #ff4d4d ${rollOver}%, #00e701 ${rollOver}%)`
                : `linear-gradient(to right, #00e701 ${rollOver}%, #ff4d4d ${rollOver}%)`
            }} />
            
            <input 
              type="range" 
              min="2" 
              max="98" 
              step="0.01"
              value={rollOver}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="dice-slider-input"
            />
          </div>

          <div className="dice-slider-numbers">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* ইনপুট সেকশন (Multiplier, Roll Over, Chance) */}
        <div className="dice-inputs-grid">
          <div className="dice-input-group">
            <label>Multiplier</label>
            <div className="dice-input-wrapper">
              <input 
                type="number" 
                value={multiplier.toFixed(4)} 
                onChange={(e) => handleMultiplierChange(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="dice-input-group">
            <label>Roll {isOver ? "Over" : "Under"}</label>
            <div className="dice-input-wrapper" onClick={handleToggleMode} style={{ cursor: "pointer" }}>
              <input 
                type="number" 
                value={rollOver.toFixed(2)} 
                readOnly 
                style={{ cursor: "pointer" }}
              />
              <i className="fa-solid fa-rotate"></i>
            </div>
          </div>
          <div className="dice-input-group">
            <label>Chance</label>
            <div className="dice-input-wrapper">
              <input 
                type="number" 
                value={chance.toFixed(4)} 
                readOnly
              />
              <span>%</span>
            </div>
          </div>
        </div>

        {/* বেট বাটন */}
        <button 
          className={`dice-bet-btn ${isRolling ? "rolling" : ""}`} 
          onClick={handleRoll}
          disabled={isRolling}
        >
          {isRolling ? "Rolling..." : "Bet"}
        </button>

        {/* বেট অ্যামাউন্ট এবং প্রফিট */}
        <div className="dice-amount-section">
          <div className="dice-amount-group">
            <div className="dice-label-row">
              <label>Bet Amount</label>
              <span className="dice-currency">0.00000000 BDT</span>
            </div>
            <div className="dice-amount-input-wrap">
              <div className="dice-currency-icon">
                <i className="fa-solid fa-bangladeshi-taka-sign"></i>
              </div>
              <input 
                type="number" 
                value={betAmount} 
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="0.00"
              />
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
              <input 
                type="number" 
                value={(Number(betAmount) * multiplier - Number(betAmount)).toFixed(2)} 
                readOnly
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* বটম ট্যাব (Manual, Auto, Advanced) */}
      <div className="dice-bottom-tabs">
        <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")}>Manual</button>
        <button className={activeTab === "auto" ? "active" : ""} onClick={() => setActiveTab("auto")}>Auto</button>
        <button className={activeTab === "advanced" ? "active" : ""} onClick={() => setActiveTab("advanced")}>Advanced</button>
      </div>

      {/* বটম এক্সট্রা বার */}
      <div className="dice-footer-bar">
        <div className="dice-footer-left">
          <button><i className="fa-solid fa-gear"></i></button>
          <button><i className="fa-solid fa-chart-simple"></i></button>
          <button><i className="fa-regular fa-star"></i></button>
        </div>
        <div className="dice-footer-right">
          <span>Provably Fair <i className="fa-solid fa-check-double"></i></span>
        </div>
      </div>
    </div>
  );
}
