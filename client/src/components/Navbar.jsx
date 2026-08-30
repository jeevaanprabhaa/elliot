import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowRight, FaBars, FaHeart, FaTimes, FaTint } from "react-icons/fa";

const navItems = [
  { label: "Home", action: "home" },
  { label: "About us", action: "why-donate" },
  { label: "How it works", action: "how-it-works" },
  { label: "Stories", action: "stories" },
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [requestsCount, setRequestsCount] = useState(0);
  const API_URL = `${import.meta.env.VITE_API_URL || ""}`;

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/requests`, {
          params: { status: "open" },
        });
        if (!cancelled) setRequestsCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch {
        // The landing page remains usable while the API is unavailable.
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [API_URL]);

  const handleNavigation = (action) => {
    setMenuOpen(false);
    if (action === "home") {
      navigate("/");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(`/#${action}`);
  };

  return (
    <nav className="bc-navbar">
      <div className="bc-navbar-inner">
        <button className="bc-brand" onClick={() => handleNavigation("home")} aria-label="BloodConnect home">
          <span className="bc-brand-mark">
            <FaHeart />
          </span>
          <span>
            Blood<span>Connect</span>
          </span>
        </button>

        <div className="bc-nav-links">
          {navItems.map((item) => (
            <button
              key={item.action}
              onClick={() => handleNavigation(item.action)}
              className={location.pathname === "/" && item.action === "home" ? "is-active" : ""}
            >
              {item.label}
            </button>
          ))}
          <button className="bc-nav-request" onClick={() => navigate("/requests")}>
            <FaTint />
            Requests
            {requestsCount > 0 && <span>{requestsCount}</span>}
          </button>
          <button onClick={() => navigate("/hospital-dashboard")}>Hospital AI</button>
        </div>

        <div className="bc-nav-actions">
          <button className="bc-nav-find" onClick={() => navigate("/search")}>
            Find a donor
          </button>
          <button className="bc-nav-register" onClick={() => navigate("/register")}>
            Register <FaArrowRight />
          </button>
        </div>

        <button
          className="bc-mobile-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {menuOpen && (
        <div className="bc-mobile-menu">
          {navItems.map((item) => (
            <button key={item.action} onClick={() => handleNavigation(item.action)}>
              {item.label}
            </button>
          ))}
          <button onClick={() => { setMenuOpen(false); navigate("/search"); }}>Find a donor</button>
          <button onClick={() => { setMenuOpen(false); navigate("/hospital-dashboard"); }}>Hospital AI</button>
          <button onClick={() => { setMenuOpen(false); navigate("/register"); }}>Register <FaArrowRight /></button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;