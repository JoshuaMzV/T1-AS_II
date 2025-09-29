import React from 'react';

const Navbar = ({ activeView, setActiveView, theme, toggleTheme }) => {
  return (
    <nav className="navbar">
      <div className="nav-views">
        <button 
          className={`nav-button ${activeView === 'library' ? 'active' : ''}`}
          onClick={() => setActiveView('library')}
        >
          Library
        </button>
        <button 
          className={`nav-button ${activeView === 'setlists' ? 'active' : ''}`}
          onClick={() => setActiveView('setlists')}
        >
          Setlists
        </button>
      </div>
      <div className="theme-switcher">
        <span aria-hidden>☀️</span>
        <label className="switch">
          <input type="checkbox" onChange={toggleTheme} checked={theme === 'dark'} />
          <span className="slider round"></span>
        </label>
        <span aria-hidden>🌙</span>
      </div>
    </nav>
  );
};

export default Navbar;
