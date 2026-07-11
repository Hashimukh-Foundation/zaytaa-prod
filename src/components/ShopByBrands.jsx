import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function ShopByBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBrands() {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, slug");

      if (!error && data) {
        setBrands(data);
      }
      setLoading(false);
    }
    fetchBrands();
  }, []);

  if (loading || brands.length === 0) return null;

  return (
    <section className="brands-section" style={styles.section}>
      {/* Injecting CSS specifically to handle mobile grids */}
      <style>{`
				.brands-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
					gap: 24px;
				}
				
				/* Mobile styling to force 2 columns and scale down text */
				@media (max-width: 600px) {
					.brands-section {
						padding: 40px 16px !important; 
					}
					.brands-grid {
						grid-template-columns: repeat(2, 1fr);
						gap: 12px; 
					}
					.brand-card {
						padding: 16px !important;
					}
					.brand-name {
						font-size: 18px !important;
					}
					.explore-btn {
						font-size: 10px !important;
						letter-spacing: 0.05em !important;
					}
				}
			`}</style>

      <div style={styles.header}>
        <p style={styles.eyebrow}>Curated for you</p>
        <h2 style={styles.heading}>Our Brands</h2>
      </div>

      <div className="brands-grid">
        {brands.map((brand) => {
          return (
            <Link
              key={brand.id}
              to={`/shop?brand=${brand.slug}`}
              style={styles.cardLink}
            >
              <div
                className="brand-card"
                style={styles.cardContainer}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--ink)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 30px rgba(0,0,0,0.06)";
                  e.currentTarget.style.background = "var(--ink)";

                  const name = e.currentTarget.querySelector(".brand-name");
                  name.style.color = "var(--white)";

                  const btn = e.currentTarget.querySelector(".explore-btn");
                  btn.style.color = "var(--white)";
                  btn.style.opacity = "1";
                  btn.style.transform = "translateY(0)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "#e6eaf0";

                  const name = e.currentTarget.querySelector(".brand-name");
                  name.style.color = "var(--ink)";

                  const btn = e.currentTarget.querySelector(".explore-btn");
                  btn.style.color = "var(--stone)";
                  btn.style.opacity = "0";
                  btn.style.transform = "translateY(10px)";
                }}
              >
                <div style={styles.contentWrapper}>
                  <h3 className="brand-name" style={styles.brandName}>
                    {brand.name}
                  </h3>

                  <div className="explore-btn" style={styles.exploreText}>
                    Explore &rarr;
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: "80px 40px",
    background: "var(--white)",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "40px", // Reduced slightly for better flow
  },
  eyebrow: {
    fontFamily: "var(--font-sans)",
    fontSize: "11px",
    letterSpacing: "0.2em",
    color: "var(--stone)",
    marginBottom: "16px",
    textTransform: "uppercase",
  },
  heading: {
    fontFamily: "var(--font-serif)",
    fontSize: "clamp(28px, 5vw, 56px)",
    fontWeight: 700,
    color: "var(--ink)",
    margin: 0,
  },
  cardLink: {
    textDecoration: "none",
    display: "block",
  },
  cardContainer: {
    aspectRatio: "1 / 1",
    background: "#e6eaf0",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "24px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  contentWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  brandName: {
    fontFamily: "var(--font-serif)",
    fontSize: "28px",
    fontWeight: 400,
    color: "var(--ink)",
    margin: 0,
    transition: "color 0.3s ease",
  },
  exploreText: {
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    fontWeight: 500,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--stone)",
    opacity: 0,
    transform: "translateY(10px)",
    transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  },
};
