"use client";

import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import "./slots.css"; // ✅ CSS ইমপোর্ট করা হলো

const DEMO_GAMES = [
  { id: "sweet-bonanza", name: "Sweet Bonanza", provider: "Pragmatic Play", image: "🍬" },
  { id: "gates-of-olympus", name: "Gates of Olympus", provider: "Pragmatic Play", image: "⚡" },
  { id: "book-of-dead", name: "Book of Dead", provider: "Play'n GO", image: "📖" },
  { id: "starburst", name: "Starburst", provider: "NetEnt", image: "💎" },
  { id: "aviator", name: "Aviator", provider: "Spribe", image: "✈️" },
  { id: "mines", name: "Mines", provider: "Spribe", image: "💣" },
];

export default function SlotsLobbyPage() {
  const router = useRouter();

  return (
    <div className="slots-page">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main style={{ paddingBottom: "80px" }}>
        <h1 className="slots-title">Slots & Casino Games</h1>
        
        <div className="slots-grid">
          {DEMO_GAMES.map((game) => (
            <div 
              key={game.id}
              onClick={() => router.push(`/casino/slots/${game.id}`)}
              className="game-card"
            >
              <div className="game-image">
                {game.image}
              </div>
              <div className="game-info">
                <h3 className="game-name">{game.name}</h3>
                <p className="game-provider">{game.provider}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer activePage="casino" onNavigate={(page) => {
        if (page === "home") router.push("/");
        else if (page === "chat") router.push("/");
        else if (page === "casino") router.push("/");
        else if (page === "sports") router.push("/");
      }} />
    </div>
  );
}
