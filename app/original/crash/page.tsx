/* app/original/crash/page.tsx */
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import GameBottomBar from "../../../components/GameBottomBar/GameBottomBar";
import { createClient } from "../../../lib/supabase/client";
import "./crash.css";

type HistoryItem = {
  id: string;
  value: number;
  isWin: boolean;
  profit: number;
  nonce: number;
  betAmount: number;
  crashPoint?: number;
};

type SuggestedGame = {
  id: string;
  game_name: string;
  game_image: string;
  game_link: string;
  border_color: string;
  ribbon_color: string;
  ribbon_text: string;
  show_border: boolean;
  show_ribbon: boolean;
  show_title: boolean;
};

const GROWTH_BASE = 1.0718;
const ANIM_MS = 50;
const SOUND_URLS = {
  click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3",
  lose: "https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3",
};

export default function CrashGamePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("10.00");
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");

  const [gameId, setGameId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [isCrashed, setIsCrashed] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [profit, setProfit] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [crashPointRevealed, setCrashPointRevealed] = useState<number | null>(null);

  const roundSettledRef = useRef(false);
  const animRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [autoStats, setAutoStats] = useState({ bets: 0, profit: 0 });
  const isAutoRef = useRef(false);
  const [autoCashoutAt, setAutoCashoutAt] = useState("2.00");
  const [autoBetCount, setAutoBetCount] = useState("0");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [onWinMode, setOnWinMode] = useState<"reset" | "increase">("reset");
  const [onWinValue, setOnWinValue] = useState("0");
  const [onLossMode, setOnLossMode] = useState<"reset" | "increase">("reset");
  const [onLossValue, setOnLossValue] = useState("0");
  const [stopOnProfit, setStopOnProfit] = useState("0.00");
  const [stopOnLoss, setStopOnLoss] = useState("0.00");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [suggestedGames, setSuggestedGames] = useState<SuggestedGame[]>([]);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState(false);

  const [instantBet, setInstantBet] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [clientSeed, setClientSeed] = useState("my_client_seed_123");
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [nonce, setNonce] = useState(0);
  const [isSeedVerified, setIsSeedVerified] = useState(false);
  const [fairnessView, setFairnessView] = useState<"main" | "change_seed" | "verify_seed">("main");

  const playSound = useCallback(
    (type: "click" | "win" | "lose") => {
      if (!soundEnabled) return;
      const audio = new Audio(SOUND_URLS[type]);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    },
    [soundEnabled]
  );

  const stopAnimations = useCallback(() => {
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("balance").eq("id", user.id).single();
        if (data) setBalance(Number(data.balance) || 0);
      }
      const { data: suggestData } = await supabase
        .from("suggested_game")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (suggestData) setSuggestedGames(suggestData);

      const { data: fair } = await supabase.rpc("get_crash_fairness_info");
      if (fair) {
        setServerSeedHash(fair.server_seed_hash || "");
        setNonce(Number(fair.nonce) || 0);
        if (fair.client_seed) setClientSeed(fair.client_seed);
      }
    };
    void fetchData();
    return () => {
      isAutoRef.current = false;
      stopAnimations();
    };
  }, [supabase, stopAnimations]);

  useEffect(() => {
    if (historyContainerRef.current) historyContainerRef.current.scrollLeft = historyContainerRef.current.scrollWidth;
    if (graphContainerRef.current) graphContainerRef.current.scrollLeft = graphContainerRef.current.scrollWidth;
  }, [history]);

  // 🟢 ১. বিমান ওড়ার লজিক (শুধু লোকাল টাইমার ব্যবহার)
  const startFlying = useCallback((bet: number, nonceAtStart: number, targetCrashPoint: number) => {
    setIsPlaying(true);
    setIsProcessing(false);
    roundSettledRef.current = false;
    
    const cp = Number(targetCrashPoint) > 1 ? Number(targetCrashPoint) : 2.0;
    const startTime = Date.now();

    if (animRef.current) clearInterval(animRef.current);

    animRef.current = window.setInterval(() => {
      if (roundSettledRef.current) return;

      const elapsed = (Date.now() - startTime) / 1000;
      const current = Math.pow(GROWTH_BASE, elapsed);
      setCurrentMultiplier(current);

      if (current >= cp) {
        roundSettledRef.current = true;
        stopAnimations();
        setCurrentMultiplier(cp);
        setCrashPointRevealed(cp);
        setIsCrashed(true);
        setIsPlaying(false);
        setProfit(-bet);
        playSound("lose");

        setHistory((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            value: 0,
            crashPoint: cp,
            isWin: false,
            profit: -bet,
            nonce: nonceAtStart,
            betAmount: bet,
          },
        ]);
        setNonce((n) => n + 1);
      }
    }, ANIM_MS);
  }, [playSound, stopAnimations]);

  // 🟢 ২. লোকাল ১৫ সেকেন্ডের কাউন্টডাউন
  const startCountdown = useCallback((bet: number, nonceAtStart: number, cp: number) => {
    setCountdown(15);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    const targetTime = Date.now() + 15000;

    countdownRef.current = window.setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
      setCountdown(remaining);

      if (now >= targetTime) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setCountdown(0);
        startFlying(bet, nonceAtStart, cp);
      }
    }, 100);
  }, [startFlying]);

  // 🟢 ৩. ম্যানুয়াল গেম স্টার্ট
  const handleStartGame = async () => {
    const amount = Number(betAmount);
    if (amount <= 0) return setErrorMsg("Invalid bet amount.");
    if (amount > balance) return setErrorMsg("Insufficient balance.");

    setIsProcessing(true);
    setErrorMsg("");
    setIsCrashed(false);
    setHasCashedOut(false);
    setCrashPointRevealed(null);
    setCurrentMultiplier(1.0);
    setProfit(0);
    stopAnimations();

    const nonceAtStart = nonce;

    try {
      const { data, error } = await supabase.rpc("start_crash_game", {
        p_bet_amount: amount,
        p_client_seed: clientSeed,
      });
      if (error) throw error;

      setGameId(data.game_id);
      setBalance(data.new_balance);
      
      const cp = Number(data.crash_point) > 1 ? Number(data.crash_point) : 2.0;
      setCrashPoint(cp);
      if (data.server_seed_hash) setServerSeedHash(data.server_seed_hash);
      if (data.nonce) setNonce(Number(data.nonce));

      playSound("click");
      startCountdown(amount, nonceAtStart, cp);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start game.");
      setIsProcessing(false);
    }
  };

  // 🟢 ৪. ম্যানুয়াল ক্যাশআউট
  const handleCashout = async () => {
    if (!isPlaying || isProcessing || isCrashed || hasCashedOut) return;
    if (currentMultiplier <= 1.0 || roundSettledRef.current) return;

    roundSettledRef.current = true; 
    stopAnimations();
    setIsProcessing(true);
    setErrorMsg("");
    const claimedMult = Number(currentMultiplier.toFixed(2));
    const nonceAtStart = nonce;

    try {
      const { data, error } = await supabase.rpc("cashout_crash", {
        p_game_id: gameId,
        p_clicked_mult: claimedMult,
      });
      if (error) throw error;

      if (data.won) {
        setBalance(data.new_balance);
        setHasCashedOut(true);
        setIsPlaying(false);
        setCurrentMultiplier(Number(data.cashout_mult));
        setProfit(Number(data.profit));
        playSound("win");

        setHistory((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            value: Number(data.cashout_mult),
            isWin: true,
            profit: Number(data.profit),
            nonce: nonceAtStart,
            betAmount: Number(betAmount),
          },
        ]);
        setNonce((n) => n + 1);
      } else {
        const cp = Number(data.crash_point) || claimedMult;
        setCurrentMultiplier(cp);
        setCrashPointRevealed(cp);
        setIsCrashed(true);
        setIsPlaying(false);
        setProfit(-Number(betAmount));
        playSound("lose");

        setHistory((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            value: 0,
            crashPoint: cp,
            isWin: false,
            profit: -Number(betAmount),
            nonce: nonceAtStart,
            betAmount: Number(betAmount),
          },
        ]);
        setNonce((n) => n + 1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to cashout.");
      roundSettledRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  // 🟢 ৫. অটো রাউন্ড প্লে (লোকাল টাইমার)
  const playAutoRound = useCallback(
    (gid: string, bet: number, target: number, crashP: number): Promise<{ won: boolean; cashoutMult?: number; crashPoint?: number }> =>
      new Promise((resolve) => {
        let settled = false;
        roundSettledRef.current = false;
        const cp = Number(crashP) > 1 ? Number(crashP) : 2.0;
        const safeTarget = Number(target) > 1 ? Number(target) : 2.0;

        setCountdown(15);
        const targetTime = Date.now() + 15000;

        const countdownInterval = window.setInterval(() => {
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
          setCountdown(remaining);

          if (now >= targetTime) {
            clearInterval(countdownInterval);
            setCountdown(0);
            setIsPlaying(true);
            const startTime = Date.now();

            const animId = window.setInterval(async () => {
              if (settled) return;
              if (!isAutoRef.current) {
                settled = true;
                clearInterval(animId);
                return resolve({ won: false });
              }

              const elapsed = (Date.now() - startTime) / 1000;
              const local = Math.pow(GROWTH_BASE, elapsed);
              setCurrentMultiplier(local);

              if (local >= safeTarget) {
                settled = true;
                clearInterval(animId);
                roundSettledRef.current = true;
                try {
                  const { data } = await supabase.rpc("cashout_crash", { p_game_id: gid, p_clicked_mult: safeTarget });
                  if (data?.won) {
                    setBalance(data.new_balance);
                    setCurrentMultiplier(Number(data.cashout_mult));
                    setHasCashedOut(true);
                    setIsPlaying(false);
                    setProfit(Number(data.profit) || bet * Number(data.cashout_mult) - bet);
                    playSound("win");
                    resolve({ won: true, cashoutMult: Number(data.cashout_mult) });
                  } else {
                    const realCp = Number(data?.crash_point) || safeTarget;
                    setCurrentMultiplier(realCp);
                    setCrashPointRevealed(realCp);
                    setIsCrashed(true);
                    setIsPlaying(false);
                    setProfit(-bet);
                    playSound("lose");
                    resolve({ won: false, crashPoint: realCp });
                  }
                } catch {
                  resolve({ won: false });
                }
              } else if (local >= cp) {
                settled = true;
                clearInterval(animId);
                roundSettledRef.current = true;
                setCurrentMultiplier(cp);
                setCrashPointRevealed(cp);
                setIsCrashed(true);
                setIsPlaying(false);
                setProfit(-bet);
                playSound("lose");
                resolve({ won: false, crashPoint: cp });
              }
            }, ANIM_MS);
          }
        }, 100);
      }),
    [supabase, playSound]
  );

  // 🟢 ৬. অটো বেট লুপ
  async function runAutoLoop(currentBet: number, currentCount: number, currentProfit: number) {
    if (!isAutoRef.current) return;

    const maxBets = Number(autoBetCount);
    const profitLimit = Number(stopOnProfit);
    const lossLimit = Number(stopOnLoss);
    const target = Number(autoCashoutAt);

    if (maxBets > 0 && currentCount >= maxBets) return toggleAutoBet();
    if (profitLimit > 0 && currentProfit >= profitLimit) return toggleAutoBet();
    if (lossLimit > 0 && currentProfit <= -lossLimit) return toggleAutoBet();
    if (currentBet > balance) {
      setErrorMsg("Auto stopped: Insufficient balance.");
      return toggleAutoBet();
    }

    setIsProcessing(true);
    setErrorMsg("");
    setIsCrashed(false);
    setHasCashedOut(false);
    setCrashPointRevealed(null);
    setCurrentMultiplier(1.0);
    setProfit(0);
    const nonceAtStart = nonce + currentCount;

    try {
      const { data: startData, error: startError } = await supabase.rpc("start_crash_game", {
        p_bet_amount: currentBet,
        p_client_seed: clientSeed,
      });
      if (startError) throw startError;

      setGameId(startData.game_id);
      setBalance(startData.new_balance);
      
      const cp = Number(startData.crash_point) > 1 ? Number(startData.crash_point) : 2.0;
      setCrashPoint(cp);
      if (startData.nonce) setNonce(Number(startData.nonce));
      if (startData.server_seed_hash) setServerSeedHash(startData.server_seed_hash);

      const round = await playAutoRound(startData.game_id, currentBet, target, cp);

      const roundProfit = round.won ? currentBet * Number(round.cashoutMult) - currentBet : -currentBet;
      const newCount = currentCount + 1;
      const newProfit = currentProfit + roundProfit;

      setAutoStats({ bets: newCount, profit: newProfit });
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          value: round.won ? Number(round.cashoutMult) : 0,
          crashPoint: round.crashPoint,
          isWin: round.won,
          profit: roundProfit,
          nonce: nonceAtStart,
          betAmount: currentBet,
        },
      ]);

      let nextBet = currentBet;
      if (round.won && onWinMode === "increase") nextBet = currentBet + (currentBet * Number(onWinValue)) / 100;
      else if (!round.won && onLossMode === "increase") nextBet = currentBet + (currentBet * Number(onLossValue)) / 100;
      setBetAmount(nextBet.toFixed(2));

      if (isAutoRef.current) {
        setTimeout(() => runAutoLoop(nextBet, newCount, newProfit), instantBet ? 300 : 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed during auto bet.");
      toggleAutoBet();
    } finally {
      setIsProcessing(false);
    }
  }

  // 🟢 ৭. অটো বেট টগল
  function toggleAutoBet() {
    if (isAutoRef.current) {
      isAutoRef.current = false;
      setIsAutoBetting(false);
      stopAnimations();
      setCountdown(0);
      return;
    }
    const amount = Number(betAmount);
    const target = Number(autoCashoutAt);
    if (amount <= 0) return setErrorMsg("Invalid bet amount.");
    if (target < 1.01) return setErrorMsg("Auto cashout must be ≥ 1.01x.");

    isAutoRef.current = true;
    setIsAutoBetting(true);
    setAutoStats({ bets: 0, profit: 0 });
    runAutoLoop(amount, 0, 0);
  }

  const totalWagered = history.reduce((s, i) => s + i.betAmount, 0);
  const totalProfit = history.reduce((s, i) => s + i.profit, 0);
  const wins = history.filter((h) => h.isWin).length;
  const losses = history.filter((h) => !h.isWin).length;
  const latestResult = history.length > 0 ? history[history.length - 1] : null;

  const liveCashout = isPlaying && !isCrashed && !hasCashedOut ? Number(betAmount) * currentMultiplier : 0;
  const displayProfit =
    activeTab === "manual"
      ? isPlaying && !isCrashed && !hasCashedOut
        ? Number(betAmount) * currentMultiplier - Number(betAmount)
        : profit
      : autoStats.profit;
  const showCashout = isPlaying && !isCrashed && !hasCashedOut;

  const generateGraph = () => {
    if (history.length === 0) {
      return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <svg viewBox="0 0 280 140" style={{ width: "100%", height: "100%", display: "block" }}>
            <line x1="0" y1="70" x2="280" y2="70" stroke="#2b4236" strokeWidth="1" />
          </svg>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a0aab2",
              fontSize: "12px",
            }}
          >
            No bets placed yet
          </div>
        </div>
      );
    }
    let cumulative = 0;
    const points = [0];
    history.forEach((h) => {
      cumulative += h.profit;
      points.push(cumulative);
    });
    const maxAbs = Math.max(...points.map(Math.abs), 1);
    const width = 280,
      height = 140;
    const centerY = height / 2;
    const padding = 15;
    const stepX = (width - 2 * padding) / Math.max(points.length - 1, 1);
    const getX = (i: number) => padding + i * stepX;
    const getY = (v: number) => centerY - (v / maxAbs) * (centerY - padding);

    let areaPath = `M ${getX(0)} ${centerY} L ${getX(0)} ${getY(points[0])}`;
    for (let i = 1; i < points.length; i++) areaPath += ` L ${getX(i)} ${getY(points[i])}`;
    areaPath += ` L ${getX(points.length - 1)} ${centerY} Z`;

    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const isGreen = points[i + 1] >= 0;
      segments.push(
        <line
          key={`line-${i}`}
          x1={getX(i)}
          y1={getY(points[i])}
          x2={getX(i + 1)}
          y2={getY(points[i + 1])}
          stroke={isGreen ? "#00E701" : "#ff4d4d"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E701" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00E701" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={centerY} x2={width} y2={centerY} stroke="#2b4236" strokeWidth="1" />
        <clipPath id="aboveCenter">
          <rect x="0" y="0" width={width} height={centerY} />
        </clipPath>
        <path d={areaPath} fill="url(#greenGradient)" clipPath="url(#aboveCenter)" />
        {segments}
      </svg>
    );
  };

  const renderAviatorCanvas = () => {
    const maxVisualMultiplier = Math.max(crashPoint || 10, currentMultiplier);
    const p = Math.min(Math.log(currentMultiplier) / Math.log(maxVisualMultiplier), 1);
    
    const x = 30 + p * 240; 
    const y = 250 - p * 190; 
    const angle = -25; 

    let pathStr = `M 30 250 `;
    let areaStr = `M 30 250 L 30 250 `;
    
    const steps = 30;
    for (let i = 1; i <= steps; i++) {
       const stepP = p * (i / steps);
       const sx = 30 + stepP * 240;
       const sy = 250 - stepP * 190;
       pathStr += `L ${sx} ${sy} `;
       areaStr += `L ${sx} ${sy} `;
    }
    areaStr += `L ${x} 280 L 30 280 Z`;

    const imageSrc = process.env.NODE_ENV === "production" 
        ? "https://mynextjsproject1.github.io/NextJs/images/crash/crash.png" 
        : "/images/crash/crash.png";

    return (
      <div className="aviator-canvas-container">
        <svg viewBox="0 0 300 300" preserveAspectRatio="none" className="aviator-svg">
          <defs>
            <linearGradient id="trailGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isCrashed ? "#ff4d4d" : "#00E701"} stopOpacity="0.6" />
              <stop offset="100%" stopColor={isCrashed ? "#ff4d4d" : "#00E701"} stopOpacity="0" />
            </linearGradient>
          </defs>

          <g stroke="#263C32" strokeWidth="0.5" strokeDasharray="4 4">
             <line x1="0" y1="75" x2="300" y2="75" />
             <line x1="0" y1="150" x2="300" y2="150" />
             <line x1="0" y1="225" x2="300" y2="225" />
             <line x1="75" y1="0" x2="75" y2="300" />
             <line x1="150" y1="0" x2="150" y2="300" />
             <line x1="225" y1="0" x2="225" y2="300" />
          </g>

          {isPlaying && <path d={areaStr} fill="url(#trailGradient)" />}
          {isPlaying && (
            <path
              d={pathStr}
              fill="none"
              stroke={isCrashed ? "#ff4d4d" : "#00E701"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 8px ${isCrashed ? '#ff4d4d' : '#00E701'})` }}
            />
          )}
        </svg>

        {isPlaying && (
          <img
            src={imageSrc}
            alt="plane"
            className={`aviator-plane-img ${isCrashed ? "crashed" : ""}`}
            style={{
              position: "absolute",
              left: `${(x / 300) * 100}%`,
              top: `${(y / 300) * 100}%`,
              width: "55px",
              height: "55px",
              objectFit: "contain",
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              filter: `drop-shadow(0 0 12px ${isCrashed ? '#ff4d4d' : '#00E701'})`,
              transition: "left 0.05s linear, top 0.05s linear, transform 0.1s linear",
              zIndex: 5,
              pointerEvents: "none",
            }}
          />
        )}

        <div className={`aviator-multiplier-overlay ${isCrashed ? "crashed" : ""}`}>
          <div className="aviator-mult-text">
             {(isCrashed ? (crashPointRevealed ?? currentMultiplier) : currentMultiplier).toFixed(2)}x
          </div>
          {isCrashed && <div className="aviator-crash-label">CRASHED</div>}
          {hasCashedOut && !isCrashed && <div className="aviator-cashout-label">CASHED OUT</div>}
          {countdown > 0 && (
            <div className="aviator-crash-label" style={{ color: "#f59e0b", marginTop: "10px" }}>
              Starting in {countdown}s
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="stake-app">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="stake-main" style={{ paddingBottom: "80px" }}>
        <div className="limbo-game-container">
          <div className="limbo-main-area">
            <div className="limbo-history-wrapper">
              <div className="limbo-history-container" ref={historyContainerRef}>
                {history.map((item) => (
                  <div key={item.id} className={`limbo-history-item ${item.isWin ? "win" : "lose"}`}>
                    {item.isWin ? `${item.value.toFixed(2)}x` : `${(item.crashPoint ?? 0).toFixed(2)}x`}
                  </div>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  background: "rgba(255,77,77,0.1)",
                  color: "#ff4d4d",
                  padding: "10px",
                  borderRadius: "6px",
                  marginBottom: "15px",
                  fontSize: "13px",
                  textAlign: "center",
                }}
              >
                {errorMsg}
              </div>
            )}

            {renderAviatorCanvas()}

            <div className="limbo-inputs-grid">
              <div className="limbo-input-group">
                <label>Status</label>
                <div className="limbo-input-wrapper">
                  <input
                    type="text"
                    readOnly
                    value={countdown > 0 ? "Waiting..." : isCrashed ? "Crashed" : isPlaying ? "Running" : hasCashedOut ? "Cashed Out" : "Idle"}
                    style={{ color: countdown > 0 ? "#f59e0b" : isCrashed ? "#ff4d4d" : isPlaying ? "#00E701" : "#fff" }}
                  />
                </div>
              </div>
              <div className="limbo-input-group">
                <label>Multiplier</label>
                <div className="limbo-input-wrapper">
                  <input
                    type="text"
                    readOnly
                    value={`${currentMultiplier.toFixed(2)}x`}
                    style={{ color: currentMultiplier > 1 ? "var(--limbo-accent)" : "#fff" }}
                  />
                </div>
              </div>
            </div>

            {activeTab === "manual" ? (
              countdown > 0 ? (
                <button className="limbo-bet-btn rolling" disabled>
                  Waiting for {countdown}s...
                </button>
              ) : showCashout ? (
                <button
                  className="limbo-bet-btn"
                  onClick={handleCashout}
                  disabled={isProcessing || currentMultiplier <= 1.0}
                  style={{
                    background: currentMultiplier > 1.0 ? "var(--limbo-accent)" : "#365244",
                    color: currentMultiplier > 1.0 ? "#000" : "#fff",
                  }}
                >
                  {isProcessing ? "Processing..." : `Cashout ৳ ${liveCashout.toFixed(2)}`}
                </button>
              ) : (
                <button className={`limbo-bet-btn ${isProcessing ? "rolling" : ""}`} onClick={handleStartGame} disabled={isProcessing}>
                  {isProcessing ? "Starting..." : "Bet"}
                </button>
              )
            ) : (
              <button
                className={`limbo-bet-btn ${isAutoBetting ? "stop-btn" : ""}`}
                onClick={toggleAutoBet}
                disabled={isProcessing && !isAutoBetting}
              >
                {isAutoBetting ? "Stop Auto" : "Start Auto"}
              </button>
            )}

            <div className="limbo-amount-section">
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Bet Amount</label>
                  <span className="limbo-currency">Balance: {balance.toFixed(2)} BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${isPlaying || isAutoBetting || countdown > 0 ? "disabled" : ""}`}>
                  <span style={{ color: "var(--limbo-muted)", fontSize: "1.1rem", fontWeight: "bold", marginRight: "8px" }}>৳</span>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isPlaying || isAutoBetting || isProcessing || countdown > 0}
                  />
                  <div className="limbo-quick-btns">
                    <button
                      type="button"
                      onClick={() => setBetAmount((Number(betAmount) / 2).toFixed(2))}
                      disabled={isPlaying || isAutoBetting || isProcessing || countdown > 0}
                    >
                      ½
                    </button>
                    <button
                      type="button"
                      onClick={() => setBetAmount((Number(betAmount) * 2).toFixed(2))}
                      disabled={isPlaying || isAutoBetting || isProcessing || countdown > 0}
                    >
                      2x
                    </button>
                  </div>
                </div>
              </div>
              <div className="limbo-amount-group">
                <div className="limbo-label-row">
                  <label>Profit</label>
                  <span className="limbo-currency">0.00000000 BDT</span>
                </div>
                <div className={`limbo-amount-input-wrap ${isPlaying || isAutoBetting || countdown > 0 ? "disabled" : ""}`}>
                  <span style={{ color: "var(--limbo-muted)", fontSize: "1.1rem", fontWeight: "bold", marginRight: "8px" }}>৳</span>
                  <input
                    type="number"
                    value={displayProfit.toFixed(2)}
                    readOnly
                    style={{
                      color: displayProfit > 0 ? "var(--limbo-accent)" : displayProfit < 0 ? "var(--limbo-danger)" : "#fff",
                    }}
                  />
                </div>
              </div>
            </div>

            {activeTab === "auto" && (
              <div className="limbo-auto-settings">
                {isAutoBetting && (
                  <div
                    style={{
                      background: "rgba(0, 231, 1, 0.1)",
                      border: "1px solid #00e701",
                      padding: "10px",
                      borderRadius: "8px",
                      marginBottom: "15px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#fff", fontSize: "13px" }}>Bets: <strong>{autoStats.bets}</strong></span>
                    <span style={{ color: autoStats.profit >= 0 ? "#00e701" : "#ff4d4d", fontSize: "13px", fontWeight: "bold" }}>
                      Profit: {autoStats.profit.toFixed(2)} BDT
                    </span>
                  </div>
                )}

                <div className={`limbo-input-group ${isAutoBetting ? "disabled" : ""}`}>
                  <label>Auto Cashout At (×)</label>
                  <div className="limbo-input-wrapper">
                    <input
                      type="number"
                      value={autoCashoutAt}
                      onChange={(e) => setAutoCashoutAt(e.target.value)}
                      disabled={isAutoBetting}
                      min="1.01"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className={`limbo-input-group ${isAutoBetting ? "disabled" : ""}`}>
                  <label>Number of Bets</label>
                  <div className="limbo-input-wrapper">
                    <input
                      type="number"
                      value={autoBetCount}
                      onChange={(e) => setAutoBetCount(e.target.value)}
                      disabled={isAutoBetting}
                    />
                    <i className="fa-solid fa-infinity"></i>
                  </div>
                </div>

                <div className="auto-advanced-toggle">
                  <label>Advanced</label>
                  <div
                    className={`toggle-switch ${isAdvanced ? "active" : ""}`}
                    onClick={() => !isAutoBetting && setIsAdvanced(!isAdvanced)}
                    style={{ opacity: isAutoBetting ? 0.5 : 1, cursor: isAutoBetting ? "not-allowed" : "pointer" }}
                  >
                    <div className="toggle-knob"></div>
                  </div>
                </div>

                {isAdvanced && (
                  <div className="advanced-options">
                    <div className="adv-row">
                      <label>On Win</label>
                      <div className="adv-inputs">
                        <select value={onWinMode} onChange={(e) => setOnWinMode(e.target.value as any)} disabled={isAutoBetting}>
                          <option value="reset">Reset</option>
                          <option value="increase">Increase by</option>
                        </select>
                        <div className="limbo-input-wrapper" style={{ width: "100px" }}>
                          <input
                            type="number"
                            value={onWinValue}
                            onChange={(e) => setOnWinValue(e.target.value)}
                            disabled={onWinMode === "reset" || isAutoBetting}
                          />
                          <span>%</span>
                        </div>
                      </div>
                    </div>

                    <div className="adv-row">
                      <label>On Loss</label>
                      <div className="adv-inputs">
                        <select value={onLossMode} onChange={(e) => setOnLossMode(e.target.value as any)} disabled={isAutoBetting}>
                          <option value="reset">Reset</option>
                          <option value="increase">Increase by</option>
                        </select>
                        <div className="limbo-input-wrapper" style={{ width: "100px" }}>
                          <input
                            type="number"
                            value={onLossValue}
                            onChange={(e) => setOnLossValue(e.target.value)}
                            disabled={onLossMode === "reset" || isAutoBetting}
                          />
                          <span>%</span>
                        </div>
                      </div>
                    </div>

                    <div className="limbo-input-group">
                      <label>Stop on Profit</label>
                      <div className="limbo-input-wrapper">
                        <input
                          type="number"
                          value={stopOnProfit}
                          onChange={(e) => setStopOnProfit(e.target.value)}
                          disabled={isAutoBetting}
                        />
                        <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                      </div>
                    </div>

                    <div className="limbo-input-group">
                      <label>Stop on Loss</label>
                      <div className="limbo-input-wrapper">
                        <input
                          type="number"
                          value={stopOnLoss}
                          onChange={(e) => setStopOnLoss(e.target.value)}
                          disabled={isAutoBetting}
                        />
                        <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="limbo-bottom-tabs">
              <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")} disabled={isAutoBetting || countdown > 0}>
                Manual
              </button>
              <button className={activeTab === "auto" ? "active" : ""} onClick={() => setActiveTab("auto")} disabled={isAutoBetting || countdown > 0}>
                Auto
              </button>
            </div>

            <GameBottomBar
              onSettingsClick={() => setIsSettingsOpen(true)}
              onStatsClick={() => setIsGraphOpen(true)}
              onFairnessClick={() => {
                setIsFairnessOpen(true);
                setFairnessView("main");
              }}
            />
          </div>

          {suggestedGames.length > 0 && (
            <div className="suggested-section">
              <h2 className="suggested-title">
                <i className="fa-solid fa-gamepad" style={{ color: "#00E701" }}></i> Suggested Games
              </h2>
              <div className="suggested-grid">
                {suggestedGames.map((game) => (
                  <div
                    key={game.id}
                    className="premium-game-card"
                    style={{ border: game.show_border !== false ? `2px solid ${game.border_color || "#00E701"}` : "none" }}
                    onClick={() => router.push(`/${game.game_link}`)}
                  >
                    <img
                      src={game.game_image}
                      alt={game.game_name}
                      className="premium-card-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x400/1B2A23/00E701?text=Game";
                      }}
                    />
                    <div className="premium-card-overlay"></div>
                    {game.show_ribbon !== false && (
                      <div className="premium-card-ribbon" style={{ backgroundColor: game.ribbon_color || "#00E701", color: "#000" }}>
                        {game.ribbon_text || "SHUFFLE"}
                      </div>
                    )}
                    {game.show_title === true && <h3 className="premium-card-title">{game.game_name}</h3>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer
        activePage="casino"
        onNavigate={(page) => {
          if (page === "home") router.push("/");
          else if (page === "chat") router.push("/live-support/");
          else if (page === "casino") router.push("/play-category/");
          else if (page === "sports") router.push("/");
        }}
      />

      {isSettingsOpen && (
        <div className="limbo-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="limbo-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body">
              <div className="limbo-setting-row">
                <span>Instant Bet (Turbo)</span>
                <div className={`toggle-switch ${instantBet ? "active" : ""}`} onClick={() => setInstantBet(!instantBet)}>
                  <div className="toggle-knob"></div>
                </div>
              </div>
              <div className="limbo-setting-row">
                <span>Sound Effects</span>
                <div className={`toggle-switch ${soundEnabled ? "active" : ""}`} onClick={() => setSoundEnabled(!soundEnabled)}>
                  <div className="toggle-knob"></div>
                </div>
              </div>
              <button
                className="limbo-btn-secondary"
                style={{ width: "100%", marginTop: "15px" }}
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsBetHistoryOpen(true);
                }}
              >
                View Bet History
              </button>
            </div>
          </div>
        </div>
      )}

      {isBetHistoryOpen && (
        <div className="limbo-modal-overlay" onClick={() => setIsBetHistoryOpen(false)}>
          <div className="limbo-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Bet History</h3>
              <button onClick={() => setIsBetHistoryOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {history.length === 0 ? (
                <p style={{ textAlign: "center", color: "#aaa" }}>No bets placed yet.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#fff" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #23332b", textAlign: "left" }}>
                      <th style={{ padding: "8px 4px" }}>Nonce</th>
                      <th style={{ padding: "8px 4px" }}>Multiplier</th>
                      <th style={{ padding: "8px 4px" }}>Result</th>
                      <th style={{ padding: "8px 4px", textAlign: "right" }}>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .slice()
                      .reverse()
                      .map((h) => (
                        <tr key={h.id} style={{ borderBottom: "1px dashed #23332b" }}>
                          <td style={{ padding: "8px 4px", color: "#a0aab2" }}>{h.nonce}</td>
                          <td style={{ padding: "8px 4px" }}>
                            {h.isWin ? `${h.value.toFixed(2)}x` : `Crash @ ${(h.crashPoint ?? 0).toFixed(2)}x`}
                          </td>
                          <td style={{ padding: "8px 4px", color: h.isWin ? "#00e701" : "#ff4d4d" }}>{h.isWin ? "Win" : "Loss"}</td>
                          <td style={{ padding: "8px 4px", textAlign: "right", color: h.profit > 0 ? "#00e701" : "#ff4d4d" }}>
                            {h.profit > 0 ? "+" : ""}
                            {h.profit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {isGraphOpen && (
        <div className="limbo-modal-overlay no-blur" onClick={() => setIsGraphOpen(false)}>
          <div className="limbo-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "240px" }}>
            <div className="limbo-live-stats-header" style={{ padding: "16px 12px 0 12px" }}>
              <div className="limbo-live-stats-title">
                <i className="fa-solid fa-chart-simple" style={{ fontSize: "14px", color: "#a0aab2" }}></i>
                <h3 style={{ fontSize: "0.95rem", color: "#fff", margin: 0, fontWeight: "bold" }}>Live Stats</h3>
              </div>
              <div className="limbo-live-stats-icons">
                <button
                  onClick={() => setIsGraphOpen(false)}
                  style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            <div className="limbo-modal-body" style={{ padding: "12px" }}>
              <div className="limbo-stats-main-card">
                <div className="limbo-stats-layout">
                  <div className="limbo-stats-column">
                    <div className="limbo-stat-row-new">
                      <span className="limbo-stat-label-new">Profit</span>
                      <span className="limbo-stat-value-new" style={{ color: totalProfit >= 0 ? "#00E701" : "#ff4d4d" }}>
                        {totalProfit >= 0 ? "" : "-"}৳{Math.abs(totalProfit).toFixed(2)}
                      </span>
                    </div>
                    <div className="limbo-stat-row-new">
                      <span className="limbo-stat-label-new">Wagered</span>
                      <span className="limbo-stat-value-new" style={{ color: "#fff" }}>
                        ৳{totalWagered.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="limbo-stats-divider"></div>
                  <div className="limbo-stats-column" style={{ paddingLeft: "8px" }}>
                    <div className="limbo-stat-row-new">
                      <span className="limbo-stat-label-new">Wins</span>
                      <span className="limbo-stat-value-new" style={{ color: "#00E701" }}>
                        {wins}
                      </span>
                    </div>
                    <div className="limbo-stat-row-new">
                      <span className="limbo-stat-label-new">Losses</span>
                      <span className="limbo-stat-value-new" style={{ color: "#ff4d4d" }}>
                        {losses}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="limbo-graph-card-wrapper">
                  <div className="limbo-graph-area-new" ref={graphContainerRef}>
                    {generateGraph()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFairnessOpen && (
        <div className="limbo-modal-overlay" onClick={() => setIsFairnessOpen(false)}>
          <div className="limbo-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="limbo-modal-header">
              <h3>Provably Fair</h3>
              <button onClick={() => setIsFairnessOpen(false)}>✕</button>
            </div>
            <div className="limbo-modal-body">
              {fairnessView === "main" && (
                <>
                  <p style={{ color: "#aaa", fontSize: "13px", marginBottom: "15px" }}>
                    Crash uses a provably fair system. The crash point is generated from the HMAC of your client seed and a server seed.
                  </p>
                  <div className="limbo-fairness-group">
                    <label>Server Seed (Hashed)</label>
                    <div className="limbo-fairness-input">
                      <code>{serverSeedHash || "—"}</code>
                    </div>
                  </div>
                  <div className="limbo-fairness-group">
                    <label>Client Seed (Editable)</label>
                    <div className="limbo-fairness-input">
                      <input type="text" value={clientSeed} readOnly />
                    </div>
                  </div>
                  <div className="limbo-fairness-group">
                    <label>Seed Verify Number</label>
                    <div className="limbo-fairness-input">
                      <code>{nonce}</code>
                    </div>
                  </div>
                  <div className="limbo-fairness-btn-group">
                    <button className="limbo-btn-secondary" onClick={() => setFairnessView("change_seed")}>
                      Change Seed
                    </button>
                    <button className="limbo-btn-secondary" onClick={() => setFairnessView("verify_seed")}>
                      Verify Seed
                    </button>
                  </div>
                </>
              )}
              {fairnessView === "change_seed" && (
                <>
                  <button className="limbo-back-btn" onClick={() => setFairnessView("main")}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                  </button>
                  <h4 style={{ color: "#fff", marginTop: 0, marginBottom: "15px" }}>Change Client Seed</h4>
                  <div className="limbo-fairness-group">
                    <label>New Client Seed</label>
                    <div className="limbo-fairness-input">
                      <input
                        type="text"
                        value={clientSeed}
                        onChange={(e) => setClientSeed(e.target.value)}
                        placeholder="Enter new seed"
                      />
                    </div>
                  </div>
                  <button
                    className="limbo-btn-secondary"
                    style={{ width: "100%", marginTop: "10px" }}
                    onClick={() => {
                      setFairnessView("main");
                      setIsSeedVerified(false);
                    }}
                  >
                    Save Seed
                  </button>
                </>
              )}
              {fairnessView === "verify_seed" && (
                <>
                  <button className="limbo-back-btn" onClick={() => setFairnessView("main")}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                  </button>
                  <h4 style={{ color: "#fff", marginTop: 0, marginBottom: "15px" }}>Verify Latest Result</h4>
                  {latestResult ? (
                    <div className="limbo-verify-result-box">
                      <p>Last Round:</p>
                      <h4 style={{ color: latestResult.isWin ? "#00E701" : "#ff4d4d" }}>
                        {latestResult.isWin ? `${latestResult.value.toFixed(2)}x (Win)` : `Crash @ ${(latestResult.crashPoint ?? 0).toFixed(2)}x`}
                      </h4>
                      <p style={{ marginTop: "10px" }}>
                        Verify Number: <strong>{latestResult.nonce}</strong>
                      </p>
                    </div>
                  ) : (
                    <p style={{ color: "#aaa", fontSize: "13px" }}>No bets placed yet to verify.</p>
                  )}
                  <div className="limbo-fairness-group">
                    <label>Server Seed (Hashed)</label>
                    <div className="limbo-fairness-input">
                      <code>{serverSeedHash || "—"}</code>
                    </div>
                  </div>
                  <div className="limbo-fairness-group">
                    <label>Client Seed</label>
                    <div className="limbo-fairness-input">
                      <code>{clientSeed}</code>
                    </div>
                  </div>
                  <button
                    className={`limbo-btn-secondary ${isSeedVerified ? "verified" : ""}`}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      background: isSeedVerified ? "#00e701" : "",
                      color: isSeedVerified ? "#000" : "",
                    }}
                    onClick={() => setIsSeedVerified(true)}
                  >
                    {isSeedVerified ? "Verified ✓" : "Run Verification"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
