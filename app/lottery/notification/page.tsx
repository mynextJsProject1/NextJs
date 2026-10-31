/* app/lottery/notification/page.tsx */
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase/client";
import "./notification.css";

type Notification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export default function NotificationPage() {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // সাউন্ড বাজানোর ফাংশন
  const playNotificationSound = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
    audio.play().catch((err) => console.log("Audio play blocked by browser:", err));
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lottery_notifications")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setNotifications(data as Notification[]);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();

    // রিয়েল-টাইম লিসেনার: নতুন নোটিফিকেশন আসলে সাউন্ড বাজবে ও লিস্ট আপডেট হবে
    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lottery_notifications" },
        (payload) => {
          if (payload.new.is_active) {
            playNotificationSound();
            // নতুন নোটিফিকেশনটি লিস্টের উপরে যোগ করা
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="notif-loading">
        <i className="fa-solid fa-circle-notch fa-spin"></i>
        <p>Loading Notifications...</p>
      </div>
    );
  }

  return (
    <div className="notif-page">
      <div className="notif-header">
        <h1>
          <i className="fa-solid fa-bell"></i> Notifications
        </h1>
        <p>Stay updated with lottery news and alerts.</p>
      </div>

      {notifications.length === 0 ? (
        <div className="notif-empty">
          <i className="fa-regular fa-bell-slash"></i>
          <h3>No Notifications Yet</h3>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map((notif) => (
            <div key={notif.id} className="notif-card">
              <div className="notif-icon">
                <i className="fa-solid fa-bullhorn"></i>
              </div>
              <div className="notif-content">
                <div className="notif-top-row">
                  <h4 className="notif-title">{notif.title}</h4>
                  <span className="notif-time">{formatDate(notif.created_at)}</span>
                </div>
                <p className="notif-message">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
