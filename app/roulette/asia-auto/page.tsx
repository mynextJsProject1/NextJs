"use client";

import React, { useMemo, useState } from "react";
import "./asia-auto/auto-asia.css";

const wheelNumbers = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const redNumbers = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const recentNumbers = [29, 25, 16, 33, 20, 17, 5, 9, 36, 35];
const hotNumbers = [32, 26, 16, 2];
const coldNumbers = [9, 6, 22, 10];
const chips = [
  { value: 1, label: "1", className: "chip-orange" },
  { value: 0.5, label: "0.5", className: "chip-yellow" },
  { value: 0.1, label: "0.1", className: "chip-red" },
];

function MiniIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    chart: <><path d="M4 20V11M11 20V5M18 20V2" /></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
    sound: <><path d="M4 10v4h4l5 4V6l-5 4zM17 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12" /></>,
    history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    fire: <><path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-8 0 3-2 4-2 4 0-4-2-7-5-9 1 5-4 7-4 13 0 4 3 7 8 7z" /></>,
    snow: <><path d="M12 2v20M4 7l16 10M20 7 4 17M8 3l4 3 4-3M8 21l4-3 4 3M2 10l4-3-1-4M22 10l-4-3 1-4M2 14l4 3-1 4M22 14l-4 3 1 4" /></>,
    spin: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 1M4 17l2 1a7 7 0 0 0 12.5-3" /></>,
    repeat: <><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    shuffle: <><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M4 4l6 6M14 14l7 7" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mini-icon">
      {paths[name] ?? paths.spin}
    </svg>
  );
}

function RouletteWheel() {
  return (
    <div className="wheel-wrap" aria-label="European roulette wheel illustration">
      <div className="wheel-rim">
        <div className="wheel-wood">
          <div className="wheel-metal">
            <div className="wheel-pockets">
              {wheelNumbers.map((number, index) => (
                <div
                  className={`wheel-pocket ${number === 0 ? "green" : redNumbers.has(number) ? "red" : "black"}`}
                  key={number}
                  style={{ transform: `translate(-50%, -50%) rotate(${index * (360 / 37)}deg) translateY(-var(--pocket-radius))` }}
                >
                  <span>{number}</span>
                </div>
              ))}
            </div>
            <div className="wheel-inner-wood">
              <div className="wheel-spokes" />
              <div className="wheel-hub"><span /></div>
              <div className="wheel-axle" />
            </div>
          </div>
          <div className="wheel-screws"><i /><i /><i /><i /></div>
        </div>
      </div>
    </div>
  );
}

