/* app/roulette/asia-auto/page.tsx */
"use client";

import { useState } from "react";
import "./asia-auto.css";

export default function AsiaAutoRoulettePage() {
  // বাজি রাখার স্টেট
  const [selectedChip, setSelectedChip] = useState<number>(0.5);
  const [bets, setBets] = useState<Record<string, number>>({});

  // ছবির মত ডেমো ডেটা
  const recentResultsTop = [0, 32, 15, 19, 4, 21, 2, 25, 17];
  const recentResultsLeft = [29, 25, 16, 33, 20, 17, 5, 9, 36, 35];
  const recentResultsLeftBottom = [32, 26, 16, 2, 9, 6, 22, 10];
  
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  const handleBetClick = (spotId: string) => {
    setBets(prev => ({
      ...prev,
      [spotId]: (prev[spotId] || 0) + selectedChip
    }));
  };

  // হুইল গ্রেডিয়েন্ট (ছবির মত একটি সবুজ স্লাইস সহ)
  const generateWheelGradient = () => {
    const totalSegments = 37;
    const segmentAngle = 360 / totalSegments;
    let gradient = "conic-gradient(";
    for (let i = 0; i < totalSegments; i++) {
      // ১ম স্লাইস সবুজ, বাকিগুলো লাল-কালো
      const color = i === 0 ? "#00E701" : (i % 2 === 0 ? "#e84141" : "#111111");
      gradient += `${color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg, `;
    }
    return gradient.slice(0, -2) + ")";
  };

  return (
    <div className="roulette-fullscreen-app">
      
      {/* ================= TOP HISTORY BAR ================= */}
      <div className="top-history-bar">
        <div className="history-scroll-area">
          {recentResultsTop.map((num, idx) => (
            <div key={idx} className={`top-history-pill ${num === 0 ? 'green' : redNumbers.includes(num) ? 'red' : 'black'}`}>
              {num}
            </div>
          ))}
        </div>
        <div className="top-timer">
          00:15
        </div>
      </div>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="main-content-area">
        
        {/* --- LEFT SIDEBAR --- */}
        <div className="left-sidebar">
          <div className="left-icon"><i className="fa-solid fa-clock-rotate-left"></i></div>
          <div className="left-history-list">
            {recentResultsLeft.map((num, idx) => (
              <div key={idx} className={`left-history-box ${redNumbers.includes(num) ? 'red' : 'black'}`}>{num}</div>
            ))}
            
            <div className="left-icon-small"><i className="fa-solid fa-fire"></i></div>
            {recentResultsLeftBottom.map((num, idx) => (
              <div key={`b-${idx}`} className={`left-history-box ${redNumbers.includes(num) ? 'orange' : 'blue'}`}>{num}</div>
            ))}
          </div>
          
          {/* Bottom Left Icons */}
          <div className="bottom-left-nav">
            <div className="nav-btn"><i className="fa-solid fa-bars"></i></div>
            <div className="nav-btn"><i className="fa-solid fa-house"></i></div>
          </div>
        </div>

        {/* --- CENTER GAME AREA --- */}
        <div className="center-game-area">
          
          {/* Wheel */}
          <div className="wheel-container">
            <div className="wheel-pointer"></div>
            <div className="wheel-wrapper">
              <div className="wheel-rotator" style={{ background: generateWheelGradient() }}>
                {/* Inner circle */}
                <div className="wheel-inner-ring">
                  <div className="wheel-center-gold">
                    <span>LottoBD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="roulette-table-wrapper">
            <div className="roulette-table-grid">
              
              {/* Zero Row */}
              <div className="empty-cell col-outside"></div>
              <div className="empty-cell col-dozens"></div>
              <div className="bet-spot zero-spot" onClick={() => handleBetClick('0')}>
                0 {bets['0'] > 0 && <div className="table-chip">{bets['0']}</div>}
              </div>
              <div className="empty-cell col-2to1"></div>

              {/* Outside Bets (Left Col 1) */}
              <div className="bet-spot outside-bet col-outside row-span-2" onClick={() => handleBetClick('1-18')}>1-18 {bets['1-18'] > 0 && <div className="table-chip">{bets['1-18']}</div>}</div>
              <div className="bet-spot outside-bet col-outside row-span-2" onClick={() => handleBetClick('even')}>Even {bets['even'] > 0 && <div className="table-chip">{bets['even']}</div>}</div>
              <div className="bet-spot red-bet col-outside row-span-2" onClick={() => handleBetClick('red')}><div className="diamond-icon red-diamond"></div> {bets['red'] > 0 && <div className="table-chip">{bets['red']}</div>}</div>
              <div className="bet-spot black-bet col-outside row-span-2" onClick={() => handleBetClick('black')}><div className="diamond-icon black-diamond"></div> {bets['black'] > 0 && <div className="table-chip">{bets['black']}</div>}</div>
              <div className="bet-spot outside-bet col-outside row-span-2" onClick={() => handleBetClick('odd')}>Odd {bets['odd'] > 0 && <div className="table-chip">{bets['odd']}</div>}</div>
              <div className="bet-spot outside-bet col-outside row-span-2" onClick={() => handleBetClick('19-36')}>19-36 {bets['19-36'] > 0 && <div className="table-chip">{bets['19-36']}</div>}</div>

              {/* Dozens (Left Col 2) */}
              <div className="bet-spot dozen-bet col-dozens row-span-4" onClick={() => handleBetClick('1st12')}>1st 12 {bets['1st12'] > 0 && <div className="table-chip">{bets['1st12']}</div>}</div>
              <div className="bet-spot dozen-bet col-dozens row-span-4" onClick={() => handleBetClick('2nd12')}>2nd 12 {bets['2nd12'] > 0 && <div className="table-chip">{bets['2nd12']}</div>}</div>
              <div className="bet-spot dozen-bet col-dozens row-span-4" onClick={() => handleBetClick('3rd12')}>3rd 12 {bets['3rd12'] > 0 && <div className="table-chip">{bets['3rd12']}</div>}</div>

              {/* 2:1 Columns (Right Col) */}
              <div className="bet-spot col-2to1 col-2to1-3 row-span-4" onClick={() => handleBetClick('col3')}>2:1 {bets['col3'] > 0 && <div className="table-chip">{bets['col3']}</div>}</div>
              <div className="bet-spot col-2to1 col-2to1-2 row-span-4" onClick={() => handleBetClick('col2')}>2:1 {bets['col2'] > 0 && <div className="table-chip">{bets['col2']}</div>}</div>
              <div className="bet-spot col-2to1 col-2to1-1 row-span-4" onClick={() => handleBetClick('col1')}>2:1 {bets['col1'] > 0 && <div className="table-chip">{bets['col1']}</div>}</div>

              {/* Numbers Grid (Center 3 Cols) */}
              {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map(num => (
                <div key={num} className={`bet-spot num-cell col-num1 ${redNumbers.includes(num) ? 'red' : 'black'}`} onClick={() => handleBetClick(num.toString())}>
                  {num} {bets[num] > 0 && <div className="table-chip">{bets[num]}</div>}
                </div>
              ))}
              {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map(num => (
                <div key={num} className={`bet-spot num-cell col-num2 ${redNumbers.includes(num) ? 'red' : 'black'}`} onClick={() => handleBetClick(num.toString())}>
                  {num} {bets[num] > 0 && <div className="table-chip">{bets[num]}</div>}
                </div>
              ))}
              {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map(num => (
                <div key={num} className={`bet-spot num-cell col-num3 ${redNumbers.includes(num) ? 'red' : 'black'}`} onClick={() => handleBetClick(num.toString())}>
                  {num} {bets[num] > 0 && <div className="table-chip">{bets[num]}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDEBAR --- */}
        <div className="right-sidebar">
          <button className="circle-btn"><i className="fa-solid fa-arrow-rotate-left"></i></button>
          <button className="circle-btn text-btn">2X</button>
          <button className="circle-btn large-btn"><i className="fa-solid fa-plus"></i></button>
          <button className="circle-btn large-btn"><i className="fa-solid fa-minus"></i></button>
          <button className="circle-btn"><i className="fa-solid fa-xmark"></i></button>
          
          <div className="chip-container">
            <div className={`chip-btn right-chip ${selectedChip === 1 ? 'active' : ''}`} onClick={() => setSelectedChip(1)}>1</div>
            <div className={`chip-btn right-chip ${selectedChip === 0.5 ? 'active' : ''}`} onClick={() => setSelectedChip(0.5)}>0.5</div>
            <div className={`chip-btn right-chip ${selectedChip === 0.1 ? 'active' : ''}`} onClick={() => setSelectedChip(0.1)}>0.1</div>
          </div>

          <div className="bottom-right-icons">
             <i className="fa-solid fa-volume-high"></i>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM INFO BAR ================= */}
      <div className="bottom-info-bar">
        <div className="info-left">
          <div>2159094070</div>
        </div>
        <div className="info-center">
          <div>TABLE COVERAGE 40.54%</div>
          <div>12:26 | 00:01:16</div>
        </div>
        <div className="info-right">
          <div className="balance-item">
            <span>BALANCE IN EUR</span>
            <span className="val">9996.50</span>
          </div>
          <div className="balance-item">
            <span>BET IN EUR</span>
            <span className="val">2.50</span>
          </div>
          <div className="balance-item">
            <span>WIN IN EUR</span>
            <span className="val"></span>
          </div>
        </div>
      </div>

    </div>
  );
}
