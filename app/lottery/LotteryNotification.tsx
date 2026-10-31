/* app/lottery/LotteryNotification.tsx */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function LotteryNotification() {
  const supabase = createClient();
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // রিয়েল-টাইম চ্যানেল সাবস্ক্রাইব করা
    const channel = supabase
      .channel("lottery_notifications_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lottery_notifications" },
        (payload) => {
          const newNotif = payload.new as any;
          if (newNotif.is_active) {
            // ১. SMS সাউন্ড বাজানো
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
            audio.play().catch(() => console.log("Browser blocked audio autoplay"));

            // ২. স্ক্রিনে নোটিফিকেশন দেখানো
            setNotification({ title: newNotif.title, message: newNotif.message });
            setShowToast(true);

            // ৩. ৬ সেকেন্ড পর নোটিফিকেশনটি বন্ধ হয়ে যাবে
            setTimeout(() => setShowToast(false), 6000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (!showToast || !notification) return null;

  return (
    <div style={{
      position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: '#2a1f3d', border: '1px solid #d4af37', borderRadius: '12px',
      padding: '15px 20px', width: '90%', maxWidth: '400px', zIndex: 99999,
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)', animation: 'slideDown 0.4s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <i className="fa-solid fa-bell" style={{ color: '#d4af37', fontSize: '20px', marginTop: '2px' }}></i>
        <div>
          <h4 style={{ margin: 0, color: '#d4af37', fontSize: '14px', fontWeight: 'bold' }}>{notification.title}</h4>
          <p style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '13px', lineHeight: '1.4' }}>{notification.message}</p>
        </div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { top: -50px; opacity: 0; }
          to { top: 70px; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
