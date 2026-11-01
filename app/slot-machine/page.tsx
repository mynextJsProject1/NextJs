'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './page.module.css';

// গেমের সিম্বল এবং সেটিংস
const SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
const REEL_COUNT = 3;
const SPIN_DURATION = 2000; // ২ সেকেন্ড

interface SpinResult {
  reels: string[];
  winAmount: number;
  isWin: boolean;
}

export default function SlotMachinePage() {
  // স্টেট ম্যানেজমেন্ট
  const [balance, setBalance] = useState<number>(1374224.62); 
  const [bet, setBet] = useState<number>(10.00);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [currentSymbols, setCurrentSymbols] = useState<string[]>(Array(REEL_COUNT).fill('7️⃣'));
  const [lastWin, setLastWin] = useState<number>(0);
  const [message, setMessage] = useState<string>('Place your bet and spin to win!');
  
  // মেমরি লিক রোধ করার জন্য রেফারেন্স
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // কম্পোনেন্ট আনমাউন্ট হলে ইন্টারভাল ক্লিয়ার করা
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinning) return;
    if (balance < bet) {
      setMessage('Insufficient balance!');
      return;
    }

    setIsSpinning(true);
    setMessage('Spinning...');
    setLastWin(0);
    
    // ব্যালেন্স কাটা (পরবর্তীতে এটি Supabase API-তে যাবে)
    setBalance((prev) => prev - bet);

    // অ্যানিমেশনের জন্য র‍্যান্ডম সিম্বল দেখানো
    spinIntervalRef.current = setInterval(() => {
      setCurrentSymbols(Array.from({ length: REEL_COUNT }, () => 
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      ));
    }, 80);

    // স্পিন শেষ হওয়া এবং ফলাফল নির্ধারণ
    setTimeout(() => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);

      // এখানে ভবিষ্যতে Supabase RPC থেকে আসল ফলাফল আসবে
      const finalReels = Array.from({ length: REEL_COUNT }, () => 
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      );
      
      setCurrentSymbols(finalReels);

      const isWin = finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2];
      const winAmount = isWin ? bet * 10 : 0; 

      if (isWin) {
        setBalance((prev) => prev + winAmount);
        setLastWin(winAmount);
        setMessage(`🎉 You won ${winAmount.toFixed(2)} BDT!`);
      } else {
        setMessage('😢 Try again!');
      }

      setIsSpinning(false);
    }, SPIN_DURATION);
  }, [isSpinning, balance, bet]);

  return (
    <div className={styles.container}>
      <div className={styles.machine}>
        {/* ইনার বর্ডার */}
        <div className={styles.innerBorder}>
          
          {/* হেডার: ব্যালেন্স */}
          <div className={styles.header}>
            <span>Balance: <strong>{balance.toFixed(2)} BDT</strong></span>
          </div>

          {/* রিলস */}
          <div className={styles.reels}>
            {currentSymbols.map((symbol, index) => (
              <div key={index} className={`${styles.reel} ${isSpinning ? styles.spinning : ''}`}>
                <span className={styles.symbol}>{symbol}</span>
              </div>
            ))}
          </div>

          {/* মেসেজ বোর্ড */}
          <div className={styles.messageBoard}>
            <p>{message}</p>
            {lastWin > 0 && <p className={styles.winText}>Profit: {lastWin.toFixed(2)} BDT</p>}
          </div>

          {/* কন্ট্রোল এরিয়া */}
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
                <button 
                  className={styles.quickBet} 
                  onClick={() => setBet(prev => Math.max(1, prev / 2))}
                  disabled={isSpinning}
                >
                  ½
                </button>
                <button 
                  className={styles.quickBet} 
                  onClick={() => setBet(prev => prev * 2)}
                  disabled={isSpinning}
                >
                  2x
                </button>
              </div>
            </div>
            
            <button
              onClick={handleSpin}
              disabled={isSpinning || balance < bet}
              className={styles.spinButton}
            >
              {isSpinning ? 'SPINNING...' : 'BET'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
