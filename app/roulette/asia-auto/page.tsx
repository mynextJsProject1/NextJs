/* app/roulette/asia-auto/page.tsx */
"use client";

import { useMemo, useState } from "react";
import "./asia-auto.css";

const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8,
  23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export default function AsiaAutoRoulettePage() {
  const [selectedChip, setSelectedChip] = useState<number>(0.5);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const recentResultsTop = [0, 32, 15, 19, 4, 21, 2, 25, 17];
  const recentResultsLeftTop = [29, 25, 16, 33, 20, 17, 5, 9, 36, 35];
  const recentResultsLeftBottom = [32, 26, 16, 2, 9, 6, 22, 10];

  const wheelGradient = useMemo(() => {
    const step = 360 / EUROPEAN_WHEEL_ORDER.length;
    const stops = EUROPEAN_WHEEL_ORDER.map((number, index) => {
      const color =
        number === 0 ? "#087b2c" : RED_NUMBERS.includes(number) ? "#b51f2b" : "#101820";
      return `${color} ${index * step}deg ${(index + 1) * step}deg`;
    });
    return `conic-gradient(from ${-90 - step / 2}deg, ${stops.join(", ")})`;
  }, []);

  const numbersData = Array.from({ length: 36 }, (_, index) => {
    const num = index + 1;
    // European table rows run 1,2,3 down each column, then 4,5,6, etc.
    return {
      num,
      col: ((num - 1) % 3) + 3,
      row: Math.floor((num - 1) / 3) + 2,
      isRed: RED_NUMBERS.includes(num),
    };
  });

  const totalBet = Object.values(bets).reduce((sum, amount) => sum + amount, 0);

  const handleBetClick = (spotId: string) => {
    if (isSpinning) return;
    setBets((previous) => ({
      ...previous,
      [spotId]: (previous[spotId] || 0) + selectedChip,
    }));
  };

  const handleSpin = () => {
    if (isSpinning || totalBet <= 0) return;

    const result = Math.floor(Math.random() * 37);
    const resultIndex = EUROPEAN_WHEEL_ORDER.indexOf(result);
    const step = 360 / EUROPEAN_WHEEL_ORDER.length;
    // The wheel's zero pocket is at the top before spinning.
    const targetAngle = resultIndex * step;
    const currentAngle = ((wheelRotation % 360) + 360) % 360;
    const correction = (360 - ((targetAngle + currentAngle) % 360)) % 360;

    setIsSpinning(true);
    setLastResult(null);
    setWheelRotation((previous) => previous + 360 * 5 + correction);

    window.setTimeout(() => {
      setLastResult(result);
      setIsSpinning(false);
      setBets({});
    }, 4200);
  };

  const wheelNumbers = EUROPEAN_WHEEL_ORDER.map((number, index) => {
    const angle = -90 + (index * 360) / EUROPEAN_WHEEL_ORDER.length;
    const radius = 39;
    const radians = (angle * Math.PI) / 180;
    return {
      number,
      left: `${50 + Math.cos(radians) * radius}%`,
      top: `${50 + Math.sin(radians) * radius}%`,
      color: number === 0 ? "green" : RED_NUMBERS.includes(number) ? "red" : "black",
    };
  });

  return (
    <div className="roulette-fullscreen-app">
      <div className="top-history-bar">
        <div className="history-scroll-area">
          {recentResultsTop.map((num, idx) => (
            <div
              key={`${num}-${idx}`}
              className={`top-pill ${num === 0 ? "green" : RED_NUMBERS.includes(num) ? "red" : "black"}`}
            >
              {num}
            </div>
          ))}
        </div>
        <div className="top-timer">EUROPEAN</div>
      </div>

      <div className="main-layout">
        <aside className="left-sidebar">
          <div className="icon-small"><i className="fa-solid fa-clock-rotate-left" /></div>
          <div className="left-history-list">
            {recentResultsLeftTop.map((num, idx) => (
              <div key={`${num}-${idx}`} className={`left-box ${RED_NUMBERS.includes(num) ? "red" : "black"}`}>
                {num}
              </div>
            ))}
            <div className="icon-small"><i className="fa-solid fa-fire" /></div>
            {recentResultsLeftBottom.map((num, idx) => (
              <div key={`bottom-${idx}`} className={`left-box ${idx < 4 ? "orange" : "blue"}`}>
                {num}
              </div>
            ))}
          </div>
          <div className="bottom-nav-icons">
            <i className="fa-solid fa-bars" />
            <i className="fa-solid fa-house" />
          </div>
        </aside>

        <main className="center-area">
          <section className="wheel-section" aria-label="European roulette wheel">
            <div className="wheel-pointer" />
            <div className="wheel-outer-ring">
              <div
                className="wheel-rotator"
                style={{ background: wheelGradient, transform: `rotate(${wheelRotation}deg)` }}
              >
                <div className="wheel-wood-detail" />
                <div className="wheel-number-ring">
                  {wheelNumbers.map((item) => (
                    <span
                      key={item.number}
                      className={`wheel-number ${item.color}`}
                      style={{ left: item.left, top: item.top }}
                    >
                      {item.number}
                    </span>
                  ))}
                </div>
                <div className="wheel-inner-metal">
                  <div className="wheel-inner-wood">
                    <div className="wheel-center-gold">ASIA<br />ROULETTE</div>
                  </div>
                </div>
              </div>
              <div className="wheel-ball-track">
                <span className="wheel-ball" />
              </div>
            </div>
          </section>

          <div className="table-container">
            <div className="roulette-table-grid">
              <div
                className="cell zero-cell"
                onClick={() => handleBetClick("0")}
                style={{ gridColumn: "3 / 6", gridRow: 1 }}
              >
                0
                {bets["0"] > 0 && <div className="chip">{bets["0"].toFixed(1)}</div>}
              </div>

              <div className="cell vert-text" onClick={() => handleBetClick("1-18")} style={{ gridColumn: 1, gridRow: "2 / 4" }}>1-18{bets["1-18"] > 0 && <div className="chip">{bets["1-18"].toFixed(1)}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick("even")} style={{ gridColumn: 1, gridRow: "4 / 6" }}>Even{bets.even > 0 && <div className="chip">{bets.even.toFixed(1)}</div>}</div>
              <div className="cell" onClick={() => handleBetClick("red")} style={{ gridColumn: 1, gridRow: "6 / 8" }}><span className="diamond red-d" />{bets.red > 0 && <div className="chip">{bets.red.toFixed(1)}</div>}</div>
              <div className="cell" onClick={() => handleBetClick("black")} style={{ gridColumn: 1, gridRow: "8 / 10" }}><span className="diamond black-d" />{bets.black > 0 && <div className="chip">{bets.black.toFixed(1)}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick("odd")} style={{ gridColumn: 1, gridRow: "10 / 12" }}>Odd{bets.odd > 0 && <div className="chip">{bets.odd.toFixed(1)}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick("19-36")} style={{ gridColumn: 1, gridRow: "12 / 14" }}>19-36{bets["19-36"] > 0 && <div className="chip">{bets["19-36"].toFixed(1)}</div>}</div>

              <div className="cell vert-text" onClick={() => handleBetClick("1st12")} style={{ gridColumn: 2, gridRow: "2 / 6" }}>1st 12{bets["1st12"] > 0 && <div className="chip">{bets["1st12"].toFixed(1)}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick("2nd12")} style={{ gridColumn: 2, gridRow: "6 / 10" }}>2nd 12{bets["2nd12"] > 0 && <div className="chip">{bets["2nd12"].toFixed(1)}</div>}</div>
              <div className="cell vert-text" onClick={() => handleBetClick("3rd12")} style={{ gridColumn: 2, gridRow: "10 / 14" }}>3rd 12{bets["3rd12"] > 0 && <div className="chip">{bets["3rd12"].toFixed(1)}</div>}</div>

              <div className="cell column-bet" onClick={() => handleBetClick("col3")} style={{ gridColumn: 6, gridRow: "2 / 6" }}>2:1{bets.col3 > 0 && <div className="chip">{bets.col3.toFixed(1)}</div>}</div>
              <div className="cell column-bet" onClick={() => handleBetClick("col2")} style={{ gridColumn: 6, gridRow: "6 / 10" }}>2:1{bets.col2 > 0 && <div className="chip">{bets.col2.toFixed(1)}</div>}</div>
              <div className="cell column-bet" onClick={() => handleBetClick("col1")} style={{ gridColumn: 6, gridRow: "10 / 14" }}>2:1{bets.col1 > 0 && <div className="chip">{bets.col1.toFixed(1)}</div>}</div>

              {numbersData.map((item) => (
                <div
                  key={item.num}
                  className={`cell num-cell ${item.isRed ? "red" : "black"}`}
                  onClick={() => handleBetClick(item.num.toString())}
                  style={{ gridColumn: item.col, gridRow: item.row }}
                >
                  {item.num}
                  {bets[item.num] > 0 && <div className="chip">{bets[item.num].toFixed(1)}</div>}
                </div>
              ))}
            </div>
            <div className="table-bottom-payouts">
              <span>2 : 1</span><span>2 : 1</span><span>2 : 1</span>
            </div>
          </div>

          <div className="coverage-info">
            TABLE COVERAGE 40.54%<br />
            TABLE LIMITS MIN 0.10 EUR / MAX 5000.00 EUR
            {lastResult !== null && <strong className="last-result">LAST RESULT: {lastResult}</strong>}
          </div>
        </main>

        <aside className="right-sidebar">
          <div className="right-tools">
            <button className="circle-btn" aria-label="Repeat bet"><i className="fa-solid fa-rotate-left" /></button>
            <button className="circle-btn text-btn" aria-label="Double bet">2X</button>
            <button className="circle-btn large-btn" aria-label="Add bet"><i className="fa-solid fa-plus" /></button>
            <button className="circle-btn large-btn" aria-label="Remove bet"><i className="fa-solid fa-minus" /></button>
            <button className="circle-btn" aria-label="Clear bet" onClick={() => setBets({})}><i className="fa-solid fa-xmark" /></button>
          </div>

          <div className="chip-container">
            {[1, 0.5, 0.1].map((chip) => (
              <button
                type="button"
                key={chip}
                className={`right-chip chip-${String(chip).replace(".", "-")} ${selectedChip === chip ? "active" : ""}`}
                onClick={() => setSelectedChip(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          <button className="spin-button" type="button" onClick={handleSpin} disabled={isSpinning || totalBet <= 0}>
            <i className={`fa-solid ${isSpinning ? "fa-spinner fa-spin" : "fa-play"}`} />
            <span>{isSpinning ? "SPINNING" : "SPIN"}</span>
          </button>
          <div className="bottom-right-icons"><i className="fa-solid fa-volume-high" /></div>
        </aside>
      </div>

      <footer className="bottom-info-bar">
        <div className="info-left">EUROPEAN ROULETTE</div>
        <div className="info-center">
          <div>TABLE COVERAGE 40.54%</div>
          <div>{isSpinning ? "NO MORE BETS" : "PLACE YOUR BETS"} | {totalBet.toFixed(2)} EUR</div>
        </div>
        <div className="info-right">
          <div className="balance-item"><span>BET IN EUR</span><span className="val">{totalBet.toFixed(2)}</span></div>
          <div className="balance-item"><span>WIN IN EUR</span><span className="val">{lastResult === null ? "0.00" : lastResult}</span></div>
        </div>
      </footer>
    </div>
  );
}
