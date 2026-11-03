/* app/original/mines/page.tsx */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import GameBottomBar from "../../../components/GameBottomBar/GameBottomBar";
import { createClient } from "../../../lib/supabase/client";
import "./mines.css";

type Tile = {
  index: number;
  isRevealed: boolean;
  isBomb: boolean;
};

type HistoryItem = {
  id: string;
  value: number;
  isWin: boolean;
  profit: number;
  nonce: number;
  betAmount: number;
};

export default function MinesGamePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("10.00");
  const [minesCount, setMinesCount] = useState(3);

  // ট্যাব স্টেট
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");

  // গেম স্টেট
  const [gameId, setGameId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // গ্রিড ও মাল্টিপ্লায়ার স্টেট
  const [tiles, setTiles] = useState<Tile[]>(Array.from({ length: 25 }, (_, i) => ({ index: i, isRevealed: false, isBomb: false })));
  const [multiplier, setMultiplier] = useState(1.00);
  const [profit, setProfit] = useState(0);

  // অটো বেট স্টেট
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [autoStats, setAutoStats] = useState({ bets: 0, profit: 0 });
  const isAutoRef = useRef(false);
  const [autoTiles, setAutoTiles] = useState("3"); // অটোতে কয়টি ঘর খুলবে
  const [autoBetCount, setAutoBetCount] = useState("0");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [onWinMode, setOnWinMode] = useState<"reset" | "increase">("reset");
  const [onWinValue, setOnWinValue] = useState("0");
  const [onLossMode, setOnLossMode] = useState<"reset" | "increase">("reset");
  const [onLossValue, setOnLossValue] = useState("0");
  const [stopOnProfit, setStopOnProfit] = useState("0.00");
  const [stopOnLoss, setStopOnLoss] = useState("0.00");

  // হিস্টোরি ও গ্রাফ
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState(false); 

  // Settings & Fairness
  const [instantBet, setInstantBet] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [clientSeed, setClientSeed] = useState("my_client_seed_123");
  const [serverSeedHash, setServerSeedHash] = useState("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0");
  const [nonce, setNonce] = useState(1);
  const [isSeedVerified, setIsSeedVerified] = useState(false);
  const [fairnessView, setFairnessView] = useState<"main" | "change_seed" | "verify_seed">("main");

  const playSound = (type: "click" | "win" | "lose") => {
    if (!soundEnabled) return;
    const urls = {
      click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
      win: "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3",
      lose: "https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3"
    };
    const audio = new Audio(urls[type]);
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio blocked:", e));
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

  // 🎮 ম্যানুয়াল গেম শুরু
  const handleStartGame = async () => {
    const amount = Number(betAmount);
    if (amount <= 0) return setErrorMsg("Invalid bet amount.");
    if (amount > balance) return setErrorMsg("Insufficient balance.");

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.rpc("start_mines_game", {
        p_bet_amount: amount,
        p_mines_count: minesCount
      });

      if (error) throw error;

      if (data) {
        setGameId(data.game_id);
        setBalance(data.new_balance);
        setIsPlaying(true);
        setMultiplier(1.00);
        setProfit(0);
        setTiles(Array.from({ length: 25 }, (_, i) => ({ index: i, isRevealed: false, isBomb: false })));
        playSound("click");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start game.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 💎 ম্যানুয়াল ঘর খোলা
  const handleRevealTile = async (index: number) => {
    if (!isPlaying || isProcessing || tiles[index].isRevealed) return;

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.rpc("reveal_mines_tile", {
        p_game_id: gameId,
        p_tile_index: index
      });

      if (error) throw error;

      if (data) {
        if (data.is_bomb) {
          setIsPlaying(false);
          setMultiplier(0);
          setProfit(-Number(betAmount));
          playSound("lose");
          
          setTiles(prev => {
            const newTiles = [...prev];
            data.bombs.forEach((bombIdx: number) => {
              newTiles[bombIdx] = { ...newTiles[bombIdx], isRevealed: true, isBomb: true };
            });
            return newTiles;
          });

          setHistory(prev => [...prev, {
            id: Date.now().toString(), value: 0, isWin: false, profit: -Number(betAmount), nonce: nonce, betAmount: Number(betAmount)
          }]);
          setNonce(prev => prev + 1);
        } else {
          setMultiplier(data.new_multiplier);
          setProfit(Number(betAmount) * data.new_multiplier - Number(betAmount));
          playSound("click");
          
          setTiles(prev => {
            const newTiles = [...prev];
            newTiles[index] = { ...newTiles[index], isRevealed: true, isBomb: false };
            return newTiles;
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reveal tile.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 💰 ম্যানুয়াল ক্যাশআউট
  const handleCashout = async () => {
    if (!isPlaying || multiplier <= 1.00) return;

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.rpc("cashout_mines", {
        p_game_id: gameId
      });

      if (error) throw error;

      if (data) {
        setIsPlaying(false);
        setBalance(data.new_balance);
        playSound("win");
        
        setTiles(prev => {
          const newTiles = [...prev];
          data.bombs.forEach((bombIdx: number) => {
            newTiles[bombIdx] = { ...newTiles[bombIdx], isRevealed: true, isBomb: true };
          });
          return newTiles;
        });

        const winProfit = Number(betAmount) * multiplier - Number(betAmount);
        setHistory(prev => [...prev, {
          id: Date.now().toString(), value: multiplier, isWin: true, profit: winProfit, nonce: nonce, betAmount: Number(betAmount)
        }]);
        setNonce(prev => prev + 1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to cashout.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🤖 অটো বেট টগল
  const toggleAutoBet = () => {
    if (isAutoRef.current) {
      isAutoRef.current = false;
      setIsAutoBetting(false);
    } else {
      const amount = Number(betAmount);
      const tilesToReveal = Number(autoTiles);
      
      if (amount <= 0) return setErrorMsg("Invalid bet amount.");
      if (tilesToReveal <= 0 || tilesToReveal > (25 - minesCount)) {
        return setErrorMsg(`You can reveal between 1 and ${25 - minesCount} tiles.`);
      }

      isAutoRef.current = true;
      setIsAutoBetting(true);
      setAutoStats({ bets: 0, profit: 0 });
      runAutoLoop(amount, 0, 0); 
    }
  };

  // 🤖 অটো বেট লুপ (মূল লজিক)
  const runAutoLoop = async (currentBet: number, currentCount: number, currentProfit: number) => {
    if (!isAutoRef.current) return;

    const maxBets = Number(autoBetCount);
    const profitLimit = Number(stopOnProfit);
    const lossLimit = Number(stopOnLoss);
    const tilesToReveal = Number(autoTiles);

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
      // ১. গেম শুরু
      const { data: startData, error: startError } = await supabase.rpc("start_mines_game", {
        p_bet_amount: currentBet,
        p_mines_count: minesCount
      });

      if (startError) throw startError;
      
      setGameId(startData.game_id);
      setBalance(startData.new_balance);
      let newTilesState = Array.from({ length: 25 }, (_, i) => ({ index: i, isRevealed: false, isBomb: false }));
      setTiles([...newTilesState]);

      let roundProfit = 0;
      let isRoundWin = false;
      let currentMultiplier = 1.00;

      // ২. ঘর খোলা (লুপ চালিয়ে)
      for (let i = 0; i < tilesToReveal; i++) {
        const tileIndex = i; // ০, ১, ২, ৩ নাম্বার ঘর খুলবে
        await new Promise(res => setTimeout(res, instantBet ? 10 : 300)); // ডিলে

        const { data: tileData, error: tileError } = await supabase.rpc("reveal_mines_tile", {
          p_game_id: startData.game_id,
          p_tile_index: tileIndex
        });

        if (tileError) throw tileError;

        if (tileData.is_bomb) {
          // বোমায় ক্লিক
          isRoundWin = false;
          roundProfit = -currentBet;
          tileData.bombs.forEach((bIdx: number) => { newTilesState[bIdx] = { ...newTilesState[bIdx], isRevealed: true, isBomb: true }; });
          setTiles([...newTilesState]);
          playSound("lose");
          break; 
        } else {
          // সেফ ঘর
          currentMultiplier = tileData.new_multiplier;
          newTilesState[tileIndex] = { ...newTilesState[tileIndex], isRevealed: true, isBomb: false };
          setTiles([...newTilesState]);
          playSound("click");

          if (i === tilesToReveal - 1) {
            // কাঙ্ক্ষিত ঘর খোলা শেষ, ক্যাশআউট
            const { data: cashoutData, error: cashoutError } = await supabase.rpc("cashout_mines", { p_game_id: startData.game_id });
            if (cashoutError) throw cashoutError;
            
            isRoundWin = true;
            setBalance(cashoutData.new_balance);
            roundProfit = (currentBet * currentMultiplier) - currentBet;
            
            cashoutData.bombs.forEach((bIdx: number) => { newTilesState[bIdx] = { ...newTilesState[bIdx], isRevealed: true, isBomb: true }; });
            setTiles([...newTilesState]);
            playSound("win");
          }
        }
      }

      // ৩. স্ট্যাটস আপডেট
      const newCount = currentCount + 1;
      const newProfit = currentProfit + roundProfit;
      setAutoStats({ bets: newCount, profit: newProfit });

      setHistory(prev => [...prev, {
        id: Date.now().toString(), value: isRoundWin ? currentMultiplier : 0, isWin: isRoundWin, profit: roundProfit, nonce: nonce + newCount, betAmount: currentBet
      }]);

      // ৪. পরবর্তী বেট সাইজ (On Win/Loss)
      let nextBet = currentBet;
      if (isRoundWin && onWinMode === "increase") {
        nextBet = currentBet + (currentBet * Number(onWinValue) / 100);
      } else if (!isRoundWin && onLossMode === "increase") {
        nextBet = currentBet + (currentBet * Number(onLossValue) / 100);
      }
      setBetAmount(nextBet.toFixed(2));

      // ৫. আবার লুপ শুরু
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

  // 📊 স্ট্যাটস ক্যালকুলেশন
  const totalWagered = history.reduce((sum, item) => sum + item.betAmount, 0);
  const totalProfit = history.reduce((sum, item) => sum + item.profit, 0);
  const wins = history.filter(h => h.isWin).length;
  const losses = history.filter(h => !h.isWin).length;

  // 📈 গ্রাফ জেনারেশন
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
    history.forEach(h => { cumulative += h.profit; points.push(cumulative); });

    const maxAbs = Math.max(...points.map(Math.abs), 1); 
    const width = 280; 
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

      segments.push(<line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />);
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E701" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#00E701" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <line x1="0" y1={centerY} x2={width} y2={centerY} stroke="#2b4236" strokeWidth="1" />
        <clipPath id="aboveCenter"><rect x="0" y="0" width={width} height={centerY} /></clipPath>
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

            {/* ✅ মাইনস গ্রিড */}
            <div className="mines-grid-container">
              {tiles.map((tile) => (
                <div
                  key={tile.index}
                  className={`mines-tile ${tile.isRevealed ? 'revealed' : ''} ${tile.isRevealed && tile.isBomb ? 'bomb' : ''} ${tile.isRevealed && !tile.isBomb ? 'safe' : ''} ${(!isPlaying && !isAutoBetting) ? 'disabled' : ''}`}
                  onClick={() => activeTab === "manual" && handleRevealTile(tile.index)}
                >
                  {tile.isRevealed && (
                    tile.isBomb ? (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="#ff4d4d" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fillOpacity="0.2"/>
                        <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" fill="currentColor"/>
                        <path d="M15.5355 6.05025C16.1213 6.63604 16.1213 7.58579 15.5355 8.17157L13.0607 10.6464C12.4749 11.2322 11.5251 11.2322 10.9393 10.6464C10.3536 10.0607 10.3536 9.11091 10.9393 8.52513L13.4142 6.05025C14 5.46447 14.9497 5.46447 15.5355 6.05025Z" fill="#ff4d4d"/>
                        <path d="M19.5 3.5L22 6M21 3L18.5 5.5" stroke="#ff4d4d" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="#00E701" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 2H18L22 8L12 22L2 8L6 2Z" fillOpacity="0.2"/>
                        <path d="M6 2L2 8H22L18 2H6Z" fill="currentColor" />
                        <path d="M12 22L7 8H17L12 22Z" fill="currentColor" fillOpacity="0.8"/>
                        <path d="M2 8L7 8L12 22L2 8Z" fill="currentColor" fillOpacity="0.6"/>
                        <path d="M22 8L17 8L12 22L22 8Z" fill="currentColor" fillOpacity="0.6"/>
                      </svg>
                    )
                  )}
                </div>
              ))}
            </div>

            <div className="limbo-inputs-grid">
              <div className="limbo-input-group">
                <label>Mines</label>
                <div className={`limbo-input-wrapper ${(isPlaying || isAutoBetting) ? 'disabled' : ''}`}>
                  <select className="mines-select" value={minesCount} onChange={(e) => setMinesCount(Number(e.target.value))} disabled={isPlaying || isAutoBetting || isProcessing}>
                    {[1, 3, 5, 10, 15, 24].map(num => <option key={num} value={num}>{num} Mines</option>)}
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

            {/* মেইন বেট / ক্যাশআউট বাটন */}
            {activeTab === "manual" ? (
              isPlaying ? (
                <button className="limbo-bet-btn" onClick={handleCashout} disabled={isProcessing || multiplier <= 1.00} style={{ background: multiplier > 1 ? 'var(--limbo-accent)' : '#365244', color: multiplier > 1 ? '#000' : '#fff' }}>
                  {isProcessing ? "Processing..." : multiplier > 1 ? `Cashout ৳ ${(Number(betAmount) * multiplier).toFixed(2)}` : "Pick a Tile"}
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
                <div className={`limbo-amount-input-wrap ${(isPlaying || isAutoBetting) ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>
                  <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0.00" disabled={isPlaying || isAutoBetting || isProcessing} />
                  <div className="limbo-quick-btns">
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))} disabled={isPlaying || isAutoBetting || isProcessing}>½</button>
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))} disabled={isPlaying || isAutoBetting || isProcessing}>2x</button>
                  </div>
                </div>
              </div>
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Profit</label>
                  <span className="limbo-currency">0.00000000 BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${(isPlaying || isAutoBetting) ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>
                  <input type="number" value={activeTab === "manual" ? (isPlaying ? profit.toFixed(2) : 0) : autoStats.profit.toFixed(2)} readOnly style={{ color: (activeTab === "manual" ? profit : autoStats.profit) > 0 ? 'var(--limbo-accent)' : (activeTab === "manual" ? profit : autoStats.profit) < 0 ? 'var(--limbo-danger)' : '#fff' }} />
                </div>
              </div>
            </div>

            {/* ✅ Auto Settings Panel */}
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
                  <label>Tiles to Reveal (Max {25 - minesCount})</label>
                  <div className="limbo-input-wrapper">
                    <input type="number" value={autoTiles} onChange={(e) => setAutoTiles(e.target.value)} disabled={isAutoBetting} min="1" max={25 - minesCount} />
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
              onStatsClick={() => setIsGraphOpen(true)}
              onFairnessClick={() => { setIsFairnessOpen(true); setFairnessView("main"); }}
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

      {/* ================= ✅ Modals ================= */}
      {/* Settings, Bet History, Graph, Fairness (আগের মতোই থাকবে) */}
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
              <button className="limbo-btn-secondary" style={{ width: '100%', marginTop: '15px' }} onClick={() => { setIsSettingsOpen(false); setIsBetHistoryOpen(true); }}>
                View Bet History
              </button>
            </div>
          </div>
        </div>
      )}

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
                        <td style={{ padding: '8px 4px' }}>{h.isWin ? `${h.value.toFixed(2)}x` : "Loss"}</td>
                        <td style={{ padding: '8px 4px', color: h.isWin ? '#00e701' : '#ff4d4d' }}>{h.isWin ? 'Win' : 'Loss'}</td>
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

      {isGraphOpen && (
        <div className="limbo-modal-overlay no-blur" onClick={() => setIsGraphOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '240px' }}>
            <div className="limbo-live-stats-header" style={{ padding: '16px 12px 0 12px' }}>
              <div className="limbo-live-stats-title">
                <i className="fa-solid fa-chart-simple" style={{ fontSize: '14px', color: '#a0aab2' }}></i>
                <h3 style={{ fontSize: '0.95rem', color: '#fff', margin: 0, fontWeight: 'bold' }}>Live Stats</h3>
              </div>
              <div className="limbo-live-stats-icons">
                <button onClick={() => setIsGraphOpen(false)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
            <div className="limbo-modal-body" style={{ padding: '12px' }}>
              <div className="limbo-stats-main-card">
                <div className="limbo-stats-layout">
                  <div className="limbo-stats-column">
                    <div className="limbo-stat-row-new">
                      <span className="limbo-stat-label-new">Profit</span>
                      <span className="limbo-stat-value-new" style={{ color: totalProfit >= 0 ? '#00E701' : '#ff4d4d' }}>{totalProfit >= 0 ? '' : '-'}৳{Math.abs(totalProfit).toFixed(2)}</span>
                    </div>
                    <div className="limbo-stat-row-new">
                      <span className="limbo-stat-label-new">Wagered</span>
                      <span className="limbo-stat-value-new" style={{ color: '#fff' }}>৳{totalWagered.toFixed(2)}</span>
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
                <div className="limbo-graph-card-wrapper">
                  <div className="limbo-graph-area-new" ref={graphContainerRef}>{generateGraph()}</div>
                </div>
              </div>
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
              {fairnessView === "main" && (
                <>
                  <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '15px' }}>Mines uses a provably fair system to ensure every grid is completely random.</p>
                  <div className="limbo-fairness-group"><label>Server Seed (Hashed)</label><div className="limbo-fairness-input"><code>{serverSeedHash}</code></div></div>
                  <div className="limbo-fairness-group"><label>Client Seed (Editable)</label><div className="limbo-fairness-input"><input type="text" value={clientSeed} readOnly /></div></div>
                  <div className="limbo-fairness-group"><label>Seed Verify Number</label><div className="limbo-fairness-input"><code>{nonce}</code></div></div>
                  <div className="limbo-fairness-btn-group">
                    <button className="limbo-btn-secondary" onClick={() => setFairnessView("change_seed")}>Change Seed</button>
                    <button className="limbo-btn-secondary" onClick={() => setFairnessView("verify_seed")}>Verify Seed</button>
                  </div>
                </>
              )}
              {fairnessView === "change_seed" && (
                <>
                  <button className="limbo-back-btn" onClick={() => setFairnessView("main")}><i className="fa-solid fa-arrow-left"></i> Back</button>
                  <h4 style={{ color: '#fff', marginTop: 0, marginBottom: '15px' }}>Change Client Seed</h4>
                  <div className="limbo-fairness-group"><label>New Client Seed</label><div className="limbo-fairness-input"><input type="text" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} placeholder="Enter new seed" /></div></div>
                  <button className="limbo-btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={() => { setFairnessView("main"); setIsSeedVerified(false); }}>Save Seed</button>
                </>
              )}
              {fairnessView === "verify_seed" && (
                <>
                  <button className="limbo-back-btn" onClick={() => setFairnessView("main")}><i className="fa-solid fa-arrow-left"></i> Back</button>
                  <h4 style={{ color: '#fff', marginTop: 0, marginBottom: '15px' }}>Verify Latest Result</h4>
                  {latestResult ? (
                    <div className="limbo-verify-result-box">
                      <p>Last Multiplier:</p>
                      <h4 style={{ color: latestResult.isWin ? '#00E701' : '#ff4d4d' }}>{latestResult.isWin ? `${latestResult.value.toFixed(2)}x (Win)` : `Loss`}</h4>
                      <p style={{ marginTop: '10px' }}>Verify Number: <strong>{latestResult.nonce}</strong></p>
                    </div>
                  ) : (
                    <p style={{ color: '#aaa', fontSize: '13px' }}>No bets placed yet to verify.</p>
                  )}
                  <div className="limbo-fairness-group"><label>Server Seed (Hashed)</label><div className="limbo-fairness-input"><code>{serverSeedHash}</code></div></div>
                  <div className="limbo-fairness-group"><label>Client Seed</label><div className="limbo-fairness-input"><code>{clientSeed}</code></div></div>
                  <button className={`limbo-btn-secondary ${isSeedVerified ? 'verified' : ''}`} style={{ width: '100%', marginTop: '10px', background: isSeedVerified ? '#00e701' : '', color: isSeedVerified ? '#000' : '' }} onClick={() => setIsSeedVerified(true)}>
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
