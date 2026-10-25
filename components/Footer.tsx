type FooterProps = {
  activePage: string;
  onNavigate: (page: string) => void;
};

const navItems = [
  { id: "home", label: "Home", icon: "fa-house" },
  { id: "casino", label: "Casino", icon: "fa-dice" },
  { id: "sports", label: "Sports", icon: "fa-trophy" },
  { id: "chat", label: "Chat", icon: "fa-comments" },
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
        >
          <i className={`fa-solid ${item.icon}`} />
          <span>{item.label}</span>
        </button>
      ))}
    </footer>
  );
}
