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
  revealed: { [level: number]: number[] }; // কোন লেভেলে কোন ডিম খোলা হয়েছে
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
  const [lostDragons, setLostDragons] = useState<any>(null); // হেরে গেলে সব ড্রাগন দেখানোর জন্য

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
    if (level !== gameState.level) return; // শুধুমাত্র বর্তমান লেভেলে ক্লিক করা যাবে
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
          // ড্রাগনে ক্লিক (Loss)
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
          // সেফ ডিম (Next Level)
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

  // ডিফিকাল্টি অনুযায়ী ড্রাগন সংখ্যা (UI-তে দেখানোর জন্য)
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

            {/* 🥚 ড্রাগন টাওয়ার গ্রিড (৪x৯) */}
            <div className="dragon-grid">
              {Array.from({ length: 9 }).map((_, levelIndex) => {
                const level = levelIndex + 1; // ১ থেকে ৯
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
                              // 💀 ড্রাগনের খুলি (Loss)
                              <svg viewBox="0 0 24 24" fill="#ff4d4d" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12c0 3.54 1.84 6.65 4.62 8.43V22h10.76v-1.57C20.16 18.65 22 15.54 22 12c0-5.52-4.48-10-10-10zm-2.5 13c-1.38 0-2.5-1.12-2.5-2.5S8.12 10 9.5 10s2.5 1.12 2.5 2.5S10.88 15 9.5 15zm5 0c-1.38 0-2.5-1.12-2.5-2.5S13.12 10 14.5 10s2.5 1.12 2.5 2.5S15.88 15 14.5 15z"/>
                              </svg>
                            ) : (
                              // 🥚 সেফ ডিম (Win)
                              <svg viewBox="0 0 24 24" fill="#00E701" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C8.13 2 5 9.13 5 13a7 7 0 0 0 14 0c0-3.87-3.13-11-7-11z" fillOpacity="0.3" stroke="#00E701" strokeWidth="2"/>
                                <path d="M9 13a3 3 0 0 0 6 0" stroke="#00E701" strokeWidth="2" fill="none" strokeLinecap="round"/>
                              </svg>
                            )
                          ) : (
                            // 🥚 আনরিভিলড ডিম
                            <svg viewBox="0 0 24 24" fill="#1B2A23" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2C8.13 2 5 9.13 5 13a7 7 0 0 0 14 0c0-3.87-3.13-11-7-11z" stroke="#263C32" strokeWidth="2"/>
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

            {/* বাটন */}
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
              onStatsClick={() => {}} // আপাতত বন্ধ
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

      {/* Settings Modal (লিম্বোর মতো) */}
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
