/* components/Footer.tsx (অথবা আপনার ফাইলের সঠিক পাথ) */
"use client";

import { useRouter } from "next/navigation";

type FooterProps = {
  activePage: string;
  onNavigate: (page: string) => void;
};

const navItems = [
  {
    id: "home",
    label: "Home",
    // ✅ উন্নত মানের Home আইকন
    path: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: "casino",
    label: "Casino",
    // ✅ উন্নত মানের Casino (Dice) আইকন
    path: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8 8h.01 M16 8h.01 M12 12h.01 M8 16h.01 M16 16h.01",
  },
  {
    id: "lottery",
    label: "Lottery",
    // ✅ উন্নত মানের Lottery (Ticket) আইকন
    path: "M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z",
  },
  {
    id: "sports",
    label: "Sports",
    // ✅ উন্নত মানের Sports (Star/Trophy) আইকন
    path: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  },
  {
    id: "chat",
    label: "Chat",
    // ✅ উন্নত মানের Chat (Message) আইকন
    path: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
];

export default function Footer({
  activePage,
  onNavigate,
}: FooterProps) {
  const router = useRouter();

  const handleNavigate = (id: string) => {
    if (id === "lottery") {
      router.push("/lottery");
    } else {
      onNavigate(id);
    }
  };

  return (
    <footer 
      className="stake-bottom-nav" 
      style={{ backgroundColor: "#184f35" }} /* ✅ আপনার চাহিদা অনুযায়ী ব্যাকগ্রাউন্ড কালার */
    >
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`stake-nav-item ${
            activePage === item.id ? "active" : ""
          }`}
          onClick={() => handleNavigate(item.id)}
          aria-label={item.label}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={item.path} />
          </svg>
          <span>{item.label}</span>
        </button>
      ))}
    </footer>
  );
}
