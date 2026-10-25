
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
          <i className="fa-solid fa-bars" />
        </button>

        <button
          className="stake-logo"
          type="button"
          onClick={onHomeClick}
          aria-label="Home"
        >
          Stake<span>.</span>
        </button>
      </div>

      <div className="stake-header-right">
        <div className="stake-wallet-pill">
          <i className="fa-solid fa-wallet" />
          <span>0.00</span>
        </div>

        <button className="stake-btn-wallet" type="button">
          Wallet
        </button>
      </div>
    </header>
  );
}
