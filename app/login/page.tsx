/* app/login/page.tsx */
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
        `${url}/functions/v1/super-action`,
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
    <div 
      className="stake-app" 
      style={{ backgroundColor: "#18221E", minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header
        onMenuClick={() => router.push("/")}
        onHomeClick={() => router.push("/")}
      />

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
            padding: "24px 20px" 
          }}
        >
          
          <h1 
            className="auth-title" 
            style={{ marginTop: '0', marginBottom: '20px', fontSize: '1.25rem', textAlign: 'center', color: '#FFFFFF' }}
          >
            Login to your account
          </h1>

          <form onSubmit={handleLogin} className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            <div>
              <label htmlFor="login-identifier" style={{ color: "#A0ADB0", fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>
                Mobile Number / Game ID
              </label>

              <div 
                className="auth-input-wrap" 
                style={{ backgroundColor: "#121816", border: "1px solid #263C32", borderRadius: "8px", height: "42px", display: "flex", alignItems: "center", padding: "0 12px" }}
              >
                <i className="fa-solid fa-user" style={{ color: "#A0ADB0", marginRight: "8px", fontSize: "0.9rem" }} />
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter mobile number or Game ID"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  style={{ background: "transparent", border: "none", outline: "none", color: "#FFFFFF", width: "100%", fontSize: "0.95rem" }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" style={{ color: "#A0ADB0", fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>
                Password
              </label>

              <div 
                className="auth-input-wrap" 
                style={{ backgroundColor: "#121816", border: "1px solid #263C32", borderRadius: "8px", height: "42px", display: "flex", alignItems: "center", padding: "0 12px" }}
              >
                <i className="fa-solid fa-lock" style={{ color: "#A0ADB0", marginRight: "8px", fontSize: "0.9rem" }} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ background: "transparent", border: "none", outline: "none", color: "#FFFFFF", width: "100%", fontSize: "0.95rem" }}
                />
                <button
                  type="button"
                  className="auth-eye"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#A0ADB0" }}
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
            </div>

            {error && (
              <div 
                className="auth-error" 
                role="alert" 
                style={{ background: "rgba(255, 77, 77, 0.1)", color: "#ff4d4d", border: "1px solid rgba(255, 77, 77, 0.3)", padding: "8px", borderRadius: "6px", fontSize: "0.85rem", textAlign: "center" }}
              >
                {error}
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
                height: "44px", 
                fontWeight: "bold", 
                fontSize: "1rem",
                marginTop: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {loading ? "Logging in..." : "LOGIN"}
              {!loading && (
                <i className="fa-solid fa-arrow-right" />
              )}
            </button>
          </form>

          <p className="auth-switch" style={{ textAlign: "center", marginTop: "16px", color: "#A0ADB0", fontSize: "0.85rem" }}>
            Don't have an account?{" "}
            <Link href="/signup" style={{ color: "#00E701", fontWeight: "bold", textDecoration: "none" }}>
              Create Account
            </Link>
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
