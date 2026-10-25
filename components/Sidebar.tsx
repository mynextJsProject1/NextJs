
type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
};

const menuItems = [
  { id: "home", label: "Home", icon: "fa-house" },
  { id: "casino", label: "Casino", icon: "fa-dice" },
  { id: "sports", label: "Sports", icon: "fa-trophy" },
];

export default function Sidebar({
  isOpen,
  onClose,
  onNavigate,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="stake-sidebar-overlay"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}

      <aside
        className={`stake-sidebar ${isOpen ? "open" : ""}`}
        aria-hidden={!isOpen}
      >
        <div className="stake-sidebar-header">
          <span className="stake-logo">
            Stake<span>.</span>
          </span>

          <button
            type="button"
            className="stake-sidebar-close"
            aria-label="Close menu"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <nav className="stake-sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="stake-sidebar-item"
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
            >
              <i className={`fa-solid ${item.icon}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
