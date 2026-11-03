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

type Banner = {
  id: number;
  image_url: string;
};

export default function HomePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  
  const [landingData, setLandingData] = useState<LandingItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  // ডেটা ফেচ করা (ল্যান্ডিং কার্ড এবং ব্যানার)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // ১. ল্যান্ডিং কার্ড ফেচ
        const { data: landingRes } = await supabase
          .from("landing_page_items")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (landingRes) setLandingData(landingRes);

        // ২. ব্যানার ফেচ (banners টেবিল থেকে)
        const { data: bannerRes } = await supabase
          .from("banners")
          .select("id, image_url")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (bannerRes) setBanners(bannerRes);

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [supabase]);

  // সেকশন অনুযায়ী ডেটা ফিল্টার করা
  const recommendedItems = landingData.filter(item => item.section_type === "recommended");
  const categoryItems = landingData.filter(item => item.section_type === "category");

  const fallbackImg = "https://via.placeholder.com/300x200/1B2A23/00E701?text=Image";

  return (
    <div className="landing-page">
      <Header 
        onMenuClick={() => router.push("/")} 
        onHomeClick={() => router.push("/")} 
      />

      <main className="landing-main">
        
        {loading ? (
          <div className="landing-loading">Loading...</div>
        ) : (
          <>
            {/* ✅ ১. ব্যানার সেকশন (হেডারের ঠিক নিচে) */}
            {banners.length > 0 && (
              <div className="banner-scroll">
                {banners.map((banner) => (
                  <img 
                    key={banner.id}
                    src={banner.image_url}
                    alt="Banner"
                    className="banner-img"
                    onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                  />
                ))}
              </div>
            )}

            {/* ✅ ২. Recommended Section */}
            {recommendedItems.length > 0 && (
              <div className="landing-section">
                <div className="landing-header">
                  {/* ✅ Casino ব্যাজ সরানো হয়েছে */}
                  <h2>Recommended</h2>
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
                      {/* ✅ টাইটেল ও সাবটাইটেল সরানো হয়েছে */}
                      <img 
                        src={item.image_url} 
                        alt="Game" 
                        onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ ৩. Categories Section */}
            {categoryItems.length > 0 && (
              <div className="landing-section">
                <div className="landing-header">
                  {/* ✅ 1xGames ব্যাজ সরানো হয়েছে */}
                  <h2>Categories</h2>
                </div>
                
                <div className="horizontal-scroll">
                  {categoryItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="category-card" 
                      onClick={() => router.push(`/${item.route_path}`)}
                    >
                      {/* ✅ টাইটেল ও ওভারলে সরানো হয়েছে */}
                      <img 
                        src={item.image_url} 
                        alt="Category" 
                        onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {landingData.length === 0 && banners.length === 0 && (
              <div className="landing-loading">
                No data available right now.
              </div>
            )}
          </>
        )}
        
      </main>

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
