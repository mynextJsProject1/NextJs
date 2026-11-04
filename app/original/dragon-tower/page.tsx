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

  const [gameId, setGameId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [gameState, setGameState] = useState<GameState>({ status: "idle", level: 1, revealed: {} });
  const [multiplier, setMultiplier] = useState(1.00);
  const [profit, setProfit] = useState(0);
  const [lostDragons, setLostDragons] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");
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

            {/* Reference-style icy dragon artwork (visual only) */}
            <div className="dragon-head-container">
              <svg className="dragon-head" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="dragonStone" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#b7c9d8" />
                    <stop offset=".48" stopColor="#71899e" />
                    <stop offset="1" stopColor="#34495d" />
                  </linearGradient>
                  <linearGradient id="dragonFace" x1="0" y1="0" x2="0.8" y2="1">
                    <stop offset="0" stopColor="#9eb4c5" />
                    <stop offset=".45" stopColor="#526b80" />
                    <stop offset="1" stopColor="#26394b" />
                  </linearGradient>
                  <linearGradient id="dragonMouth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#20d9ff" />
                    <stop offset="1" stopColor="#087ba9" />
                  </linearGradient>
                  <filter id="dragonGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {/* rear ice spikes */}
                <path d="M54 62 18 8 68 39Z M106 62 142 8 92 39Z" fill="url(#dragonStone)" stroke="#718da5" strokeWidth="3"/>
                <path d="M40 82 2 51 49 60Z M120 82 158 51 111 60Z" fill="#627d94" stroke="#9bb0c1" strokeWidth="2"/>
                <path d="M62 43 48 4 78 34Z M98 43 112 4 82 34Z" fill="#9db4c7" stroke="#607b92" strokeWidth="2"/>
                {/* cheek armor */}
                <path d="M43 74 20 91 42 112 55 96Z M117 74 140 91 118 112 105 96Z" fill="#718ba0" stroke="#a9bdcc" strokeWidth="2"/>
                {/* face silhouette */}
                <path d="M80 27 C52 25 37 53 34 84 C30 118 46 151 65 163 L80 174 95 163 C114 151 130 118 126 84 C123 53 108 25 80 27Z" fill="url(#dragonFace)" stroke="#a8bdce" strokeWidth="4"/>
                {/* forehead plates */}
                <path d="M80 31 66 61 80 75 94 61Z" fill="#8da5b9" stroke="#c3d2de" strokeWidth="2"/>
                <path d="M57 54 70 70 61 82 49 69Z M103 54 90 70 99 82 111 69Z" fill="#607b91"/>
                {/* glowing eyes */}
                <path d="M42 91 72 98 54 116Z M118 91 88 98 106 116Z" fill="#071b2a" stroke="#263c4e" strokeWidth="2"/>
                <path d="M46 93 66 99 54 110Z M114 93 94 99 106 110Z" fill="#28dfff" filter="url(#dragonGlow)"/>
                {/* nose and muzzle */}
                <path d="M70 111 80 119 90 111 86 132 74 132Z" fill="#243b50" stroke="#9bb5c9" strokeWidth="2"/>
                <path d="M53 123 Q80 135 107 123 L99 151 Q80 169 61 151Z" fill="#172b3d" stroke="#9ab1c4" strokeWidth="3"/>
                <path d="M60 130 Q80 145 100 130 L91 151 Q80 159 69 151Z" fill="url(#dragonMouth)" stroke="#21dfff" strokeWidth="2"/>
                <path d="M64 128 73 139 78 128 M96 128 87 139 82 128" fill="#e9f5fb"/>
                <path d="M70 154 80 166 90 154" fill="#0c1c2b" stroke="#b8cbd8" strokeWidth="2"/>
                {/* ice cracks */}
                <path d="M80 38 74 57 84 68 M43 76 55 85 M117 76 105 85" fill="none" stroke="#d5e6f1" strokeWidth="2" opacity=".75"/>
              </svg>
            </div>

            {/* 🥚 ড্রাগন টাওয়ার গ্রিড (স্ক্রল ছাড়া) */}
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
                              {/* Flame skull artwork */}
                              <svg className="egg-art egg-art-skull" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <defs>
                                  <linearGradient id="flameOuter" x1="0" y1="1" x2=".7" y2="0">
                                    <stop offset="0" stopColor="#ff4b16"/><stop offset=".55" stopColor="#ff9e24"/><stop offset="1" stopColor="#ffe05b"/>
                                  </linearGradient>
                                  <linearGradient id="skullBone" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0" stopColor="#fff9df"/><stop offset="1" stopColor="#d7cba8"/>
                                  </linearGradient>
                                </defs>
                                <path d="M55 12 C48 1 43 7 48 20 C32 11 29 25 38 34 C20 30 19 45 31 53 C17 70 31 91 48 92 L79 91 C99 83 105 63 89 49 C98 35 88 27 78 32 C84 14 69 10 64 26 C63 15 59 8 55 12Z" fill="url(#flameOuter)"/>
                                <path d="M54 24 C48 17 47 27 52 35 M82 30 C91 23 93 36 85 43 M34 57 C26 68 36 81 45 82" fill="none" stroke="#ffcf54" strokeWidth="4" strokeLinecap="round"/>
                                <path d="M43 48 C43 34 54 28 67 31 C82 34 89 47 85 65 C83 77 77 81 75 89 L49 89 C48 80 40 73 39 62 C38 56 39 52 43 48Z" fill="url(#skullBone)" stroke="#fff4cf" strokeWidth="2"/>
                                <ellipse cx="53" cy="59" rx="10" ry="12" fill="#102638"/>
                                <ellipse cx="75" cy="59" rx="10" ry="12" fill="#102638"/>
                                <path d="M62 69 57 79 67 79Z" fill="#102638"/>
                                <path d="M48 85 48 96 55 91 61 97 66 91 73 96 76 85" fill="#e8ddbd" stroke="#c8ba97" strokeWidth="2" strokeLinejoin="round"/>
                                <path d="M55 94V103 M63 95V105 M71 93V101" stroke="#a99c7e" strokeWidth="2"/>
                              </svg>
                            ) : (
                              {/* Pale fossil egg: safe reveal */}
                              <svg className="egg-art egg-art-safe" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <defs>
                                  <linearGradient id="safeEggShell" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0" stopColor="#fffef0"/><stop offset=".55" stopColor="#eee8d1"/><stop offset="1" stopColor="#cfc6a8"/>
                                  </linearGradient>
                                </defs>
                                <path d="M50 5 C28 5 13 43 14 70 C15 94 28 104 50 104 C72 104 85 94 86 70 C87 43 72 5 50 5Z" fill="url(#safeEggShell)" stroke="#f8f1d9" strokeWidth="2"/>
                                <ellipse cx="67" cy="27" rx="7" ry="12" transform="rotate(-28 67 27)" fill="#fff" opacity=".9"/>
                                <path d="M26 72 Q34 64 40 72 L37 82 Q29 85 26 72Z M46 82 Q54 72 61 82 L59 92 47 94Z M67 70 Q75 62 80 72 L76 83 66 81Z M35 94 Q41 87 47 95 L44 101 35 100Z M62 97 Q69 87 76 95 L72 102 62 102Z" fill="#c9bea0"/>
                                <circle cx="36" cy="57" r="3" fill="#d8ceb3"/><circle cx="65" cy="48" r="3" fill="#d8ceb3"/>
                              </svg>
                            )
                          ) : (
                            {/* Fossil-pattern egg shown before selection */}
                            <svg className="egg-art egg-art-hidden" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <defs>
                                <linearGradient id="hiddenEggShell" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0" stopColor="#9b9b91"/><stop offset=".55" stopColor="#777d7c"/><stop offset="1" stopColor="#4f5b60"/>
                                </linearGradient>
                              </defs>
                              <path d="M50 5 C28 5 13 43 14 70 C15 94 28 104 50 104 C72 104 85 94 86 70 C87 43 72 5 50 5Z" fill="url(#hiddenEggShell)" stroke="#9ba4a5" strokeWidth="2"/>
                              <ellipse cx="68" cy="25" rx="7" ry="12" transform="rotate(-28 68 25)" fill="#b8c1c1" opacity=".28"/>
                              <g fill="#5e6664" opacity=".72">
                                <path d="M24 70 Q31 61 39 70 L36 82 27 82Z M43 82 Q51 72 59 82 L57 93 45 94Z M65 69 Q74 60 81 70 L77 83 66 82Z M33 94 Q40 86 47 95 L44 102 34 101Z M61 97 Q68 87 76 95 L72 103 62 102Z"/>
                                <circle cx="39" cy="51" r="3"/><circle cx="62" cy="47" r="4"/><circle cx="28" cy="61" r="3"/>
                              </g>
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
