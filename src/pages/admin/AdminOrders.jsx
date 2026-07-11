import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import React from "react";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Removed the complex SMS verification state. Kept only what is needed.
  const [editTxInputs, setEditTxInputs] = useState({});
  const [addPaymentInputs, setAddPaymentInputs] = useState({});

  const [activeTab, setActiveTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchOrders();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [page, activeTab, startDate, endDate]);

  async function fetchOrders() {
    setLoading(true);

    let query = supabase.from("orders").select(
      `
                *,
                order_items (
                    quantity,
                    price_at_purchase,
                    products ( name ),
                    product_variants ( name )
                )
            `,
      { count: "exact" },
    );

    if (activeTab !== "All") {
      query = query.eq("status", activeTab);
    }

    if (searchTerm) {
      const term = `%${searchTerm}%`;
      query = query.or(
        `display_id.ilike.${term},customer_name.ilike.${term},customer_phone.ilike.${term},customer_email.ilike.${term}`,
      );
    }

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }

  const handleStatusChange = async (orderId, newStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      alert("Failed to update status.");
    } else {
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order,
        ),
      );
    }
  };

  const handleUpdateTransactionId = async (orderId) => {
    const newTxId = editTxInputs[orderId];
    if (newTxId === undefined) return;

    const formattedTxId = newTxId.trim().toUpperCase();

    const { error } = await supabase
      .from("orders")
      .update({ transaction_id: formattedTxId })
      .eq("id", orderId);

    if (error) {
      alert("Failed to update Transaction ID.");
    } else {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, transaction_id: formattedTxId }
            : order,
        ),
      );
      alert("Transaction ID successfully saved!");
    }
  };

  const handleAddPayment = async (orderId, totalAmount, currentAdvance) => {
    const amountToAddStr = addPaymentInputs[orderId];
    if (!amountToAddStr) return;

    const amountToAdd = parseFloat(amountToAddStr);
    if (isNaN(amountToAdd)) {
      alert("Please enter a valid number");
      return;
    }

    const newAdvance = (parseFloat(currentAdvance) || 0) + amountToAdd;
    const dueAmount = Math.max(0, totalAmount - newAdvance);

    const { error } = await supabase
      .from("orders")
      .update({ advance_paid: newAdvance, due_amount: dueAmount })
      .eq("id", orderId);

    if (error) {
      alert("Failed to add payment.");
    } else {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, advance_paid: newAdvance, due_amount: dueAmount }
            : order,
        ),
      );
      setAddPaymentInputs((prev) => ({ ...prev, [orderId]: "" }));
      alert(`৳${amountToAdd} successfully added to the total paid!`);
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleExport = () => {
    if (orders.length === 0) {
      alert("No orders to export.");
      return;
    }

    const headers = [
      "Order ID",
      "Date",
      "Customer Name",
      "Phone",
      "Email",
      "Total (BDT)",
      "Amount Paid (BDT)",
      "Status",
      "Transaction ID",
      "Coupon Code",
    ];
    const csvRows = [headers.join(",")];

    orders.forEach((order) => {
      const row = [
        order.display_id,
        new Date(order.created_at).toLocaleDateString("en-GB"),
        `"${order.customer_name}"`,
        `"${order.customer_phone || ""}"`,
        `"${order.customer_email || ""}"`,
        order.total_amount,
        order.advance_paid || 0,
        order.status,
        order.transaction_id || "None",
        order.coupon_code || "None",
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `axiolab_orders_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return { bg: "#fff7ed", color: "#c2410c" };
      case "confirmed":
        return { bg: "#eff6ff", color: "#1d4ed8" };
      case "shipped":
        return { bg: "#f0fdf4", color: "#15803d" };
      case "cancelled":
        return { bg: "#fef2f2", color: "#b91c1c" };
      default:
        return { bg: "#f3f4f6", color: "#374151" };
    }
  };

  const getPaymentStatus = (advance, total) => {
    const adv = Number(advance) || 0;
    const tot = Number(total) || 0;
    if (adv >= tot)
      return { label: "Full Paid", bg: "#dcfce7", color: "#166534" };
    if (adv > 0)
      return { label: "Courier Paid", bg: "#fef08a", color: "#854d0e" };
    return { label: "Unpaid", bg: "#fee2e2", color: "#991b1b" };
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Orders</h1>
      </div>

      <div style={styles.tabsContainer}>
        {["All", "Pending", "Confirmed", "Shipped", "Cancelled"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tabButton,
              color: activeTab === tab ? "var(--ink)" : "var(--stone)",
              borderBottomColor:
                activeTab === tab ? "var(--ink)" : "transparent",
            }}
          >
            {tab} Orders
          </button>
        ))}
      </div>

      <div style={styles.actionRow}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search ID, Name, Email, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.actionButtons}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              ...styles.outlineBtn,
              background: showFilters ? "#eff6ff" : "white",
            }}
          >
            <span style={{ marginRight: "8px" }}>≡</span> Filter
          </button>
          <button onClick={handleExport} style={styles.outlineBtn}>
            <span style={{ marginRight: "8px" }}>↑</span> Export Page
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={styles.filterPanel}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.filterInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.filterInput}
            />
          </div>
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            style={styles.clearBtn}
          >
            Clear Dates
          </button>
        </div>
      )}

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.emptyState}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div style={styles.emptyState}>
            No orders match your search or filters.
          </div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Order ID</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Total & Coupon</th>
                  <th style={styles.th}>Payment</th>
                  <th style={styles.th}>Order Status</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const customerTx = order.transaction_id || "";
                  const badgeStyle = getBadgeStyle(order.status);
                  const paymentBadge = getPaymentStatus(
                    order.advance_paid,
                    order.total_amount,
                  );

                  const advance = Number(order.advance_paid) || 0;
                  const total = Number(order.total_amount) || 0;
                  const isCourierPaid = advance > 0;
                  const isTotalPaid = advance >= total;

                  return (
                    <React.Fragment key={order.id}>
                      <tr style={styles.tr}>
                        <td style={styles.td}>
                          <span style={styles.trackingId}>
                            {order.display_id}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.grayText}>
                            {new Date(order.created_at).toLocaleDateString(
                              "en-GB",
                            )}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.primaryText}>
                            {order.customer_name}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.primaryText}>
                            ৳{order.total_amount.toFixed(2)}
                          </div>
                          {order.coupon_code ? (
                            <div
                              style={{
                                marginTop: "4px",
                                display: "inline-flex",
                                background: "#f3f4f6",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontFamily: "var(--font-mono)",
                                color: "var(--ink)",
                                fontWeight: 600,
                              }}
                            >
                              🎫 {order.coupon_code}
                            </div>
                          ) : (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "11px",
                                color: "var(--stone)",
                              }}
                            >
                              No Coupon
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: 600,
                              backgroundColor: paymentBadge.bg,
                              color: paymentBadge.color,
                            }}
                          >
                            {paymentBadge.label}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusChange(order.id, e.target.value)
                            }
                            style={{
                              ...styles.statusSelect,
                              backgroundColor: badgeStyle.bg,
                              color: badgeStyle.color,
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          <button
                            onClick={() => toggleExpand(order.id)}
                            style={styles.dotsBtn}
                          >
                            •••
                          </button>
                        </td>
                      </tr>

                      {expandedOrderId === order.id && (
                        <tr>
                          <td colSpan="7" style={styles.expandedCell}>
                            <div style={styles.expandedContent}>
                              <div style={styles.infoGrid}>
                                {/* --- SIMPLIFIED PAYMENT MANAGER --- */}
                                <div style={styles.verificationCard}>
                                  <div style={styles.verificationHeader}>
                                    <span style={styles.label}>
                                      MANAGE PAYMENT
                                    </span>
                                  </div>

                                  <div style={styles.verificationBody}>
                                    <div style={styles.txRow}>
                                      <span style={styles.grayText}>
                                        Add Received Amount (৳):
                                      </span>
                                      <div
                                        style={{ display: "flex", gap: "8px" }}
                                      >
                                        <input
                                          type="number"
                                          placeholder="Amount"
                                          value={
                                            addPaymentInputs[order.id] || ""
                                          }
                                          onChange={(e) =>
                                            setAddPaymentInputs({
                                              ...addPaymentInputs,
                                              [order.id]: e.target.value,
                                            })
                                          }
                                          style={{
                                            ...styles.verifyInput,
                                            width: "120px",
                                          }}
                                        />
                                        <button
                                          onClick={() =>
                                            handleAddPayment(
                                              order.id,
                                              order.total_amount,
                                              order.advance_paid,
                                            )
                                          }
                                          style={styles.saveBtn}
                                        >
                                          Add
                                        </button>
                                      </div>
                                    </div>

                                    <div style={styles.txRow}>
                                      <span style={styles.grayText}>
                                        Reference TrxID:
                                      </span>
                                      <div
                                        style={{ display: "flex", gap: "8px" }}
                                      >
                                        <input
                                          type="text"
                                          placeholder={
                                            customerTx || "Leave blank if none"
                                          }
                                          value={
                                            editTxInputs[order.id] !== undefined
                                              ? editTxInputs[order.id]
                                              : order.transaction_id || ""
                                          }
                                          onChange={(e) =>
                                            setEditTxInputs({
                                              ...editTxInputs,
                                              [order.id]: e.target.value,
                                            })
                                          }
                                          style={{
                                            ...styles.verifyInput,
                                            width: "160px",
                                            textTransform: "uppercase",
                                          }}
                                        />
                                        <button
                                          onClick={() =>
                                            handleUpdateTransactionId(order.id)
                                          }
                                          style={styles.outlineSaveBtn}
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        margin: "8px 0",
                                        borderTop: "1px solid #e2e8f0",
                                      }}
                                    ></div>

                                    <div
                                      style={{
                                        marginTop: "8px",
                                        padding: "16px",
                                        background: "#f8fafc",
                                        borderRadius: "8px",
                                        border: "1px solid #e2e8f0",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          marginBottom: "8px",
                                        }}
                                      >
                                        <span style={styles.grayText}>
                                          Total Money Received:
                                        </span>
                                        <strong style={styles.monoText}>
                                          ৳
                                          {(order.advance_paid || 0).toFixed(2)}
                                        </strong>
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          marginBottom: "16px",
                                          paddingBottom: "16px",
                                          borderBottom: "1px solid #e2e8f0",
                                        }}
                                      >
                                        <span style={styles.grayText}>
                                          Courier Charge:
                                        </span>
                                        <strong
                                          style={{
                                            color: isCourierPaid
                                              ? "var(--green)"
                                              : "#c2410c",
                                          }}
                                        >
                                          {isCourierPaid ? "PAID" : "DUE"}
                                        </strong>
                                      </div>

                                      {order.coupon_code && (
                                        <div
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: "16px",
                                          }}
                                        >
                                          <span style={styles.grayText}>
                                            Coupon Used:
                                          </span>
                                          <strong
                                            style={{
                                              ...styles.monoText,
                                              color: "var(--ink)",
                                              background: "#e5e7eb",
                                              padding: "2px 8px",
                                              borderRadius: "4px",
                                              fontSize: "12px",
                                            }}
                                          >
                                            {order.coupon_code}
                                          </strong>
                                        </div>
                                      )}

                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                        }}
                                      >
                                        <span
                                          style={{
                                            ...styles.primaryText,
                                            fontWeight: 700,
                                          }}
                                        >
                                          Total Order Price (৳
                                          {(order.total_amount || 0).toFixed(2)}
                                          ):
                                        </span>
                                        <strong
                                          style={{
                                            color: isTotalPaid
                                              ? "white"
                                              : "#991b1b",
                                            backgroundColor: isTotalPaid
                                              ? "var(--green)"
                                              : "#fee2e2",
                                            padding: "4px 8px",
                                            borderRadius: "4px",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                          }}
                                        >
                                          {isTotalPaid ? "PAID" : "DUE"}
                                        </strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div style={styles.infoBlock}>
                                  <span style={styles.label}>
                                    SHIPPING DETAILS
                                  </span>
                                  <div style={styles.addressBox}>
                                    <strong style={styles.primaryText}>
                                      {order.customer_name}
                                    </strong>
                                    <div
                                      style={{
                                        color: "var(--ink)",
                                        marginTop: "4px",
                                      }}
                                    >
                                      {order.shipping_address}
                                    </div>
                                    <div
                                      style={{
                                        marginTop: "8px",
                                        paddingTop: "8px",
                                        borderTop: "1px solid var(--border)",
                                      }}
                                    >
                                      <span style={styles.grayText}>
                                        Phone:{" "}
                                      </span>{" "}
                                      <strong style={styles.primaryText}>
                                        {order.customer_phone}
                                      </strong>
                                      <br />
                                      <span style={styles.grayText}>
                                        Email:{" "}
                                      </span>{" "}
                                      <strong style={styles.primaryText}>
                                        {order.customer_email}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div style={{ marginTop: "32px" }}>
                                <span style={styles.label}>
                                  FULL ORDER MANIFEST
                                </span>
                                <div style={styles.itemsList}>
                                  {order.order_items.map((item, idx) => (
                                    <div key={idx} style={styles.itemRow}>
                                      <div>
                                        <strong style={styles.primaryText}>
                                          {item.products?.name ||
                                            "Unknown Product"}
                                        </strong>
                                        {item.product_variants && (
                                          <span
                                            style={{
                                              ...styles.grayText,
                                              marginLeft: "8px",
                                            }}
                                          >
                                            (Size: {item.product_variants.name})
                                          </span>
                                        )}
                                      </div>
                                      <div style={styles.monoText}>
                                        {item.quantity}{" "}
                                        <span style={styles.grayText}>x</span> ৳
                                        {item.price_at_purchase.toFixed(2)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            <div style={styles.paginationFooter}>
              <span style={styles.grayText}>
                Showing {orders.length} of {totalCount} orders
              </span>
              <div style={styles.pageControls}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{ ...styles.pageBtn, opacity: page === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <span style={styles.primaryText}>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{
                    ...styles.pageBtn,
                    opacity: page === totalPages ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    padding: "40px",
    maxWidth: "1400px",
    margin: "0 auto",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
  },
  header: { marginBottom: "24px" },
  title: {
    fontFamily: "var(--font-sans)",
    fontSize: "28px",
    fontWeight: 700,
    color: "var(--ink)",
    margin: 0,
  },

  tabsContainer: {
    display: "flex",
    gap: "24px",
    borderBottom: "1px solid #e2e8f0",
    marginBottom: "24px",
  },
  tabButton: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "0 0 12px 0",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  actionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  searchWrapper: { position: "relative", width: "400px" },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9ca3af",
    fontSize: "14px",
  },
  searchInput: {
    width: "100%",
    padding: "10px 10px 10px 36px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },

  actionButtons: { display: "flex", gap: "12px" },
  outlineBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #2563eb",
    color: "#2563eb",
    background: "white",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "background 0.2s",
  },

  filterPanel: {
    display: "flex",
    alignItems: "flex-end",
    gap: "16px",
    padding: "20px",
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "24px",
    animation: "slideDown 0.2s ease-out",
  },
  filterGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  filterLabel: {
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  filterInput: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    outline: "none",
    color: "var(--ink)",
  },
  clearBtn: {
    padding: "10px 16px",
    background: "none",
    border: "none",
    color: "#6b7280",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "underline",
    cursor: "pointer",
  },

  tableContainer: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: {
    padding: "16px 24px",
    background: "white",
    borderBottom: "1px solid #e2e8f0",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--ink)",
  },
  tr: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "16px 24px", verticalAlign: "middle" },

  primaryText: {
    fontFamily: "var(--font-sans)",
    color: "#111827",
    fontWeight: 500,
    fontSize: "14px",
  },
  grayText: {
    fontFamily: "var(--font-sans)",
    color: "#6b7280",
    fontSize: "14px",
  },
  trackingId: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 500,
    color: "#111827",
  },

  statusSelect: {
    padding: "6px 12px",
    borderRadius: "6px",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    border: "none",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    textAlign: "center",
  },
  dotsBtn: {
    background: "transparent",
    border: "none",
    color: "#9ca3af",
    fontSize: "18px",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "4px",
    transition: "background 0.2s",
  },

  expandedCell: { padding: 0, background: "#f8fafc" },
  expandedContent: { padding: "32px 48px", borderLeft: "4px solid #2563eb" },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "32px",
    alignItems: "start",
  },
  infoBlock: { display: "flex", flexDirection: "column" },
  addressBox: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    padding: "20px",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  verificationCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    overflow: "hidden",
  },
  verificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f1f5f9",
    padding: "12px 20px",
    borderBottom: "1px solid #e2e8f0",
  },
  verificationBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  txRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
  },
  verifyInput: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    outline: "none",
    width: "200px",
    transition: "all 0.2s",
  },
  saveBtn: {
    padding: "10px 16px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  outlineSaveBtn: {
    padding: "10px 16px",
    background: "white",
    color: "#2563eb",
    border: "1px solid #2563eb",
    borderRadius: "6px",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },

  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "16px",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "12px",
    borderBottom: "1px solid #f1f5f9",
  },

  monoText: {
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--ink)",
    letterSpacing: "0.05em",
  },
  label: {
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "block",
    marginBottom: "8px",
  },

  emptyState: {
    padding: "60px",
    textAlign: "center",
    fontFamily: "var(--font-sans)",
    color: "#6b7280",
    fontSize: "15px",
  },

  paginationFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    background: "white",
    borderTop: "1px solid #e2e8f0",
  },
  pageControls: { display: "flex", alignItems: "center", gap: "16px" },
  pageBtn: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    background: "white",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--ink)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
