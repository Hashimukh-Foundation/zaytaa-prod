import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const navigate = useNavigate();

  // --- Search States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);
  const { cartCount } = useCart();

  // --- Mobile Menu State ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Placeholder Animation ---
  const placeholders = [
    "Search 'Cleanser'...",
    "Search 'Moisturizer'...",
    "Find your routine...",
    "Search 'Vitamin C'...",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000); // Changes every 3 seconds
    return () => clearInterval(interval);
  }, [placeholders.length]);

  // --- Live Search Logic (Debounced) ---
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      // Fetch matching products from Supabase
      const { data, error } = await supabase
        .from("products")
        .select("name, slug, product_images(url)")
        .ilike("name", `%${searchQuery}%`)
        .limit(5); // Show top 5 results max

      if (!error && data) {
        setSuggestions(data);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Handlers ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsFocused(false);
      setSearchQuery("");
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { label: "Shop All", url: "/shop" },
    { label: "Bestsellers", url: "/shop?bestseller=true" },
    { label: "New Arrivals", url: "/shop?newarrival=true" },
    { label: "Track Order", url: "/track-order" },
    { label: "About", url: "#" },
  ];

  return (
    <nav className="axio-nav">
      <style>{`
                .axio-nav {
                    position: sticky;
                    top: 0;
                    z-index: 999;
                    background: var(--white, #ffffff);
                    border-bottom: 1px solid var(--border, #e5e5e5);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 24px;
                    height: 80px;
                    gap: 24px;
                }

                /* Left Side: Logo & Links */
                .nav-left {
                    display: flex;
                    align-items: center;
                    gap: 40px;
                }
                .logo {
                    font-family: var(--font-serif);
                    font-size: 22px;
                    font-weight: 700;
                    letter-spacing: 0.15em;
                    color: var(--ink, #111111);
                    text-decoration: none;
                    text-transform: uppercase;
                }
                .nav-links {
                    display: flex;
                    gap: 24px;
                }
                .nav-link {
                    font-family: var(--font-sans);
                    font-size: 13px;
                    font-weight: 500;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    color: var(--stone, #78716c);
                    text-decoration: none;
                    transition: color 0.2s;
                }
                .nav-link:hover, .nav-link.active {
                    color: var(--ink, #111111);
                }

				/* Mobile Menu Toggle Button */
				.mobile-menu-btn {
					display: none;
					background: none;
					border: none;
					cursor: pointer;
					color: var(--ink, #111111);
					padding: 4px;
				}

                /* Right Side: Search & Actions */
                .nav-right {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    flex: 1;
                    justify-content: flex-end;
                }

                /* Search Bar */
                .search-container {
                    position: relative;
                    width: 100%;
                    max-width: 320px;
                }
                .search-form {
                    display: flex;
                    align-items: center;
                    background: #fcfbf8;
                    border: 1px solid var(--green, #22c55e);
                    border-radius: 100px;
                    padding: 6px 16px;
                    transition: border-color 0.2s;
                }
                .search-form:focus-within {
                    border-color: var(--ink, #111111);
                }
                .search-input {
                    border: none;
                    background: transparent;
                    outline: none;
                    width: 100%;
                    font-family: var(--font-sans);
                    font-size: 14px;
                    color: var(--ink, #111111);
                    padding: 4px 0;
                }
                .search-input::placeholder {
                    color: #a8a29e;
                    transition: opacity 0.3s ease;
                }
                .search-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--stone, #78716c);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                }

                /* Search Dropdown */
                .search-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    width: 100%;
                    background: var(--white, #ffffff);
                    border: 1px solid var(--border, #e5e5e5);
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .suggestion-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    text-decoration: none;
                    border-bottom: 1px solid #f4f3f0;
                    transition: background 0.2s;
                }
                .suggestion-item:last-child {
                    border-bottom: none;
                }
                .suggestion-item:hover {
                    background: #fcfbf8;
                }
                .suggestion-img {
                    width: 40px;
                    height: 40px;
                    border-radius: 4px;
                    object-fit: cover;
                    background: #f4f3f0;
                }
                .suggestion-text {
                    font-family: var(--font-sans);
                    font-size: 13px;
                    color: var(--ink, #111111);
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .no-results {
                    padding: 16px;
                    font-family: var(--font-sans);
                    font-size: 13px;
                    color: var(--stone, #78716c);
                    text-align: center;
                }

                /* Actions */
                .action-button {
                    background: none;
                    border: none;
                    font-family: var(--font-sans);
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--ink, #111111);
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    cursor: pointer;
                    white-space: nowrap;
                }

                /* Mobile Adjustments */
                @media (max-width: 900px) {
					.nav-left { gap: 16px; }
					.mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
                    .nav-links {
						display: none; /* Hide default inline links */
					}
					
					/* Mobile Menu Active State */
					.nav-links.mobile-active {
						display: flex;
						flex-direction: column;
						position: absolute;
						top: 80px;
						left: 0;
						width: 100%;
						height: calc(100vh - 80px);
						background: var(--white, #ffffff);
						padding: 32px 24px;
						gap: 32px;
					}
					.nav-links.mobile-active .nav-link {
						font-size: 18px;
						border-bottom: 1px solid var(--border, #e5e5e5);
						padding-bottom: 16px;
					}
                }

                @media (max-width: 600px) {
                    .axio-nav { padding: 0 16px; gap: 12px; }
                    .logo { font-size: 18px; }
					.nav-right { gap: 12px; }
                    .search-container { position: static; } /* Drops menu full width on mobile */
                    .search-dropdown { top: 80px; border-radius: 0; border-left: none; border-right: none; }
                }
            `}</style>

      <div className="nav-left">
        {/* Mobile Hamburger Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <Link
          to="/"
          className="logo"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Zaytaa
        </Link>

        <div className={`nav-links ${isMobileMenuOpen ? "mobile-active" : ""}`}>
          {navLinks.map((link) => (
            <NavLink
              key={link.url}
              to={link.url}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="nav-right">
        <div className="search-container" ref={searchRef}>
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="search-input"
              placeholder={placeholders[placeholderIndex]}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
            />
            <button type="submit" className="search-btn" aria-label="Search">
              <SearchIcon />
            </button>
          </form>

          {/* Auto-Suggest Dropdown */}
          {isFocused && searchQuery.trim().length >= 2 && (
            <div className="search-dropdown">
              {suggestions.length > 0 ? (
                suggestions.map((prod) => (
                  <Link
                    key={prod.slug}
                    to={`/product/${prod.slug}`}
                    className="suggestion-item"
                    onClick={() => {
                      setIsFocused(false);
                      setSearchQuery("");
                    }}
                  >
                    <img
                      src={prod.product_images?.[0]?.url || "/placeholder.jpg"}
                      alt={prod.name}
                      className="suggestion-img"
                    />
                    <span className="suggestion-text">{prod.name}</span>
                  </Link>
                ))
              ) : (
                <div className="no-results">No products found.</div>
              )}
            </div>
          )}
        </div>

        <button
          className="action-button"
          onClick={() => {
            setIsMobileMenuOpen(false);
            navigate("/checkout");
          }}
        >
          Bag ({cartCount})
        </button>
      </div>
    </nav>
  );
}

// Icons
const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const MenuIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const CloseIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
