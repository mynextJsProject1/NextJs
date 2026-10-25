"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

type HeaderProps = {
onMenuClick: () => void;
onHomeClick: () => void;
};

export default function Header({
onMenuClick,
onHomeClick,
}: HeaderProps) {
const router = useRouter();

const [user, setUser] = useState<any>(null);
const [balance, setBalance] = useState<number>(0);
const [balanceLoading, setBalanceLoading] = useState(true);

// Load the signed-in user's real balance from Supabase.
useEffect(() => {
let active = true;

const loadBalance = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  if (!active) return;

  if (error) {
    console.error("Failed to load profile balance:", error.message);
    setBalanceLoading(false);
    return;
  }

  if (data) {
    const amount = Number(data.balance);
    setBalance(Number.isFinite(amount) ? amount : 0);
  } else {
    setBalance(0);
  }

  setBalanceLoading(false);
};

// Restore the existing session after a page refresh.
const restoreSession = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (!active) return;

  if (error) {
    console.error("Failed to restore session:", error.message);
    setUser(null);
    setBalance(0);
    setBalanceLoading(false);
    return;
  }

  const currentUser = data.session?.user ?? null;

  setUser(currentUser);

  if (currentUser) {
    await loadBalance(currentUser.id);
  } else {
    setBalance(0);
    setBalanceLoading(false);
  }
};

void restoreSession();

// Keep the header synchronized with login and logout.
const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((_event, session) => {
  if (!active) return;

  const currentUser = session?.user ?? null;

  setUser(currentUser);

  if (!currentUser) {
    setBalance(0);
    setBalanceLoading(false);
  } else {
    setBalanceLoading(true);
  }
});

return () => {
  active = false;
  subscription.unsubscribe();
};

}, []);

// Refresh the balance when the user's profile changes in Supabase.
useEffect(() => {
if (!user?.id) return;

let active = true;

const refreshBalance = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .maybeSingle();

  if (!active) return;

  if (error) {
    console.error("Failed to refresh balance:", error.message);
    return;
  }

  if (data) {
    const amount = Number(data.balance);
    setBalance(Number.isFinite(amount) ? amount : 0);
  } else {
    setBalance(0);
  }

  setBalanceLoading(false);
};

void refreshBalance();

const channel = supabase
  .channel(`header-balance-${user.id}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "profiles",
      filter: `id=eq.${user.id}`,
    },
    () => {
      void refreshBalance();
    }
  )
  .subscribe();

return () => {
  active = false;
  void supabase.removeChannel(channel);
};

}, [user?.id]);

const handleProfileClick = () => {
router.push("/profile");
};

return (
<header className="stake-header">
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
    {user ? (
      <>
        <div
          className="stake-wallet-pill"
          aria-label={
            balanceLoading
              ? "Loading balance"
              : `Balance: ${balance.toFixed(2)}`
          }
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

          <span>
            {balanceLoading ? "..." : balance.toFixed(2)}
          </span>
        </div>

        <button
          className="stake-btn-wallet"
          type="button"
        >
          Wallet
        </button>

        <button
          type="button"
          onClick={handleProfileClick}
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
          gap: "8px",
          whiteSpace: "nowrap",
        }}
      >
        <Link
          href="/login"
          style={{
            color: "#FFFFFF",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Login
        </Link>

        <Link
          href="/signup"
          style={{
            color: "#FFFFFF",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Signup
        </Link>
      </div>
    )}
  </div>
</header>

);
}
