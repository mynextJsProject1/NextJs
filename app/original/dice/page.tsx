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
  const [betAmount, setBetAmount] = useState("10.00");
  
  // ✅ সংখ্যা টাইপ করার জন্য String State (যাতে ইউজার ফ্রি-লি এডিট করতে পারে)
  const [rollOver, setRollOver] = useState(50.50);
  const [isOver, setIsOver] = useState(true); 
  const [multiplier, setMultiplier] = useState(2.0000);
  const [chance, setChance] = useState(49.5000);

  const [multiplierStr, setMultiplierStr] = useState("2.0000");
  const [rollOverStr, setRollOverStr] = useState("50.50");
  const [chanceStr, setChanceStr] = useState("49.5000");

  // রোল অ্যানিমেশন ও রেজাল্ট
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  // ভিজুয়াল স্লাইডার (বক্সটি এখানে মুভ করবে)
  const [visualSliderValue, setVisualSliderValue] = useState(50.50);

  // ট্যাব স্টেট
  const [activeTab, setActiveTab] = useState<"manual" | "auto" | "advanced">("manual");

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

  // ✅ স্লাইডার পরিবর্তন
  const handleSliderChange = (value: number) => {
    setRollOver(value);
    setRollOverStr(value.toFixed(2));
    setVisualSliderValue(value);
    const newChance = isOver ? 100 - value : value;
    setChance(newChance);
    setChanceStr(newChance.toFixed(4));
    const newMultiplier = 99 / newChance;
    setMultiplier(newMultiplier);
    setMultiplierStr(newMultiplier.toFixed(4)); 
  };

  // ✅ Over/Under টগল
  const handleToggleMode = () => {
    setIsOver(!isOver);
    const newChance = !isOver ? 100 - rollOver : rollOver;
    setChance(newChance);
    setChanceStr(newChance.toFixed(4));
    const newMultiplier = 99 / newChance;
    setMultiplier(newMultiplier);
    setMultiplierStr(newMultiplier.toFixed(4));
  };

  // ✅ ইনপুট হ্যান্ডলারসমূহ (ফ্রি-লি টাইপ করার জন্য)
  const handleMultiplierInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMultiplierStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 1) {
      setMultiplier(num);
      const newChance = 99 / num;
      setChance(newChance);
      setChanceStr(newChance.toFixed(4));
      const newRollOver = isOver ? 100 - newChance : newChance;
      setRollOver(newRollOver);
      setRollOverStr(newRollOver.toFixed(2));
      setVisualSliderValue(newRollOver);
    }
  };

  const handleRollOverInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRollOverStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num < 100) {
      setRollOver(num);
      setVisualSliderValue(num);
      const newChance = isOver ? 100 - num : num;
      setChance(newChance);
      setChanceStr(newChance.toFixed(4));
      const newMultiplier = 99 / newChance;
      setMultiplier(newMultiplier);
      setMultiplierStr(newMultiplier.toFixed(4));
    }
  };

  const handleChanceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChanceStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num < 100) {
      setChance(num);
      const newMultiplier = 99 / num;
      setMultiplier(newMultiplier);
      setMultiplierStr(newMultiplier.toFixed(4));
      const newRollOver = isOver ? 100 - num : num;
      setRollOver(newRollOver);
      setRollOverStr(newRollOver.toFixed(2));
      setVisualSliderValue(newRollOver);
    }
  };

  // ✅ আসল গেম লজিক এবং ডান থেকে বামে স্লাইড অ্যানিমেশন
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

    // ✅ ডান থেকে বামে স্লাইড অ্যানিমেশন (100 থেকে 0)
    let startTime = performance.now();
    let duration = 1500; // ১.৫ সেকেন্ড
    
    const animate = (time: number) => {
      let elapsed = time - startTime;
      let progress = Math.min(elapsed / duration, 1);
      
      // Ease out effect
      let easeOut = 1 - Math.pow(1 - progress, 3);
      let currentVal = 100 - (100 * easeOut); 
      
      setVisualSliderValue(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);

    try {
      const { data, error } = await supabase.rpc("play_dice_bet", {
        p_bet_amount: amount,
        p_target: rollOver,
        p_is_over: isOver,
        p_multiplier: multiplier
      });

      if (error) throw error;

      // অ্যানিমেশন শেষ হওয়া পর্যন্ত অপেক্ষা করা
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (data) {
        setVisualSliderValue(data.roll); 
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
            
            {errorMsg && (
              <div style={{ background: "rgba(255,77,77,0.1)", color: "#ff4d4d", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px", textAlign: "center" }}>
                {errorMsg}
              </div>
            )}

            {/* স্লাইডার সেকশন */}
            <div className="dice-slider-section">
              <div className="dice-slider-track">
                
                {/* ✅ ভাসমান রেজাল্ট বক্স (ডান থেকে বামে আসবে) */}
                {(isRolling || result !== null) && (
                  <div 
                    className={`dice-floating-result ${isWin === true ? 'win' : isWin === false ? 'lose' : ''}`}
                    style={{ left: `${visualSliderValue}%` }}
                  >
                    {visualSliderValue.toFixed(2)}
                    <div className="arrow-down"></div>
                  </div>
                )}

                <div className="dice-track-fill" style={{
                  background: isOver 
                    ? `linear-gradient(to right, #ff4d4d ${rollOver}%, #00e701 ${rollOver}%)`
                    : `linear-gradient(to right, #00e701 ${rollOver}%, #ff4d4d ${rollOver}%)`
                }} />
                
                <input 
                  type="range" min="0" max="100" step="0.01"
                  value={visualSliderValue}
                  readOnly
                  className="dice-visual-slider"
                />

                <input 
                  type="range" min="2" max="98" step="0.01"
                  value={rollOver}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  className="dice-main-slider"
                />
              </div>

              <div className="dice-slider-numbers">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </div>

            {/* ✅ ইনপুট গ্রিড (৩টি পাশাপাশি থাকবে) */}
            <div className="dice-inputs-grid">
              <div className="dice-input-group">
                <label>Multiplier</label>
                <div className="dice-input-wrapper">
                  <input 
                    type="number" 
                    step="any"
                    value={multiplierStr} 
                    onChange={handleMultiplierInput} 
                  />
                </div>
              </div>
              <div className="dice-input-group">
                <label>Roll {isOver ? "Over" : "Under"}</label>
                <div className="dice-input-wrapper" onClick={handleToggleMode} style={{ cursor: "pointer" }}>
                  <input 
                    type="number" 
                    step="any"
                    value={rollOverStr} 
                    onChange={handleRollOverInput}
                  />
                  <i className="fa-solid fa-rotate" style={{ cursor: "pointer" }}></i>
                </div>
              </div>
              <div className="dice-input-group">
                <label>Chance</label>
                <div className="dice-input-wrapper">
                  <input 
                    type="number" 
                    step="any"
                    value={chanceStr} 
                    onChange={handleChanceInput}
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* বেট বাটন */}
            <button className={`dice-bet-btn ${isRolling ? "rolling" : ""}`} onClick={handleRoll} disabled={isRolling}>
              {isRolling ? "Rolling..." : "Bet"}
            </button>

            {/* ম্যানুয়াল ট্যাব */}
            {activeTab !== "auto" && (
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
            )}

            {/* ট্যাব */}
            <div className="dice-bottom-tabs">
              <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")}>Manual</button>
              <button className={activeTab === "auto" ? "active" : ""} onClick={() => setActiveTab("auto")}>Auto</button>
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
