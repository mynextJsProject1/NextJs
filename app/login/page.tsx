
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
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
            action: "login",
            identifier: identifier.trim(),
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.session) {
        throw new Error(
          result.error || "Login failed. Please try again."
        );
      }

      const supabase = createClient();

      const { error: sessionError } =
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });

      if (sessionError) {
        throw sessionError;
      }

      router.replace("/");
      router.refresh();
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
            <i className="fa-solid fa-user-shield" />
          </div>

          <p className="auth-eyebrow">WELCOME BACK</p>
          <h1 className="auth-title">Login to your account</h1>
          <p className="auth-description">
            Enter your mobile number or Game ID to continue.
          </p>

          <form onSubmit={handleLogin} className="auth-form">
            <label htmlFor="login-identifier">
              Mobile Number / Game ID
            </label>

            <div className="auth-input-wrap">
              <i className="fa-solid fa-user" />
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                placeholder="Enter mobile number or Game ID"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <label htmlFor="login-password">Password</label>

            <div className="auth-input-wrap">
              <i className="fa-solid fa-lock" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "LOGIN"}
              {!loading && (
                <i className="fa-solid fa-arrow-right" />
              )}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link href="/signup">Create Account</Link>
          </p>
        </section>
      </main>

      <Footer
        activePage="login"
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
