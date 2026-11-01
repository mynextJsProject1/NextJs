/* app/lottery/lottery-verifie/page.tsx */
"use client";

import { useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./lottery-verifie.css";

export default function LotteryVerifyPage() {
  const supabase = useMemo(() => createClient(), []);
  
  const [searchCode, setSearchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setResult(null);

    try {
      // ১. টিকিট কোড দিয়ে lottery_tickets টেবিলে খোঁজা
      const { data: ticket, error: ticketError } = await supabase
        .from("lottery_tickets")
        .select("*")
        .eq("ticket_code", searchCode.trim().toUpperCase())
        .maybeSingle();

      if (ticketError) throw ticketError;

      // ২. যদি টিকিট না পাওয়া যায় (ফেক বা ভুল কোড)
      if (!ticket) {
        setErrorMsg("Invalid Ticket! This ticket code does not exist in our system.");
        setLoading(false);
        return;
      }

      // ৩. টিকিট পাওয়া গেলে ড্র-এর তথ্য আনা
      const { data: draw } = await supabase
        .from("lottery_draws")
        .select("draw_name, draw_time, status, winning_number, jackpot_amount")
        .eq("id", ticket.draw_id)
        .single();

      // ৪. ইউজারের নাম আনা (প্রাইভেসির জন্য শুধু নাম)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", ticket.user_id)
        .maybeSingle();

      // ৫. সফলভাবে ডাটা সেট করা
      setResult({
        ticket,
        draw,
        holderName: profile?.full_name || "Unknown User",
      });

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Something went wrong while verifying. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ইউজারের নাম মাস্ক করা (যেমন: MD R***L ISLAM)
  const maskName = (name: string) => {
    if (!name) return "N/A";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return parts[0] + " " + parts[1].charAt(0) + "***" + (parts[1].length > 1 ? parts[1].charAt(parts[1].length - 1) : "");
    }
    return name.charAt(0) + "***" + name.charAt(name.length - 1);
  };

  return (
    <div className="verify-page">
      <div className="verify-header">
        <i className="fa-solid fa-shield-halved"></i>
        <h1>Ticket Verification</h1>
        <p>Check if your lottery ticket is authentic or fake.</p>
      </div>

      {/* সার্চ ফর্ম */}
      <div className="verify-card">
        <form onSubmit={handleVerify} className="verify-form">
          <input 
            type="text" 
            placeholder="Enter Ticket Code (e.g. TKT-A1B2C3)" 
            value={searchCode} 
            onChange={e => setSearchCode(e.target.value)} 
            required 
          />
          {/* ✅ type="button" দেওয়া হয়েছে যাতে পেইজ রিফ্রেশ না হয় */}
          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify Ticket"}
          </button>
        </form>
      </div>

      {/* এরর মেসেজ (যদি ফেক হয়) */}
      {errorMsg && (
        <div className="verify-error fade-in">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>
            <h3>Fake or Invalid Ticket</h3>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* সাকসেস রেজাল্ট (যদি আসল হয়) */}
      {result && (
        <div className="verify-success fade-in">
          <div className="success-badge">
            <i className="fa-solid fa-circle-check"></i> Authentic Ticket
          </div>
          
          <div className="result-details">
            <div className="res-row">
              <span>Ticket Code</span>
              <strong>{result.ticket.ticket_code}</strong>
            </div>
            <div className="res-row">
              <span>Holder Name</span>
              <strong>{maskName(result.holderName)}</strong>
            </div>
            <div className="res-row">
              <span>Draw Name</span>
              <strong>{result.draw?.draw_name || "N/A"}</strong>
            </div>
            <div className="res-row">
              <span>Draw Date</span>
              <strong>{new Date(result.draw?.draw_time).toLocaleString()}</strong>
            </div>
            <div className="res-row">
              <span>Ticket Number</span>
              <strong>#{result.ticket.ticket_number}</strong>
            </div>
            
            <div className="res-row status-row">
              <span>Draw Status</span>
              <strong className={result.draw?.status === "finished" ? "text-green" : "text-gold"}>
                {result.draw?.status.toUpperCase()}
              </strong>
            </div>

            {/* যদি ড্র ফিনিশ হয়ে থাকে, তবে বিজয়ী নম্বর দেখাবে */}
            {result.draw?.status === "finished" && (
              <div className="res-row win-row">
                <span>Winning Number</span>
                <strong className={result.ticket.ticket_number === result.draw.winning_number.toString() ? "text-green" : "text-red"}>
                  {result.ticket.ticket_number === result.draw.winning_number.toString() 
                    ? "🎉 Congratulations! You Won!" 
                    : `Better luck next time (Winning No: ${result.draw.winning_number})`}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
