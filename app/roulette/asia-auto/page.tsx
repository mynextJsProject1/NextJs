/* app/roulette/asia-auto/page.tsx */
"use client";

import { useState } from "react";
import "./asia-auto.css";

export default function AsiaAutoRoulettePage() {
  const [selectedChip, setSelectedChip] = useState<number>(0.5);
  const [bets, setBets] = useState<Record<string, number>>({});

  const recentResultsTop = [0, 32, 15, 19, 4, 21, 2, 25, 17];
  const recentResultsLeftTop = [29, 25, 16, 33, 20, 17, 5, 9, 36, 35];
  const recentResultsLeftBottom = [32, 26, 16, 2, 9, 6, 22, 10];
  
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  const handleBetClick = (spotId: string) => {
    setBets(prev => ({
      ...prev,
      [spotId]: (prev[spotId] || 0) + selectedChip
    }));
  };

  // হুইলের গ্রেডিয়েন্ট
  const generateWheelGradient = () => {
    const totalSegments = 37;
    const segmentAngle = 360 / totalSegments;
    let gradient = "conic-gradient(";
    for (let i = 0; i < totalSegments; i++) {
      const color = i === 0 ? "#00E701" : (i % 2 === 0 ? "#d93838" : "#181818");
      gradient += `${color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg, `;
    }
    return gradient.slice(0, -2) + ")";
  };

  // ৩৬টি নাম্বারের পজিশন
  const numbersData = Array.from({ length: 36 }, (_, i) => {
    const num = i + 1;
    const col = ((num - 1) % 3) + 3; 
    const row = Math.floor((num - 1) / 3) + 2; 
    return { num, col, row, isRed: redNumbers.includes(num) };
  });

  return (
    <div className="roulette-fullscreen-app">
      
      {/* ================= TOP HISTORY BAR ================= */}
      <div className="top-history-bar">
        <div className="history-scroll-area">
          {recentResultsTop.map((num, idx) => (
            <div key={idx} className={`top-pill ${num === 0 ? 'green' : redNumbers.includes(num) ? 'red' : 'black'}`}>
              {num}
            </div>
          ))}
        </div>
        <div className="top-timer">00:15</div>
      </div>

      {/* ================= MAIN LAYOUT ================= */}
      <div className="main-layout">
        
        {/* --- LEFT SIDEBAR --- */}
        <div className="left-sidebar">
          <div className="icon-small"><i className="fa-solid fa-clock-rotate-left"></i></div>
          <div className="left-history-list">
            {recentResultsLeftTop.map((num, idx) => (
              <div key={idx} className={`left-box ${redNumbers.includes(num) ? 'red' : 'black'}`}>{num}</div>
            ))}
            <div className="icon-small"><i className="fa-solid fa-fire"></i></div>
            {recentResultsLeftBottom.map((num, idx) => (
              <div key={`b-${idx}`} className={`left-box ${redNumbers.includes(num) ? 'orange' : 'blue'}`}>{num}</div>
            ))}
          </div>
          <div className="bottom-nav-icons">
            <i className="fa-solid fa-bars"></i>
            <i className="fa-solid fa-house"></i>
          </div>
        </div>

        {/* --- CENTER AREA (Wheel + Table) --- */}
        <div className="center-area">
          
          {/* Wheel */}
          <div className="wheel-section">
            <div className="wheel-pointer"></div>
            <div className="wheel-outer-ring">
              <div className="wheel-rotator" style={{ background: generateWheelGradient() }}>
                <div className="wheel-inner-ring">
                  <div className="wheel-center-gold">LottoBD</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <div className="roulette-table-grid">
              
              {/* Top Zero */}
              <div className="cell zero-cell" onClick={() => handleBetClick('0')} style={{ gridColumn: '3 / 6', gridRow: 1 }}>
                0 {bets['0'] > 0 && <div className="chip">{bets['0']}</div>}
              </div>

              {/* Left Column */}
              <div className="cell vert-text" onClick={() => handleBetClick('1-18')} style={{ gridColumn: 1, gridRow: '2 / 4' }}>1-18 {bets['1-18'] > 0 && <div className="chip">{bets['1-18']}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick('even')} style={{ gridColumn: 1, gridRow: '4 / 6' }}>Even {bets['even'] > 0 && <div className="chip">{bets['even']}</div>}</div>
              <div className="cell" onClick={() => handleBetClick('red')} style={{ gridColumn: 1, gridRow: '6 / 8' }}><span className="diamond red-d"></span>{bets['red'] > 0 && <div className="chip">{bets['red']}</div>}</div>
              <div className="cell" onClick={() => handleBetClick('black')} style={{ gridColumn: 1, gridRow: '8 / 10' }}><span className="diamond black-d"></span>{bets['black'] > 0 && <div className="chip">{bets['black']}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick('odd')} style={{ gridColumn: 1, gridRow: '10 / 12' }}>Odd {bets['odd'] > 0 && <div className="chip">{bets['odd']}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick('19-36')} style={{ gridColumn: 1, gridRow: '12 / 14' }}>19-36 {bets['19-36'] > 0 && <div className="chip">{bets['19-36']}</div>}</div>

              {/* Dozens Column */}
              <div className="cell vert-text" onClick={() => handleBetClick('1st12')} style={{ gridColumn: 2, gridRow: '2 / 6' }}>1st 12 {bets['1st12'] > 0 && <div className="chip">{bets['1st12']}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick('2nd12')} style={{ gridColumn: 2, gridRow: '6 / 10' }}>2nd 12 {bets['2nd12'] > 0 && <div className="chip">{bets['2nd12']}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick('3rd12')} style={{ gridColumn: 2, gridRow: '10 / 14' }}>3rd 12 {bets['3rd12'] > 0 && <div className="chip">{bets['3rd12']}</div>}</div>

              {/* 2:1 Columns */}
              <div className="cell" onClick={() => handleBetClick('col3')} style={{ gridColumn: 6, gridRow: '2 / 6' }}>2:1 {bets['col3'] > 0 && <div className="chip">{bets['col3']}</div>}</div>
              <div className="cell" onClick={() => handleBetClick('col2')} style={{ gridColumn: 6, gridRow: '6 / 10' }}>2:1 {bets['col2'] > 0 && <div className="chip">{bets['col2']}</div>}</div>
              <div className="cell" onClick={() => handleBetClick('col1')} style={{ gridColumn: 6, gridRow: '10 / 14' }}>2:1 {bets['col1'] > 0 && <div className="chip">{bets['col1']}</div>}</div>

              {/* Numbers */}
              {numbersData.map((item) => (
                <div 
                  key={item.num} 
                  className={`cell num-cell ${item.isRed ? 'red' : 'black'}`}
                  onClick={() => handleBetClick(item.num.toString())}
                  style={{ gridColumn: item.col, gridRow: item.row }}
                >
                  {item.num}
                  {bets[item.num] > 0 && <div className="chip">{bets[item.num]}</div>}
                </div>
              ))}

            </div>
          </div>
        </div>

        {/* --- RIGHT SIDEBAR --- */}
        <div className="right-sidebar">
          <button className="circle-btn"><i className="fa-solid fa-rotate-left"></i></button>
          <button className="circle-btn text-btn">2X</button>
          <button className="circle-btn large-btn"><i className="fa-solid fa-plus"></i></button>
          <button className="circle-btn large-btn"><i className="fa-solid fa-minus"></i></button>
          <button className="circle-btn"><i className="fa-solid fa-xmark"></i></button>
          
          <div className="chip-container">
            <div className={`right-chip ${selectedChip === 1 ? 'active' : ''}`} onClick={() => setSelectedChip(1)}>1</div>
            <div className={`right-chip ${selectedChip === 0.5 ? 'active' : ''}`} onClick={() => setSelectedChip(0.5)}>0.5</div>
            <div className={`right-chip ${selectedChip === 0.1 ? 'active' : ''}`} onClick={() => setSelectedChip(0.1)}>0.1</div>
          </div>

          <div className="bottom-right-icons">
             <i className="fa-solid fa-volume-high"></i>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM INFO BAR ================= */}
      <div className="bottom-info-bar">
        <div className="info-left">2159094070</div>
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
