
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { createClient } from "../../lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gameId, setGameId] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setGameId("");

    const cleanMobile = mobile.replace(/\D/g, "");

    if (!/^01[3-9]\d{8}$/.test(cleanMobile)) {
      setError("Enter a valid Bangladesh mobile number.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError("Password must be between 8 and 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !anonKey) {
        throw new Error("Supabase configuration is missing.");
      }

      const response = await fetch(
        `${url}/functions/v1/auth-manager`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
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
          result.error || "Account creation failed."
        );
      }

      if (result.game_id) {
        setGameId(result.game_id);
      }

      if (result.session?.access_token &&
          result.session?.refresh_token) {
        const supabase = createClient();

        const { error: sessionError } =
          await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token,
          });

        if (sessionError) {
          throw new Error(
            "Account created, but session setup failed. Please log in."
          );
        }

        router.replace("/");
        router.refresh();
        return;
      }

      setError(
        "Account created, but automatic login failed. Please log in."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stake-app">
      <Header
        onMenuClick={() => router.push("/")}
        onHomeClick={() => router.push("/")}
      />

      <main className="stake-main auth-main">
        <section className="auth-card">
          <div className="auth-brand-icon">
            <i className="fa-solid fa-user-plus" />
          </div>

          <p className="auth-eyebrow">JOIN GAZICASINO</p>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-description">
            Fill in your details to get started.
          </p>

          <form onSubmit={handleSignup} className="auth-form">
            <label htmlFor="signup-name">Full Name</label>
            <div className="auth-input-wrap">
              <i className="fa-solid fa-user" />
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <label htmlFor="signup-mobile">Mobile Number</label>
            <div className="auth-input-wrap">
              <i className="fa-solid fa-phone" />
              <input
                id="signup-mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, ""))
                }
                maxLength={11}
                required
              />
            </div>

            <label htmlFor="signup-password">Password</label>
            <div className="auth-input-wrap">
              <i className="fa-solid fa-lock" />
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={128}
                required
              />
              <button
                type="button"
                className="auth-eye"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i
                  className={
                    showPassword
                      ? "fa-solid fa-eye-slash"
                      : "fa-solid fa-eye"
                  }
                />
              </button>
            </div>

            <label htmlFor="signup-confirm">
              Confirm Password
            </label>
            <div className="auth-input-wrap">
              <i className="fa-solid fa-lock" />
              <input
                id="signup-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter password again"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                maxLength={128}
                required
              />
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
                {gameId && (
                  <p className="auth-game-id">
                    Your Game ID: <strong>{gameId}</strong>
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
              {!loading && (
                <i className="fa-solid fa-arrow-right" />
              )}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link href="/login">Login</Link>
          </p>
        </section>
      </main>

      <Footer
        activePage="signup"
        onNavigate={(page) => {
          if (page === "home") router.push("/");
          else if (page === "chat") router.push("/");
          else if (page === "casino") router.push("/");
          else if (page === "sports") router.push("/");
        }}
      />
    </div>
  );
}

