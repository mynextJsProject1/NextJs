/* app/signup/page.tsx */
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
      setMessage("Please enter a valid Bangladeshi mobile number.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setMessage("Password must be between 8 and 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error(
          "Supabase configuration not found. Please check GitHub Environment Variables."
        );
      }

      const supabaseUrl = url.replace(/\/+$/, "");

      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get("ref") || "";

      const response = await fetch(
        `${supabaseUrl}/functions/v1/super-action`,
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
            ref: refCode, 
          }),
        }
      );

      const responseText = await response.text();

      let result: {
        error?: string;
        message?: string;
        game_id?: string;
        session?: {
          access_token?: string;
          refresh_token?: string;
        };
      };

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Invalid JSON Response from Supabase (HTTP ${response.status}). Check Function Logs.`
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Signup failed (HTTP ${response.status}).`
        );
      }

      if (
        result.session?.access_token &&
        result.session?.refresh_token
      ) {
        const { createClient } = await import(
          "../../lib/supabase/client"
        );

        const supabase = createClient();

        const { error } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });

        if (error) {
          throw new Error(
            "Account created, but failed to set session. Please login."
          );
        }

        router.replace("/");
        router.refresh();
        return;
      }

      setGameId(result.game_id || "");
      setMessage(
        result.message ||
          "Account created successfully. Please login now."
      );
    } catch (error) {
      if (error instanceof TypeError) {
        setMessage(
          "Could not connect to Supabase. Check Function URL, CORS, and Network."
        );
      } else {
        setMessage(
          error instanceof Error
            ? error.message
            : "An error occurred. Please try again."
        );
      }
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
          {/* ✅ লাল দাগ দেওয়া আইকন এবং টেক্সট সরিয়ে ফেলা হয়েছে */}

          <h1 className="auth-title" style={{ marginTop: '0', marginBottom: '24px' }}>Create Account</h1>

          <form onSubmit={handleSignup} className="auth-form">
            <label htmlFor="fullName">Full Name</label>

            <div className="auth-input-wrap">
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Name"
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
                placeholder="Minimum 8 characters"
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
                placeholder="Re-enter password"
                minLength={8}
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
            Already have an account?{" "}
            <Link href="/login">Login</Link>
          </p>
        </section>
      </main>

      <footer className="stake-footer">
        © 2026 Gazicasino. All rights reserved.
      </footer>
    </div>
  );
}
