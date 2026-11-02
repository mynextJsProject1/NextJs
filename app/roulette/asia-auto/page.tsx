/* app/roulette/asia-auto/page.tsx */
"use client";

import { useState } from "react";

export default function AsiaAutoRoulettePage() {
  const [selectedChip, setSelectedChip] = useState<number>(0.5);
  const [bets, setBets] = useState<Record<string, number>>({});

  // ছবির মত ডেমো ডেটা
  const recentResultsTop = [0, 32, 15, 19, 4, 21, 2, 25, 17];
  const recentResultsLeft = [
    { num: 29, color: "red" }, { num: 25, color: "red" }, { num: 16, color: "red" },
    { num: 33, color: "black" }, { num: 20, color: "black" }, { num: 17, color: "black" },
    { num: 5, color: "red" }, { num: 9, color: "red" }, { num: 36, color: "red" }, { num: 35, color: "black" }
  ];
  const recentResultsLeftBottom = [
    { num: 32, color: "orange" }, { num: 26, color: "blue" }, { num: 16, color: "orange" },
    { num: 2, color: "blue" }, { num: 9, color: "orange" }, { num: 6, color: "blue" },
    { num: 22, color: "blue" }, { num: 10, color: "blue" }
  ];

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
      const color = i === 0 ? "#00E701" : (i % 2 === 0 ? "#e84141" : "#111111");
      gradient += `${color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg, `;
    }
    return gradient.slice(0, -2) + ")";
  };

  return (
    <div className="roulette-wrapper">
      
      {/* ================= CSS STYLES ================= */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700;900&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

        .roulette-wrapper {
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
          background-color: #0f1c17;
          font-family: 'Roboto Condensed', sans-serif;
          color: white;
          overflow: hidden;
          user-select: none;
          box-sizing: border-box;
        }

        /* ================= TOP HISTORY BAR ================= */
        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #1a2c24;
          margin: 10px 10px 0 10px;
          border-radius: 12px;
          border: 1px solid #2b4236;
        }

        .history-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .history-scroll::-webkit-scrollbar { display: none; }

        .top-pill {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 13px;
          font-weight: 900;
          flex-shrink: 0;
          box-shadow: inset 0 -2px 5px rgba(0,0,0,0.3);
        }
        .top-pill.green { background: #00E701; color: #000; }
        .top-pill.red { background: #e84141; }
        .top-pill.black { background: #222; border: 1px solid #555; }

        .timer {
          background: #0d1612;
          color: #00E701;
          font-weight: 900;
          font-size: 16px;
          padding: 5px 15px;
          border-radius: 20px;
          letter-spacing: 1px;
        }

        /* ================= MAIN LAYOUT ================= */
        .main-layout {
          display: flex;
          flex: 1;
          padding: 10px;
          gap: 10px;
          overflow: hidden;
        }

        /* --- LEFT SIDEBAR --- */
        .left-sidebar {
          width: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .left-icon { color: #a0aab2; font-size: 18px; margin-bottom: 5px; }
        .left-history { display: flex; flex-direction: column; gap: 4px; width: 100%; overflow-y: auto; scrollbar-width: none; }
        .left-history::-webkit-scrollbar { display: none; }
        
        .left-box {
          width: 100%;
          height: 26px;
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: 900;
          font-size: 13px;
          box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
        }
        .left-box.red { background: #e84141; border: 1px solid #ff7b6b; }
        .left-box.black { background: #1a1a1a; border: 1px solid #444; }
        .left-box.orange { background: #e67e22; border: 1px solid #f39c12; }
        .left-box.blue { background: #2980b9; border: 1px solid #3498db; }
        .left-icon-small { color: #a0aab2; font-size: 14px; margin: 5px 0; }

        .bottom-left-nav {
          display: flex;
          gap: 15px;
          margin-top: auto;
          margin-bottom: 5px;
          color: #fff;
          font-size: 22px;
        }

        /* --- CENTER GAME AREA --- */
        .center-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        /* Wheel */
        .wheel-container {
          position: relative;
          margin-top: 5px;
          margin-bottom: 20px;
          width: 220px;
          height: 220px;
        }
        .wheel-pointer {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-top: 20px solid #f1c40f;
          z-index: 10;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));
        }
        .wheel-wrapper {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          padding: 6px;
          background: #1a2c24;
          box-shadow: 0 10px 20px rgba(0,0,0,0.6), inset 0 0 10px rgba(0,0,0,0.8);
        }
        .wheel-rotator {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          position: relative;
          animation: spin 15s linear infinite;
          border: 2px solid #f1c40f;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .wheel-inner-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60%;
          height: 60%;
          background: #1a2c24;
          border-radius: 50%;
          border: 4px solid #f1c40f;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .wheel-center-gold {
          width: 80%;
          height: 80%;
          background: radial-gradient(circle, #f1c40f, #d4ac0d);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: counter-spin 15s linear infinite;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.3);
        }
        @keyframes counter-spin { 100% { transform: rotate(-360deg); } }
        .wheel-center-gold span { color: #000; font-weight: 900; font-size: 14px; }

        /* --- TABLE --- */
        .table-wrapper {
          width: 100%;
          max-width: 320px;
          background: #1a3d45;
          padding: 4px;
          border-radius: 6px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        }
        
        .roulette-grid {
          display: grid;
          grid-template-columns: 26px 26px 1fr 1fr 1fr 34px;
          grid-template-rows: 26px repeat(12, 26px);
          gap: 2px;
        }

        /* Empty cells for alignment */
        .empty { background: transparent; }
        
        /* Specific placements */
        .zero-spot {
          grid-column: 3 / 6;
          grid-row: 1;
          background: #27ae60;
          border: 1px solid #2ecc71;
          display: flex; justify-content: center; align-items: center;
          border-radius: 2px; font-weight: bold;
        }

        .bet-spot {
          display: flex;
          justify-content: center;
          align-items: center;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          position: relative;
          border-radius: 2px;
        }
        .bet-spot:active { transform: scale(0.95); }

        /* Left Side (Outside Bets) */
        .col-outside { grid-column: 1; }
        .outside-bet {
          background: #214b56; border: 1px solid #356b78;
          font-size: 10px;
          writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg);
        }
        .red-bet, .black-bet { background: #214b56; border: 1px solid #356b78; }
        .diamond-icon { width: 10px; height: 10px; transform: rotate(45deg); }
        .red-diamond { background: #e84141; }
        .black-diamond { background: #111; border: 1px solid #555; }

        /* Dozens */
        .col-dozens { grid-column: 2; }
        .dozen-bet {
          background: #214b56; border: 1px solid #356b78;
          font-size: 11px;
          writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg);
        }

        /* 2:1 Columns */
        .col-2to1 { grid-column: 6; }
        .col-bet {
          background: #214b56; border: 1px solid #356b78;
          font-size: 12px;
        }

        /* Numbers */
        .num-cell { font-size: 14px; }
        .num-cell.red { background: #c0392b; border: 1px solid #e74c3c; }
        .num-cell.black { background: #111; border: 1px solid #333; }
        
        .col-num1 { grid-column: 3; }
        .col-num2 { grid-column: 4; }
        .col-num3 { grid-column: 5; }

        /* Row spans */
        .span-2 { grid-row: span 2; }
        .span-4 { grid-row: span 4; }

        /* Placed Chip */
        .table-chip {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, #f1c40f, #d4ac0d);
          color: #000;
          width: 18px; height: 18px;
          border-radius: 50%;
          display: flex; justify-content: center; align-items: center;
          font-size: 9px; font-weight: 900;
          box-shadow: 0 2px 4px rgba(0,0,0,0.8);
          border: 1px dashed #000; z-index: 5; pointer-events: none;
        }

        /* --- RIGHT SIDEBAR --- */
        .right-sidebar {
          width: 50px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding-top: 10px;
        }

        .circle-btn {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #3c5c4a, #1a2c24);
          border: 2px solid #556b2f;
          color: #a0aab2;
          font-size: 18px;
          display: flex; justify-content: center; align-items: center;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        }
        .circle-btn.text-btn { font-size: 16px; font-weight: 900; color: #d4af37; }
        .circle-btn.large-btn { width: 46px; height: 46px; font-size: 22px; }

        .chip-container { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
        .chip-btn {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; justify-content: center; align-items: center;
          font-weight: 900; font-size: 14px;
          cursor: pointer; border: 3px dashed #fff;
          box-shadow: 0 3px 6px rgba(0,0,0,0.5);
        }
        .chip-btn:nth-child(1) { background: #e74c3c; color: #fff; }
        .chip-btn:nth-child(2) { background: #f1c40f; color: #000; border-color: #fff; }
        .chip-btn:nth-child(3) { background: #ecf0f1; color: #000; border-color: #e74c3c; }
        .chip-btn.active { transform: scale(1.1); box-shadow: 0 0 10px rgba(255,255,255,0.8); }

        .bottom-right-icons { margin-top: auto; margin-bottom: 10px; color: #fff; font-size: 24px; }

        /* ================= BOTTOM INFO BAR ================= */
        .bottom-bar {
          height: 40px; background: #050a08;
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 10px; color: #a0aab2; font-size: 10px;
        }
        .info-center { text-align: center; line-height: 1.2; }
        .info-right { display: flex; gap: 15px; }
        .balance-item { display: flex; flex-direction: column; align-items: flex-end; }
        .balance-item .val { color: #fff; font-size: 14px; font-weight: 900; }
      `}</style>

      {/* ================= TOP HISTORY BAR ================= */}
      <div className="top-bar">
        <div className="history-scroll">
          {recentResultsTop.map((num, idx) => (
            <div key={idx} className={`top-pill ${num === 0 ? 'green' : redNumbers.includes(num) ? 'red' : 'black'}`}>
              {num}
            </div>
          ))}
        </div>
        <div className="timer">00:15</div>
      </div>

      {/* ================= MAIN LAYOUT ================= */}
      <div className="main-layout">
        
        {/* --- LEFT SIDEBAR --- */}
        <div className="left-sidebar">
          <div className="left-icon"><i className="fa-solid fa-clock-rotate-left"></i></div>
          <div className="left-history">
            {recentResultsLeft.map((item, idx) => (
              <div key={idx} className={`left-box ${item.color}`}>{item.num}</div>
            ))}
            <div className="left-icon-small"><i className="fa-solid fa-fire"></i></div>
            {recentResultsLeftBottom.map((item, idx) => (
              <div key={`b-${idx}`} className={`left-box ${item.color}`}>{item.num}</div>
            ))}
          </div>
          <div className="bottom-left-nav">
            <i className="fa-solid fa-bars"></i>
            <i className="fa-solid fa-house"></i>
          </div>
        </div>

        {/* --- CENTER GAME AREA --- */}
        <div className="center-area">
          
          {/* Wheel */}
          <div className="wheel-container">
            <div className="wheel-pointer"></div>
            <div className="wheel-wrapper">
              <div className="wheel-rotator" style={{ background: generateWheelGradient() }}>
                <div className="wheel-inner-ring">
                  <div className="wheel-center-gold">
                    <span>LottoBD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <div className="roulette-grid">
              
              {/* Row 1: Zero */}
              <div className="empty col-outside"></div>
              <div className="empty col-dozens"></div>
              <div className="bet-spot zero-spot" onClick={() => handleBetClick('0')}>
                0 {bets['0'] > 0 && <div className="table-chip">{bets['0']}</div>}
              </div>
              <div className="empty col-2to1"></div>

              {/* --- Column 1: Outside Bets --- */}
              <div className="bet-spot outside-bet col-outside span-2" onClick={() => handleBetClick('1-18')}>1-18 {bets['1-18'] > 0 && <div className="table-chip">{bets['1-18']}</div>}</div>
              <div className="bet-spot outside-bet col-outside span-2" onClick={() => handleBetClick('even')}>Even {bets['even'] > 0 && <div className="table-chip">{bets['even']}</div>}</div>
              <div className="bet-spot red-bet col-outside span-2" onClick={() => handleBetClick('red')}><div className="diamond-icon red-diamond"></div> {bets['red'] > 0 && <div className="table-chip">{bets['red']}</div>}</div>
              <div className="bet-spot black-bet col-outside span-2" onClick={() => handleBetClick('black')}><div className="diamond-icon black-diamond"></div> {bets['black'] > 0 && <div className="table-chip">{bets['black']}</div>}</div>
              <div className="bet-spot outside-bet col-outside span-2" onClick={() => handleBetClick('odd')}>Odd {bets['odd'] > 0 && <div className="table-chip">{bets['odd']}</div>}</div>
              <div className="bet-spot outside-bet col-outside span-2" onClick={() => handleBetClick('19-36')}>19-36 {bets['19-36'] > 0 && <div className="table-chip">{bets['19-36']}</div>}</div>

              {/* --- Column 2: Dozens --- */}
              <div className="bet-spot dozen-bet col-dozens span-4" onClick={() => handleBetClick('1st12')}>1st 12 {bets['1st12'] > 0 && <div className="table-chip">{bets['1st12']}</div>}</div>
              <div className="bet-spot dozen-bet col-dozens span-4" onClick={() => handleBetClick('2nd12')}>2nd 12 {bets['2nd12'] > 0 && <div className="table-chip">{bets['2nd12']}</div>}</div>
              <div className="bet-spot dozen-bet col-dozens span-4" onClick={() => handleBetClick('3rd12')}>3rd 12 {bets['3rd12'] > 0 && <div className="table-chip">{bets['3rd12']}</div>}</div>

              {/* --- Column 6: 2:1 --- */}
              <div className="bet-spot col-bet col-2to1 span-4" onClick={() => handleBetClick('col3')}>2:1 {bets['col3'] > 0 && <div className="table-chip">{bets['col3']}</div>}</div>
              <div className="bet-spot col-bet col-2to1 span-4" onClick={() => handleBetClick('col2')}>2:1 {bets['col2'] > 0 && <div className="table-chip">{bets['col2']}</div>}</div>
              <div className="bet-spot col-bet col-2to1 span-4" onClick={() => handleBetClick('col1')}>2:1 {bets['col1'] > 0 && <div className="table-chip">{bets['col1']}</div>}</div>

              {/* --- Columns 3, 4, 5: Numbers Grid --- */}
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
            <div className={`chip-btn ${selectedChip === 1 ? 'active' : ''}`} onClick={() => setSelectedChip(1)}>1</div>
            <div className={`chip-btn ${selectedChip === 0.5 ? 'active' : ''}`} onClick={() => setSelectedChip(0.5)}>0.5</div>
            <div className={`chip-btn ${selectedChip === 0.1 ? 'active' : ''}`} onClick={() => setSelectedChip(0.1)}>0.1</div>
          </div>

          <div className="bottom-right-icons">
             <i className="fa-solid fa-volume-high"></i>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM INFO BAR ================= */}
      <div className="bottom-bar">
        <div>2159094070</div>
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
