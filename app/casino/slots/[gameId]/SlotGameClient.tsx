"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../../components/Header";
import Footer from "../../../../components/Footer";
import { createClient } from "../../../../lib/supabase/client";
import "../slots.css"; // ✅ CSS ইমপোর্ট করা হলো

const SYMBOLS = ["🍒", "🍋", "💎", "🔔", "7️⃣", "⭐"];

export default function SlotGameClient({ gameId }: { gameId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("10.00");
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState([["🍒", "🍋", "💎"], ["🍋", "💎", "🔔"], ["💎", "🔔", "🍒"]]);
  const [errorMsg, setErrorMsg] = useState("");
  const [winAmount, setWinAmount] = useState<number | null>(null);

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

  const spin = async () => {
    const amount = Number(betAmount);
    if (amount <= 0) return setErrorMsg("সঠিক বেট অ্যামাউন্ট দিন");
    if (amount > balance) return setErrorMsg("আপনার পর্যাপ্ত ব্যালেন্স নেই!");

    setErrorMsg("");
    setIsSpinning(true);
    setWinAmount(null);

    try {
      const { data: betData, error: betError } = await supabase.rpc("place_slot_bet", {
        p_amount: amount,
        p_game_id: gameId,
      });

      if (betError) throw new Error(betError.message);
      setBalance(betData.new_balance);

      let spinCount = 0;
      const spinInterval = setInterval(() => {
        setReels([
          [SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)]],
          [SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)]],
          [SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)]]
        ]);
        spinCount++;
        if (spinCount > 15) {
          clearInterval(spinInterval);
          finishSpin(amount);
        }
      }, 100);

    } catch (err: any) {
      setErrorMsg(err.message || "কিছু ভুল হয়েছে");
      setIsSpinning(false);
    }
  };

  const finishSpin = async (betAmountPlaced: number) => {
    const finalReels = [
      [SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)]],
      [SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)]],
      [SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)], SYMBOLS[Math.floor(Math.random() * 6)]]
    ];
    setReels(finalReels);

    const middleRow = [finalReels[0][1], finalReels[1][1], finalReels[2][1]];
    let isWin = false;
    let multiplier = 0;

    if (middleRow[0] === middleRow[1] && middleRow[1] === middleRow[2]) {
      isWin = true;
      multiplier = 10;
    } else if (middleRow[0] === middleRow[1] || middleRow[1] === middleRow[2]) {
      isWin = true;
      multiplier = 2;
    }

    if (isWin) {
      const amountWon = betAmountPlaced * multiplier;
      setWinAmount(amountWon);

      try {
        const { data: winData, error: winError } = await supabase.rpc("credit_slot_win", {
          p_amount: amountWon,
          p_game_id: gameId,
        });
        if (winError) throw winError;
        setBalance(winData.new_balance);
      } catch (err: any) {
        setErrorMsg("উইন ক্রেডিট করতে সমস্যা হয়েছে: " + err.message);
      }
    }
    setIsSpinning(false);
  };

  return (
    <div className="slots-page">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main style={{ paddingBottom: "80px" }}>
        <h2 style={{ textAlign: "center", textTransform: "capitalize", marginBottom: "20px" }}>
          {gameId.replace("-", " ")}
        </h2>

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        <div className="slot-game-container">
          <div className="reels-grid">
            {[0, 1, 2].map((colIndex) => (
              <div key={colIndex} className="reel-column">
                {reels[colIndex].map((symbol, rowIndex) => (
                  <div key={rowIndex} className="symbol-box">
                    {symbol}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ height: "50px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "15px" }}>
            {winAmount !== null && winAmount > 0 && (
              <div style={{ color: "#00e701", fontSize: "24px", fontWeight: "bold" }}>
                WIN {winAmount.toFixed(2)} BDT!
              </div>
            )}
          </div>
        </div>

        <div className="controls-area">
          <div className="balance-row">
            <span>Balance</span>
            <span className="balance-amount">{balance.toFixed(2)} BDT</span>
          </div>

          <div className="input-row">
            <input 
              type="number" 
              value={betAmount} 
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={isSpinning}
              className="bet-input"
            />
            <button 
              onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))}
              disabled={isSpinning}
              className="quick-btn"
            >
              ½
            </button>
            <button 
              onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))}
              disabled={isSpinning}
              className="quick-btn"
            >
              2x
            </button>
          </div>

          <button 
            onClick={spin}
            disabled={isSpinning}
            className="spin-btn"
          >
            {isSpinning ? "Spinning..." : "SPIN"}
          </button>
        </div>
      </main>

      <Footer activePage="casino" onNavigate={() => {}} />
    </div>
  );
}
