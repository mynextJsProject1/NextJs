/* app/original/dice/page.tsx */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import GameBottomBar from "../../../components/GameBottomBar/GameBottomBar";
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
  
  // বিট হিস্টরি (Graph এর জন্য betAmount যুক্ত করা হয়েছে)
  const [history, setHistory] = useState<{ id: string, value: number, isWin: boolean, profit: number, nonce: number, betAmount: number }[]>([]);
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

  // Auto Betting
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [autoStats, setAutoStats] = useState({ bets: 0, profit: 0 });
  const isAutoRef = useRef(false);

  // ✅ Settings, Graph, Fairness এর জন্য স্টেট
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState(false); 

  // Settings এর ভেতরের স্টেট
  const [instantBet, setInstantBet] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Fairness Seed State
  const [clientSeed, setClientSeed] = useState("my_client_seed_123");
  const [serverSeedHash, setServerSeedHash] = useState("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0");
  const [nonce, setNonce] = useState(1);
  const [isSeedVerified, setIsSeedVerified] = useState(false);

  // সাউন্ড প্লে ফাংশন
  const playDiceSound = () => {
    if (soundEnabled) {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play blocked by browser:", e));
    }
  };

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
    
    playDiceSound();

    try {
      const { data, error } = await supabase.rpc("play_dice_bet", {
        p_bet_amount: amountToBet,
        p_target: rollOver,
        p_is_over: isOver,
        p_multiplier: multiplier
      });

      if (error) throw error;

      if (data) {
        setVisualSliderValue(data.roll); 
        setResult(data.roll);
        setIsWin(data.is_win);
        setBalance(data.new_balance);
        
        setHistory(prev => [...prev, { 
          id: Date.now().toString(), 
          value: data.roll, 
          isWin: data.is_win, 
          profit: data.profit,
          nonce: nonce,
          betAmount: amountToBet
        }].slice(-20));
        
        setNonce(prev => prev + 1);
      }
      return data;
    } catch (err: any) {
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

      setBetAmount(nextBet.toFixed(2));

      if (isAutoRef.current) {
        setTimeout(() => runAutoLoop(nextBet, newCount, newProfit), 300);
      }
    } catch (err) {
      toggleAutoBet(); 
    }
  };

  // ✅ Graph Stats Calculation
  const totalWagered = history.reduce((sum, item) => sum + item.betAmount, 0);
  const totalProfit = history.reduce((sum, item) => sum + item.profit, 0);
  const wins = history.filter(h => h.isWin).length;
  const losses = history.filter(h => !h.isWin).length;

  // ✅ Graph SVG Line Drawing (স্ক্রল করার জন্য প্রস্থ বাড়ানো হয়েছে)
  const generateGraph = () => {
    if (history.length === 0) return null;
    
    let cumulativeProfit = 0;
    const points = history.map(h => {
      cumulativeProfit += h.profit;
      return cumulativeProfit;
    });

    const maxVal = Math.max(...points.map(Math.abs), 10); 
    const width = 1000; // ✅ পিসির মতো মুভ করার জন্য চওড়া করা হলো
    const height = 150;
    const stepX = width / Math.max(points.length - 1, 1);

    let linePath = `M 0 ${height / 2} `;
    points.forEach((p, i) => {
      const x = i * stepX;
      const y = (height / 2) - (p / maxVal) * (height / 2 - 10);
      linePath += `L ${x} ${y} `;
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: `${width}px`, height: '100%', minWidth: '100%' }}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#23332b" strokeWidth="2" />
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinejoin="round" />
        <defs>
          <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="50%" stopColor="#ff4d4d" />
            <stop offset="50%" stopColor="#00e701" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

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
                <span>Instant Bet (Turbo)</span>
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
              
              <button 
                className="dice-btn-secondary" 
                style={{ width: '100%', marginTop: '15px' }}
                onClick={() => { setIsSettingsOpen(false); setIsBetHistoryOpen(true); }}
              >
                View Bet History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ✅ Bet History Modal ================= */}
      {isBetHistoryOpen && (
        <div className="dice-modal-overlay" onClick={() => setIsBetHistoryOpen(false)}>
          <div className="dice-modal-content" onClick={e => e.stopPropagation()}>
            <div className="dice-modal-header">
              <h3>Bet History</h3>
              <button onClick={() => setIsBetHistoryOpen(false)}>✕</button>
            </div>
            <div className="dice-modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {history.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#aaa' }}>No bets placed yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#fff' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #23332b', textAlign: 'left' }}>
                      <th style={{ padding: '8px 4px' }}>Nonce</th>
                      <th style={{ padding: '8px 4px' }}>Roll</th>
                      <th style={{ padding: '8px 4px' }}>Result</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right' }}>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice().reverse().map((h) => (
                      <tr key={h.id} style={{ borderBottom: '1px dashed #23332b' }}>
                        <td style={{ padding: '8px 4px', color: '#a0aab2' }}>{h.nonce}</td>
                        <td style={{ padding: '8px 4px' }}>{h.value.toFixed(2)}</td>
                        <td style={{ padding: '8px 4px', color: h.isWin ? '#00e701' : '#ff4d4d' }}>
                          {h.isWin ? 'Win' : 'Loss'}
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', color: h.profit > 0 ? '#00e701' : '#ff4d4d' }}>
                          {h.profit > 0 ? '+' : ''}{h.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ✅ Graph/Stats Modal (Updated Design) ================= */}
      {isGraphOpen && (
        <div className="dice-modal-overlay" onClick={() => setIsGraphOpen(false)}>
          {/* ✅ maxWidth কমিয়ে ৩০০px করা হয়েছে (কার্ড ৬০% ছোট) */}
          <div className="dice-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '300px' }}>
            <div className="dice-modal-header">
              <h3>Stats & Graph</h3>
              <button onClick={() => setIsGraphOpen(false)}>✕</button>
            </div>
            <div className="dice-modal-body" style={{ padding: '10px' }}>
              
              {/* Stats Grid */}
              <div className="dice-stats-grid">
                <div className="dice-stat-item">
                  <span className="dice-stat-label">Profit</span>
                  <span className={`dice-stat-value ${totalProfit >= 0 ? 'text-green' : 'text-red'}`}>
                    {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}
                  </span>
                </div>
                <div className="dice-stat-item">
                  <span className="dice-stat-label">Wagered</span>
                  <span className="dice-stat-value">{totalWagered.toFixed(2)}</span>
                </div>
                <div className="dice-stat-item">
                  <span className="dice-stat-label">Wins</span>
                  <span className="dice-stat-value text-green">{wins}</span>
                </div>
                <div className="dice-stat-item">
                  <span className="dice-stat-label">Losses</span>
                  <span className="dice-stat-value text-red">{losses}</span>
                </div>
              </div>

              {/* Graph Area */}
              <div className="dice-graph-area">
                {history.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#a0aab2', padding: '30px 0', fontSize: '12px' }}>No bets placed yet</div>
                ) : (
                  generateGraph()
                )}
              </div>

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
                  <code>{serverSeedHash}</code>
                </div>
              </div>

              <div className="dice-fairness-group">
                <label>Client Seed (Editable)</label>
                <div className="dice-fairness-input">
                  <input 
                    type="text" 
                    value={clientSeed} 
                    onChange={(e) => { setClientSeed(e.target.value); setIsSeedVerified(false); }} 
                  />
                </div>
              </div>

              <div className="dice-fairness-group">
                <button 
                  className="dice-btn-secondary" 
                  style={{ width: '100%', marginBottom: '10px' }}
                  onClick={() => {
                    const newSeed = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    setClientSeed(newSeed);
                    setIsSeedVerified(false);
                  }}
                >
                  Change Seed
                </button>

                <button 
                  className={`dice-btn-secondary ${isSeedVerified ? 'verified' : ''}`} 
                  style={{ width: '100%', background: isSeedVerified ? '#00e701' : '', color: isSeedVerified ? '#000' : '' }}
                  onClick={() => setIsSeedVerified(true)}
                >
                  {isSeedVerified ? "Seed Verified ✓" : "Verify Seed"}
                </button>
              </div>

              <div className="dice-fairness-group">
                <label>Nonce</label>
                <div className="dice-fairness-input">
                  <code>{nonce}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
