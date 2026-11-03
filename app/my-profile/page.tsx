/* app/my-profile/page.tsx */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { createClient } from "../../lib/supabase/client";
import "./my-profile.css";

type ProfileData = {
  id: string;
  full_name: string;
  mobile: string;
  game_id: string;
  balance: number;
  bonus_balance: number;
  lottery_balance: number;
  referral_earnings: number;
  total_required_turnover: number;
  total_completed_turnover: number;
  role: string;
  account_status: string;
  status_reason: string | null;
  email: string | null;
  email_verified: boolean;
  birthday: string | null;
  postal_code: string | null;
  city: string | null;
  address_verified: boolean;
  identify_verified: boolean;
  created_at: string;
};

export default function MyProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login/");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setProfile(data as ProfileData);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [supabase, router]);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="my-profile-page">
        <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />
        <main className="my-profile-main">
          <div className="profile-loading">
            <i className="fa-solid fa-circle-notch" />
            <span>Loading Profile...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const isActive = profile.account_status === "active";

  return (
    <div className="my-profile-page">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />
      
      <main className="my-profile-main">
        
        {/* ১. প্রোফাইল হেডার (অ্যাভাটার ও নাম) */}
        <div className="profile-header-card">
          <div className="profile-avatar">
            {getInitials(profile.full_name)}
          </div>
          <h2>{profile.full_name || "Unknown User"}</h2>
          <div className="profile-game-id">Game ID: {profile.game_id || "N/A"}</div>
          <span className={`profile-status-badge ${isActive ? 'status-active' : 'status-blocked'}`}>
            {profile.account_status || "Active"}
          </span>
          {profile.status_reason && (
            <p style={{ color: "#ff4d4d", fontSize: "0.8rem", marginTop: "8px" }}>
              Reason: {profile.status_reason}
            </p>
          )}
        </div>

        {/* ২. ওয়ালেট এবং ব্যালেন্স */}
        <div className="profile-section-card">
          <h3><i className="fa-solid fa-wallet"></i> Wallet Overview</h3>
          <div className="profile-balance-grid">
            <div className="balance-item main-balance">
              <span>Main Balance</span>
              <strong>৳ {Number(profile.balance || 0).toLocaleString()}</strong>
            </div>
            <div className="balance-item">
              <span>Bonus Balance</span>
              <strong>৳ {Number(profile.bonus_balance || 0).toLocaleString()}</strong>
            </div>
            <div className="balance-item">
              <span>Lottery Balance</span>
              <strong>৳ {Number(profile.lottery_balance || 0).toLocaleString()}</strong>
            </div>
            <div className="balance-item">
              <span>Referral Earnings</span>
              <strong>৳ {Number(profile.referral_earnings || 0).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* ৩. পার্সোনাল ইনফরমেশন */}
        <div className="profile-section-card">
          <h3><i className="fa-solid fa-user"></i> Personal Information</h3>
          
          <div className="profile-info-row">
            <span>Mobile Number</span>
            <strong>{profile.mobile || "N/A"}</strong>
          </div>
          <div className="profile-info-row">
            <span>Email Address</span>
            <strong>{profile.email || "Not Provided"}</strong>
          </div>
          <div className="profile-info-row">
            <span>Birthday</span>
            <strong>{profile.birthday ? formatDate(profile.birthday) : "Not Provided"}</strong>
          </div>
          <div className="profile-info-row">
            <span>City</span>
            <strong>{profile.city || "Not Provided"}</strong>
          </div>
          <div className="profile-info-row">
            <span>Postal Code</span>
            <strong>{profile.postal_code || "Not Provided"}</strong>
          </div>
        </div>

        {/* ৪. ভেরিফিকেশন স্ট্যাটাস */}
        <div className="profile-section-card">
          <h3><i className="fa-solid fa-shield-halved"></i> Verification Status</h3>
          
          <div className="profile-info-row">
            <span>Email Verified</span>
            <span className={`verify-badge ${profile.email_verified ? 'verify-yes' : 'verify-no'}`}>
              {profile.email_verified ? "Verified" : "Not Verified"}
            </span>
          </div>
          <div className="profile-info-row">
            <span>Identity (KYC)</span>
            <span className={`verify-badge ${profile.identify_verified ? 'verify-yes' : 'verify-no'}`}>
              {profile.identify_verified ? "Verified" : "Not Verified"}
            </span>
          </div>
          <div className="profile-info-row">
            <span>Address Verified</span>
            <span className={`verify-badge ${profile.address_verified ? 'verify-yes' : 'verify-no'}`}>
              {profile.address_verified ? "Verified" : "Not Verified"}
            </span>
          </div>
        </div>

        {/* ৫. অ্যাকাউন্ট স্ট্যাটস ও টার্নওভার */}
        <div className="profile-section-card">
          <h3><i className="fa-solid fa-chart-pie"></i> Account Statistics</h3>
          
          <div className="profile-info-row">
            <span>Joined On</span>
            <strong>{formatDate(profile.created_at)}</strong>
          </div>
          <div className="profile-info-row">
            <span>Required Turnover</span>
            <strong>৳ {Number(profile.total_required_turnover || 0).toLocaleString()}</strong>
          </div>
          <div className="profile-info-row">
            <span>Completed Turnover</span>
            <strong style={{ color: "var(--color-primary)" }}>
              ৳ {Number(profile.total_completed_turnover || 0).toLocaleString()}
            </strong>
          </div>
        </div>

      </main>

      <Footer
        activePage="profile"
        onNavigate={(page) => {
          if (page === "home") router.push("/");
          else if (page === "chat") router.push("/live-support/");
          else if (page === "casino") router.push("/");
          else if (page === "sports") router.push("/");
        }}
      />
    </div>
  );
}
