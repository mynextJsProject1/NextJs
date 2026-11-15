"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
// ✅ ৪ লেভেল উপরে গিয়ে কম্পোনেন্ট ইমপোর্ট করতে হবে
import Header from "../../../../components/Header";
import Footer from "../../../../components/Footer";
import GameBottomBar from "../../../../components/GameBottomBar/GameBottomBar";
import { createClient } from "../../../../lib/supabase/client";

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ id: string, win: number, bet: number }[]>([]);

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
        if (spinCount > 20) {
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
        
        setHistory(prev => [{ id: Date.now().toString(), win: amountWon, bet: betAmountPlaced }, ...prev]);
      } catch (err: any) {
        setErrorMsg("উইন ক্রেডিট করতে সমস্যা হয়েছে: " + err.message);
      }
    } else {
       setHistory(prev => [{ id: Date.now().toString(), win: 0, bet: betAmountPlaced }, ...prev]);
    }

    setIsSpinning(false);
  };

  return (
    <div className="min-h-screen bg-[#0f212e] text-white flex flex-col">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-lg pb-24">
        
        <h2 className="text-xl font-bold text-center mb-4 capitalize">{gameId.replace("-", " ")}</h2>

        {errorMsg && (
          <div className="bg-red-500/20 text-red-400 p-2 rounded mb-4 text-center text-sm">
            {errorMsg}
          </div>
        )}

        <div className="bg-[#1a2c38] p-4 rounded-xl border border-[#2a3e4c] mb-6">
          <div className="bg-black/50 p-4 rounded-lg grid grid-cols-3 gap-2 aspect-square border border-gray-700">
            {[0, 1, 2].map((colIndex) => (
              <div key={colIndex} className="flex flex-col gap-2 justify-around">
                {reels[colIndex].map((symbol, rowIndex) => (
                  <div key={rowIndex} className="bg-[#213743] rounded-lg flex items-center justify-center text-4xl h-full shadow-inner border border-gray-600/30">
                    {symbol}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="h-12 mt-4 flex items-center justify-center">
            {winAmount !== null && winAmount > 0 && (
              <div className="text-[#00e701] text-2xl font-bold animate-bounce">
                WIN {winAmount.toFixed(2)} BDT!
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#1a2c38] p-4 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400">Balance</div>
            <div className="font-bold text-[#00e701]">{balance.toFixed(2)} BDT</div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-[#213743] rounded-lg p-2 flex items-center border border-gray-700">
              <span className="text-gray-400 mr-2">৳</span>
              <input 
                type="number" 
                value={betAmount} 
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isSpinning}
                className="bg-transparent w-full outline-none text-white font-bold"
              />
            </div>
            <button 
              onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))}
              disabled={isSpinning}
              className="bg-[#213743] px-4 py-3 rounded-lg text-sm hover:bg-[#2a3e4c] disabled:opacity-50"
            >
              ½
            </button>
            <button 
              onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))}
              disabled={isSpinning}
              className="bg-[#213743] px-4 py-3 rounded-lg text-sm hover:bg-[#2a3e4c] disabled:opacity-50"
            >
              2x
            </button>
          </div>

          <button 
            onClick={spin}
            disabled={isSpinning}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              isSpinning 
                ? "bg-gray-600 cursor-not-allowed" 
                : "bg-[#00e701] text-black hover:bg-[#00c701] shadow-[0_0_15px_rgba(0,231,1,0.4)]"
            }`}
          >
            {isSpinning ? "Spinning..." : "SPIN"}
          </button>
        </div>

        <GameBottomBar 
          onSettingsClick={() => setIsSettingsOpen(true)}
          onStatsClick={() => {}} 
          onFairnessClick={() => {}}
        />
      </main>

      <Footer activePage="casino" onNavigate={() => {}} />

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-[#1a2c38] w-full max-w-sm rounded-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
              <h3 className="font-bold">Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <button 
               className="w-full bg-[#213743] py-2 rounded text-sm hover:bg-[#2a3e4c]"
               onClick={() => { setIsSettingsOpen(false); setIsBetHistoryOpen(true); }}
            >
              View Bet History
            </button>
          </div>
        </div>
      )}

      {isBetHistoryOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsBetHistoryOpen(false)}>
          <div className="bg-[#1a2c38] w-full max-w-sm rounded-xl p-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
              <h3 className="font-bold">Bet History</h3>
              <button onClick={() => setIsBetHistoryOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            {history.length === 0 ? (
              <p className="text-center text-gray-400 text-sm">No bets yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex justify-between text-sm bg-[#213743] p-2 rounded">
                    <span className="text-gray-400">Bet: {h.bet.toFixed(2)}</span>
                    <span className={h.win > 0 ? "text-[#00e701]" : "text-red-400"}>
                      {h.win > 0 ? `+${h.win.toFixed(2)}` : `-${h.bet.toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
