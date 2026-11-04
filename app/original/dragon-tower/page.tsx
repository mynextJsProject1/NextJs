/* app/original/dragon-tower/page.tsx */
"use client";

import { useState, useEffect, useMemo } from "react";
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

  // ট্যাব স্টেট
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");

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
  }, [supabase]);

  const playSound = (type: "click" | "win" | "lose") => {
    const urls = {
      click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
      win: "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3",
      lose: "https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3"
    };
    const audio = new Audio(urls[type]);
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio blocked:", e));
  };

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
        playSound("click");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start game.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🥚 ডিমে ক্লিক করা
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
          playSound("lose");
        } else {
          const nextLevel = data.new_level;
          setMultiplier(data.new_multiplier);
          setProfit(Number(betAmount) * data.new_multiplier - Number(betAmount));
          playSound("click");

          setGameState(prev => ({
            ...prev,
            level: nextLevel > 9 ? 9 : nextLevel,
            status: data.auto_cashout ? "cashed_out" : "playing",
            revealed: { ...prev.revealed, [level]: [...(prev.revealed[level] || []), eggIndex] }
          }));

          if (data.auto_cashout) {
            setBalance(prev => prev + (Number(betAmount) * data.new_multiplier));
            playSound("win");
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
        playSound("win");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to cashout.");
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

      <main className="stake-main" style={{ paddingBottom: '80px' }}>
        <div className="limbo-game-container">
          <div className="limbo-main-area">
            
            {errorMsg && (
              <div style={{ background: "rgba(255,77,77,0.1)", color: "#ff4d4d", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px", textAlign: "center" }}>
                {errorMsg}
              </div>
            )}

            {/* 🐉 হরর ড্রাগন হেড */}
            <div className="dragon-head-container">
              <svg className="dragon-head" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 10 L20 30 L10 70 L30 90 L70 90 L90 70 L80 30 Z" fill="#121816" stroke="#263C32" strokeWidth="2" />
                <path d="M30 40 L45 45 L40 55 Z" className="dragon-eye" />
                <path d="M70 40 L55 45 L60 55 Z" className="dragon-eye" />
                <path d="M40 70 L60 70 L50 85 Z" fill="#263C32" />
                <path d="M45 60 L55 60 M48 65 L52 65" stroke="#A0ADB0" strokeWidth="2" />
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
                              // 💀 প্রিমিয়াম ড্রাগন খুলি (Loss)
                              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ff4d4d" />
                                    <stop offset="100%" stopColor="#990000" />
                                  </linearGradient>
                                </defs>
                                <path d="M50 15 C30 15 20 35 20 55 C20 75 30 85 50 85 C70 85 80 75 80 55 C80 35 70 15 50 15 Z" fill="url(#redGrad)" stroke="#ff1a1a" strokeWidth="3" />
                                <path d="M35 75 L35 85 L45 80 L50 85 L55 80 L65 85 L65 75" fill="#990000" stroke="#ff1a1a" strokeWidth="2" strokeLinejoin="round" />
                                <ellipse cx="35" cy="50" rx="10" ry="12" fill="#000" stroke="#ff1a1a" strokeWidth="2" />
                                <ellipse cx="65" cy="50" rx="10" ry="12" fill="#000" stroke="#ff1a1a" strokeWidth="2" />
                                <ellipse cx="35" cy="50" rx="5" ry="7" fill="#ff4d4d" />
                                <ellipse cx="65" cy="50" rx="5" ry="7" fill="#ff4d4d" />
                                <path d="M45 65 L55 65 L50 70 Z" fill="#000" />
                              </svg>
                            ) : (
                              // 🥚 প্রিমিয়াম সেফ ডিম (Win)
                              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#00E701" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#00E701" stopOpacity="0.2" />
                                  </linearGradient>
                                </defs>
                                <path d="M50 10 C25 10 15 45 15 65 C15 85 25 95 50 95 C75 95 85 85 85 65 C85 45 75 10 50 10 Z" fill="url(#greenGrad)" stroke="#00E701" strokeWidth="4" />
                                <path d="M40 40 L50 55 L45 70 L55 80" stroke="#00E701" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M40 40 L50 55 L45 70 L55 80" stroke="#FFFFFF" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                                <circle cx="50" cy="65" r="10" fill="#FFFFFF" opacity="0.2" filter="blur(4px)"/>
                              </svg>
                            )
                          ) : (
                            // 🥚 প্রিমিয়াম আনরিভিলড ডিম
                            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                              <path d="M50 10 C25 10 15 45 15 65 C15 85 25 95 50 95 C75 95 85 85 85 65 C85 45 75 10 50 10 Z" fill="#1B2A23" stroke="#263C32" strokeWidth="4" />
                              <circle cx="35" cy="45" r="5" fill="#121816" />
                              <circle cx="60" cy="55" r="7" fill="#121816" />
                              <circle cx="40" cy="75" r="6" fill="#121816" />
                              <circle cx="65" cy="80" r="4" fill="#121816" />
                              <circle cx="25" cy="65" r="3" fill="#121816" />
                              <circle cx="70" cy="40" r="4" fill="#121816" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="limbo-inputs-grid">
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

            {gameState.status === "playing" ? (
              <button className="limbo-bet-btn" onClick={handleCashout} disabled={isProcessing || gameState.level === 1} style={{ background: multiplier > 1 ? 'var(--limbo-accent)' : '#365244', color: multiplier > 1 ? '#000' : '#fff' }}>
                {isProcessing ? "Processing..." : multiplier > 1 ? `Cashout ৳ ${(Number(betAmount) * multiplier).toFixed(2)}` : "Pick an Egg"}
              </button>
            ) : (
              <button className={`limbo-bet-btn ${isProcessing ? "rolling" : ""}`} onClick={handleStartGame} disabled={isProcessing}>
                {isProcessing ? "Starting..." : "Bet"}
              </button>
            )}

            <div className="limbo-amount-section">
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Bet Amount</label>
                  <span className="limbo-currency">Balance: {balance.toFixed(2)} BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${(gameState.status === "playing") ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>
                  <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0.00" disabled={gameState.status === "playing" || isProcessing} />
                  <div className="limbo-quick-btns">
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))} disabled={gameState.status === "playing" || isProcessing}>½</button>
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))} disabled={gameState.status === "playing" || isProcessing}>2x</button>
                  </div>
                </div>
              </div>
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Profit</label>
                  <span className="limbo-currency">0.00000000 BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${(gameState.status === "playing") ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>
                  <input type="number" value={gameState.status === "playing" ? profit.toFixed(2) : 0} readOnly style={{ color: profit > 0 ? 'var(--limbo-accent)' : profit < 0 ? 'var(--limbo-danger)' : '#fff' }} />
                </div>
              </div>
            </div>

            <div className="limbo-bottom-tabs">
              <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")} disabled={gameState.status === "playing"}>Manual</button>
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

      {/* Settings Modal */}
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

      {/* Fairness Modal */}
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
