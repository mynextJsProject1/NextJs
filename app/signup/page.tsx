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
    <div 
      className="stake-app" 
      style={{ backgroundColor: "#18221E", minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* ✅ হেডার ব্যাকগ্রাউন্ড ও বর্ডার আপডেট করা হয়েছে */}
      <header 
        className="stake-header" 
        style={{ backgroundColor: "#18221E", borderBottom: "1px solid #263C32", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <Link href="/" className="stake-logo" style={{ textDecoration: "none" }}>
          <span className="gazi-logo-text" style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#FFFFFF" }}>
            Gazi<span className="gazi-logo-accent" style={{ color: "#00E701" }}>casino</span>
          </span>
        </Link>

        <Link 
          href="/login" 
          className="stake-btn-wallet"
          style={{ backgroundColor: "#121816", color: "#FFFFFF", padding: "6px 16px", borderRadius: "6px", border: "1px solid #263C32", textDecoration: "none", fontSize: "0.85rem", fontWeight: "bold" }}
        >
          Login
        </Link>
      </header>

      <main 
        className="stake-main auth-main" 
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      >
        {/* ✅ কার্ডের সাইজ ৩০% ছোট করার জন্য প্যাডিং ও মার্জিন কমানো হয়েছে */}
        <section 
          className="auth-card" 
          style={{ 
            backgroundColor: "#1B2A23", 
            border: "1px solid #263C32", 
            borderRadius: "12px",
            width: "100%",
            maxWidth: "400px",
            padding: "20px 16px" 
          }}
        >
          <h1 
            className="auth-title" 
            style={{ marginTop: '0', marginBottom: '16px', fontSize: '1.25rem', textAlign: 'center', color: '#FFFFFF' }}
          >
            Create Account
          </h1>

          <form onSubmit={handleSignup} className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            
            <div>
              <label htmlFor="fullName" style={{ color: "#A0ADB0", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Full Name</label>
              <div className="auth-input-wrap" style={{ backgroundColor: "#121816", border: "1px solid #263C32", borderRadius: "8px", height: "40px", display: "flex", alignItems: "center", padding: "0 12px" }}>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  minLength={2}
                  maxLength={100}
                  required
                  style={{ background: "transparent", border: "none", outline: "none", color: "#FFFFFF", width: "100%", fontSize: "0.9rem" }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="mobile" style={{ color: "#A0ADB0", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Mobile Number</label>
              <div className="auth-input-wrap" style={{ backgroundColor: "#121816", border: "1px solid #263C32", borderRadius: "8px", height: "40px", display: "flex", alignItems: "center", padding: "0 12px" }}>
                <input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="01XXXXXXXXX"
                  maxLength={11}
                  required
                  style={{ background: "transparent", border: "none", outline: "none", color: "#FFFFFF", width: "100%", fontSize: "0.9rem" }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" style={{ color: "#A0ADB0", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Password</label>
              <div className="auth-input-wrap" style={{ backgroundColor: "#121816", border: "1px solid #263C32", borderRadius: "8px", height: "40px", display: "flex", alignItems: "center", padding: "0 12px" }}>
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
                  style={{ background: "transparent", border: "none", outline: "none", color: "#FFFFFF", width: "100%", fontSize: "0.9rem" }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" style={{ color: "#A0ADB0", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Confirm Password</label>
              <div className="auth-input-wrap" style={{ backgroundColor: "#121816", border: "1px solid #263C32", borderRadius: "8px", height: "40px", display: "flex", alignItems: "center", padding: "0 12px" }}>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  minLength={8}
                  maxLength={128}
                  required
                  style={{ background: "transparent", border: "none", outline: "none", color: "#FFFFFF", width: "100%", fontSize: "0.9rem" }}
                />
              </div>
            </div>

            {message && (
              <div 
                className="auth-error" 
                role="alert" 
                style={{ background: "rgba(255, 77, 77, 0.1)", color: "#ff4d4d", border: "1px solid rgba(255, 77, 77, 0.3)", padding: "8px", borderRadius: "6px", fontSize: "0.85rem", textAlign: "center" }}
              >
                {message}

                {gameId && (
                  <p className="auth-game-id" style={{ marginTop: "4px", marginBottom: 0, fontWeight: "bold", color: "#FFFFFF" }}>
                    Game ID: {gameId}
                  </p>
                )}
              </div>
            )}

            {/* ✅ বাটনের উচ্চতা ও মার্জিন কমানো হয়েছে */}
            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
              style={{ 
                backgroundColor: "#00E701", 
                color: "#000", 
                border: "none", 
                borderRadius: "8px", 
                height: "42px", 
                fontWeight: "bold", 
                fontSize: "1rem",
                marginTop: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {loading ? "Creating account..." : "CREATE ACCOUNT"}
            </button>
          </form>

          <p className="auth-switch" style={{ textAlign: "center", marginTop: "12px", marginBottom: 0, color: "#A0ADB0", fontSize: "0.85rem" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#00E701", fontWeight: "bold", textDecoration: "none" }}>
              Login
            </Link>
          </p>
        </section>
      </main>

      <footer 
        className="stake-footer" 
        style={{ backgroundColor: "#18221E", color: "#A0ADB0", textAlign: "center", padding: "16px", fontSize: "0.75rem", borderTop: "1px solid #263C32" }}
      >
        © 2026 Gazicasino. All rights reserved.
      </footer>
    </div>
  );
}
