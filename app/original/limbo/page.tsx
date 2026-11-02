/* app/original/limbo/page.tsx */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import GameBottomBar from "../../../components/GameBottomBar/GameBottomBar";
import { createClient } from "../../../lib/supabase/client";
import "./limbo.css";

export default function LimboGamePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("10.00");
  
  // Limbo Specific States
  const [targetMultiplier, setTargetMultiplier] = useState(2.00);
  const [chance, setChance] = useState(49.50);

  // রোল অ্যানিমেশন ও রেজাল্ট
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [displayMultiplier, setDisplayMultiplier] = useState(1.00); 
  
  const [history, setHistory] = useState<{ id: string, value: number, isWin: boolean, profit: number, nonce: number, betAmount: number }[]>([]);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // ট্যাব স্টেট (Advanced বাদ দেওয়া হয়েছে)
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");

  // Auto Mode State
  const [autoBetCount, setAutoBetCount] = useState("0");
  const [isAdvanced, setIsAdvanced] = useState(false); // অটো সেটিংসের ভেতরে এখনো থাকবে
  const [onWinMode, setOnWinMode] = useState<"reset" | "increase">("reset");
  const [onWinValue, setOnWinValue] = useState("0");
  const [onLossMode, setOnLossMode] = useState<"reset" | "increase">("reset");
  const [onLossValue, setOnLossValue] = useState("0");
  const [stopOnProfit, setStopOnProfit] = useState("0.00");
  const [stopOnLoss, setStopOnLoss] = useState("0.00");

  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [autoStats, setAutoStats] = useState({ bets: 0, profit: 0 });
  const isAutoRef = useRef(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState(false); 

  // Fairness Sub-Views
  const [fairnessView, setFairnessView] = useState<"main" | "change_seed" | "verify_seed">("main");

  // Settings
  const [instantBet, setInstantBet] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Fairness
  const [clientSeed, setClientSeed] = useState("my_client_seed_123");
  const [serverSeedHash, setServerSeedHash] = useState("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0");
  const [nonce, setNonce] = useState(1);
  const [isSeedVerified, setIsSeedVerified] = useState(false);

  const playLimboSound = () => {
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

  useEffect(() => {
    if (historyContainerRef.current) {
      historyContainerRef.current.scrollLeft = historyContainerRef.current.scrollWidth;
    }
    if (graphContainerRef.current) {
      graphContainerRef.current.scrollLeft = graphContainerRef.current.scrollWidth;
    }
  }, [history]);

  const handleMultiplierChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 1.01) { setTargetMultiplier(1.01); setChance(98.02); return; }
    setTargetMultiplier(num);
    const newChance = (99 / num);
    setChance(newChance);
  };

  const executeBet = async (amountToBet: number) => {
    if (amountToBet <= 0) throw new Error("Invalid bet amount.");
    if (amountToBet > balance) throw new Error("Insufficient balance.");
    if (targetMultiplier < 1.01) throw new Error("Multiplier must be at least 1.01x");

    setBalance(prev => prev - amountToBet);

    setIsRolling(true);
    setResult(null);
    setIsWin(null);
    setDisplayMultiplier(1.00);
    setErrorMsg("");
    
    playLimboSound();

    try {
      const { data, error } = await supabase.rpc("play_limbo_bet", {
        p_bet_amount: amountToBet,
        p_target_multiplier: targetMultiplier
      });

      if (error) throw error;

      if (data) {
        const crashPoint = Number(data.crash_multiplier);
        
        const startTime = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          
          if (elapsed >= 1000 || instantBet) { 
            clearInterval(interval);
            setDisplayMultiplier(crashPoint);
            setResult(crashPoint);
            setIsWin(data.is_win);
            setBalance(data.new_balance); 
            
            // ✅ History-তে সর্বোচ্চ ১০,০০০ বেট পয়েন্ট জমা থাকবে
            setHistory(prev => {
              const newHistory = [...prev, { 
                id: Date.now().toString(), 
                value: crashPoint, 
                isWin: data.is_win, 
                profit: data.profit,
                nonce: nonce,
                betAmount: amountToBet
              }];
              return newHistory.slice(-10000); 
            });
            
            setNonce(prev => prev + 1);
            setIsRolling(false);
          } else {
            const progress = elapsed / 1000;
            const current = 1.00 + (crashPoint - 1.00) * progress;
            setDisplayMultiplier(current);
          }
        }, 30);
      }
      return data;
    } catch (err: any) {
      setBalance(prev => prev + amountToBet); 
      setErrorMsg(err.message || "Failed to place bet.");
      setIsRolling(false);
      throw err;
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
        setTimeout(() => runAutoLoop(nextBet, newCount, newProfit), 1200); 
      }
    } catch (err) {
      toggleAutoBet(); 
    }
  };

  const totalWagered = history.reduce((sum, item) => sum + item.betAmount, 0);
  const totalProfit = history.reduce((sum, item) => sum + item.profit, 0);
  const wins = history.filter(h => h.isWin).length;
  const losses = history.filter(h => !h.isWin).length;

  // ✅ গ্রাফ জেনারেশন লজিক
  const generateGraph = () => {
    if (history.length === 0) {
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <svg viewBox={`0 0 280 140`} style={{ width: '100%', height: '100%', display: 'block' }}>
             <line x1="0" y1="70" x2="280" y2="70" stroke="#2b4236" strokeWidth="1" />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aab2', fontSize: '12px' }}>
            No bets placed yet
          </div>
        </div>
      );
    }
    
    let cumulative = 0;
    const points = [0]; 
    history.forEach(h => {
      cumulative += h.profit;
      points.push(cumulative);
    });

    const maxAbs = Math.max(...points.map(Math.abs), 1); 
    const width = Math.max(280, points.length * 10); 
    const height = 140; 
    const centerY = height / 2;
    const padding = 15;
    
    const stepX = (width - 2 * padding) / Math.max(points.length - 1, 1);
    
    const getX = (index: number) => padding + index * stepX;
    const getY = (val: number) => centerY - (val / maxAbs) * (centerY - padding);

    let areaPath = `M ${getX(0)} ${centerY} L ${getX(0)} ${getY(points[0])}`;
    for (let i = 1; i < points.length; i++) {
      areaPath += ` L ${getX(i)} ${getY(points[i])}`;
    }
    areaPath += ` L ${getX(points.length - 1)} ${centerY} Z`;

    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(points[i]);
      const x2 = getX(i + 1);
      const y2 = getY(points[i + 1]);
      
      const isGreen = points[i + 1] >= 0;
      const color = isGreen ? "#00E701" : "#ff4d4d";

      segments.push(
        <line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      );
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: `${width}px`, height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E701" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#00E701" stopOpacity="0"/>
          </linearGradient>
        </defs>
        
        <line x1="0" y1={centerY} x2={width} y2={centerY} stroke="#2b4236" strokeWidth="1" />
        
        <clipPath id="aboveCenter">
          <rect x="0" y="0" width={width} height={centerY} />
        </clipPath>
        <path d={areaPath} fill="url(#greenGradient)" clipPath="url(#aboveCenter)" />

        {segments}
      </svg>
    );
  };

  const latestResult = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className="stake-app">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="stake-main" style={{ paddingBottom: '80px' }}>
        <div className="limbo-game-container">
          <div className="limbo-main-area">
            
            <div className="limbo-history-wrapper">
              <div className="limbo-history-container" ref={historyContainerRef}>
                {history.map((item) => (
                  <div key={item.id} className={`limbo-history-item ${item.isWin ? 'win' : 'lose'}`}>
                    {item.value.toFixed(2)}x
                  </div>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: "rgba(255,77,77,0.1)", color: "#ff4d4d", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px", textAlign: "center" }}>
                {errorMsg}
              </div>
            )}

            <div className="limbo-display-area">
              <div className={`limbo-multiplier-text ${isRolling ? 'rolling' : isWin === true ? 'win' : isWin === false ? 'lose' : ''}`}>
                {displayMultiplier.toFixed(2)}x
              </div>
            </div>

            <div className="limbo-inputs-grid">
              <div className="limbo-input-group">
                <label>Target Multiplier</label>
                <div className={`limbo-input-wrapper ${isAutoBetting ? 'disabled' : ''}`}>
                  <input 
                    type="number" 
                    step="0.01"
                    value={targetMultiplier} 
                    onChange={(e) => handleMultiplierChange(e.target.value)} 
                    disabled={isAutoBetting || isRolling}
                  />
                  <span>x</span>
                </div>
              </div>
              <div className="limbo-input-group">
                <label>Win Chance</label>
                <div className="limbo-input-wrapper">
                  <input 
                    type="number" 
                    value={chance.toFixed(2)} 
                    readOnly
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            <button 
              className={`limbo-bet-btn ${isRolling && !isAutoBetting ? "rolling" : ""} ${isAutoBetting ? "stop-btn" : ""}`} 
              onClick={activeTab === "manual" ? handleManualRoll : toggleAutoBet} 
              disabled={isRolling && !isAutoBetting}
            >
              {isAutoBetting ? "Stop Auto" : isRolling ? "Playing..." : activeTab === "manual" ? "Bet" : "Start Auto"}
            </button>

            <div className="limbo-amount-section">
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Bet Amount</label>
                  <span className="limbo-currency">Balance: {balance.toFixed(2)} BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${isAutoBetting ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>
                  
                  <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0.00" disabled={isAutoBetting} />
                  <div className="limbo-quick-btns">
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))} disabled={isAutoBetting}>½</button>
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))} disabled={isAutoBetting}>2x</button>
                  </div>
                </div>
              </div>
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Profit</label>
                  <span className="limbo-currency">0.00000000 BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${isAutoBetting ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>

                  <input type="number" value={(Number(betAmount) * targetMultiplier - Number(betAmount)).toFixed(2)} readOnly placeholder="0.00" />
                </div>
              </div>
            </div>

            {activeTab === "auto" && (
              <div className="limbo-auto-settings">
                {isAutoBetting && (
                  <div style={{ background: "rgba(0, 231, 1, 0.1)", border: "1px solid #00e701", padding: "10px", borderRadius: "8px", marginBottom: "15px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#fff", fontSize: "13px" }}>Bets: <strong>{autoStats.bets}</strong></span>
                    <span style={{ color: autoStats.profit >= 0 ? "#00e701" : "#ff4d4d", fontSize: "13px", fontWeight: "bold" }}>
                      Profit: {autoStats.profit.toFixed(2)} BDT
                    </span>
                  </div>
                )}

                <div className={`limbo-input-group ${isAutoBetting ? 'disabled' : ''}`}>
                  <label>Number of Bets</label>
                  <div className="limbo-input-wrapper">
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
                        <div className="limbo-input-wrapper" style={{ width: "100px" }}>
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
                        <div className="limbo-input-wrapper" style={{ width: "100px" }}>
                          <input type="number" value={onLossValue} onChange={(e) => setOnLossValue(e.target.value)} disabled={onLossMode === "reset" || isAutoBetting} />
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="limbo-input-group">
                      <label>Stop on Profit</label>
                      <div className="limbo-input-wrapper">
                        <input type="number" value={stopOnProfit} onChange={(e) => setStopOnProfit(e.target.value)} disabled={isAutoBetting} />
                        <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                      </div>
                    </div>

                    <div className="limbo-input-group">
                      <label>Stop on Loss</label>
                      <div className="limbo-input-wrapper">
                        <input type="number" value={stopOnLoss} onChange={(e) => setStopOnLoss(e.target.value)} disabled={isAutoBetting} />
                        <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ✅ Advanced বাটন বাদ দেওয়া হয়েছে */}
            <div className="limbo-bottom-tabs">
              <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")} disabled={isAutoBetting}>Manual</button>
              <button className={activeTab === "auto" ? "active" : ""} onClick={() => setActiveTab("auto")} disabled={isAutoBetting}>Auto</button>
            </div>

            <GameBottomBar 
              onSettingsClick={() => setIsSettingsOpen(true)}
              onStatsClick={() => setIsGraphOpen(true)}
              onFairnessClick={() => { setIsFairnessOpen(true); setFairnessView("main"); }}
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
        <div className="limbo-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body">
              <div className="limbo-setting-row">
                <span>Instant Bet (Turbo)</span>
                <div className={`toggle-switch ${instantBet ? "active" : ""}`} onClick={() => setInstantBet(!instantBet)}>
                  <div className="toggle-knob"></div>
                </div>
              </div>
              <div className="limbo-setting-row">
                <span>Sound Effects</span>
                <div className={`toggle-switch ${soundEnabled ? "active" : ""}`} onClick={() => setSoundEnabled(!soundEnabled)}>
                  <div className="toggle-knob"></div>
                </div>
              </div>
              
              <button 
                className="limbo-btn-secondary" 
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
        <div className="limbo-modal-overlay" onClick={() => setIsBetHistoryOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Bet History</h3>
              <button onClick={() => setIsBetHistoryOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {history.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#aaa' }}>No bets placed yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#fff' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #23332b', textAlign: 'left' }}>
                      <th style={{ padding: '8px 4px' }}>Nonce</th>
                      <th style={{ padding: '8px 4px' }}>Multiplier</th>
                      <th style={{ padding: '8px 4px' }}>Result</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right' }}>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice().reverse().map((h) => (
                      <tr key={h.id} style={{ borderBottom: '1px dashed #23332b' }}>
                        <td style={{ padding: '8px 4px', color: '#a0aab2' }}>{h.nonce}</td>
                        <td style={{ padding: '8px 4px' }}>{h.value.toFixed(2)}x</td>
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

      {/* ================= ✅ Graph/Stats Modal ================= */}
      {isGraphOpen && (
        <div className="limbo-modal-overlay no-blur" onClick={() => setIsGraphOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '240px' }}>
            
            <div className="limbo-live-stats-header" style={{ padding: '16px 12px 0 12px' }}>
              <div className="limbo-live-stats-title">
                <i className="fa-solid fa-chart-simple" style={{ fontSize: '14px', color: '#a0aab2' }}></i>
                <h3 style={{ fontSize: '0.95rem', color: '#fff', margin: 0, fontWeight: 'bold' }}>Live Stats</h3>
              </div>
              <div className="limbo-live-stats-icons">
                <i className="fa-solid fa-thumbtack" style={{ transform: 'rotate(45deg)', fontSize: '12px', cursor: 'pointer' }}></i>
                <i className="fa-solid fa-rotate-right" style={{ fontSize: '12px', cursor: 'pointer' }}></i>
                
                <button 
                  onClick={() => setIsGraphOpen(false)} 
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div className="limbo-modal-body" style={{ padding: '12px 12px 12px 12px' }}>
              
              <div className="limbo-stats-layout">
                <div className="limbo-stats-column">
                  <div className="limbo-stat-row-new">
                    <span className="limbo-stat-label-new">Profit</span>
                    <span className="limbo-stat-value-new" style={{ color: totalProfit >= 0 ? '#00E701' : '#ff4d4d' }}>
                      {totalProfit >= 0 ? '' : '-'}৳{Math.abs(totalProfit).toFixed(2)} 
                    </span>
                  </div>
                  <div className="limbo-stat-row-new">
                    <span className="limbo-stat-label-new">Wagered</span>
                    <span className="limbo-stat-value-new" style={{ color: '#fff' }}>
                      ৳{totalWagered.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="limbo-stats-divider"></div>

                <div className="limbo-stats-column" style={{ paddingLeft: '8px' }}>
                  <div className="limbo-stat-row-new">
                    <span className="limbo-stat-label-new">Wins</span>
                    <span className="limbo-stat-value-new" style={{ color: '#00E701' }}>{wins}</span>
                  </div>
                  <div className="limbo-stat-row-new">
                    <span className="limbo-stat-label-new">Losses</span>
                    <span className="limbo-stat-value-new" style={{ color: '#ff4d4d' }}>{losses}</span>
                  </div>
                </div>
              </div>

              {/* ✅ গ্রাফ কার্ডে রাখা হয়েছে */}
              <div className="limbo-graph-card-wrapper">
                <div className="limbo-graph-area-new" ref={graphContainerRef}>
                  {generateGraph()}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ================= ✅ Fairness Modal ================= */}
      {isFairnessOpen && (
        <div className="limbo-modal-overlay" onClick={() => setIsFairnessOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Provably Fair</h3>
              <button onClick={() => setIsFairnessOpen(false)}>✕</button>
            </div>
            
            <div className="limbo-modal-body">
              
              {/* Main View */}
              {fairnessView === "main" && (
                <>
                  <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '15px' }}>
                    Limbo uses a provably fair system to ensure every roll is completely random.
                  </p>
                  
                  <div className="limbo-fairness-group">
                    <label>Server Seed (Hashed)</label>
                    <div className="limbo-fairness-input">
                      <code>{serverSeedHash}</code>
                    </div>
                  </div>

                  <div className="limbo-fairness-group">
                    <label>Client Seed (Editable)</label>
                    <div className="limbo-fairness-input">
                      <input type="text" value={clientSeed} readOnly />
                    </div>
                  </div>

                  <div className="limbo-fairness-group">
                    <label>Seed Verify Number</label>
                    <div className="limbo-fairness-input">
                      <code>{nonce}</code>
                    </div>
                  </div>

                  <div className="limbo-fairness-btn-group">
                    <button className="limbo-btn-secondary" onClick={() => setFairnessView("change_seed")}>
                      Change Seed
                    </button>
                    <button className="limbo-btn-secondary" onClick={() => setFairnessView("verify_seed")}>
                      Verify Seed
                    </button>
                  </div>
                </>
              )}

              {/* Change Seed View */}
              {fairnessView === "change_seed" && (
                <>
                  <button className="limbo-back-btn" onClick={() => setFairnessView("main")}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                  </button>
                  <h4 style={{ color: '#fff', marginTop: 0, marginBottom: '15px' }}>Change Client Seed</h4>
                  
                  <div className="limbo-fairness-group">
                    <label>New Client Seed</label>
                    <div className="limbo-fairness-input">
                      <input 
                        type="text" 
                        value={clientSeed} 
                        onChange={(e) => setClientSeed(e.target.value)} 
                        placeholder="Enter new seed"
                      />
                    </div>
                  </div>

                  <button 
                    className="limbo-btn-secondary" 
                    style={{ width: '100%', marginTop: '10px' }}
                    onClick={() => { setFairnessView("main"); setIsSeedVerified(false); }}
                  >
                    Save Seed
                  </button>
                </>
              )}

              {/* Verify Seed View */}
              {fairnessView === "verify_seed" && (
                <>
                  <button className="limbo-back-btn" onClick={() => setFairnessView("main")}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                  </button>
                  <h4 style={{ color: '#fff', marginTop: 0, marginBottom: '15px' }}>Verify Latest Result</h4>

                  {latestResult ? (
                    <div className="limbo-verify-result-box">
                      <p>Last Multiplier:</p>
                      <h4 style={{ color: latestResult.isWin ? '#00E701' : '#ff4d4d' }}>
                        {latestResult.value.toFixed(2)}x ({latestResult.isWin ? 'Win' : 'Loss'})
                      </h4>
                      <p style={{ marginTop: '10px' }}>Verify Number: <strong>{latestResult.nonce}</strong></p>
                    </div>
                  ) : (
                    <p style={{ color: '#aaa', fontSize: '13px' }}>No bets placed yet to verify.</p>
                  )}

                  <div className="limbo-fairness-group">
                    <label>Server Seed (Hashed)</label>
                    <div className="limbo-fairness-input">
                      <code>{serverSeedHash}</code>
                    </div>
                  </div>
                  
                  <div className="limbo-fairness-group">
                    <label>Client Seed</label>
                    <div className="limbo-fairness-input">
                      <code>{clientSeed}</code>
                    </div>
                  </div>

                  <button 
                    className={`limbo-btn-secondary ${isSeedVerified ? 'verified' : ''}`} 
                    style={{ width: '100%', marginTop: '10px', background: isSeedVerified ? '#00e701' : '', color: isSeedVerified ? '#000' : '' }} 
                    onClick={() => setIsSeedVerified(true)}
                  >
                    {isSeedVerified ? "Verified ✓" : "Run Verification"}
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
