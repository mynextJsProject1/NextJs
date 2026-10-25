"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import ChatDrawer from "../components/ChatDrawer";
import { createClient } from "../lib/supabase/client";

const games = [
  { name: "Lucky Slots", category: "Slots", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400" },
  { name: "Golden Casino", category: "Popular", image: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=400" },
  { name: "Royal Play", category: "Slots", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400" },
  { name: "Neon Games", category: "Popular", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400" },
  { name: "Sports Arena", category: "Sports", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400" },
  { name: "Adventure", category: "Popular", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400" },
];

const categories = ["All", "Popular", "Slots", "Sports"];

type Banner = {
  id: number;
  image_url: string;
};

export default function Home() {
  const [activePage, setActivePage] = useState("home");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBanners() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("banners")
        .select("id, image_url")
        .eq("is_active", true)
        .order("id", { ascending: false });

      if (error) {
        console.error("Banner loading failed:", error.message);
        return;
      }

      if (!cancelled) {
        setBanners(data ?? []);
        setBannerIndex(0);
      }
    }

    loadBanners();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;

    const timer = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % banners.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  function previousBanner() {
    setBannerIndex((current) =>
      (current - 1 + banners.length) % banners.length
    );
  }

  function nextBanner() {
    setBannerIndex((current) =>
      (current + 1) % banners.length
    );
  }

  function navigate(page: string) {
    if (page === "chat") {
      setChatOpen(true);
      return;
    }

    setActivePage(page);
    setActiveCategory("All");
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filteredGames = games.filter((game) => {
    const matchesCategory =
      activeCategory === "All" || game.category === activeCategory;
    const matchesSearch = game.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const visibleGames =
    activePage === "sports"
      ? games.filter((game) => game.category === "Sports")
      : filteredGames;

  return (
    <div className="stake-app">
      <Header
        onMenuClick={() => setMenuOpen(true)}
        onHomeClick={() => navigate("home")}
      />

      <main className="stake-main">
        {banners.length > 0 && (
          <section
            className="stake-banner"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0].clientX;
            }}
            onTouchEnd={(event) => {
              if (touchStartX.current === null) return;

              const difference =
                touchStartX.current - event.changedTouches[0].clientX;

              if (difference > 40) nextBanner();
              if (difference < -40) previousBanner();

              touchStartX.current = null;
            }}
          >
            <img
              key={banners[bannerIndex].id}
              className="stake-banner-image"
              src={banners[bannerIndex].image_url}
              alt="Promotional banner"
            />

            {banners.length > 1 && (
              <>
                <button
                  className="stake-banner-arrow stake-banner-prev"
                  type="button"
                  aria-label="Previous banner"
                  onClick={previousBanner}
                >
                  &#8249;
                </button>

                <button
                  className="stake-banner-arrow stake-banner-next"
                  type="button"
                  aria-label="Next banner"
                  onClick={nextBanner}
                >
                  &#8250;
                </button>

                <div className="stake-banner-dots">
                  {banners.map((banner, index) => (
                    <button
                      key={banner.id}
                      type="button"
                      aria-label={`Show banner ${index + 1}`}
                      className={`stake-banner-dot ${
                        index === bannerIndex ? "active" : ""
                      }`}
                      onClick={() => setBannerIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        <div className="stake-search">
          <input
            type="search"
            placeholder="Search games..."
            aria-label="Search games"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="stake-section-heading">
          <h2>
            {activePage === "sports"
              ? "Sports"
              : activePage === "casino"
                ? "Casino Games"
                : "Explore Games"}
          </h2>
          <button
            className="stake-view-all"
            type="button"
            onClick={() => {
              setActivePage("casino");
              setActiveCategory("All");
            }}
          >
            View All →
          </button>
        </div>

        {activePage !== "sports" && (
          <div className="stake-categories">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`stake-category ${
                  activeCategory === category ? "active" : ""
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        <div className="stake-game-grid">
          {visibleGames.length > 0 ? (
            visibleGames.map((game) => (
              <article className="stake-game-card" key={game.name}>
                <img
                  className="stake-game-image"
                  src={game.image}
                  alt={game.name}
                  loading="lazy"
                />
                <div className="stake-game-name">{game.name}</div>
              </article>
            ))
          ) : (
            <p className="stake-empty">No games found.</p>
          )}
        </div>

        <footer className="stake-footer">
          © 2026 Gazicasino. All rights reserved.
        </footer>
      </main>

      <Footer activePage={activePage} onNavigate={navigate} />
      <Sidebar
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={navigate}
      />
      <ChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
