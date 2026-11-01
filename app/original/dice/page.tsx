/* app/original/dice/page.tsx */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// ✅ পাথ পরিবর্তন করে ৪ থেকে ৩টি ../ করা হয়েছে
import Header from "../../../components/Header"; 
import Footer from "../../../components/Footer";
import "./dice.css";

export default function DiceGamePage() {
  const router = useRouter();

  // গেমের স্টেট 
  const [balance, setBalance] = useState(30.69);
  const [betAmount, setBetAmount] = useState("0.00");
  const [rollOver, setRollOver] = useState(50.50);
  const [isOver, setIsOver] = useState(true); 
  const [multiplier, setMultiplier] = useState(2.0000);
  const [chance, setChance] = useState(49.5000);

  // রোল অ্যানিমেশন ও রেজাল্ট
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  
  // ট্যাব স্টেট
  const [activeTab, setActiveTab] = useState<"manual" | "auto" | "advanced">("manual");

  // ✅ স্লাইডার পরিবর্তন হলে অটো ক্যালকুলেশন
  const handleSliderChange = (value: number) => {
    setRollOver(value);
    const newChance = isOver ? 100 - value : value;
    setChance(newChance);
    setMultiplier(99 / newChance); 
  };

  // ✅ Over/Under টগল করা
  const handleToggleMode = () => {
    setIsOver(!isOver);
    const newChance = !isOver ? 100 - rollOver : rollOver;
    setChance(newChance);
    setMultiplier(99 / newChance);
  };

  // ✅ Multiplier চেঞ্জ করলে Chance অটো আপডেট
  const handleMultiplierChange = (val: number) => {
    setMultiplier(val);
    if (val <= 1) return;
    const newChance = 99 / val;
    setChance(newChance);
    setRollOver(isOver ? 100 - newChance : newChance);
  };

  // ✅ ডামি রোল ফাংশন
  const handleRoll = () => {
    if (betAmount === "0.00" || Number(betAmount) <= 0) return;
    
    setIsRolling(true);
    setResult(null);
    setIsWin(null);

    // অ্যানিমেশন এফেক্ট
    setTimeout(() => {
      const randomNumber = Math.random() * 100;
      setResult(randomNumber);
      
      const win = isOver ? randomNumber > rollOver : randomNumber < rollOver;
      setIsWin(win);
      
      if (win) {
        setBalance(prev => prev + (Number(betAmount) * multiplier) - Number(betAmount));
      } else {
        setBalance(prev => prev - Number(betAmount));
      }
      
      setIsRolling(false);
    }, 1500);
  };

  return (
    <div className="stake-app">
      
      {/* ✅ Header ইন্টিগ্রেশন */}
      <Header 
        onMenuClick={() => router.push("/")} 
        onHomeClick={() => router.push("/")} 
      />

      <main className="stake-main" style={{ paddingBottom: '80px' }}>
        <div className="dice-game-container">
          
          {/* মেইন গেম এরিয়া */}
          <div className="dice-main-area">
            
            {/* রেজাল্ট বক্স */}
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

            {/* বটম ট্যাব (Manual, Auto, Advanced) */}
            <div className="dice-bottom-tabs">
              <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")}>Manual</button>
              <button className={activeTab === "auto" ? "active" : ""} onClick={() => setActiveTab("auto")}>Auto</button>
              <button className={activeTab === "advanced" ? "active" : ""} onClick={() => setActiveTab("advanced")}>Advanced</button>
            </div>
          </div>
        </div>
      </main>

      {/* ✅ Footer ইন্টিগ্রেশন */}
      <Footer
        activePage="casino"
        onNavigate={(page) => {
          if (page === "home") router.push("/");
          else if (page === "chat") router.push("/");
          else if (page === "casino") router.push("/");
          else if (page === "sports") router.push("/");
        }}
      />
    </div>
  );
}
