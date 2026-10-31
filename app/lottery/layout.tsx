/* app/lottery/layout.tsx */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import "./layout.css";

export default function LotteryLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  const [balance, setBalance] = useState(0);
  const [winnings, setWinnings] = useState(0);

  // ✅ নতুন স্টেট: নোটিফিকেশন টোস্টের জন্য
  const [activeNotification, setActiveNotification] = useState<{ title: string; message: string } | null>(null);
  const [showToast, setShowToast] = useState(false);

  const loadBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("lottery_balance, lottery_winnings").eq("id", user.id).single();
      if (data) {
        setBalance(Number(data.lottery_balance) || 0);
        setWinnings(Number(data.lottery_winnings) || 0);
      }
    }
  };

  useEffect(() => {
    void loadBalance();
    const channel = supabase.channel("lottery-layout-profile")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => loadBalance())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // ================= ✅ নতুন লজিক: রিয়েল-টাইম নোটিফিকেশন ও সাউন্ড =================
  useEffect(() => {
    const notificationChannel = supabase
      .channel("lottery_notifications_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lottery_notifications" },
        (payload) => {
          const newNotif = payload.new as any;
          
          if (newNotif.is_active) {
            // ১. সাউন্ড বাজানো (SMS notification tone)
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3"); 
            audio.play().catch((err) => console.log("Audio play blocked by browser:", err));

            // ২. টোস্ট পপআপ দেখানো
            setActiveNotification({ title: newNotif.title, message: newNotif.message });
            setShowToast(true);

            // ৩. ৬ সেকেন্ড পর টোস্ট বন্ধ হয়ে যাওয়া
            const timer = setTimeout(() => {
              setShowToast(false);
            }, 6000);

            return () => clearTimeout(timer);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [supabase]);
  // ======================================================================

  // এখানে FontAwesome এর বদলে সরাসরি SVG আইকন ব্যবহার করা হয়েছে
  const navItems = [
    { 
      name: "Home", 
      path: "/lottery", 
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> 
    },
    { 
      name: "Deposit", 
      path: "/lottery/deposit", 
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> 
    },
    { 
      name: "Withdraw", 
      path: "/lottery/withdraw", 
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg> 
    },
    { 
      name: "My Tickets", 
      path: "/lottery/my-tickets", 
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> 
    },
    { 
      name: "Winners", 
      path: "/lottery/winner", 
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg> 
    },
  ];

  return (
    <div className="lottery-app-layout">
      <header className="lottery-header">
        <Link href="/lottery" className="lottery-logo">
          <i className="fa-solid fa-trophy"></i> GaziLottery
        </Link>
        <div className="lottery-header-right">
          <div className="lottery-wallet-pill" onClick={() => router.push('/lottery/deposit')}>
            <i className="fa-solid fa-coins"></i>
            <span>{balance.toFixed(2)}</span>
          </div>
          <div className="lottery-trophy-pill">
            <i className="fa-solid fa-gift" style={{ color: "#ffd700" }}></i>
            <span>{winnings.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <main className="lottery-content">
        {children}
      </main>

      {/* ✅ নতুন যোগ করা নোটিফিকেশন টোস্ট (Popup) */}
      {showToast && activeNotification && (
        <div style={{
          position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#2a1f3d', border: '1px solid #d4af37', borderRadius: '12px',
          padding: '15px 20px', width: '90%', maxWidth: '400px', zIndex: 99999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', animation: 'slideDown 0.4s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', padding: '8px', borderRadius: '50%' }}>
              <i className="fa-solid fa-bell" style={{ color: '#d4af37', fontSize: '18px' }}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, color: '#d4af37', fontSize: '15px', fontWeight: 'bold' }}>{activeNotification.title}</h4>
              <p style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '13px', lineHeight: '1.4' }}>{activeNotification.message}</p>
            </div>
            {/* ম্যানুয়ালি বন্ধ করার জন্য X বাটন */}
            <button 
              onClick={() => setShowToast(false)} 
              style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '0' }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          
          {/* স্লাইড ডাউন অ্যানিমেশনের জন্য স্টাইল */}
          <style>{`
            @keyframes slideDown {
              from { top: -50px; opacity: 0; }
              to { top: 70px; opacity: 1; }
            }
          `}</style>
        </div>
      )}

      <nav className="lottery-bottom-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className={`lottery-nav-item ${isActive ? "active" : ""}`}>
              {/* আইকনটি সেন্টারে রাখার জন্য flex ব্যবহার করা হয়েছে */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '4px' }}>
                {item.icon}
              </div>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
