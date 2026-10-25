
"use client";

import { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import ChatDrawer from "../components/ChatDrawer";

const banners = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1000",
    alt: "Gaming banner one",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=1000",
    alt: "Gaming banner two",
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=1000",
    alt: "Gaming banner three",
  },
];

const games = [
  {
    name: "Lucky Slots",
    category: "Slots",
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400",
  },
  {
    name: "Golden Casino",
    category: "Popular",
    image:
      "https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=400",
  },
  {
    name: "Royal Play",
    category: "Slots",
    image:
      "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400",
  },
  {
    name: "Neon Games",
    category: "Popular",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400",
  },
  {
    name: "Sports Arena",
    category: "Sports",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400",
  },
  {
    name: "Adventure",
    category: "Popular",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400",
  },
];

const categories = ["All", "Popular", "Slots", "Sports"];

export default function Home() {
  const [activePage, setActivePage] = useState("home");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % banners.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

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
      activeCategory === "All" ||
      game.category === activeCategory;

    const matchesSearch = game.name
      .toLowerCase()
      .includes(search.toLowerCase());

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
        <section
          className="stake-banner-slider"
          aria-label="Featured banners"
        >
          <div className="stake-banner-window">
            <div
              className="stake-banner-track"
              style={{
                transform: `translateX(-${activeBanner * 100}%)`,
              }}
            >
              {banners.map((banner) => (
                <div className="stake-banner-slide" key={banner.id}>
                  <img
                    src={banner.image}
                    alt={banner.alt}
                    className="stake-banner-image"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="stake-banner-dots">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                className={`stake-banner-dot ${
                  activeBanner === index ? "active" : ""
                }`}
                aria-label={`Show banner ${index + 1}`}
                aria-pressed={activeBanner === index}
                onClick={() => setActiveBanner(index)}
              />
            ))}
          </div>
        </section>

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
                <div className="stake-game-name">
                  {game.name}
                </div>
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

      <Footer
        activePage={activePage}
        onNavigate={navigate}
      />

      <Sidebar
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={navigate}
      />

      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
