
type FooterProps = {
  activePage: string;
  onNavigate: (page: string) => void;
};

const navItems = [
  {
    id: "home",
    label: "Home",
    path: "M3 10.5L12 3L21 10.5V20H14V14H10V20H3V10.5Z",
  },
  {
    id: "casino",
    label: "Casino",
    path: "M4 4H20V20H4V4ZM8 8H8.01M16 8H16.01M12 12H12.01M8 16H8.01M16 16H16.01",
  },
  {
    id: "lottery",
    label: "Lottery",
    path: "M7 3H17V6H20V21H4V6H7V3ZM8 11L10.5 13.5L16 8",
  },
  {
    id: "sports",
    label: "Sports",
    path: "M12 3L15 9H21L16 13L18 20L12 16L6 20L8 13L3 9H9L12 3Z",
  },
  {
    id: "chat",
    label: "Chat",
    path: "M21 11.5A8.5 8.5 0 0 1 12.5 20H5L3 21L4 16.5A8.5 8.5 0 1 1 21 11.5Z",
  },
];

export default function Footer({
  activePage,
  onNavigate,
}: FooterProps) {
  return (
    <footer className="stake-bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`stake-nav-item ${
            activePage === item.id ? "active" : ""
          }`}
          onClick={() => onNavigate(item.id)}
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
