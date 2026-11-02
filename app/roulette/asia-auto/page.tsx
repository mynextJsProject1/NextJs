/* app/roulette/asia-auto/page.tsx */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import "./asia-auto.css";

// রুলেটের নাম্বার এবং কালার (0-36)
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export default function AsiaAutoRoulettePage() {
  const router = useRouter();

  // ডামি UI স্টেট
  const [selectedChip, setSelectedChip] = useState<number>(10);
  const [timer, setTimer] = useState<number>(15); // ড্রয়ের জন্য ১৫ সেকেন্ড টাইমার
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [dummyHistory, setDummyHistory] = useState<number[]>([0, 32, 15, 4, 21, 2, 19, 8, 11]);

  // ডামি টাইমার লজিক (শুধু UI দেখানোর জন্য)
  useEffect(() => {
    if (timer === 0) {
      setIsSpinning(true);
      setTimeout(() => {
        setIsSpinning(false);
        setTimer(15);
        // র‍্যান্ডম রেজাল্ট হিস্টরিতে যোগ করা
        setDummyHistory(prev => [Math.floor(Math.random() * 37), ...prev.slice(0, 9)]);
      }, 3000); // ৩ সেকেন্ড ঘুরবে
      return;
    }
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const getNumberColor = (num: number) => {
    if (num === 0) return "green";
    if (RED_NUMBERS.includes(num)) return "red";
    return "black";
  };

  return (
    <div className="stake-app">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="stake-main" style={{ paddingBottom: '80px' }}>
        <div className="roulette-container">
          
          <div className="roulette-main-area">
            {/* ✅ টপ বার: রেজাল্ট হিস্টরি */}
            <div className="roulette-history">
              {dummyHistory.map((num, i) => (
                <div key={i} className={`history-ball ${getNumberColor(num)}`}>
                  {num}
                </div>
              ))}
            </div>

            {/* ✅ রুলেট হুইল সেকশন */}
            <div className="roulette-wheel-section">
              <div className={`roulette-wheel ${isSpinning ? 'spinning' : ''}`}>
                <div className="wheel-center">
                  <span>Auto</span>
                  <span>Roulette</span>
                </div>
              </div>
              <div className="roulette-timer">
                {isSpinning ? "Spinning..." : `Next Draw: 00:${timer < 10 ? '0' : ''}${timer}`}
              </div>
            </div>

            {/* ✅ বেটিং টেবিল */}
            <div className="roulette-betting-area">
              <div className="betting-grid">
                {/* 0 নাম্বার */}
                <div className="bet-cell green-num zero-cell">
                  <span>0</span>
                </div>

                {/* ১ থেকে ৩৬ নাম্বার */}
                <div className="numbers-grid">
                  {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => (
                    <div key={num} className={`bet-cell ${getNumberColor(num)}-num`}>
                      <span>{num}</span>
                    </div>
                  ))}
                </div>

                {/* আউটসাইড বেটস */}
                <div className="outside-bets">
                  <div className="bet-cell outside-cell">1st 12</div>
                  <div className="bet-cell outside-cell">2nd 12</div>
                  <div className="bet-cell outside-cell">3rd 12</div>
                  <div className="bet-cell outside-cell">1-18</div>
                  <div className="bet-cell outside-cell">EVEN</div>
                  <div className="bet-cell red-num">RED</div>
                  <div className="bet-cell black-num">BLACK</div>
                  <div className="bet-cell outside-cell">ODD</div>
                  <div className="bet-cell outside-cell">19-36</div>
                </div>
              </div>
            </div>

            {/* ✅ কন্ট্রোল প্যানেল (চিপস এবং বাটন) */}
            <div className="roulette-control-panel">
              <div className="chips-container">
                {[1, 5, 10, 25, 100].map(chip => (
                  <button 
                    key={chip} 
                    className={`chip ${selectedChip === chip ? 'active' : ''}`}
                    onClick={() => setSelectedChip(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="action-buttons">
                <button className="btn-secondary">Undo</button>
                <button className="btn-secondary">Clear</button>
                <button className="btn-secondary">Double</button>
                <button className="btn-primary">Place Bet</button>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer activePage="casino" onNavigate={(page) => {
        if (page === "home") router.push("/");
        else if (page === "chat") router.push("/");
        else if (page === "casino") router.push("/");
        else if (page === "sports") router.push("/");
      }} />
    </div>
  );
}
