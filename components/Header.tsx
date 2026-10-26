
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

  function openProfile() {
    router.push("/profile/");
  }

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
              onClick={openProfile}
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
  );
}
