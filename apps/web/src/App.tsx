import { useState } from 'react';

const styles = `
  .app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: radial-gradient(circle at top, #f5f7ff, #ffffff);
    color: #1f2933;
    font-family: 'Inter', system-ui, sans-serif;
    padding: 1.5rem 1rem 5rem;
    box-sizing: border-box;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  .chip-group {
    display: none;
    gap: 0.75rem;
  }

  .chip {
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    background: rgba(93, 93, 255, 0.1);
    color: #3535ff;
    font-weight: 600;
  }

  .card {
    background: white;
    border-radius: 1.5rem;
    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.1);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mission-list {
    display: grid;
    gap: 0.75rem;
  }

  .mission {
    background: #f0f4ff;
    border-radius: 1rem;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .popup {
    position: fixed;
    bottom: 6rem;
    right: 1.5rem;
    background: white;
    border-radius: 1.25rem;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
    width: min(320px, calc(100% - 2rem));
    padding: 1rem;
    animation: bounce-in 240ms ease-out;
  }

  @keyframes bounce-in {
    0% { transform: translateY(20px); opacity: 0; }
    70% { transform: translateY(-6px); opacity: 1; }
    100% { transform: translateY(0); }
  }

  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid rgba(148, 163, 184, 0.3);
    display: flex;
    justify-content: space-around;
    padding: 0.75rem 1rem;
    box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.08);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.8rem;
    color: #475569;
    gap: 0.25rem;
  }

  .nav-item.active {
    color: #4f46e5;
    font-weight: 600;
  }

  .popup-trigger {
    background: #4f46e5;
    border: none;
    color: white;
    font-weight: 600;
    border-radius: 9999px;
    padding: 0.75rem 1.5rem;
    align-self: flex-start;
    cursor: pointer;
    box-shadow: 0 12px 30px rgba(79, 70, 229, 0.3);
  }

  @media (min-width: 768px) {
    .app-shell {
      padding: 3rem 4rem;
    }

    .chip-group {
      display: flex;
    }

    .bottom-nav {
      display: none;
    }

    .popup {
      right: 4rem;
      bottom: 3rem;
    }
  }
`;

function App() {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="app-shell">
      <style>{styles}</style>
      <header className="header">
        <div>
          <p style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Good afternoon</p>
          <h1 style={{ fontSize: '1.9rem', margin: 0 }}>Innerbloom</h1>
        </div>
        <div className="chip-group">
          <span className="chip">Wellness</span>
          <span className="chip">Missions</span>
          <span className="chip">Rewards</span>
        </div>
      </header>

      <main className="card">
        <div>
          <h2 style={{ margin: 0 }}>Today's Missions</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b' }}>
            Stay consistent to keep your streak going.
          </p>
        </div>

        <div className="mission-list">
          <div className="mission">
            <span>💬 Check in with your mood</span>
            <input type="checkbox" readOnly />
          </div>
          <div className="mission">
            <span>🚶‍♀️ Mindful walk (10 mins)</span>
            <input type="checkbox" readOnly />
          </div>
          <div className="mission">
            <span>🧘‍♂️ Breathing practice</span>
            <input type="checkbox" readOnly />
          </div>
        </div>

        <button className="popup-trigger" onClick={() => setShowPopup((prev) => !prev)}>
          {showPopup ? 'Hide coach tip' : 'Coach tip'}
        </button>
      </main>

      {showPopup && (
        <div className="popup">
          <strong>Keep it up! 🌟</strong>
          <p style={{ color: '#475569', marginBottom: '0.75rem' }}>
            Quick check-ins build strong habits. Try sharing one win with a friend today!
          </p>
          <button
            onClick={() => setShowPopup(false)}
            style={{
              background: '#eef2ff',
              border: 'none',
              color: '#4338ca',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              cursor: 'pointer'
            }}
          >
            Got it
          </button>
        </div>
      )}

      <nav className="bottom-nav">
        <button className="nav-item active" type="button">
          <span role="img" aria-label="home">
            🏠
          </span>
          Home
        </button>
        <button className="nav-item" type="button">
          <span role="img" aria-label="missions">
            🎯
          </span>
          Missions
        </button>
        <button className="nav-item" type="button">
          <span role="img" aria-label="rewards">
            🎁
          </span>
          Rewards
        </button>
      </nav>
    </div>
  );
}

export default App;
