/* app/my-bets/my-bets.css */
.my-bets-page {
  --bets-bg: #0f212e;
  --bets-card: #1a2c38;
  --bets-border: #2f4553;
  --bets-text: #ffffff;
  --bets-muted: #b1bad3;
  --bets-accent: #00e701;
}

.my-bets-page .my-bets-main {
  padding: 1rem 0.8rem 3rem;
  max-width: 600px;
  margin: 0 auto;
}

.my-bets-page .my-bets-title {
  font-size: 1.3rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  color: var(--bets-text);
}

.my-bets-page .my-bets-loading,
.my-bets-page .my-bets-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  color: var(--bets-muted);
  gap: 12px;
}

.my-bets-page .my-bets-loading i { font-size: 2rem; color: var(--bets-accent); }
.my-bets-page .my-bets-empty i { font-size: 3rem; color: var(--bets-border); }

.my-bets-page .bets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.my-bets-page .bet-card {
  background: var(--bets-card);
  border: 1px solid var(--bets-border);
  border-radius: 10px;
  padding: 14px;
}

.my-bets-page .bet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.my-bets-page .bet-date {
  font-size: 0.75rem;
  color: var(--bets-muted);
}

.my-bets-page .bet-status {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 4px;
}

.my-bets-page .bet-status.pending { background: rgba(245, 130, 32, 0.15); color: #f58220; }
.my-bets-page .bet-status.won { background: rgba(0, 231, 1, 0.15); color: var(--bets-accent); }
.my-bets-page .bet-status.lost { background: rgba(255, 77, 77, 0.15); color: #ff4d4d; }

.my-bets-page .bet-match {
  font-size: 0.95rem;
  color: var(--bets-text);
  margin-bottom: 12px;
}

.my-bets-page .bet-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  background: rgba(0, 0, 0, 0.2);
  padding: 10px;
  border-radius: 8px;
}

.my-bets-page .bet-details-grid > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.my-bets-page .bet-details-grid span {
  font-size: 0.7rem;
  color: var(--bets-muted);
  text-transform: uppercase;
}

.my-bets-page .bet-details-grid strong {
  font-size: 0.9rem;
  color: var(--bets-text);
}

.my-bets-page .text-green {
  color: var(--bets-accent) !important;
}
