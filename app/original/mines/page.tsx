/* app/original/mines/page.tsx */
"use client";

import { useState, useEffect, useMemo } from "react";
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

export default function MinesGamePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("10.00");
  const [minesCount, setMinesCount] = useState(3);

  // গেম স্টেট
  const [gameId, setGameId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // গ্রিড ও মাল্টিপ্লায়ার স্টেট
  const [tiles, setTiles] = useState<Tile[]>(Array.from({ length: 25 }, (_, i) => ({ index: i, isRevealed: false, isBomb: false })));
  const [multiplier, setMultiplier] = useState(1.00);
  const [profit, setProfit] = useState(0);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState(false); 

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

  // 🎮 গেম শুরু করার ফাংশন
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
        
        // গ্রিড রিসেট
        setTiles(Array.from({ length: 25 }, (_, i) => ({ index: i, isRevealed: false, isBomb: false })));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start game.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 💎 ঘর খোলার ফাংশন
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
          // বোমায় ক্লিক করলে গেম ওভার
          setIsPlaying(false);
          setMultiplier(0);
          setProfit(-Number(betAmount));
          
          // সব বোমা দেখিয়ে দেওয়া
          setTiles(prev => {
            const newTiles = [...prev];
            data.bombs.forEach((bombIdx: number) => {
              newTiles[bombIdx] = { ...newTiles[bombIdx], isRevealed: true, isBomb: true };
            });
            return newTiles;
          });
        } else {
          // সেফ ঘর
          setMultiplier(data.new_multiplier);
          setProfit(Number(betAmount) * data.new_multiplier - Number(betAmount));
          
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

  // 💰 ক্যাশআউট ফাংশন
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
        setMultiplier(0);
        
        // সব বোমা দেখিয়ে দেওয়া
        setTiles(prev => {
          const newTiles = [...prev];
          data.bombs.forEach((bombIdx: number) => {
            newTiles[bombIdx] = { ...newTiles[bombIdx], isRevealed: true, isBomb: true };
          });
          return newTiles;
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to cashout.");
    } finally {
      setIsProcessing(false);
    }
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

            {/* মাইনস গ্রিড (৫x৫) */}
            <div className="mines-grid-container">
              {tiles.map((tile) => (
                <div
                  key={tile.index}
                  className={`mines-tile ${tile.isRevealed ? 'revealed' : ''} ${tile.isRevealed && tile.isBomb ? 'bomb' : ''} ${tile.isRevealed && !tile.isBomb ? 'safe' : ''} ${!isPlaying ? 'disabled' : ''}`}
                  onClick={() => handleRevealTile(tile.index)}
                >
                  {/* ✅ SVG আইকন ব্যবহার করা হয়েছে (PNG বা ফন্ট ছাড়াই কাজ করবে) */}
                  {tile.isRevealed && (
                    tile.isBomb ? (
                      // বোমা আইকন
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="14" r="7"></circle>
                        <path d="M16.24 7.76a4 4 0 0 1 2.83 2.83"></path>
                        <path d="M21 4l-2 2"></path>
                        <path d="M18 3l1 1"></path>
                      </svg>
                    ) : (
                      // হীরা আইকন
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 3h12l4 6-10 13L2 9z"></path>
                        <path d="M11 3L8 9l4 13 4-13-3-6"></path>
                        <path d="M2 9h20"></path>
                      </svg>
                    )
                  )}
                </div>
              ))}
            </div>

            <div className="limbo-inputs-grid">
              <div className="limbo-input-group">
                <label>Mines</label>
                <div className={`limbo-input-wrapper ${isPlaying ? 'disabled' : ''}`}>
                  <select 
                    className="mines-select"
                    value={minesCount}
                    onChange={(e) => setMinesCount(Number(e.target.value))}
                    disabled={isPlaying || isProcessing}
                  >
                    {[1, 3, 5, 10, 15, 24].map(num => (
                      <option key={num} value={num}>{num} Mines</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="limbo-input-group">
                <label>Multiplier</label>
                <div className="limbo-input-wrapper">
                  <input 
                    type="text" 
                    value={`${multiplier.toFixed(2)}x`} 
                    readOnly 
                    style={{ color: multiplier > 1 ? 'var(--limbo-accent)' : '#fff' }}
                  />
                </div>
              </div>
            </div>

            {/* বেট বা ক্যাশআউট বাটন */}
            {isPlaying ? (
              <button 
                className="limbo-bet-btn" 
                onClick={handleCashout}
                disabled={isProcessing || multiplier <= 1.00}
                style={{ background: multiplier > 1 ? 'var(--limbo-accent)' : '#365244', color: multiplier > 1 ? '#000' : '#fff' }}
              >
                {isProcessing ? "Processing..." : multiplier > 1 ? `Cashout ৳ ${(Number(betAmount) * multiplier).toFixed(2)}` : "Pick a Tile"}
              </button>
            ) : (
              <button 
                className={`limbo-bet-btn ${isProcessing ? "rolling" : ""}`} 
                onClick={handleStartGame} 
                disabled={isProcessing}
              >
                {isProcessing ? "Starting..." : "Bet"}
              </button>
            )}

            <div className="limbo-amount-section">
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Bet Amount</label>
                  <span className="limbo-currency">Balance: {balance.toFixed(2)} BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${isPlaying ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>
                  <input 
                    type="number" 
                    value={betAmount} 
                    onChange={(e) => setBetAmount(e.target.value)} 
                    placeholder="0.00" 
                    disabled={isPlaying || isProcessing} 
                  />
                  <div className="limbo-quick-btns">
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))} disabled={isPlaying || isProcessing}>½</button>
                    <button type="button" onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))} disabled={isPlaying || isProcessing}>2x</button>
                  </div>
                </div>
              </div>
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Profit</label>
                  <span className="limbo-currency">0.00000000 BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${isPlaying ? 'disabled' : ''}`}>
                  <span style={{ color: 'var(--limbo-muted)', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '8px' }}>৳</span>
                  <input 
                    type="number" 
                    value={isPlaying ? profit.toFixed(2) : 0} 
                    readOnly 
                    style={{ color: profit > 0 ? 'var(--limbo-accent)' : profit < 0 ? 'var(--limbo-danger)' : '#fff' }}
                  />
                </div>
              </div>
            </div>

            <div className="limbo-bottom-tabs">
              <button className="active">Manual</button>
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
        else if (page === "chat") router.push("/live-support/");
        else if (page === "casino") router.push("/play-category/");
        else if (page === "sports") router.push("/");
      }} />

      {/* ================= ✅ Modals ================= */}
      {isSettingsOpen && (
        <div className="limbo-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body">
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

      {isBetHistoryOpen && (
        <div className="limbo-modal-overlay" onClick={() => setIsBetHistoryOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Bet History</h3>
              <button onClick={() => setIsBetHistoryOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body">
                <p style={{ textAlign: 'center', color: '#aaa' }}>History is not integrated yet.</p>
            </div>
          </div>
        </div>
      )}

      {isGraphOpen && (
        <div className="limbo-modal-overlay no-blur" onClick={() => setIsGraphOpen(false)}>
          <div className="limbo-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '240px' }}>
             <div className="limbo-modal-header">
              <h3>Live Stats</h3>
              <button onClick={() => setIsGraphOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body">
              <p style={{ textAlign: 'center', color: '#aaa' }}>Stats will be available soon.</p>
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
                Mines uses a provably fair system to ensure every grid is completely random.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
