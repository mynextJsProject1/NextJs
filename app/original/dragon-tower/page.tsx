/* app/original/dragon-tower/page.tsx */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import GameBottomBar from "../../../components/GameBottomBar/GameBottomBar";
import { createClient } from "../../../lib/supabase/client";
import "./dragon-tower.css";

type GameState = {
  status: "idle" | "playing" | "cashed_out" | "lost";
  level: number;
  revealed: { [level: number]: number[] };
};

type HistoryItem = {
  id: string;
  value: number;
  isWin: boolean;
  profit: number;
  nonce: number;
  betAmount: number;
};

export default function DragonTowerGamePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("10.00");
  const [difficulty, setDifficulty] = useState("easy");

  // গেম স্টেট
  const [gameId, setGameId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [gameState, setGameState] = useState<GameState>({ status: "idle", level: 1, revealed: {} });
  const [multiplier, setMultiplier] = useState(1.00);
  const [profit, setProfit] = useState(0);
  const [lostDragons, setLostDragons] = useState<any>(null);

  // অটো বেট স্টেট
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [autoStats, setAutoStats] = useState({ bets: 0, profit: 0 });
  const isAutoRef = useRef(false);
  const [autoLevels, setAutoLevels] = useState("3"); // কত লেভেল উঠবে
  const [autoBetCount, setAutoBetCount] = useState("0");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [onWinMode, setOnWinMode] = useState<"reset" | "increase">("reset");
  const [onWinValue, setOnWinValue] = useState("0");
  const [onLossMode, setOnLossMode] = useState<"reset" | "increase">("reset");
  const [onLossValue, setOnLossValue] = useState("0");
  const [stopOnProfit, setStopOnProfit] = useState("0.00");
  const [stopOnLoss, setStopOnLoss] = useState("0.00");

  // হিস্টোরি
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

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
  }, [history]);

  // 🎮 গেম শুরু
  const handleStartGame = async () => {
    const amount = Number(betAmount);
    if (amount <= 0) return setErrorMsg("Invalid bet amount.");
    if (amount > balance) return setErrorMsg("Insufficient balance.");

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.rpc("start_dragon_tower", {
        p_bet_amount: amount,
        p_difficulty: difficulty
      });

      if (error) throw error;

      if (data) {
        setGameId(data.game_id);
        setBalance(data.new_balance);
        setGameState({ status: "playing", level: 1, revealed: {} });
        setMultiplier(1.00);
        setProfit(0);
        setLostDragons(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start game.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🥚 ডিমে ক্লিক
  const handleRevealEgg = async (level: number, eggIndex: number) => {
    if (gameState.status !== "playing" || isProcessing) return;
    if (level !== gameState.level) return; 
    if (gameState.revealed[level]?.includes(eggIndex)) return;

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.rpc("reveal_dragon_egg", {
        p_game_id: gameId,
        p_egg_index: eggIndex
      });

      if (error) throw error;

      if (data) {
        if (data.is_dragon) {
          setGameState(prev => ({
            ...prev,
            status: "lost",
            revealed: { ...prev.revealed, [level]: [...(prev.revealed[level] || []), eggIndex] }
          }));
          setMultiplier(0);
          setProfit(-Number(betAmount));
          setLostDragons(data.dragons);
          
          setHistory(prev => [...prev, {
            id: Date.now().toString(), value: 0, isWin: false, profit: -Number(betAmount), nonce: history.length + 1, betAmount: Number(betAmount)
          }]);
        } else {
          const nextLevel = data.new_level;
          setMultiplier(data.new_multiplier);
          setProfit(Number(betAmount) * data.new_multiplier - Number(betAmount));

          setGameState(prev => ({
            ...prev,
            level: nextLevel > 9 ? 9 : nextLevel,
            status: data.auto_cashout ? "cashed_out" : "playing",
            revealed: { ...prev.revealed, [level]: [...(prev.revealed[level] || []), eggIndex] }
          }));

          if (data.auto_cashout) {
            setBalance(prev => prev + (Number(betAmount) * data.new_multiplier));
            setHistory(prev => [...prev, {
              id: Date.now().toString(), value: data.new_multiplier, isWin: true, profit: (Number(betAmount) * data.new_multiplier) - Number(betAmount), nonce: history.length + 1, betAmount: Number(betAmount)
            }]);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reveal egg.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 💰 ক্যাশআউট
  const handleCashout = async () => {
    if (gameState.status !== "playing" || gameState.level === 1) return;

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.rpc("cashout_dragon_tower", {
        p_game_id: gameId
      });

      if (error) throw error;

      if (data) {
        setGameState(prev => ({ ...prev, status: "cashed_out" }));
        setBalance(data.new_balance);
        
        setHistory(prev => [...prev, {
          id: Date.now().toString(), value: multiplier, isWin: true, profit: (Number(betAmount) * multiplier) - Number(betAmount), nonce: history.length + 1, betAmount: Number(betAmount)
        }]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to cashout.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🤖 অটো বেট লজিক
  const toggleAutoBet = () => {
    if (isAutoRef.current) {
      isAutoRef.current = false;
      setIsAutoBetting(false);
    } else {
      const amount = Number(betAmount);
      const levelsToClimb = Number(autoLevels);
      
      if (amount <= 0) return setErrorMsg("Invalid bet amount.");
      if (levelsToClimb <= 0 || levelsToClimb > 9) {
        return setErrorMsg(`You can climb between 1 and 9 levels.`);
      }

      isAutoRef.current = true;
      setIsAutoBetting(true);
      setAutoStats({ bets: 0, profit: 0 });
      runAutoLoop(amount, 0, 0); 
    }
  };

  const runAutoLoop = async (currentBet: number, currentCount: number, currentProfit: number) => {
    if (!isAutoRef.current) return;

    const maxBets = Number(autoBetCount);
    const profitLimit = Number(stopOnProfit);
    const lossLimit = Number(stopOnLoss);
    const levelsToClimb = Number(autoLevels);

    if (maxBets > 0 && currentCount >= maxBets) return toggleAutoBet();
    if (profitLimit > 0 && currentProfit >= profitLimit) return toggleAutoBet();
    if (lossLimit > 0 && currentProfit <= -lossLimit) return toggleAutoBet();
    if (currentBet > balance) {
      setErrorMsg("Auto stopped: Insufficient balance.");
      return toggleAutoBet();
    }

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const { data: startData, error: startError } = await supabase.rpc("start_dragon_tower", {
        p_bet_amount: currentBet,
        p_difficulty: difficulty
      });

      if (startError) throw startError;
      
      setGameId(startData.game_id);
      setBalance(startData.new_balance);
      
      let currentLevel = 1;
      let isRoundWin = false;
      let roundProfit = 0;
      let currentMultiplier = 1.00;
      
      let currentRevealed: { [level: number]: number[] } = {};
      setGameState({ status: "playing", level: 1, revealed: {} });
      setMultiplier(1.00);

      for (let i = 0; i < levelsToClimb; i++) {
        // অটো বট র‍্যান্ডমলি একটি ডিম খুঁজে বের করবে
        const eggIndex = Math.floor(Math.random() * 4);
        
        await new Promise(res => setTimeout(res, 500)); // ডিলে

        const { data: tileData, error: tileError } = await supabase.rpc("reveal_dragon_egg", {
          p_game_id: startData.game_id,
          p_egg_index: eggIndex
        });

        if (tileError) throw tileError;

        currentRevealed[currentLevel] = [eggIndex];
        setGameState({ status: "playing", level: currentLevel + 1, revealed: currentRevealed });

        if (tileData.is_dragon) {
          isRoundWin = false;
          roundProfit = -currentBet;
          setMultiplier(0);
          setGameState({ status: "lost", level: currentLevel, revealed: currentRevealed });
          break; 
        } else {
          currentMultiplier = tileData.new_multiplier;
          setMultiplier(currentMultiplier);
          currentLevel = tileData.new_level;
          
          if (i === levelsToClimb - 1) {
            const { data: cashoutData, error: cashoutError } = await supabase.rpc("cashout_dragon_tower", { p_game_id: startData.game_id });
            if (cashoutError) throw cashoutError;
            
            isRoundWin = true;
            setBalance(cashoutData.new_balance);
            roundProfit = (currentBet * currentMultiplier) - currentBet;
            setGameState({ status: "cashed_out", level: currentLevel, revealed: currentRevealed });
          }
        }
      }

      const newCount = currentCount + 1;
      const newProfit = currentProfit + roundProfit;
      setAutoStats({ bets: newCount, profit: newProfit });

      setHistory(prev => [...prev, {
        id: Date.now().toString(), value: isRoundWin ? currentMultiplier : 0, isWin: isRoundWin, profit: roundProfit, nonce: history.length + 1, betAmount: currentBet
      }]);

      let nextBet = currentBet;
      if (isRoundWin && onWinMode === "increase") {
        nextBet = currentBet + (currentBet * Number(onWinValue) / 100);
      } else if (!isRoundWin && onLossMode === "increase") {
        nextBet = currentBet + (currentBet * Number(onLossValue) / 100);
      }
      setBetAmount(nextBet.toFixed(2));

      if (isAutoRef.current) {
        setTimeout(() => runAutoLoop(nextBet, newCount, newProfit), 1200); 
      }

    } catch (err: any) {
      setErrorMsg(err.message || "Failed during auto bet.");
      toggleAutoBet();
    } finally {
      setIsProcessing(false);
    }
  };

  const getDragonsPerLevel = () => {
    if (difficulty === "easy") return 1;
    if (difficulty === "medium") return 2;
    return 3;
  };

  return (
    <div className="stake-app">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="stake-main" style={{ paddingBottom: '80px', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div className="limbo-game-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="limbo-main-area" style={{ flex: 1 }}>
            
            <div className="limbo-history-wrapper">
              <div className="limbo-history-container" ref={historyContainerRef}>
                {history.map((item) => (
                  <div key={item.id} className={`limbo-history-item ${item.isWin ? 'win' : 'lose'}`}>
                    {item.isWin ? `${item.value.toFixed(2)}x` : "Loss"}
                  </div>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: "rgba(255,77,77,0.1)", color: "#ff4d4d", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px", textAlign: "center" }}>
                {errorMsg}
              </div>
            )}

            {/* 🐉 3D আইস ড্রাগন হেড */}
            <div className="dragon-head-container">
              <svg className="dragon-head" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="iceBase" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#94A3B8" />
                    <stop offset="50%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#1E293B" />
                  </linearGradient>
                  <linearGradient id="iceSpike" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#00E5FF" />
                  </linearGradient>
                </defs>
                
                <path d="M45 25 L15 0 L35 25 Z" fill="url(#iceSpike)" />
                <path d="M55 25 L85 0 L65 25 Z" fill="url(#iceSpike)" />
                <path d="M30 40 L5 20 L25 40 Z" fill="url(#iceSpike)" />
                <path d="M70 40 L95 20 L75 40 Z" fill="url(#iceSpike)" />
                
                <path d="M50 10 C30 10 20 30 20 55 C20 80 30 95 50 95 C70 95 80 80 80 55 C80 30 70 10 50 10 Z" fill="url(#iceBase)" />
                <path d="M30 60 L70 60 L50 90 Z" fill="#0F172A" />
                
                <path d="M25 40 L45 45 L30 50 Z" fill="#0F172A" />
                <path d="M75 40 L55 45 L70 50 Z" fill="#0F172A" />
                
                <path d="M30 43 L40 45 L33 48 Z" className="dragon-eye" />
                <path d="M70 43 L60 45 L67 48 Z" className="dragon-eye" />
                
                <path d="M35 60 L40 70 L45 60 Z" fill="#00E5FF" />
                <path d="M55 60 L60 70 L65 60 Z" fill="#00E5FF" />
                <path d="M45 60 L50 65 L55 60 Z" fill="#00E5FF" />
              </svg>
            </div>

            {/* 🥚 ড্রাগন টাওয়ার গ্রিড */}
            <div className="dragon-grid">
              {Array.from({ length: 9 }).map((_, levelIndex) => {
                const level = levelIndex + 1;
                const isActive = gameState.status === "playing" && gameState.level === level;
                
                return (
                  <div key={level} className={`level-row ${isActive ? "active" : ""}`}>
                    {Array.from({ length: 4 }).map((_, eggIndex) => {
                      const isRevealed = gameState.revealed[level]?.includes(eggIndex);
                      const isDragon = lostDragons && lostDragons[level - 1]?.includes(eggIndex);
                      
                      return (
                        <div
                          key={eggIndex}
                          className={`egg-tile ${isRevealed && isDragon ? 'dragon' : ''} ${isRevealed && !isDragon ? 'safe' : ''}`}
                          onClick={() => handleRevealEgg(level, eggIndex)}
                        >
                          {isRevealed ? (
                            isDragon ? (
                              // 💀 আগুন ও খুলি
                              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <radialGradient id="fireGrad" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#FFDD00" />
                                    <stop offset="70%" stopColor="#FF5500" />
                                    <stop offset="100%" stopColor="#990000" />
                                  </radialGradient>
                                </defs>
                                <circle cx="50" cy="50" r="45" fill="url(#fireGrad)" />
                                <path d="M50 20 C40 20 30 30 30 45 C30 60 40 70 50 70 C60 70 70 60 70 45 C70 30 60 20 50 20 Z" fill="#FFFFFF" />
                                <circle cx="40" cy="45" r="8" fill="#000000" />
                                <circle cx="60" cy="45" r="8" fill="#000000" />
                                <path d="M45 60 L55 60 L50 68 Z" fill="#000000" />
                              </svg>
                            ) : (
                              // 🥚 সেফ ডিম (সাদা)
                              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <path d="M50 15 C30 15 20 45 20 65 C20 85 30 95 50 95 C70 95 80 85 80 65 C80 45 70 15 50 15 Z" fill="#F8FAFC" />
                                <path d="M40 40 L50 50 L45 60 L55 70" stroke="#94A3B8" strokeWidth="2" fill="none" />
                                <path d="M50 15 C30 15 20 45 20 65 C20 85 30 95 50 95 C70 95 80 85 80 65 C80 45 70 15 50 15 Z" fill="none" stroke="#E2E8F0" strokeWidth="2"/>
                              </svg>
                            )
                          ) : (
                            // 🥚 পাথরের ডিম (আনরিভিলড)
                            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                              <path d="M50 15 C30 15 20 45 20 65 C20 85 30 95 50 95 C70 95 80 85 80 65 C80 45 70 15 50 15 Z" fill="#64748B" />
                              <circle cx="35" cy="45" r="4" fill="#475569" />
                              <circle cx="60" cy="55" r="6" fill="#475569" />
                              <circle cx="40" cy="75" r="5" fill="#475569" />
                              <circle cx="65" cy="80" r="3" fill="#475569" />
                              <circle cx="25" cy="65" r="3" fill="#475569" />
                              <circle cx="70" cy="40" r="4" fill="#475569" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="limbo-inputs-grid" style={{ marginTop: 'auto' }}>
              <div className="limbo-input-group">
                <label>Difficulty ({getDragonsPerLevel()} Dragons)</label>
                <div className={`limbo-input-wrapper ${(gameState.status === "playing") ? 'disabled' : ''}`}>
                  <select className="mines-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={gameState.status === "playing" || isProcessing}>
                    <option value="easy">Easy (1 Dragon)</option>
                    <option value="medium">Medium (2 Dragons)</option>
                    <option value="hard">Hard (3 Dragons)</option>
                  </select>
                </div>
              </div>
              <div className="limbo-input-group">
                <label>Multiplier</label>
                <div className="limbo-input-wrapper">
                  <input type="text" value={`${multiplier.toFixed(2)}x`} readOnly style={{ color: multiplier > 1 ? 'var(--limbo-accent)' : '#fff' }} />
                </div>
              </div>
            </div>

            {activeTab === "manual" ? (
              gameState.status === "playing" ? (
                <button className="limbo-bet-btn" onClick={handleCashout} disabled={isProcessing || gameState.level === 1} style={{ background: multiplier > 1 ? 'var(--limbo-accent)' : '#365244', color: multiplier > 1 ? '#000' : '#fff' }}>
                  {isProcessing ? "Processing..." : multiplier > 1 ? `Cashout ৳ ${(Number(betAmount) * multiplier).toFixed(2)}` : "Pick an Egg"}
                </button>
              ) : (
                <button className={`limbo-bet-btn ${isProcessing ? "rolling" : ""}`} onClick={handleStartGame} disabled={isProcessing}>
                  {isProcessing ? "Starting..." : "Bet"}
                </button>
              )
            ) : (
              <button className={`limbo-bet-btn ${isAutoBetting ? "stop-btn" : ""}`} onClick={toggleAutoBet} disabled={isProcessing && !isAutoBetting}>
                {isAutoBetting ? "Stop Auto" : "Start Auto"}
              </button>
            )}

            <div className="limbo-amount-section">
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Bet Amount</label>
                  <span className="limbo-currency">Balance: {balance.toFixed(2)} BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${(gameState.status === "playing" || isAutoBetting) ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>
                  <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0.00" disabled={gameState.status === "playing" || isAutoBetting || isProcessing} />
                  <div className="limbo-quick-btns">
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))} disabled={gameState.status === "playing" || isAutoBetting || isProcessing}>½</button>
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))} disabled={gameState.status === "playing" || isAutoBetting || isProcessing}>2x</button>
                  </div>
                </div>
              </div>
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Profit</label>
                  <span className="limbo-currency">0.00000000 BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${(gameState.status === "playing" || isAutoBetting) ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>
                  <input type="number" value={activeTab === "manual" ? (gameState.status === "playing" ? profit.toFixed(2) : 0) : autoStats.profit.toFixed(2)} readOnly style={{ color: (activeTab === "manual" ? profit : autoStats.profit) > 0 ? 'var(--limbo-accent)' : (activeTab === "manual" ? profit : autoStats.profit) < 0 ? 'var(--limbo-danger)' : '#fff' }} />
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
                  <label>Levels to Climb (1-9)</label>
                  <div className="limbo-input-wrapper">
                    <input type="number" value={autoLevels} onChange={(e) => setAutoLevels(e.target.value)} disabled={isAutoBetting} min="1" max="9" />
                  </div>
                </div>

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

            <div className="limbo-bottom-tabs">
              <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")} disabled={isAutoBetting}>Manual</button>
              <button className={activeTab === "auto" ? "active" : ""} onClick={() => setActiveTab("auto")} disabled={isAutoBetting}>Auto</button>
            </div>

            <GameBottomBar 
              onSettingsClick={() => setIsSettingsOpen(true)}
              onStatsClick={() => {}} 
              onFairnessClick={() => setIsFairnessOpen(true)}
            />

          </div>
        </div>
      </main>

      <Footer activePage="casino" onNavigate={(page) => {
        if (page === "home") router.push("/");
        else if (page === "chat") router.push("/live-support/");
        else if (page === "casino") router.push("/play-category/");
        else if (page === "sports") router.push("/");
      }} />

      {isSettingsOpen && (
        <div className="limbo-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body">
              <p style={{ color: '#A0ADB0', fontSize: '13px', textAlign: 'center' }}>Sound and Turbo settings coming soon!</p>
            </div>
          </div>
        </div>
      )}

      {isFairnessOpen && (
        <div className="limbo-modal-overlay" onClick={() => setIsFairnessOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Provably Fair</h3>
              <button onClick={() => setIsFairnessOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body">
              <p style={{ color: '#aaa', fontSize: '13px' }}>
                Dragon Tower uses a provably fair system to ensure every egg is completely random.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
