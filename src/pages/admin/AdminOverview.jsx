import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export default function AdminOverview({ setActiveTab }) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all");
  const [recentOrders, setRecentOrders] = useState([]);
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    totalRevenue: 0,
    advanceCollected: 0,
    pendingCod: 0,
    orderCount: 0,
    aov: 0,
  });

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);

      // 1. Get Product & Category counts
      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      const { count: categoryCount } = await supabase
        .from("categories")
        .select("*", { count: "exact", head: true });

      // 2. Fetch Orders for Financials (Excluding Cancelled)
      let query = supabase
        .from("orders")
        .select(
          "display_id, customer_name, total_amount, advance_paid, due_amount, status, created_at",
        )
        .neq("status", "Cancelled")
        .order("created_at", { ascending: false });

      // Apply Time Filters
      if (timeRange !== "all") {
        const now = new Date();
        let startDate = new Date();

        if (timeRange === "today") {
          startDate.setHours(0, 0, 0, 0);
        } else if (timeRange === "week") {
          startDate.setDate(now.getDate() - 7);
        } else if (timeRange === "month") {
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
        }

        query = query.gte("created_at", startDate.toISOString());
      }

      const { data, error } = await query;

      if (!error && data) {
        let revenue = 0;
        let advance = 0;
        let cod = 0;

        data.forEach((order) => {
          revenue += Number(order.total_amount) || 0;
          advance += Number(order.advance_paid) || 0;
          cod += Number(order.due_amount) || 0;
        });

        setStats({
          products: productCount || 0,
          categories: categoryCount || 0,
          totalRevenue: revenue,
          advanceCollected: advance,
          pendingCod: cod,
          orderCount: data.length,
          aov: data.length > 0 ? revenue / data.length : 0,
        });

        // Store latest 5 for the preview table
        setRecentOrders(data.slice(0, 5));
      }

      setLoading(false);
    }

    fetchDashboardData();
  }, [timeRange]);

  return (
    <div>
      <div style={styles.headerRow}>
        <h2 style={styles.pageTitle}>Overview</h2>

        <div style={styles.filterContainer}>
          {["today", "week", "month", "all"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                ...styles.filterBtn,
                background: timeRange === range ? "var(--ink)" : "white",
                color: timeRange === range ? "white" : "var(--stone)",
                borderColor:
                  timeRange === range ? "var(--ink)" : "var(--border)",
              }}
            >
              {range === "today"
                ? "Today"
                : range === "week"
                  ? "Last 7 Days"
                  : range === "month"
                    ? "This Month"
                    : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingState}>Loading dashboard data...</div>
      ) : (
        <>
          {/* FINANCIAL STAT CARDS */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.cardHeader}>
                <span style={styles.statLabel}>Gross Revenue</span>
                <WalletIcon />
              </div>
              <h3 style={styles.statNumber}>
                ৳
                {stats.totalRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              <div style={styles.cardSub}>
                Total from {stats.orderCount} orders
              </div>
            </div>

            <div
              style={{
                ...styles.statCard,
                background: "#f0fdf4",
                borderColor: "#bbf7d0",
              }}
            >
              <div style={styles.cardHeader}>
                <span style={styles.statLabel}>Cash in Hand (bKash)</span>
                <BankIcon />
              </div>
              <h3 style={{ ...styles.statNumber, color: "#166534" }}>
                ৳
                {stats.advanceCollected.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              <div style={{ ...styles.cardSub, color: "#15803d" }}>
                Advance collected
              </div>
            </div>

            <div
              style={{
                ...styles.statCard,
                background: "#fff7ed",
                borderColor: "#fed7aa",
              }}
            >
              <div style={styles.cardHeader}>
                <span style={styles.statLabel}>Pending COD</span>
                <TruckIcon />
              </div>
              <h3 style={{ ...styles.statNumber, color: "#c2410c" }}>
                ৳
                {stats.pendingCod.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              <div style={{ ...styles.cardSub, color: "#c2410c" }}>
                Money with courier riders
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.cardHeader}>
                <span style={styles.statLabel}>Avg. Order Value</span>
                <TrendingIcon />
              </div>
              <h3 style={styles.statNumber}>
                ৳
                {stats.aov.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              <div style={styles.cardSub}>Average spend per customer</div>
            </div>
          </div>

          {/* INVENTORY STATS */}
          <div style={{ ...styles.statsGrid, marginTop: "24px" }}>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Total Products</p>
              <h3 style={styles.statNumber}>{stats.products}</h3>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Categories</p>
              <h3 style={styles.statNumber}>{stats.categories}</h3>
            </div>
          </div>

          {/* RECENT TRANSACTIONS TABLE */}
          <div style={styles.recentSection}>
            <div style={styles.recentHeader}>
              <h2 style={styles.recentTitle}>Recent Transactions</h2>
              <button
                onClick={() => setActiveTab("orders")}
                style={styles.viewAllLink}
              >
                View All Orders &rarr;
              </button>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Order ID</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>Advance</th>
                    <th style={styles.th}>Due (COD)</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={styles.emptyTable}>
                        No orders found for this time period.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.display_id} style={styles.tr}>
                        <td
                          style={{
                            ...styles.td,
                            fontFamily: "var(--font-mono)",
                            fontWeight: 600,
                          }}
                        >
                          {order.display_id}
                        </td>
                        <td style={styles.td}>{order.customer_name}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>
                          ৳{Number(order.total_amount).toFixed(2)}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            color: "var(--green)",
                            fontWeight: 600,
                          }}
                        >
                          ৳{Number(order.advance_paid).toFixed(2)}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            color: "#c2410c",
                            fontWeight: 600,
                          }}
                        >
                          ৳{Number(order.due_amount).toFixed(2)}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background:
                                order.status === "Pending"
                                  ? "#fff7ed"
                                  : order.status === "Shipped"
                                    ? "#f0fdf4"
                                    : "#f3f4f6",
                              color:
                                order.status === "Pending"
                                  ? "#c2410c"
                                  : order.status === "Shipped"
                                    ? "#15803d"
                                    : "var(--ink)",
                            }}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Icons
const WalletIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6b7280"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);
const BankIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#15803d"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);
const TruckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#c2410c"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 17h4V5H2v12h3" />
    <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
    <path d="M14 17h1" />
    <circle cx="7.5" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);
const TrendingIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6b7280"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px",
  },
  pageTitle: {
    fontFamily: "var(--font-serif)",
    fontSize: "32px",
    color: "var(--ink)",
    margin: 0,
  },
  filterContainer: {
    display: "flex",
    gap: "8px",
    background: "white",
    padding: "4px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
  },
  filterBtn: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid transparent",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  loadingState: { padding: "40px", textAlign: "center", color: "var(--stone)" },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "24px",
  },
  statCard: {
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: "14px",
    color: "var(--stone)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statNumber: {
    fontFamily: "var(--font-mono)",
    fontSize: "32px",
    color: "var(--ink)",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    margin: 0,
  },
  cardSub: {
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    color: "var(--stone)",
  },
  recentSection: {
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "24px",
    marginTop: "32px",
  },
  recentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  recentTitle: {
    fontFamily: "var(--font-sans)",
    fontSize: "18px",
    color: "var(--ink)",
    margin: 0,
  },
  viewAllLink: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 600,
    color: "#2563eb",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
  },
  tableContainer: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: {
    padding: "16px",
    borderBottom: "1px solid #e2e8f0",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--stone)",
    textTransform: "uppercase",
  },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: {
    padding: "16px",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    color: "var(--ink)",
    verticalAlign: "middle",
  },
  emptyTable: { textAlign: "center", padding: "32px", color: "var(--stone)" },
};
