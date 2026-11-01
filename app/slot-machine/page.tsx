'use client';

import React, { useState, useCallback } from 'react';
import styles from './slot-machine.css;

const SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
const REEL_COUNT = 3;
const SPIN_DURATION = 1500;

const SlotMachine: React.FC = () => {
  const [balance, setBalance] = useState<number>(1374224.62); // আপনার স্ক্রিনশটের ব্যালেন্স
  const [bet, setBet] = useState<number>(10.00);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [currentSymbols, setCurrentSymbols] = useState<string[]>(
    Array(REEL_COUNT).fill(SYMBOLS[0])
  );
  const [lastWin, setLastWin] = useState<number>(0);
  const [message, setMessage] = useState<string>('আপনার ভাগ্য পরীক্ষা করুন!');

  const spin = useCallback(async () => {
    if (isSpinning || balance < bet) {
      if (balance < bet) setMessage('পর্যাপ্ত ব্যালেন্স নেই!');
      return;
    }

    setIsSpinning(true);
    setMessage('ঘুরছে...');
    setLastWin(0);
    setBalance((prev) => prev - bet);

    const spinInterval = setInterval(() => {
      setCurrentSymbols(Array.from({ length: REEL_COUNT }, () => 
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      ));
    }, 100);

    setTimeout(() => {
      clearInterval(spinInterval);
      const finalReels = Array.from({ length: REEL_COUNT }, () => 
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      );
      
      setCurrentSymbols(finalReels);
      const isWin = finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2];
      const winAmount = isWin ? bet * 10 : 0; 

      if (isWin) {
        setBalance((prev) => prev + winAmount);
        setLastWin(winAmount);
        setMessage(`🎉 আপনি জিতেছেন ${winAmount.toFixed(2)} কয়েন!`);
      } else {
        setMessage('😢 আবার চেষ্টা করুন!');
      }
      setIsSpinning(false);
    }, SPIN_DURATION);
  }, [isSpinning, balance, bet]);

  return (
    <div className={styles.container}>
      {/* মেইন মেশিন কন্টেইনার */}
      <div className={styles.machine}>
        
        {/* ইনার বর্ডার কন্টেইনার */}
        <div className={styles.innerBorder}>
          
          <div className={styles.header}>
            <span>Balance: <strong>{balance.toFixed(2)} BDT</strong></span>
          </div>

          <div className={styles.reels}>
            {currentSymbols.map((symbol, index) => (
              <div key={index} className={`${styles.reel} ${isSpinning ? styles.spinning : ''}`}>
                <span className={styles.symbol}>{symbol}</span>
              </div>
            ))}
          </div>

          <div className={styles.messageBoard}>
            <p>{message}</p>
            {lastWin > 0 && <p className={styles.winText}>Profit: {lastWin.toFixed(2)} BDT</p>}
          </div>

          <div className={styles.controls}>
            <div className={styles.inputGroup}>
              <label>Bet Amount</label>
              <div className={styles.betWrapper}>
                <input
                  type="number"
                  value={bet}
                  onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                  disabled={isSpinning}
                  min="1"
                  className={styles.betInput}
                />
                <button className={styles.quickBet}>½</button>
                <button className={styles.quickBet}>2x</button>
              </div>
            </div>
            
            <button
              onClick={spin}
              disabled={isSpinning}
              className={styles.spinButton}
            >
              {isSpinning ? 'Spinning...' : 'BET'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SlotMachine;
