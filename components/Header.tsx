"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type HeaderProps = {
  onMenuClick: () => void;
  onHomeClick: () => void;
};

type Profile = {
  id: string;
  balance: number | string;
};

export default function Header({
  onMenuClick,
  onHomeClick,
}: HeaderProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadBalance = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, balance")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Balance loading failed:", error.message);
        return;
      }

      const profile = data as Profile | null;
      const amount = Number(profile?.balance ?? 0);

      setBalance(
        Number.isFinite(amount) && amount >= 0 ? amount : 0
      );
    },
    [supabase]
  );

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        console.error("Session restore failed:", error.message);
        setUserId(null);
        setBalance(0);
        setLoading(false);
        return;
      }

      const id = data.session?.user.id ?? null;
      setUserId(id);

      if (id) {
        await loadBalance(id);
      } else {
        setBalance(0);
      }

      if (active) setLoading(false);
    }

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const id = session?.user.id ?? null;
      setUserId(id);

      if (!id) {
        setBalance(0);
        setLoading(false);
        setIsDrawerOpen(false);
      } else {
        setLoading(true);
        window.setTimeout(() => {
          if (active) {
            void loadBalance(id).finally(() => {
              if (active) setLoading(false);
            });
          }
        }, 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadBalance]);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    const refresh = async () => {
      if (!active) return;
      await loadBalance(userId);
    };

    const channel = supabase
      .channel(`header-profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, supabase, loadBalance]);

  function openWallet() {
    if (!userId) {
      router.push("/login/");
      return;
    }
    router.push("/wallets/");
  }

  const handleNavigate = (path: string) => {
    setIsDrawerOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsDrawerOpen(false);
    router.push("/login/");
  };

  // CSS ভ্যারিয়েবলগুলো ড্রয়ারের জন্য আপডেট করা হয়েছে
  const drawerStyles = {
    overlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      zIndex: 9998,
      opacity: isDrawerOpen ? 1 : 0,
      visibility: isDrawerOpen ? "visible" as const : "hidden" as const,
      transition: "all 0.3s ease",
    },
    drawer: {
      position: "fixed" as const,
      top: 0,
      right: 0,
      bottom: 0,
      width: "280px",
      backgroundColor: "var(--bg-card, #1B2A23)",
      zIndex: 9999,
      transform: isDrawerOpen ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.3s ease",
      display: "flex",
      flexDirection: "column" as const,
      borderLeft: "1px solid var(--border-color, #263C32)",
      boxShadow: "-5px 0 15px rgba(0,0,0,0.5)",
    },
    header: {
      padding: "20px",
      borderBottom: "1px solid var(--border-color, #263C32)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    menuContainer: {
      padding: "10px 0",
      flex: 1,
      overflowY: "auto" as const,
    },
    menuItem: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "14px 20px",
      color: "var(--text-secondary, #A0ADB0)",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.2s",
      borderLeft: "3px solid transparent",
    },
    logoutBtn: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "16px 20px",
      color: "#ff4d4d",
      backgroundColor: "transparent",
      border: "none",
      borderTop: "1px solid var(--border-color, #263C32)",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
      width: "100%",
      textAlign: "left" as const,
    }
  };

  return (
    <>
      {/* ✅ হেডারের ব্যাকগ্রাউন্ড কালার #18221E করা হয়েছে */}
      <header 
        className="stake-header" 
        style={{ 
          backgroundColor: "#18221E", 
          borderBottom: "1px solid var(--border-color, #263C32)" 
        }}
      >
        <div className="stake-header-left">
          <button
            className="stake-menu-btn"
            type="button"
            aria-label="Open menu"
            onClick={onMenuClick}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M3 6H21M3 12H21M3 18H21"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            className="stake-logo"
            type="button"
            onClick={onHomeClick}
            aria-label="Gazicasino home"
          >
            <span className="gazi-logo-text">
              Gazi<span className="gazi-logo-accent">casino</span>
            </span>
          </button>
        </div>

        <div className="stake-header-right">
          {loading ? (
            <span
              className="stake-wallet-pill"
              aria-label="Checking login status"
            >
              ...
            </span>
          ) : userId ? (
            <>
              <div
                className="stake-wallet-pill"
                aria-label={`Balance: ${balance.toFixed(2)}`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20V19H5.5A2.5 2.5 0 0 1 3 16.5V7.5Z"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 8H20M16 13H17"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{balance.toFixed(2)}</span>
              </div>

              <button
                className="stake-btn-wallet"
                type="button"
                onClick={openWallet}
              >
                Wallet
              </button>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Open profile"
                title="Profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                whiteSpace: "nowrap",
              }}
            >
              <Link
                href="/signup/"
                style={{
                  color: "#FFFFFF",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Signup
              </Link>

              <Link
                href="/login/"
                style={{
                  color: "#FFFFFF",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ================= ✅ Right Side Drawer ================= */}
      <div style={drawerStyles.overlay} onClick={() => setIsDrawerOpen(false)} />
      
      <div style={drawerStyles.drawer}>
        {/* Drawer Header */}
        <div style={drawerStyles.header}>
          <span style={{ color: "var(--text-primary, #FFFFFF)", fontSize: "16px", fontWeight: "bold" }}>
            My Account
          </span>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            style={{ background: "transparent", border: "none", color: "var(--text-secondary, #A0ADB0)", cursor: "pointer", padding: 0 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Drawer Menu Items */}
        <div style={drawerStyles.menuContainer}>
          <div 
            style={drawerStyles.menuItem} 
            onClick={() => handleNavigate("/my-account/")}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "var(--bg-input, #121816)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary, #A0ADB0)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Profile
          </div>
          
          <div 
            style={drawerStyles.menuItem} 
            onClick={() => handleNavigate("/my-level/")}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "var(--bg-input, #121816)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary, #A0ADB0)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            VIP
          </div>

          <div 
            style={drawerStyles.menuItem} 
            onClick={() => handleNavigate("/transactions/")}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "var(--bg-input, #121816)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary, #A0ADB0)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Transactions
          </div>

          <div 
            style={drawerStyles.menuItem} 
            onClick={() => handleNavigate("/redeem/")}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "var(--bg-input, #121816)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary, #A0ADB0)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
            Redeem Code
          </div>

          <div 
            style={drawerStyles.menuItem} 
            onClick={() => handleNavigate("/refer/")}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "var(--bg-input, #121816)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary, #A0ADB0)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Affiliate Program
          </div>

          <div 
            style={drawerStyles.menuItem} 
            onClick={() => handleNavigate("/user-settings/")}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "var(--bg-input, #121816)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary, #A0ADB0)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings
          </div>

          <div 
            style={drawerStyles.menuItem} 
            onClick={() => handleNavigate("/live-support/")}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "var(--bg-input, #121816)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary, #A0ADB0)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Live Support
          </div>
        </div>

        {/* Logout Button */}
        <button 
          style={drawerStyles.logoutBtn}
          onClick={handleLogout}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255, 77, 77, 0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </button>
      </div>
    </>
  );
}
