/* app/roulette/asia-auto/page.tsx */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import "./asia-auto.css";

export default function AsiaAutoRoulettePage() {
  const router = useRouter();

  // সিলেক্ট করা চিপ এবং বসানো বাজি (বাজি রাখার ফাংশন)
  const [selectedChip, setSelectedChip] = useState<number>(10);
  const [bets, setBets] = useState<Record<string, number>>({});

  const recentResults = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27];
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  // চিপ বসানোর ফাংশন
  const handleBetClick = (spotId: string) => {
    setBets(prev => ({
      ...prev,
      [spotId]: (prev[spotId] || 0) + selectedChip
    }));
  };

  // বাজি ক্লিয়ার করার ফাংশন
  const clearBets = () => setBets({});

  // হুইলের ব্যাকগ্রাউন্ড জেনারেট
  const generateWheelGradient = () => {
    const totalSegments = 37;
    const segmentAngle = 360 / totalSegments;
    let gradient = "conic-gradient(";
    for (let i = 0; i < totalSegments; i++) {
      const color = i === 0 ? "#00E701" : (i % 2 === 0 ? "#111" : "#ff4d4d");
      gradient += `${color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg, `;
    }
    return gradient.slice(0, -2) + ")";
  };

  return (
    <div className="stake-app">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="roulette-main-container">
        
        {/* টপ বার */}
        <div className="roulette-top-bar">
          <div className="roulette-history">
            {recentResults.map((num, idx) => (
              <div key={idx} className={`history-pill ${num === 0 ? 'green' : redNumbers.includes(num) ? 'red' : 'black'}`}>
                {num}
              </div>
            ))}
          </div>
          <div className="roulette-timer">
            <i className="fa-solid fa-clock"></i> <strong>00:15</strong>
          </div>
        </div>

        {/* রুলেট হুইল */}
        <div className="roulette-wheel-section">
          <div className="wheel-pointer"></div>
          <div className="roulette-wheel-wrapper">
            <div className="roulette-wheel" style={{ background: generateWheelGradient() }}>
              <div className="wheel-inner-circle">
                <div className="wheel-center"><span>LottoBD</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= Vertical Betting Table (২য় ছবির ডিজাইন) ================= */}
        <div className="roulette-table-container">
          <div className="table-header-actions">
            <button className="btn-clear" onClick={clearBets}>Clear Bets</button>
            <div className="total-bet-display">
              Total Bet: ৳{Object.values(bets).reduce((a, b) => a + b, 0)}
            </div>
          </div>

          <div className="roulette-table-grid">
            
            {/* Row 1: Zero */}
            <div className="bet-spot zero-spot g-zero" onClick={() => handleBetClick('0')}>
              0
              {bets['0'] > 0 && <div className="placed-chip">{bets['0']}</div>}
            </div>

            {/* Col 1: Outside Bets */}
            <div className="bet-spot outside-bet g-1-18" onClick={() => handleBetClick('1-18')}>
              1-18 {bets['1-18'] > 0 && <div className="placed-chip">{bets['1-18']}</div>}
            </div>
            <div className="bet-spot outside-bet g-even" onClick={() => handleBetClick('even')}>
              EVEN {bets['even'] > 0 && <div className="placed-chip">{bets['even']}</div>}
            </div>
            <div className="bet-spot red-bet g-red" onClick={() => handleBetClick('red')}>
              <div className="diamond red-diamond"></div> RED
              {bets['red'] > 0 && <div className="placed-chip">{bets['red']}</div>}
            </div>
            <div className="bet-spot black-bet g-black" onClick={() => handleBetClick('black')}>
              <div className="diamond black-diamond"></div> BLACK
              {bets['black'] > 0 && <div className="placed-chip">{bets['black']}</div>}
            </div>
            <div className="bet-spot outside-bet g-odd" onClick={() => handleBetClick('odd')}>
              ODD {bets['odd'] > 0 && <div className="placed-chip">{bets['odd']}</div>}
            </div>
            <div className="bet-spot outside-bet g-19-36" onClick={() => handleBetClick('19-36')}>
              19-36 {bets['19-36'] > 0 && <div className="placed-chip">{bets['19-36']}</div>}
            </div>

            {/* Col 2: Dozens */}
            <div className="bet-spot dozen-bet g-1st12" onClick={() => handleBetClick('1st12')}>
              1st 12 {bets['1st12'] > 0 && <div className="placed-chip">{bets['1st12']}</div>}
            </div>
            <div className="bet-spot dozen-bet g-2nd12" onClick={() => handleBetClick('2nd12')}>
              2nd 12 {bets['2nd12'] > 0 && <div className="placed-chip">{bets['2nd12']}</div>}
            </div>
            <div className="bet-spot dozen-bet g-3rd12" onClick={() => handleBetClick('3rd12')}>
              3rd 12 {bets['3rd12'] > 0 && <div className="placed-chip">{bets['3rd12']}</div>}
            </div>

            {/* Cols 3, 4, 5: Numbers Grid (Column-wise mapping) */}
            {/* Column 1: 1, 4, 7... */}
            {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map(num => (
              <div key={num} className={`bet-spot num-cell col-1-num ${redNumbers.includes(num) ? 'red' : 'black'}`} onClick={() => handleBetClick(num.toString())}>
                {num}
                {bets[num] > 0 && <div className="placed-chip">{bets[num]}</div>}
              </div>
            ))}
            {/* Column 2: 2, 5, 8... */}
            {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map(num => (
              <div key={num} className={`bet-spot num-cell col-2-num ${redNumbers.includes(num) ? 'red' : 'black'}`} onClick={() => handleBetClick(num.toString())}>
                {num}
                {bets[num] > 0 && <div className="placed-chip">{bets[num]}</div>}
              </div>
            ))}
            {/* Column 3: 3, 6, 9... */}
            {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map(num => (
              <div key={num} className={`bet-spot num-cell col-3-num ${redNumbers.includes(num) ? 'red' : 'black'}`} onClick={() => handleBetClick(num.toString())}>
                {num}
                {bets[num] > 0 && <div className="placed-chip">{bets[num]}</div>}
              </div>
            ))}

            {/* Col 6: 2:1 Columns */}
            <div className="bet-spot col-bet g-col3" onClick={() => handleBetClick('col3')}>
              2:1 {bets['col3'] > 0 && <div className="placed-chip">{bets['col3']}</div>}
            </div>
            <div className="bet-spot col-bet g-col2" onClick={() => handleBetClick('col2')}>
              2:1 {bets['col2'] > 0 && <div className="placed-chip">{bets['col2']}</div>}
            </div>
            <div className="bet-spot col-bet g-col1" onClick={() => handleBetClick('col1')}>
              2:1 {bets['col1'] > 0 && <div className="placed-chip">{bets['col1']}</div>}
            </div>

          </div>
        </div>

        {/* চিপ সিলেকশন */}
        <div className="roulette-chips-bar">
          {[1, 5, 10, 50, 100, 500].map(chip => (
            <div 
              key={chip} 
              className={`chip-btn ${selectedChip === chip ? 'active' : ''}`}
              onClick={() => setSelectedChip(chip)}
            >
              {chip}
            </div>
          ))}
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
