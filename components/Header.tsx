
type HeaderProps = {
  onMenuClick: () => void;
  onHomeClick: () => void;
};

export default function Header({
  onMenuClick,
  onHomeClick,
}: HeaderProps) {
  return (
    <header className="stake-header">
      <div className="stake-header-left">
        <button
          className="stake-menu-btn"
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M3 6H21M3 12H21M3 18H21"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <button
          className="stake-logo"
          type="button"
          onClick={onHomeClick}
          aria-label="Gazicasino home"
        >
          <span className="gazi-logo-text">
            Gazi<span className="gazi-logo-accent">casino</span>
          </span>
        </button>
      </div>

      <div className="stake-header-right">
        <div className="stake-wallet-pill">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20V19H5.5A2.5 2.5 0 0 1 3 16.5V7.5Z"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M3 8H20M16 13H17"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span>0.00</span>
        </div>

        <button className="stake-btn-wallet" type="button">
          Wallet
        </button>
      </div>
    </header>
  );
}