export default function AisaAutoRoulettePage() {
  const [selectedChip, setSelectedChip] = useState(1);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const betTotal = useMemo(
    () => Object.values(bets).reduce((sum, amount) => sum + amount, 0),
    [bets]
  );

  const addBet = (key: string) => {
    setBets((current) => ({ ...current, [key]: (current[key] || 0) + selectedChip }));
  };

  const spinDemo = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    window.setTimeout(() => {
      setLastResult(Math.floor(Math.random() * 37));
      setIsSpinning(false);
    }, 1300);
  };

  const numberClass = (number: number) =>
    number === 0 ? "number-green" : redNumbers.has(number) ? "number-red" : "number-black";

  return (
    <main className="roulette-page">
      <div className="roulette-shell">
        <header className="game-header">
          <div className="brand-lockup">
            <span className="brand-script">European</span>
            <strong>ROULETTE</strong>
            <small>LIVE • FIRST</small>
          </div>
          <div className="header-actions">
            <button aria-label="Statistics"><MiniIcon name="chart" /></button>
            <button aria-label="Game history"><MiniIcon name="history" /></button>
          </div>
        </header>

        <section className="upper-game">
          <aside className="history-rail">
            <div className="rail-heading"><MiniIcon name="history" /></div>
            <div className="number-stack">
              {recentNumbers.map((number, index) => (
                <span className={`history-number ${numberClass(number)} ${index === 9 ? "outlined" : ""}`} key={number}>{number}</span>
              ))}
            </div>
            <div className="rail-heading hot-heading"><MiniIcon name="fire" /></div>
            <div className="number-stack">
              {hotNumbers.map((number) => <span className="history-number hot-number" key={number}>{number}</span>)}
            </div>
            <div className="rail-heading cold-heading"><MiniIcon name="snow" /></div>
            <div className="number-stack">
              {coldNumbers.map((number) => <span className="history-number cold-number" key={number}>{number}</span>)}
            </div>
          </aside>

          <div className="wheel-column">
            <div className="wheel-title">EUROPEAN <b>ROULETTE</b></div>
            <RouletteWheel />
            <div className="result-strip">
              <span>LAST RESULT</span>
              <strong className={lastResult === null ? "" : numberClass(lastResult)}>{lastResult === null ? "—" : lastResult}</strong>
              {isSpinning && <em>SPINNING…</em>}
            </div>
          </div>

          <aside className="control-rail">
            <button className="control-button" aria-label="Statistics"><MiniIcon name="chart" /></button>
            <button className="control-button" aria-label="Race track"><span className="track-icon">▥</span></button>
            <button className="control-button star-control" aria-label="Favorites">★</button>
            <button className="control-button gold-control" onClick={() => setBets({})} aria-label="Clear bets"><MiniIcon name="repeat" /></button>
            <button className="control-button gold-control" onClick={() => setBets((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value * 2])))} aria-label="Double bets">2X</button>
            <button className="control-button gold-control big-control" onClick={spinDemo} aria-label="Spin roulette"><MiniIcon name="spin" /></button>
            <button className="control-button gold-control" onClick={() => setBets({})} aria-label="Undo bets"><MiniIcon name="repeat" /></button>
            <button className="control-button gold-control" onClick={() => setBets({})} aria-label="Clear bets"><MiniIcon name="close" /></button>
          </aside>
        </section>

        <section className="betting-area">
          <div className="betting-left-labels">
            <button onClick={() => addBet("low")}>1–18</button>
            <button onClick={() => addBet("even")}>EVEN</button>
            <button onClick={() => addBet("red")}><span className="diamond red-diamond" /></button>
            <button onClick={() => addBet("black")}><span className="diamond black-diamond" /></button>
            <button onClick={() => addBet("odd")}>ODD</button>
            <button onClick={() => addBet("high")}>19–36</button>
          </div>
          <div className="dozens-labels">
            <button onClick={() => addBet("1st12")}>1st 12</button>
            <button onClick={() => addBet("2nd12")}>2nd 12</button>
            <button onClick={() => addBet("3rd12")}>3rd 12</button>
          </div>
          <div className="number-board-wrap">
            <button className="zero-cell" onClick={() => addBet("0")}>0 <small>{bets["0"] ? bets["0"].toFixed(1) : ""}</small></button>
            <div className="number-board">
              {Array.from({ length: 12 }, (_, row) => (
                <React.Fragment key={row}>
                  {[1 + row * 3, 2 + row * 3, 3 + row * 3].map((number) => (
                    <button
                      key={number}
                      className={`number-cell ${numberClass(number)} ${bets[String(number)] ? "has-bet" : ""}`}
                      onClick={() => addBet(String(number))}
                    >
                      <span>{number}</span>
                      {bets[String(number)] ? <small>{bets[String(number)].toFixed(1)}</small> : null}
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div className="column-bets">
              <button onClick={() => addBet("col1")}>2 : 1</button>
              <button onClick={() => addBet("col2")}>2 : 1</button>
              <button onClick={() => addBet("col3")}>2 : 1</button>
            </div>
          </div>
        </section>

        <div className="table-info">
          <span>TABLE COVERAGE 40.54%</span>
          <span>TABLE LIMITS MIN 0.10 EUR / MAX 5000.00 EUR</span>
        </div>

        <nav className="bottom-controls">
          <button aria-label="Menu"><MiniIcon name="menu" /></button>
          <button aria-label="Home"><MiniIcon name="home" /></button>
          <div className="chip-picker" aria-label="Select betting chip">
            {chips.map((chip) => (
              <button
                key={chip.label}
                className={`chip ${chip.className} ${selectedChip === chip.value ? "selected" : ""}`}
                onClick={() => setSelectedChip(chip.value)}
                aria-pressed={selectedChip === chip.value}
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
          <button aria-label="Sound"><MiniIcon name="sound" /></button>
        </nav>

        <footer className="account-bar">
          <div><small>BALANCE IN EUR</small><strong>9996.50</strong></div>
          <div><small>BET IN EUR</small><strong>{betTotal.toFixed(2)}</strong></div>
          <div><small>WIN IN EUR</small><strong>—</strong></div>
        </footer>
        <div className="demo-note">DEMO INTERFACE • NOT CONNECTED TO REAL MONEY OR A LIVE GAME</div>
      </div>
    </main>
  );
}
