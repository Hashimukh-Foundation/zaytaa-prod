import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

// --- ELEGANT TOAST NOTIFICATION ---
const Toast = ({ message, type }) => {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div
      style={{
        ...styles.toast,
        background: isError ? "#fef2f2" : "#fff",
        color: isError ? "#b91c1c" : "var(--ink)",
        border: isError ? "1px solid #fca5a5" : "1px solid var(--border)",
      }}
    >
      {message}
    </div>
  );
};

export default function CouponManager() {
  // --- STATE ---
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: "",
    min: "",
    limit: "",
  });

  // --- HELPERS ---
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  // --- FETCH DATA ---
  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Failed to load coupons", "error");
    } else {
      setCoupons(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // --- ACTIONS ---
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.value) {
      showToast("Code and Value are required", "error");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("coupons").insert([
      {
        code: formData.code.toUpperCase().trim(),
        discount_type: formData.type,
        discount_value: parseFloat(formData.value),
        min_spend: parseFloat(formData.min) || 0,
        usage_limit: formData.limit ? parseInt(formData.limit) : null,
      },
    ]);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Coupon created successfully!");
      setFormData({
        code: "",
        type: "percentage",
        value: "",
        min: "",
        limit: "",
      });
      fetchCoupons();
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (coupon) => {
    const newStatus = !coupon.is_active;
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: newStatus })
      .eq("id", coupon.id);

    if (error) {
      showToast("Failed to update status", "error");
    } else {
      showToast(`Coupon ${newStatus ? "Activated" : "Deactivated"}`);
      fetchCoupons();
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`))
      return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);

    if (error) {
      showToast("Failed to delete coupon", "error");
    } else {
      showToast("Coupon deleted permanently");
      fetchCoupons();
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <Toast message={toast.message} type={toast.type} />

      <div style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>Discount Codes</h2>
          <p style={styles.subtitle}>Manage promotional codes and rules</p>
        </div>
      </div>

      {/* CREATE COUPON FORM */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Create New Coupon</h3>
        <form onSubmit={handleCreate}>
          <div style={styles.grid3}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. SUMMER20"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                style={{ ...styles.input, textTransform: "uppercase" }}
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Discount Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                style={styles.select}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (৳)</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Discount Value</label>
              <input
                type="number"
                step="0.01"
                placeholder={
                  formData.type === "percentage"
                    ? "e.g. 10 for 10%"
                    : "e.g. 500 for ৳500"
                }
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Minimum Spend Requirement (৳)</label>
              <input
                type="number"
                placeholder="Leave empty for no minimum"
                value={formData.min}
                onChange={(e) =>
                  setFormData({ ...formData, min: e.target.value })
                }
                style={styles.input}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Total Usage Limit</label>
              <input
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.limit}
                onChange={(e) =>
                  setFormData({ ...formData, limit: e.target.value })
                }
                style={styles.input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={styles.btnPrimary}
          >
            {isSubmitting ? "Creating..." : "Generate Coupon"}
          </button>
        </form>
      </div>

      {/* COUPON LIST */}
      <div style={{ marginTop: "40px" }}>
        <div style={styles.header}>
          <h3 style={styles.cardTitle}>Existing Coupons ({coupons.length})</h3>
        </div>

        {loading ? (
          <p style={styles.emptyText}>Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p style={styles.emptyText}>No coupons have been created yet.</p>
        ) : (
          <div style={styles.cardGrid}>
            {coupons.map((c) => (
              <div
                key={c.id}
                style={{
                  ...styles.couponCard,
                  opacity: c.is_active ? 1 : 0.6,
                  borderColor: c.is_active ? "var(--border)" : "#e5e7eb",
                }}
              >
                <div style={styles.couponHeader}>
                  <h4 style={styles.couponCode}>{c.code}</h4>
                  <span
                    style={{
                      ...styles.badge,
                      background: c.is_active
                        ? "var(--green-light)"
                        : "#f3f4f6",
                      color: c.is_active ? "var(--green)" : "var(--stone)",
                    }}
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div style={styles.couponDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Discount:</span>
                    <span style={styles.detailValue}>
                      {c.discount_type === "percentage"
                        ? `${c.discount_value}% OFF`
                        : `৳${c.discount_value} OFF`}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Min Spend:</span>
                    <span style={styles.detailValue}>
                      {c.min_spend > 0 ? `৳${c.min_spend}` : "None"}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Usage:</span>
                    <span
                      style={{
                        ...styles.detailValue,
                        color:
                          c.usage_limit && c.used_count >= c.usage_limit
                            ? "#d9534f"
                            : "var(--ink)",
                      }}
                    >
                      {c.used_count} / {c.usage_limit || "∞"}
                    </span>
                  </div>
                </div>

                <div style={styles.couponActions}>
                  <button
                    onClick={() => handleToggleStatus(c)}
                    style={{
                      ...styles.actionBtn,
                      color: c.is_active ? "var(--stone)" : "var(--green)",
                    }}
                  >
                    {c.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.code)}
                    style={{ ...styles.actionBtn, color: "#d9534f" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  toast: {
    position: "fixed",
    bottom: "32px",
    right: "32px",
    padding: "16px 24px",
    borderRadius: "12px",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 500,
    zIndex: 9999,
    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
  },

  pageWrapper: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 24px",
    minHeight: "80vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
  },
  pageTitle: {
    fontFamily: "var(--font-serif)",
    fontSize: "32px",
    color: "var(--ink)",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    color: "var(--stone)",
    margin: 0,
  },

  card: {
    background: "white",
    padding: "32px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
  },
  cardTitle: {
    fontFamily: "var(--font-sans)",
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--ink)",
    margin: "0 0 24px 0",
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: {
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--stone)",
  },
  input: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
  },
  select: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
    cursor: "pointer",
  },

  btnPrimary: {
    background: "var(--ink)",
    color: "#fff",
    padding: "14px 24px",
    borderRadius: "8px",
    border: "none",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },

  emptyText: {
    padding: "24px 0",
    color: "var(--stone)",
    fontFamily: "var(--font-sans)",
    fontSize: "15px",
  },

  // Coupon Card Grid
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "24px",
  },
  couponCard: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    transition: "all 0.2s",
  },
  couponHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: "1px dashed var(--border)",
  },
  couponCode: {
    fontFamily: "var(--font-mono)",
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--ink)",
    margin: 0,
    letterSpacing: "1px",
  },
  badge: {
    fontSize: "11px",
    padding: "4px 10px",
    borderRadius: "100px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 600,
  },

  couponDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "20px",
    flex: 1,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    color: "var(--stone)",
  },
  detailValue: {
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--ink)",
  },

  couponActions: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid var(--border)",
    paddingTop: "16px",
    marginTop: "auto",
  },
  actionBtn: {
    background: "none",
    border: "none",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },
};
