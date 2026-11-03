/* app/page.tsx */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./page.css";

type LandingItem = {
  id: string;
  section_type: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  route_path: string;
  sort_order: number;
};

export default function HomePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  
  const [landingData, setLandingData] = useState<LandingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ডেটা ফেচ করা
  useEffect(() => {
    const fetchLandingData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("landing_page_items")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        if (data) setLandingData(data);
      } catch (err) {
        console.error("Error fetching landing data:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchLandingData();
  }, [supabase]);

  // সেকশন অনুযায়ী ডেটা ফিল্টার করা
  const recommendedItems = landingData.filter(item => item.section_type === "recommended");
  const categoryItems = landingData.filter(item => item.section_type === "category");

  // ডিফল্ট ছবি (যদি ইমেজ লোড না হয়)
  const fallbackImg = "https://via.placeholder.com/300x200/1B2A23/00E701?text=Game";

  return (
    <div className="landing-page">
      {/* ✅ হেডার কম্পোনেন্ট */}
      <Header 
        onMenuClick={() => router.push("/")} 
        onHomeClick={() => router.push("/")} 
      />

      <main className="landing-main">
        
        {loading ? (
          <div className="landing-loading">Loading Games...</div>
        ) : (
          <>
            {/* ✅ ১. Recommended Section */}
            {recommendedItems.length > 0 && (
              <div className="landing-section">
                <div className="landing-header">
                  <h2>
                    Recommended <span className="badge">Casino</span>
                  </h2>
                  <button className="view-all-btn" onClick={() => router.push("/play-category")}>
                    All
                  </button>
                </div>
                
                <div className="horizontal-scroll">
                  {recommendedItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="recommended-card" 
                      onClick={() => router.push(`/${item.route_path}`)}
                    >
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                      />
                      <div className="rec-info">
                        <h3>{item.title}</h3>
                        {item.subtitle && <p>{item.subtitle}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ ২. Categories Section */}
            {categoryItems.length > 0 && (
              <div className="landing-section">
                <div className="landing-header">
                  <h2>
                    Categories <span className="badge-outline">1xGames</span>
                  </h2>
                </div>
                
                <div className="horizontal-scroll">
                  {categoryItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="category-card" 
                      onClick={() => router.push(`/${item.route_path}`)}
                    >
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                      />
                      <div className="cat-overlay">
                        <h3>{item.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* যদি কোনো ডেটা না থাকে */}
            {landingData.length === 0 && (
              <div className="landing-loading">
                No games available right now. Please add games from Admin Panel.
              </div>
            )}
          </>
        )}
        
      </main>

      {/* ✅ ফুটার কম্পোনেন্ট */}
      <Footer
        activePage="home"
        onNavigate={(page) => {
          if (page === "home") router.push("/");
          else if (page === "chat") router.push("/live-support/");
          else if (page === "casino") router.push("/play-category/");
          else if (page === "sports") router.push("/");
        }}
      />
    </div>
  );
}
