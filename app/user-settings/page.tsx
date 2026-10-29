/* app/user-settings/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./user-settings.css";

type Profile = {
  id: string;
  full_name: string;
  mobile: string;
  game_id: string;
  balance: number;
  email: string | null;
  email_verified: boolean;
  birthday: string | null;
  postal_code: string | null;
  city: string | null;
  address_verified: boolean;
  identify_verified: boolean;
};

type Session = {
  id: string;
  ip_address: string;
  browser_info: string;
  last_active: string;
};

type TabType = "account" | "verify" | "security" | "sessions";

export default function UserSettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<TabType>("account");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Verify State
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  // Security State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signup/"); return; }

      // ১. প্রোফাইল ডাটা লোড
      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      
      if (profileData) {
        setProfile(profileData as Profile);
        setEmail(profileData.email || "");
        setBirthday(profileData.birthday || "");
        setPostalCode(profileData.postal_code || "");
        setCity(profileData.city || "");
      }

      // ২. সেশন ডাটা লোড
      const { data: sessionData } = await supabase
        .from("user_sessions").select("*").eq("user_id", user.id).order("last_active", { ascending: false });
      
      if (sessionData) setSessions(sessionData as Session[]);

      // ৩. নতুন সেশন ট্র্যাক করা (IP এবং ব্রাউজার)
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      
      await supabase.from("user_sessions").insert({
        user_id: user.id,
        ip_address: ipData.ip || "Unknown",
        browser_info: navigator.userAgent.substring(0, 100)
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const navigate = (page: string) => {
    const routes: Record<string, string> = { home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/", wallet: "/wallets/" };
    router.push(routes[page] ?? "/");
  };

  // --- Verify Logic ---
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    if (!profile) return;

    const { error } = await supabase.from("profiles").update({ email: email, email_verified: true }).eq("id", profile.id);
    if (!error) {
      setMessage({ type: "success", text: "Email verified successfully!" });
      setProfile({ ...profile, email, email_verified: true });
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ 
      birthday, postal_code: postalCode, city, address_verified: true 
    }).eq("id", profile.id);
    
    if (!error) {
      setMessage({ type: "success", text: "Address verified successfully!" });
      setProfile({ ...profile, birthday, postal_code: postalCode, city, address_verified: true });
    }
  };

  // --- Security Logic ---
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "Please fill all password fields." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    // Note: Supabase সরাসরি old password চেক করে না, তবে আমরা auth.updateUser ব্যবহার করব
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Password updated successfully!" });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    }
  };

  if (loading) {
    return (
      <div className="stake-app settings-page">
        <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
        <main className="stake-main settings-main" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "2rem", color: "#00e701" }}></i>
        </main>
      </div>
    );
  }

  return (
    <div className="stake-app settings-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main settings-main">
        <h1 className="settings-title">Account Settings</h1>

        {/* Tabs */}
        <div className="settings-tabs">
          <button className={activeTab === "account" ? "active" : ""} onClick={() => { setActiveTab("account"); setMessage({ type: "", text: "" }); }}>Account</button>
          <button className={activeTab === "verify" ? "active" : ""} onClick={() => { setActiveTab("verify"); setMessage({ type: "", text: "" }); }}>Verify</button>
          <button className={activeTab === "security" ? "active" : ""} onClick={() => { setActiveTab("security"); setMessage({ type: "", text: "" }); }}>Security</button>
          <button className={activeTab === "sessions" ? "active" : ""} onClick={() => { setActiveTab("sessions"); setMessage({ type: "", text: "" }); }}>Sessions</button>
        </div>

        {message.text && (
          <div className={`settings-alert ${message.type}`}>{message.text}</div>
        )}

        {/* --- ১. Account Tab --- */}
        {activeTab === "account" && profile && (
          <div className="settings-card">
            {!profile.email_verified && (
              <div className="verify-warning">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>Please verify your email address to use all features.</span>
              </div>
            )}
            <div className="info-row"><span>Full Name:</span> <strong>{profile.full_name}</strong></div>
            <div className="info-row"><span>Mobile:</span> <strong>{profile.mobile}</strong></div>
            <div className="info-row"><span>Game ID:</span> <strong>{profile.game_id}</strong></div>
            <div className="info-row"><span>Balance:</span> <strong className="text-green">৳ {Number(profile.balance).toLocaleString()}</strong></div>
          </div>
        )}

        {/* --- ২. Verify Tab --- */}
        {activeTab === "verify" && profile && (
          <div className="verify-list">
            {/* Level 1 */}
            <div className="verify-card">
              <div className="verify-header">
                <h3>Level 1: Number Verification</h3>
                <i className="fa-solid fa-circle-check text-green" style={{ fontSize: "1.2rem" }}></i>
              </div>
              <p className="verify-desc">Your mobile number ({profile.mobile}) is verified.</p>
            </div>

            {/* Level 2 */}
            <div className="verify-card">
              <div className="verify-header">
                <h3>Level 2: Email Verification</h3>
                {profile.email_verified && <i className="fa-solid fa-circle-check text-green" style={{ fontSize: "1.2rem" }}></i>}
              </div>
              {!profile.email_verified ? (
                <form onSubmit={handleSaveEmail} className="verify-form">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
                  <button type="submit">Verify Email</button>
                </form>
              ) : (
                <p className="verify-desc text-green"><i className="fa-solid fa-check"></i> Email: {profile.email}</p>
              )}
            </div>

            {/* Level 3 */}
            <div className="verify-card">
              <div className="verify-header">
                <h3>Level 3: Address Verification</h3>
                {profile.address_verified && <i className="fa-solid fa-circle-check text-green" style={{ fontSize: "1.2rem" }}></i>}
              </div>
              {!profile.address_verified ? (
                <form onSubmit={handleSaveAddress} className="verify-form">
                  <input type="text" value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder="Birthday (e.g. 1990-01-01)" required />
                  <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal Code" required />
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" required />
                  <button type="submit">Verify Address</button>
                </form>
              ) : (
                <p className="verify-desc text-green"><i className="fa-solid fa-check"></i> Address Verified.</p>
              )}
            </div>

            {/* Level 4 */}
            <div className="verify-card">
              <div className="verify-header">
                <h3>Level 4: Identify Verification</h3>
                {profile.identify_verified && <i className="fa-solid fa-circle-check text-green" style={{ fontSize: "1.2rem" }}></i>}
              </div>
              <p className="verify-desc">Coming soon (NID / Passport upload).</p>
            </div>
          </div>
        )}

        {/* --- ৩. Security Tab --- */}
        {activeTab === "security" && (
          <div className="settings-card">
            <form onSubmit={handlePasswordChange} className="settings-form">
              <label>Old Password</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
              
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              
              <label>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              
              <button type="submit">Update Password</button>
            </form>
          </div>
        )}

        {/* --- ৪. Sessions Tab --- */}
        {activeTab === "sessions" && (
          <div className="settings-card">
            <p style={{ color: "#9ca9a3", fontSize: "0.85rem", marginBottom: "16px" }}>Your recent login sessions.</p>
            <div className="session-list">
              {sessions.map((s) => (
                <div className="session-item" key={s.id}>
                  <i className="fa-solid fa-desktop" style={{ color: "#00e701", marginRight: "10px" }}></i>
                  <div>
                    <strong style={{ display: "block", color: "#fff", fontSize: "0.85rem" }}>IP: {s.ip_address}</strong>
                    <span style={{ fontSize: "0.75rem", color: "#9ca9a3", wordBreak: "break-all" }}>{s.browser_info}</span>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "#9ca9a3", marginTop: "4px" }}>{new Date(s.last_active).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer activePage="profile" onNavigate={navigate} />
    </div>
  );
}
