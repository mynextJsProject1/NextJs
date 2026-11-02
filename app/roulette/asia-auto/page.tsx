/* app/roulette/asia-auto/page.tsx */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import "./asia-auto.css";

export default function AsiaAutoRoulettePage() {
  const router = useRouter();

  // ডেমো রেজাল্ট (শুধু ডিজাইনের জন্য)
  const recentResults = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27];

  // রুলেটের নাম্বার এবং কালার
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

  // হুইলের জন্য কালার জেনারেট করা (সিমুলেশন)
  const generateWheelGradient = () => {
    const totalSegments = 37;
    const segmentAngle = 360 / totalSegments;
    let gradient = "conic-gradient(";
    
    for (let i = 0; i < totalSegments; i++) {
      const color = i === 0 ? "#00E701" : (i % 2 === 0 ? "#111" : "#ff4d4d");
      const start = i * segmentAngle;
      const end = (i + 1) * segmentAngle;
      gradient += `${color} ${start}deg ${end}deg, `;
    }
    gradient = gradient.slice(0, -2) + ")";
    return gradient;
  };

  return (
    <div className="stake-app">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="roulette-main-container">
        
        {/* ================= টপ বার: টাইমার ও হিস্টরি ================= */}
        <div className="roulette-top-bar">
          <div className="roulette-history">
            {recentResults.map((num, idx) => (
              <div 
                key={idx} 
                className={`history-pill ${num === 0 ? 'green' : redNumbers.includes(num) ? 'red' : 'black'}`}
              >
                {num}
              </div>
            ))}
          </div>
          <div className="roulette-timer">
            <i className="fa-solid fa-clock"></i> Starting in: <strong>00:15</strong>
          </div>
        </div>

        {/* ================= রুলেট হুইল ================= */}
        <div className="roulette-wheel-section">
          <div className="wheel-pointer"></div>
          <div className="roulette-wheel-wrapper">
            <div 
              className="roulette-wheel" 
              style={{ background: generateWheelGradient() }}
            >
              {/* ইন্টারনাল হাব */}
              <div className="wheel-inner-circle">
                <div className="wheel-center">
                  <span>LottoBD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= বেটিং টেবিল এরিয়া ================= */}
        <div className="roulette-betting-area">
          
          {/* মেইন নাম্বার গ্রিড */}
          <div className="roulette-table-grid">
            {/* 0 */}
            <div className="bet-spot zero-spot">0</div>
            
            {/* 1-36 */}
            <div className="numbers-grid">
              {/* Row 1 (3, 6, 9... 36) */}
              {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map(num => (
                <div key={num} className={`bet-spot ${redNumbers.includes(num) ? 'red' : 'black'}`}>{num}</div>
              ))}
              {/* Row 2 (2, 5, 8... 35) */}
              {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map(num => (
                <div key={num} className={`bet-spot ${redNumbers.includes(num) ? 'red' : 'black'}`}>{num}</div>
              ))}
              {/* Row 3 (1, 4, 7... 34) */}
              {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map(num => (
                <div key={num} className={`bet-spot ${redNumbers.includes(num) ? 'red' : 'black'}`}>{num}</div>
              ))}
            </div>
          </div>

          {/* আউটসাইড বেটস */}
          <div className="outside-bets-grid">
            <div className="bet-spot outside">1st 12</div>
            <div className="bet-spot outside">2nd 12</div>
            <div className="bet-spot outside">3rd 12</div>
            
            <div className="bet-spot outside">1-18</div>
            <div className="bet-spot outside">EVEN</div>
            <div className="bet-spot red-bet">RED</div>
            <div className="bet-spot black-bet">BLACK</div>
            <div className="bet-spot outside">ODD</div>
            <div className="bet-spot outside">19-36</div>
          </div>
          
        </div>

        {/* ================= চিপ সিলেকশন (শুধু ডিজাইন) ================= */}
        <div className="roulette-chips">
          {[1, 5, 10, 50, 100, 500].map(chip => (
            <div key={chip} className="chip-btn">
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
