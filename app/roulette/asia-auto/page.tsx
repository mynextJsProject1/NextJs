"use client";

import React, { useState } from "react";
import "./auto-asia.css";

export default function RouletteAsiaAutoPage() {
  const [balance, setBalance] = useState(9996.50);
  const [betAmount, setBetAmount] = useState(2.50);

  // ডেমো ডাটা (ছবির মত)
  const historyNumbers = [
    { num: "29", color: "red", icon: "fa-fire" },
    { num: "25", color: "red" },
    { num: "16", color: "red" },
    { num: "33", color: "black" },
    { num: "20", color: "black" },
    { num: "17", color: "black" },
    { num: "5", color: "red" },
    { num: "9", color: "red" },
    { num: "36", color: "red" },
    { num: "35", color: "black" },
  ];

  // রুলেট টেবিলের নাম্বার জেনারেশন (১২ কলাম x ৩ রো)
  const renderNumbers = () => {
    const grid = [];
    // রো-ভিত্তিক লুপ (ছবির মত: উপরে ৩,৬,৯... নিচে ১,৪,৭...)
    for (let i = 0; i < 12; i++) {
        // উপরের রো (3, 6, 9...)
        grid.push({ num: (i * 3) + 3, color: (i * 3) + 3 === 3 || (i * 3) + 3 === 9 || (i * 3) + 3 === 12 || (i * 3) + 3 === 18 || (i * 3) + 3 === 21 || (i * 3) + 3 === 27 || (i * 3) + 3 === 30 || (i * 3) + 3 === 36 ? "red" : "black" });
        // মাঝের রো (2, 5, 8...)
        grid.push({ num: (i * 3) + 2, color: (i * 3) + 2 === 2 || (i * 3) + 2 === 8 || (i * 3) + 2 === 11 || (i * 3) + 2 === 17 || (i * 3) + 2 === 20 || (i * 3) + 2 === 26 || (i * 3) + 2 === 29 || (i * 3) + 2 === 35 ? "red" : "black" });
        // নিচের রো (1, 4, 7...)
        grid.push({ num: (i * 3) + 1, color: (i * 3) + 1 === 1 || (i * 3) + 1 === 7 || (i * 3) + 1 === 10 || (i * 3) + 1 === 16 || (i * 3) + 1 === 19 || (i * 3) + 1 === 25 || (i * 3) + 1 === 28 || (i * 3) + 1 === 34 ? "red" : "black" });
    }
    
    // CSS গ্রিডের জন্য সঠিক অর্ডারে সাজানো (রো বাই রো, বাম থেকে ডানে)
    const col1 = grid.filter((_, idx) => idx % 3 === 0); // উপরের রো
    const col2 = grid.filter((_, idx) => idx % 3 === 1); // মাঝের রো
    const col3 = grid.filter((_, idx) => idx % 3 === 2); // নিচের রো
    
    const orderedGrid = [];
    for(let i=0; i<12; i++) {
        orderedGrid.push(col1[i]); // 3, 6, 9...
        orderedGrid.push(col2[i]); // 2, 5, 8...
        orderedGrid.push(col3[i]); // 1, 4, 7...
    }
    return orderedGrid;
  };

  const numbers = renderNumbers();

  return (
    <div className="roulette-app-container">
      {/* ====== TOP SECTION ====== */}
      <div className="roulette-top-section">
        
        {/* Left Sidebar - History */}
        <div className="roulette-history-sidebar">
          <div className="history-header-icon"><i className="fa-solid fa-clock-rotate-left"></i></div>
          {historyNumbers.map((item, index) => (
            <div key={index} className={`history-item bg-${item.color}`}>
              {item.icon && <i className={`fa-solid ${item.icon} history-icon`}></i>}
              <span>{item.num}</span>
            </div>
          ))}
          <div className="history-item bg-orange"><i className="fa-solid fa-fire"></i></div>
          <div className="history-item bg-blue"><i className="fa-solid fa-snowflake"></i></div>
        </div>

        {/* Center - Wheel */}
        <div className="roulette-wheel-container">
          {/* এখানে আপনার রুলেট হুইলের ইমেজটি বসাবেন */}
          <div className="roulette-wheel-placeholder">
            <div className="wheel-inner-circle">
              <div className="wheel-cross"></div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Controls */}
        <div className="roulette-controls-sidebar">
          <button className="ctrl-btn icon-only"><i className="fa-solid fa-chart-simple"></i></button>
          <button className="ctrl-btn icon-only"><i className="fa-solid fa-arrows-up-down"></i></button>
          <button className="ctrl-btn icon-only"><i className="fa-regular fa-star"></i></button>
          
          <div className="ctrl-group">
            <button className="ctrl-btn icon-only"><i className="fa-solid fa-rotate-left"></i></button>
            <button className="ctrl-btn icon-only"><i className="fa-solid fa-rotate-right"></i></button>
          </div>

          <button className="ctrl-btn text-only font-bold">2X</button>

          <div className="ctrl-group">
            <button className="ctrl-btn icon-only border-gold"><i className="fa-solid fa-plus"></i></button>
            <button className="ctrl-btn icon-only border-gold"><i className="fa-solid fa-minus"></i></button>
          </div>

          <button className="ctrl-btn icon-only border-gold"><i className="fa-solid fa-xmark"></i></button>

          <div className="ctrl-bottom-group">
            <button className="ctrl-btn auto-btn"><i className="fa-solid fa-arrows-rotate"></i></button>
            <button className="ctrl-btn chip-btn">0.5</button>
            <button className="ctrl-btn info-btn"><i className="fa-solid fa-circle-info"></i></button>
          </div>
        </div>
      </div>

      {/* ====== BETTING TABLE ====== */}
      <div className="roulette-table-container">
        
        {/* Zero */}
        <div className="table-zero bg-green">0</div>

        <div className="table-grid-layout">
          {/* Left Outside Bets */}
          <div className="outside-bets-left">
            <div className="outside-btn">1-18</div>
            <div className="outside-btn">Even</div>
            <div className="outside-btn bg-red"><div className="diamond-icon"></div></div>
            <div className="outside-btn bg-black"><div className="diamond-icon"></div></div>
            <div className="outside-btn">Odd</div>
            <div className="outside-btn">19-36</div>
          </div>

          {/* Numbers Grid (12x3) */}
          <div className="numbers-grid">
            {numbers.map((item, index) => (
              <div key={index} className={`number-cell bg-${item.color}`}>
                {item.num}
              </div>
            ))}
          </div>

          {/* Right Columns (2:1) */}
          <div className="outside-bets-right">
            <div className="outside-btn col-btn">2:1</div>
            <div className="outside-btn col-btn">2:1</div>
            <div className="outside-btn col-btn">2:1</div>
          </div>
        </div>

        {/* Bottom Dozens (1st 12, 2nd 12, 3rd 12) */}
        <div className="dozens-row">
          <div className="outside-btn dozen-btn">1st 12</div>
          <div className="outside-btn dozen-btn">2nd 12</div>
          <div className="outside-btn dozen-btn">3rd 12</div>
        </div>
      </div>

      {/* ====== BOTTOM BAR ====== */}
      <div className="roulette-bottom-bar">
        <div className="bottom-left-icons">
          <button className="menu-btn"><i className="fa-solid fa-bars"></i></button>
          <button className="home-btn"><i className="fa-solid fa-house"></i></button>
        </div>

        <div className="bottom-center-info">
          <div className="table-limits">TABLE COVERAGE 40.54% <br /> TABLE LIMITS MIN 0.10 EUR / MAX 5000.00 EUR</div>
          <div className="table-meta">
            <span>2159004070</span>
            <span>12:26 | 00:01.6</span>
          </div>
        </div>

        <div className="bottom-right-logo">
          <div className="synot-logo">SYNOT</div>
          <div className="sound-icon"><i className="fa-solid fa-volume-high"></i></div>
        </div>
      </div>

      {/* ====== BALANCE BAR ====== */}
      <div className="balance-bar">
        <div className="balance-item">
          <span className="label">BALANCE IN EUR</span>
          <span className="value">{balance.toFixed(2)}</span>
        </div>
        <div className="balance-item">
          <span className="label">BET IN EUR</span>
          <span className="value">{betAmount.toFixed(2)}</span>
        </div>
        <div className="balance-item">
          <span className="label">WIN IN EUR</span>
          <span className="value">0.00</span>
        </div>
      </div>
    </div>
  );
}
