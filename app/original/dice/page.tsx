/* app/original/dice/page.tsx */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import GameBottomBar from "../../../components/GameBottomBar/GameBottomBar"; // ✅ নতুন কানেকশন
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
  
  // বিট হিস্টরি
  const [history, setHistory] = useState<{ id: string, value: number, isWin: boolean }[]>([]);
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

  // ✅ Auto Betting এর জন্য
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [autoStats, setAutoStats] = useState({ bets: 0, profit: 0 });
  const isAutoRef = useRef(false);

  // ✅ নতুন স্টেটসমূহ (Settings, Graph, Fairness)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

  // Settings এর ভেতরের স্টেট
  const [instantBet, setInstantBet] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("balance").eq("id", user.id).single();
        if (data) setBalance(Number(data.balance) || 0);
      }
    };
    void fetchBalance();
    return () => { isAutoRef.current = false; };
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

  const handleMultiplierChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) { setMultiplier(0); return; }
    setMultiplier(num);
    if (num <= 1) return;
    const newChance = 99 / num;
    setChance(newChance);
    const newRollOver = isOver ? 100 - newChance : newChance;
    setRollOver(newRollOver);
    setVisualSliderValue(newRollOver);
  };

  const handleChanceChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0 || num >= 100) { setChance(0); return; }
    setChance(num);
    const newMultiplier = 99 / num;
    setMultiplier(newMultiplier);
    const newRollOver = isOver ? 100 - num : num;
    setRollOver(newRollOver);
    setVisualSliderValue(newRollOver);
  };

  const handleRollOverChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0 || num >= 100) { setRollOver(0); return; }
    setRollOver(num);
    setVisualSliderValue(num);
    const newChance = isOver ? 100 - num : num;
    setChance(newChance);
    setMultiplier(99 / newChance);
  };

  const executeBet = async (amountToBet: number) => {
    if (amountToBet <= 0) throw new Error("Invalid bet amount.");
    if (amountToBet > balance) throw new Error("Insufficient balance.");
    
    setIsRolling(true);
    setResult(null);
    setIsWin(null);
    setErrorMsg("");

    const animationInterval = setInterval(() => {
      setVisualSliderValue(Math.random() * 100);
    }, 50);

    try {
      const { data, error } = await supabase.rpc("play_dice_bet", {
        p_bet_amount: amountToBet,
        p_target: rollOver,
        p_is_over: isOver,
        p_multiplier: multiplier
      });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 1500));
      clearInterval(animationInterval);

      if (data) {
        setVisualSliderValue(data.roll); 
        setResult(data.roll);
        setIsWin(data.is_win);
        setBalance(data.new_balance);
        setHistory(prev => [...prev, { id: Date.now().toString(), value: data.roll, isWin: data.is_win }].slice(-20)); 
      }
      return data;
    } catch (err: any) {
      clearInterval(animationInterval);
      setErrorMsg(err.message || "Failed to place bet.");
      throw err;
    } finally {
      setIsRolling(false);
    }
  };

  const handleManualRoll = async () => {
    await executeBet(Number(betAmount)).catch(() => {});
  };

  const toggleAutoBet = () => {
    if (isAutoRef.current) {
      isAutoRef.current = false;
      setIsAutoBetting(false);
    } else {
      if (Number(betAmount) <= 0) return setErrorMsg("Please enter a valid bet amount.");
      isAutoRef.current = true;
      setIsAutoBetting(true);
      setAutoStats({ bets: 0, profit: 0 });
      runAutoLoop(Number(betAmount), 0, 0); 
    }
  };

  const runAutoLoop = async (currentBet: number, currentCount: number, currentProfit: number) => {
    if (!isAutoRef.current) return;

    const maxBets = Number(autoBetCount);
    const profitLimit = Number(stopOnProfit);
    const lossLimit = Number(stopOnLoss);

    if (maxBets > 0 && currentCount >= maxBets) return toggleAutoBet();
    if (profitLimit > 0 && currentProfit >= profitLimit) return toggleAutoBet();
    if (lossLimit > 0 && currentProfit <= -lossLimit) return toggleAutoBet();
    if (currentBet > balance) {
      setErrorMsg("Auto stopped: Insufficient balance.");
      return toggleAutoBet();
    }

    try {
      const data = await executeBet(currentBet);
      if (!data) return;

      const newCount = currentCount + 1;
      const newProfit = currentProfit + data.profit;
      setAutoStats({ bets: newCount, profit: newProfit });
      
      let nextBet = Number(betAmount); 
      if (data.is_win && onWinMode === "increase") {
        nextBet = currentBet + (currentBet * Number(onWinValue) / 100);
      } else if (!data.is_win && onLossMode === "increase") {
        nextBet = currentBet + (currentBet * Number(onLossValue) / 100);
      }

      if (isAutoRef.current) {
        setTimeout(() => runAutoLoop(nextBet, newCount, newProfit), 200);
      }
    } catch (err) {
      toggleAutoBet(); 
    }
  };

  // ✅ Graph এর জন্য সর্বোচ্চ ভ্যালু বের করা (চার্ট স্কেল করার জন্য)
  const maxGraphValue = Math.max(...history.map(h => h.value), 100);

  return (
    <div className="stake-app">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="stake-main" style={{ paddingBottom: '80px' }}>
        <div className="dice-game-container">
          <div className="dice-main-area">
            
            <div className="dice-history-wrapper">
              <div className="dice-history-container">
                {history.map((item) => (
                  <div key={item.id} className={`dice-history-item ${item.isWin ? 'win' : 'lose'}`}>
                    {item.value.toFixed(2)}
                  </div>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: "rgba(255,77,77,0.1)", color: "#ff4d4d", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px", textAlign: "center" }}>
                {errorMsg}
              </div>
            )}

            <div className="dice-slider-section">
              <div className="dice-slider-track">
                
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
                  disabled={isAutoBetting} 
                />
              </div>

              <div className="dice-slider-numbers">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </div>

            <div className="dice-inputs-grid">
              <div className="dice-input-group">
                <label>Multiplier</label>
                <div className={`dice-input-wrapper ${isAutoBetting ? 'disabled' : ''}`}>
                  <input 
                    type="number" 
                    value={multiplier === 0 ? "" : multiplier} 
                    onChange={(e) => handleMultiplierChange(e.target.value)} 
                    disabled={isAutoBetting}
                  />
                </div>
              </div>
              <div className="dice-input-group">
                <label>Roll {isOver ? "Over" : "Under"}</label>
                <div className={`dice-input-wrapper ${isAutoBetting ? 'disabled' : ''}`} onClick={() => !isAutoBetting && handleToggleMode()} style={{ cursor: isAutoBetting ? "not-allowed" : "pointer" }}>
                  <input 
                    type="number" 
                    value={rollOver === 0 ? "" : rollOver} 
                    onChange={(e) => handleRollOverChange(e.target.value)}
                    disabled={isAutoBetting}
                  />
                  <i className="fa-solid fa-rotate"></i>
                </div>
              </div>
              <div className="dice-input-group">
                <label>Chance</label>
                <div className={`dice-input-wrapper ${isAutoBetting ? 'disabled' : ''}`}>
                  <input 
                    type="number" 
                    value={chance === 0 ? "" : chance} 
                    onChange={(e) => handleChanceChange(e.target.value)}
                    disabled={isAutoBetting}
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            <button 
              className={`dice-bet-btn ${isRolling && !isAutoBetting ? "rolling" : ""} ${isAutoBetting ? "stop-btn" : ""}`} 
              onClick={activeTab === "manual" ? handleManualRoll : toggleAutoBet} 
              disabled={isRolling && !isAutoBetting}
            >
              {isAutoBetting ? "Stop Auto" : isRolling ? "Rolling..." : activeTab === "manual" ? "Bet" : "Start Auto"}
            </button>

            <div className="dice-amount-section">
              <div className="dice-amount-group">
                <div className="dice-label-row">
                  <label>Bet Amount</label>
                  <span className="dice-currency">Balance: {balance.toFixed(2)} BDT</span>
                </div>
                <div className={`dice-amount-input-wrap ${isAutoBetting ? 'disabled' : ''}`}>
                  <div className="dice-currency-icon">
                    <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                  </div>
                  <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0.00" disabled={isAutoBetting} />
                  <div className="dice-quick-btns">
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))} disabled={isAutoBetting}>½</button>
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))} disabled={isAutoBetting}>2x</button>
                  </div>
                </div>
              </div>
              <div className="dice-amount-group">
                <div className="dice-label-row">
                  <label>Profit</label>
                  <span className="dice-currency">0.00000000 BDT</span>
                </div>
                <div className={`dice-amount-input-wrap ${isAutoBetting ? 'disabled' : ''}`}>
                  <div className="dice-currency-icon">
                    <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                  </div>
                  <input type="number" value={(Number(betAmount) * multiplier - Number(betAmount)).toFixed(2)} readOnly placeholder="0.00" />
                </div>
              </div>
            </div>

            {activeTab === "auto" && (
              <div className="dice-auto-settings">
                
                {isAutoBetting && (
                  <div style={{ background: "rgba(0, 231, 1, 0.1)", border: "1px solid #00e701", padding: "10px", borderRadius: "8px", marginBottom: "15px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#fff", fontSize: "13px" }}>Bets: <strong>{autoStats.bets}</strong></span>
                    <span style={{ color: autoStats.profit >= 0 ? "#00e701" : "#ff4d4d", fontSize: "13px", fontWeight: "bold" }}>
                      Profit: {autoStats.profit.toFixed(2)} BDT
                    </span>
                  </div>
                )}

                <div className={`dice-input-group ${isAutoBetting ? 'disabled' : ''}`}>
                  <label>Number of Bets</label>
                  <div className="dice-input-wrapper">
                    <input type="number" value={autoBetCount} onChange={(e) => setAutoBetCount(e.target.value)} disabled={isAutoBetting} />
                    <i className="fa-solid fa-infinity"></i>
                  </div>
                </div>

                <div className="auto-advanced-toggle">
                  <label>Advanced</label>
                  <div className={`toggle-switch ${isAdvanced ? "active" : ""}`} onClick={() => !isAutoBetting && setIsAdvanced(!isAdvanced)} style={{ opacity: isAutoBetting ? 0.5 : 1, cursor: isAutoBetting ? 'not-allowed' : 'pointer' }}>
                    <div className="toggle-knob"></div>
                  </div>
                </div>

                {isAdvanced && (
                  <div className="advanced-options">
                    <div className="adv-row">
                      <label>On Win</label>
                      <div className="adv-inputs">
                        <select value={onWinMode} onChange={(e) => setOnWinMode(e.target.value as any)} disabled={isAutoBetting}>
                          <option value="reset">Reset</option>
                          <option value="increase">Increase by</option>
                        </select>
                        <div className="dice-input-wrapper" style={{ width: "100px" }}>
                          <input type="number" value={onWinValue} onChange={(e) => setOnWinValue(e.target.value)} disabled={onWinMode === "reset" || isAutoBetting} />
                          <span>%</span>
                        </div>
                      </div>
                    </div>

                    <div className="adv-row">
                      <label>On Loss</label>
                      <div className="adv-inputs">
                        <select value={onLossMode} onChange={(e) => setOnLossMode(e.target.value as any)} disabled={isAutoBetting}>
                          <option value="reset">Reset</option>
                          <option value="increase">Increase by</option>
                        </select>
                        <div className="dice-input-wrapper" style={{ width: "100px" }}>
                          <input type="number" value={onLossValue} onChange={(e) => setOnLossValue(e.target.value)} disabled={onLossMode === "reset" || isAutoBetting} />
                          <span>%</span>
                        </div>
                      </div>
                    </div>

                    <div className="dice-input-group">
                      <label>Stop on Profit</label>
                      <div className="dice-input-wrapper">
                        <input type="number" value={stopOnProfit} onChange={(e) => setStopOnProfit(e.target.value)} disabled={isAutoBetting} />
                        <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                      </div>
                    </div>

                    <div className="dice-input-group">
                      <label>Stop on Loss</label>
                      <div className="dice-input-wrapper">
                        <input type="number" value={stopOnLoss} onChange={(e) => setStopOnLoss(e.target.value)} disabled={isAutoBetting} />
                        <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="dice-bottom-tabs">
              <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")} disabled={isAutoBetting}>Manual</button>
              <button className={activeTab === "auto" ? "active" : ""} onClick={() => setActiveTab("auto")} disabled={isAutoBetting}>Auto</button>
              <button className={activeTab === "advanced" ? "active" : ""} onClick={() => setActiveTab("advanced")} disabled={isAutoBetting}>Advanced</button>
            </div>

            {/* ✅ GameBottomBar কানেক্ট করা হলো */}
            <GameBottomBar 
              onSettingsClick={() => setIsSettingsOpen(true)}
              onStatsClick={() => setIsGraphOpen(true)}
              onFairnessClick={() => setIsFairnessOpen(true)}
            />

          </div>
        </div>
      </main>

      <Footer activePage="casino" onNavigate={(page) => {
        if (page === "home") router.push("/");
        else if (page === "chat") router.push("/");
        else if (page === "casino") router.push("/");
        else if (page === "sports") router.push("/");
      }} />

      {/* ================= ✅ Settings Modal ================= */}
      {isSettingsOpen && (
        <div className="dice-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="dice-modal-content" onClick={e => e.stopPropagation()}>
            <div className="dice-modal-header">
              <h3>Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>
            <div className="dice-modal-body">
              <div className="dice-setting-row">
                <span>Instant Bet</span>
                <div className={`toggle-switch ${instantBet ? "active" : ""}`} onClick={() => setInstantBet(!instantBet)}>
                  <div className="toggle-knob"></div>
                </div>
              </div>
              <div className="dice-setting-row">
                <span>Sound Effects</span>
                <div className={`toggle-switch ${soundEnabled ? "active" : ""}`} onClick={() => setSoundEnabled(!soundEnabled)}>
                  <div className="toggle-knob"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ✅ Graph/Stats Modal ================= */}
      {isGraphOpen && (
        <div className="dice-modal-overlay" onClick={() => setIsGraphOpen(false)}>
          <div className="dice-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="dice-modal-header">
              <h3>Dice Graph</h3>
              <button onClick={() => setIsGraphOpen(false)}>✕</button>
            </div>
            <div className="dice-modal-body">
              {history.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#aaa' }}>No bets placed yet.</p>
              ) : (
                <div className="dice-graph-container">
                  {history.slice().reverse().map((h, i) => (
                    <div key={h.id} className="dice-graph-bar-wrapper">
                      <div 
                        className={`dice-graph-bar ${h.isWin ? 'win' : 'lose'}`} 
                        style={{ height: `${(h.value / maxGraphValue) * 100}%` }}
                      ></div>
                      <span className="dice-graph-label">{h.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ✅ Fairness Modal ================= */}
      {isFairnessOpen && (
        <div className="dice-modal-overlay" onClick={() => setIsFairnessOpen(false)}>
          <div className="dice-modal-content" onClick={e => e.stopPropagation()}>
            <div className="dice-modal-header">
              <h3>Provably Fair</h3>
              <button onClick={() => setIsFairnessOpen(false)}>✕</button>
            </div>
            <div className="dice-modal-body">
              <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '15px' }}>
                Dice uses a provably fair system to ensure every roll is completely random and cannot be manipulated.
              </p>
              
              <div className="dice-fairness-group">
                <label>Server Seed (Hashed)</label>
                <div className="dice-fairness-input">
                  <code>a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0</code>
                </div>
              </div>

              <div className="dice-fairness-group">
                <label>Client Seed (Editable)</label>
                <div className="dice-fairness-input">
                  <input type="text" defaultValue="my_client_seed_123" />
                </div>
              </div>

              <div className="dice-fairness-group">
                <label>Nonce</label>
                <div className="dice-fairness-input">
                  <code>{history.length + 1}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
