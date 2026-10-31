/* app/lottery/profile/page.tsx */
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase/client";
import { useRouter } from "next/navigation";
import "./profile.css";

type UserDetails = {
  full_name: string;
  father_name: string;
  mother_name: string;
  mobile: string;
  nid_number: string;
  birth_date: string;
  district: string;
  zip_code: string;
  full_address: string;
};

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/signup"); return; }

        const { data, error } = await supabase
          .from("lottery_user_details")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setDetails(data as UserDetails);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [supabase, router]);

  // ✅ ডাটা মাস্ক (Mask) করার ফাংশন: প্রথম ৩ সংখ্যা + ****** + শেষের ২ সংখ্যা
  const maskSensitiveData = (value: string) => {
    if (!value) return "N/A";
    if (value.length <= 5) return "******";
    return value.substring(0, 3) + "******" + value.substring(value.length - 2);
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <i className="fa-solid fa-circle-notch fa-spin"></i>
        <p>Loading Profile...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="profile-empty">
        <i className="fa-solid fa-user-xmark"></i>
        <h3>No Profile Found</h3>
        <p>You haven't completed your KYC verification yet.</p>
        <button onClick={() => router.push("/lotter/verifications-details")} className="go-verify-btn">
          Complete Verification
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        
        {/* প্রোফাইল হেডার */}
        <div className="profile-header">
          <div className="profile-avatar">
            <i className="fa-solid fa-user"></i>
          </div>
          <h2 className="profile-name">{details.full_name}</h2>
          <span className="profile-badge">Verified User</span>
        </div>

        {/* প্রোফাইল তথ্য */}
        <div className="profile-details">
          <div className="info-row">
            <span className="info-label">Mobile Number</span>
            <span className="info-value">{maskSensitiveData(details.mobile)}</span>
          </div>

          <div className="info-row">
            <span className="info-label">NID Number</span>
            <span className="info-value">{maskSensitiveData(details.nid_number)}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Father's Name</span>
            <span className="info-value">{details.father_name}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Mother's Name</span>
            <span className="info-value">{details.mother_name}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Date of Birth</span>
            <span className="info-value">{details.birth_date || "N/A"}</span>
          </div>

          <div className="info-row">
            <span className="info-label">District</span>
            <span className="info-value">{details.district || "N/A"}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Zip Code</span>
            <span className="info-value">{details.zip_code || "N/A"}</span>
          </div>

          <div className="info-row address-row">
            <span className="info-label">Full Address</span>
            <span className="info-value">{details.full_address}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
