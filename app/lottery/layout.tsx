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

  // ✅ নতুন স্টেট: সাইড ড্রয়ার (Drawer) ওপেন/ক্লোজ করার জন্য
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      {/* ================= ✅ নতুন আপডেট করা হেডার ================= */}
      <header className="lottery-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px' }}>
        
        {/* বাম পাশ: হ্যামবার্গার মেনু এবং লোগো */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Hamburger SVG */}
          <button 
            onClick={() => setIsDrawerOpen(true)} 
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
          <Link href="/lottery" className="lottery-logo" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
            LottoBD
          </Link>
        </div>

        {/* ডান পাশ: নোটিফিকেশন আইকন এবং ব্যালেন্স পিল */}
        <div className="lottery-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          
          {/* Notification Bell SVG */}
          <button 
            onClick={() => router.push('/lottery/notification')} 
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', marginRight: '4px' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>

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
      {/* ============================================================ */}

      <main className="lottery-content">
        {children}
      </main>

      <nav className="lottery-bottom-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className={`lottery-nav-item ${isActive ? "active" : ""}`}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '4px' }}>
                {item.icon}
              </div>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* ================= ✅ নতুন যোগ করা সাইড ড্রয়ার (Drawer) ================= */}
      
      {/* ড্রয়ার ওভারলে (বাইরে ক্লিক করলে বন্ধ হবে) */}
      {isDrawerOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999 }} 
          onClick={() => setIsDrawerOpen(false)} 
        />
      )}

      {/* সাইড ড্রয়ার মেনু */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        backgroundColor: '#1a0f2e', zIndex: 1000,
        transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        borderRight: '1px solid #3a1f6b', display: 'flex', flexDirection: 'column'
      }}>
        {/* ড্রয়ার হেডার */}
        <div style={{ padding: '20px', borderBottom: '1px solid #3a1f6b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#ffd700', margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Menu</h2>
          <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '24px' }}>
            &times;
          </button>
        </div>

        {/* ড্রয়ার লিংকসমূহ */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Link href="/profile" onClick={() => setIsDrawerOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500' }}>
            <i className="fa-solid fa-user" style={{ color: '#d4af37', fontSize: '18px' }}></i> Profile
          </Link>
          
          <Link href="/contact" onClick={() => setIsDrawerOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500' }}>
            <i className="fa-solid fa-envelope" style={{ color: '#d4af37', fontSize: '18px' }}></i> Contact Us
          </Link>
          
          <Link href="/support" onClick={() => setIsDrawerOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500' }}>
            <i className="fa-solid fa-headset" style={{ color: '#d4af37', fontSize: '18px' }}></i> Live Support
          </Link>
        </div>
      </div>
      {/* ========================================================================= */}

    </div>
  );
}
