"use client";

import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

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
    <div className="min-h-screen bg-[#0f212e] text-white">
      <Header onMenuClick={() => router.push("/")} onHomeClick={() => router.push("/")} />

      <main className="container mx-auto px-4 py-8 pb-24">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-white text-left">Slots & Casino Games</h1>
        
        {/* গ্রিড লেআউট */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {DEMO_GAMES.map((game) => (
            <div 
              key={game.id}
              onClick={() => router.push(`/casino/slots/${game.id}`)}
              className="bg-[#1a2c38] rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-lg border border-transparent hover:border-[#00e701] flex flex-col"
            >
              {/* ইমেজ বা আইকনের অংশ */}
              <div className="h-32 md:h-40 bg-[#213743] flex items-center justify-center text-6xl shadow-inner">
                {game.image}
              </div>
              {/* টেক্সটের অংশ */}
              <div className="p-3 md:p-4">
                <h3 className="font-bold text-sm md:text-base text-white truncate">{game.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{game.provider}</p>
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
