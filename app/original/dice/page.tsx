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
  const [rollOver, setRollOver] = useState(50.50);
  const [isOver, setIsOver] = useState(true); 
  const [multiplier, setMultiplier] = useState(2.0000);
  const [chance, setChance] = useState(49.5000);

  // রোল অ্যানিমেশন ও রেজাল্ট
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  // ভিজুয়াল স্লাইডার (বক্সটি এখানে মুভ করবে)
  const [visualSliderValue, setVisualSliderValue] = useState(50.50);

  // ট্যাব স্টেট
  const [activeTab, setActiveTab] = useState<"manual" | "auto" | "advanced">("manual");

  // Auto Mode State
  const [autoBetCount, setAutoBetCount] = useState("0");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [onWinMode, setOnWinMode] = useState<"reset" | "increase">("reset");
  const [onWinValue, setOnWinValue] = useState("0");
  const [onLossMode, setOnLossMode] = useState<"reset" | "increase">("reset");
  const [onLossValue, setOnLossValue] = useState("0");
  const [stopOnProfit, setStopOnProfit] = useState("0.00");
  const [stopOnLoss, setStopOnLoss] = useState("0.00");

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
    setVisualSliderValue(value);
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
    const newRollOver = isOver ? 100 - newChance : newChance;
    setRollOver(newRollOver);
    setVisualSliderValue(newRollOver);
  };

  const handleChanceChange = (val: number) => {
    if (val <= 0 || val >= 100) return;
    setChance(val);
    const newMultiplier = 99 / val;
    setMultiplier(newMultiplier);
    const newRollOver = isOver ? 100 - val : val;
    setRollOver(newRollOver);
    setVisualSliderValue(newRollOver);
  };

  const handleRollOverChange = (val: number) => {
    if (val <= 0 || val >= 100) return;
    setRollOver(val);
    setVisualSliderValue(val);
    const newChance = isOver ? 100 - val : val;
    setChance(newChance);
    setMultiplier(99 / newChance);
  };

  // ✅ আসল গেম লজিক
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

    // ভিজুয়াল অ্যানিমেশন
    const animationInterval = setInterval(() => {
      setVisualSliderValue(Math.random() * 100);
    }, 50);

    try {
      const { data, error } = await supabase.rpc("play_dice_bet", {
        p_bet_amount: amount,
        p_target: rollOver,
        p_is_over: isOver,
        p_multiplier: multiplier
      });

      if (error) throw error;

      setTimeout(() => {
        clearInterval(animationInterval);
        if (data) {
          setVisualSliderValue(data.roll); 
          setResult(data.roll);
          setIsWin(data.is_win);
          setBalance(data.new_balance);
        }
        setIsRolling(false);
      }, 1500);

    } catch (err: any) {
      clearInterval(animationInterval);
      setErrorMsg(err.message || "Failed to place bet.");
      setIsRolling(false);
    }
  };

  const handleAutoStart = () => {
    alert("Auto betting will start in the backend update!");
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

            {/* ✅ স্লাইডার সেকশন (রেজাল্ট বক্স এখন এখানে থাকবে) */}
            <div className="dice-slider-section">
              <div className="dice-slider-track">
                
                {/* ✅ ভাসমান রেজাল্ট বক্স (রোলিং এবং রেজাল্টের সময় এখানে দেখা যাবে) */}
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
                  <input 
                    type="number" 
                    value={rollOver.toFixed(2)} 
                    onChange={(e) => handleRollOverChange(Number(e.target.value))}
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
                    onChange={(e) => handleChanceChange(Number(e.target.value))}
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* বেট বাটন */}
            <button className={`dice-bet-btn ${isRolling ? "rolling" : ""}`} onClick={activeTab === "manual" ? handleRoll : handleAutoStart} disabled={isRolling}>
              {isRolling ? "Rolling..." : activeTab === "manual" ? "Bet" : "Start Auto"}
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

            {/* অটো মোড UI */}
            {activeTab === "auto" && (
              <div className="dice-auto-settings">
                <div className="dice-input-group">
                  <label>Number of Bets</label>
                  <div className="dice-input-wrapper">
                    <input type="number" value={autoBetCount} onChange={(e) => setAutoBetCount(e.target.value)} />
                    <i className="fa-solid fa-infinity"></i>
                  </div>
                </div>

                <div className="auto-advanced-toggle">
                  <label>Advanced</label>
                  <div className={`toggle-switch ${isAdvanced ? "active" : ""}`} onClick={() => setIsAdvanced(!isAdvanced)}>
                    <div className="toggle-knob"></div>
                  </div>
                </div>

                {isAdvanced && (
                  <div className="advanced-options">
                    <div className="adv-row">
                      <label>On Win</label>
                      <div className="adv-inputs">
                        <select value={onWinMode} onChange={(e) => setOnWinMode(e.target.value as any)}>
                          <option value="reset">Reset</option>
                          <option value="increase">Increase by</option>
                        </select>
                        <div className="dice-input-wrapper" style={{ width: "100px" }}>
                          <input type="number" value={onWinValue} onChange={(e) => setOnWinValue(e.target.value)} disabled={onWinMode === "reset"} />
                          <span>%</span>
                        </div>
                      </div>
                    </div>

                    <div className="adv-row">
                      <label>On Loss</label>
                      <div className="adv-inputs">
                        <select value={onLossMode} onChange={(e) => setOnLossMode(e.target.value as any)}>
                          <option value="reset">Reset</option>
                          <option value="increase">Increase by</option>
                        </select>
                        <div className="dice-input-wrapper" style={{ width: "100px" }}>
                          <input type="number" value={onLossValue} onChange={(e) => setOnLossValue(e.target.value)} disabled={onLossMode === "reset"} />
                          <span>%</span>
                        </div>
                      </div>
                    </div>

                    <div className="dice-input-group">
                      <label>Stop on Profit</label>
                      <div className="dice-input-wrapper">
                        <input type="number" value={stopOnProfit} onChange={(e) => setStopOnProfit(e.target.value)} />
                        <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                      </div>
                    </div>

                    <div className="dice-input-group">
                      <label>Stop on Loss</label>
                      <div className="dice-input-wrapper">
                        <input type="number" value={stopOnLoss} onChange={(e) => setStopOnLoss(e.target.value)} />
                        <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
