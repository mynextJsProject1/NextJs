/* app/play-category/page.tsx */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "./play-category.css";

type Category = {
  id: string;
  name: string;
  sort_order: number;
};

type Game = {
  id: string;
  category_id: string;
  title: string;
  image_url: string;
  route_path: string;
  sort_order: number;
};

export default function PlayCategoryPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // ডেটা লোড করা
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // ক্যাটাগরি লোড
        const { data: catData } = await supabase
          .from("game_categories")
          .select("*")
          .order("sort_order", { ascending: true });
        
        if (catData) setCategories(catData);

        // গেম লোড (শুধুমাত্র অ্যাক্টিভ গেম)
        const { data: gameData } = await supabase
          .from("games")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (gameData) setGames(gameData);
      } catch (err) {
        console.error("Error fetching games:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [supabase]);

  // ফিল্টারিং লজিক (ক্যাটাগরি + সার্চ)
  const filteredGames = games.filter((game) => {
    const matchCategory = activeCategory === "all" || game.category_id === activeCategory;
    const matchSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="play-category-page">
      <Header 
        onMenuClick={() => router.push("/")} 
        onHomeClick={() => router.push("/")} 
      />

      <main className="pc-main">
        
        {/* সার্চ বার */}
        <div className="pc-search-wrap">
          <i className="fa-solid fa-magnifying-glass pc-search-icon"></i>
          <input 
            type="text" 
            placeholder="Search games..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ✅ Casino Games এবং View All সেকশনটি সরিয়ে দেওয়া হয়েছে */}

        {/* ক্যাটাগরি বাটনসমূহ */}
        <div className="pc-categories">
          <button 
            className={`pc-cat-btn ${activeCategory === "all" ? "active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            All
          </button>
          
          {categories.map((cat) => (
            <button 
              key={cat.id}
              className={`pc-cat-btn ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* গেম গ্রিড */}
        {loading ? (
          <div className="pc-empty">Loading games...</div>
        ) : filteredGames.length === 0 ? (
          <div className="pc-empty">No games found in this category.</div>
        ) : (
          <div className="pc-grid">
            {filteredGames.map((game, index) => (
              <div 
                key={game.id} 
                className={`pc-card ${index === 2 ? "highlight" : ""}`} 
                onClick={() => router.push(`/${game.route_path}`)}
              >
                <div className="pc-card-img-wrap">
                  <img 
                    src={game.image_url} 
                    alt={game.title} 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x300/1B2A23/00E701?text=Game";
                    }}
                  />
                </div>
                {/* ✅ গেমের টাইটেল (<h3 className="pc-card-title">) সরিয়ে ফেলা হয়েছে */}
              </div>
            ))}
          </div>
        )}

      </main>

      <Footer
        activePage="casino"
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
