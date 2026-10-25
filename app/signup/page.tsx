
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [gameId, setGameId] = useState("");

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setGameId("");

    const cleanMobile = mobile.replace(/\D/g, "");

    if (!/^01[3-9]\d{8}$/.test(cleanMobile)) {
      setMessage("সঠিক বাংলাদেশের মোবাইল নম্বর দিন।");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setMessage("পাসওয়ার্ড ৮ থেকে ১২৮ অক্ষরের মধ্যে দিন।");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("দুটি পাসওয়ার্ড এক নয়।");
      return;
    }

    setLoading(true);

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error("Supabase configuration পাওয়া যায়নি।");
      }

      const response = await fetch(
        `${url}/functions/v1/auth-manager`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            action: "signup",
            full_name: fullName.trim(),
            mobile: cleanMobile,
            password,
            confirm_password: confirmPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "অ্যাকাউন্ট তৈরি করা যায়নি।"
        );
      }

      if (result.session?.access_token &&
          result.session?.refresh_token) {
        const { createClient } = await import(
          "../../lib/supabase/client"
        );

        const supabase = createClient();

        const { error } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });

        if (error) throw error;

        router.replace("/");
        router.refresh();
        return;
      }

      setGameId(result.game_id || "");
      setMessage(
        "অ্যাকাউন্ট তৈরি হয়েছে। এখন Login করুন।"
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stake-app">
      <header className="stake-header">
        <Link href="/" className="stake-logo">
          <span className="gazi-logo-text">
            Gazi<span className="gazi-logo-accent">casino</span>
          </span>
        </Link>
        <Link href="/login" className="stake-btn-wallet">
          Login
        </Link>
      </header>

      <main className="stake-main auth-main">
        <section className="auth-card">
          <div className="auth-brand-icon">
            <i className="fa-solid fa-user-plus" />
          </div>

          <p className="auth-eyebrow">JOIN GAZICASINO</p>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-description">
            আপনার অ্যাকাউন্ট তৈরি করতে তথ্য দিন।
          </p>

          <form onSubmit={handleSignup} className="auth-form">
            <label htmlFor="fullName">Full Name</label>
            <div className="auth-input-wrap">
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="আপনার নাম"
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <label htmlFor="mobile">Mobile Number</label>
            <div className="auth-input-wrap">
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, ""))
                }
                placeholder="01XXXXXXXXX"
                maxLength={11}
                required
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৮ অক্ষর"
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="auth-input-wrap">
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="পাসওয়ার্ড আবার লিখুন"
                maxLength={128}
                required
              />
            </div>

            {message && (
              <div className="auth-error" role="alert">
                {message}
                {gameId && (
                  <p className="auth-game-id">
                    Game ID: <strong>{gameId}</strong>
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "CREATE ACCOUNT"}
            </button>
          </form>

          <p className="auth-switch">
            আগে থেকেই অ্যাকাউন্ট আছে?{" "}
            <Link href="/login">Login করুন</Link>
          </p>
        </section>
      </main>

      <footer className="stake-footer">
        © 2026 Gazicasino. All rights reserved.
      </footer>
    </div>
  );
}
