/* app/lottery/layout.tsx */
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import "./layout.css";

// নোটিফিকেশন মডালের জন্য ডাটা টাইপ
type Notification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export default function LotteryLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  
  const [balance, setBalance] = useState(0);
  const [winnings, setWinnings] = useState(0);

  // ✅ নতুন স্টেট: Drawer এবং Notification Modal
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

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

  // ✅ নোটিফিকেশন মডাল ওপেন হলে ডাটা লোড করা
  useEffect(() => {
    if (isNotifModalOpen) {
      const fetchNotifs = async () => {
        setNotifLoading(true);
        const { data } = await supabase
          .from("lottery_notifications")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (data) setNotifications(data);
        setNotifLoading(false);
      };
      void fetchNotifs();
    }
  }, [isNotifModalOpen, supabase]);

  // হেল্পার ফাংশন (তারিখ ফরম্যাট)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const navItems = [
    { name: "Home", path: "/lottery", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
    { name: "Deposit", path: "/lottery/deposit", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> },
    { name: "Withdraw", path: "/lottery/withdraw", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg> },
    { name: "My Tickets", path: "/lottery/my-tickets", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> },
    { name: "Winners", path: "/lottery/winner", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg> },
  ];

  return (
    <div className="lottery-app-layout">
      <header className="lottery-header">
        {/* ✅ টপ বারের বাম দিক: হ্যামবার্গার মেনু এবং লোগো */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div onClick={() => setIsDrawerOpen(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          <Link href="/lottery" className="lottery-logo">
            LottoBD
          </Link>
        </div>

        {/* টপ বারের ডান দিক: ব্যালেন্স, উইনিং এবং নোটিফিকেশন */}
        <div className="lottery-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* ✅ বর্ডার আরও চিকন করা হয়েছে (borderWidth: '0.5px') */}
          <div className="lottery-wallet-pill" onClick={() => router.push('/lottery/deposit')} style={{ borderWidth: '0.5px' }}>
            <i className="fa-solid fa-coins"></i>
            <span>{balance.toFixed(2)}</span>
          </div>
          <div className="lottery-trophy-pill" style={{ borderWidth: '0.5px' }}>
            <i className="fa-solid fa-gift" style={{ color: "#ffd700" }}></i>
            <span>{winnings.toFixed(2)}</span>
          </div>
          
          {/* ✅ নোটিফিকেশন বেল আইকন */}
          <div onClick={() => setIsNotifModalOpen(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
        </div>
      </header>

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

      {/* ================= ✅ ১. বাম দিকের Drawer (Side Menu) ================= */}
      {isDrawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)} />
          <div className="drawer-menu">
            <div className="drawer-header">
              <h2 style={{ color: '#d4af37', margin: 0, fontSize: '20px' }}>Menu</h2>
              <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <Link href="/lottery/profile" className="drawer-item" onClick={() => setIsDrawerOpen(false)}>
              <i className="fa-solid fa-user"></i> Profile
            </Link>
            
            {/* ✅ Contact Us এর জায়গায় Submit Ticket */}
            <Link href="/lottery/submit-ticket" className="drawer-item" onClick={() => setIsDrawerOpen(false)}>
              <i className="fa-solid fa-ticket"></i> Submit Ticket
            </Link>
            
            {/* ✅ নতুন যোগ করা Transaction */}
            <Link href="/lottery/transaction" className="drawer-item" onClick={() => setIsDrawerOpen(false)}>
              <i className="fa-solid fa-receipt"></i> Transaction
            </Link>
            
            {/* ✅ নতুন যোগ করা Verifications */}
            <Link href="/lottery/verifications-details" className="drawer-item" onClick={() => setIsDrawerOpen(false)}>
              <i className="fa-solid fa-id-card"></i> Verifications
            </Link>
            
            {/* ✅ নতুন যোগ করা Lottery Verifie */}
            <Link href="/lottery/lottery-verifie" className="drawer-item" onClick={() => setIsDrawerOpen(false)}>
              <i className="fa-solid fa-check-double"></i> Lottery Verifie
            </Link>

            {/* ✅ Live Support সম্পূর্ণ সরিয়ে ফেলা হয়েছে */}
          </div>
        </>
      )}
      {/* =================================================================== */}

      {/* ================= ✅ ২. নোটিফিকেশন মডাল (Popup) ================= */}
      {isNotifModalOpen && (
        <div className="notif-modal-overlay" onClick={() => setIsNotifModalOpen(false)}>
          <div className="notif-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Notifications</h3>
              <button onClick={() => setIsNotifModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div className="notif-modal-body">
              {notifLoading ? (
                <p style={{ textAlign: 'center', color: '#aaa', marginTop: '20px' }}>Loading...</p>
              ) : notifications.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#aaa', marginTop: '20px' }}>No notifications found.</p>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="notif-item">
                    <div className="notif-item-top">
                      <h4 className="notif-item-title">{notif.title}</h4>
                      <span className="notif-item-time">{formatDate(notif.created_at)}</span>
                    </div>
                    <p className="notif-item-msg">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* =================================================================== */}
    </div>
  );
}
