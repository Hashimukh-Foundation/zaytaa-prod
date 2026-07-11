import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function TrackOrder() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [ordersList, setOrdersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [newTxIds, setNewTxIds] = useState({});
  const [isUpdatingTx, setIsUpdatingTx] = useState(false);
  const [txMessages, setTxMessages] = useState({});

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setOrdersList([]);
    setHasSearched(false);
    setTxMessages({});
    setNewTxIds({});

    if (!phoneNumber.trim()) return;

    setLoading(true);

    try {
      const { data: orders, error: orderError } = await supabase.rpc(
        "get_orders_by_phone",
        { p_phone: phoneNumber.trim() },
      );

      if (orderError) throw orderError;

      if (!orders || orders.length === 0) {
        setErrorMsg("We couldn't find any orders with that phone number.");
      } else {
        setOrdersList(orders);
      }
      setHasSearched(true);
    } catch (err) {
      console.error("Tracking error:", err);
      setErrorMsg("An error occurred while looking up your orders.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTransaction = async (e, displayId) => {
    e.preventDefault();
    const txIdToSave = newTxIds[displayId];
    if (!txIdToSave || !txIdToSave.trim()) return;

    setIsUpdatingTx(true);
    setTxMessages((prev) => ({ ...prev, [displayId]: { type: "", text: "" } }));

    try {
      const formattedTxId = txIdToSave.trim().toUpperCase();
      const { error } = await supabase
        .from("orders")
        .update({ transaction_id: formattedTxId })
        .eq("display_id", displayId);

      if (error) throw error;

      setOrdersList((prevOrders) =>
        prevOrders.map((order) =>
          order.display_id === displayId
            ? { ...order, transaction_id: formattedTxId }
            : order,
        ),
      );

      setTxMessages((prev) => ({
        ...prev,
        [displayId]: { type: "success", text: "Transaction ID updated!" },
      }));

      setNewTxIds((prev) => ({ ...prev, [displayId]: "" }));
    } catch (err) {
      console.error("Update error:", err);
      setTxMessages((prev) => ({
        ...prev,
        [displayId]: {
          type: "error",
          text: "Failed to update Transaction ID.",
        },
      }));
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "var(--green)";
      case "shipped":
        return "#0056b3";
      case "cancelled":
        return "#c94040";
      default:
        return "#f59e0b";
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Track Your Orders</h1>
        <p style={styles.bodyText}>
          Enter your phone number below to check the status of your recent
          purchases.
        </p>
      </div>

      <div style={styles.searchBox}>
        <form onSubmit={handleTrackOrder} style={styles.form}>
          <input
            type="tel"
            placeholder="e.g. 017XXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" disabled={loading} style={styles.searchBtn}>
            {loading ? "Searching..." : "Track"}
          </button>
        </form>
        {errorMsg && <div style={styles.error}>{errorMsg}</div>}
      </div>

      {hasSearched && ordersList.length > 0 && (
        <div
          style={{
            marginBottom: "24px",
            fontFamily: "var(--font-sans)",
            color: "var(--stone)",
            fontSize: "14px",
          }}
        >
          Found {ordersList.length} order{ordersList.length > 1 ? "s" : ""} for
          this number:
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {ordersList.map((orderData) => {
          const advance = Number(orderData.advance_paid) || 0;
          const isPaymentReceived = advance > 0;

          const msg = txMessages[orderData.display_id];

          return (
            <div key={orderData.display_id} style={styles.resultCard}>
              <div style={styles.resultHeader}>
                <div>
                  <span style={styles.label}>ORDER ID</span>
                  <div style={styles.monoText}>{orderData.display_id}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={styles.label}>ORDER STATUS</span>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(orderData.status),
                      color: "white",
                    }}
                  >
                    {orderData.status.toUpperCase()}
                  </div>
                </div>
              </div>

              <div style={styles.detailsGrid}>
                <div style={styles.detailBlock}>
                  <span style={styles.label}>SHIPPING TO</span>
                  <div style={styles.valueText}>{orderData.customer_name}</div>
                  <div style={styles.valueText}>
                    {orderData.shipping_address}
                  </div>
                </div>

                <div style={styles.detailBlock}>
                  <span style={styles.label}>ORDER DATE</span>
                  <div style={styles.valueText}>
                    {new Date(orderData.created_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.itemsSection}>
                <span style={styles.label}>ITEMS ORDERED</span>
                <div style={styles.itemList}>
                  {orderData.order_items.map((item, idx) => (
                    <div key={idx} style={styles.itemRow}>
                      <div>
                        <div style={styles.itemName}>
                          {item.products?.name || "Unknown Product"}
                        </div>
                        {item.product_variants && (
                          <div style={styles.itemVariant}>
                            Size: {item.product_variants.name}
                          </div>
                        )}
                      </div>
                      <div style={styles.itemPriceQty}>
                        {item.quantity} x ৳{item.price_at_purchase.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.paymentSection}>
                <span style={styles.label}>PAYMENT INFORMATION</span>
                <div style={styles.paymentBox}>
                  <div style={styles.currentTxRow}>
                    <span style={styles.valueText}>Customer TrxID:</span>
                    {orderData.transaction_id ? (
                      <strong style={styles.monoText}>
                        {orderData.transaction_id}
                      </strong>
                    ) : (
                      <span
                        style={{
                          color: "#c94040",
                          fontWeight: 500,
                          fontFamily: "var(--font-sans)",
                          fontSize: "14px",
                        }}
                      >
                        None Provided
                      </span>
                    )}
                  </div>

                  {orderData.status.toLowerCase() === "pending" && (
                    <div style={styles.updateTxContainer}>
                      <p
                        style={{
                          ...styles.bodyText,
                          fontSize: "13px",
                          margin: "0 0 12px 0",
                        }}
                      >
                        Need to add or update your payment TrxID? Enter it
                        below.
                      </p>
                      <form
                        onSubmit={(e) =>
                          handleUpdateTransaction(e, orderData.display_id)
                        }
                        style={styles.txForm}
                      >
                        <input
                          type="text"
                          placeholder="Enter bKash/Nagad TrxID"
                          value={newTxIds[orderData.display_id] || ""}
                          onChange={(e) =>
                            setNewTxIds((prev) => ({
                              ...prev,
                              [orderData.display_id]: e.target.value,
                            }))
                          }
                          style={styles.txInput}
                          required
                        />
                        <button
                          type="submit"
                          disabled={isUpdatingTx}
                          style={styles.txBtn}
                        >
                          {isUpdatingTx ? "..." : "Update"}
                        </button>
                      </form>
                      {msg && msg.text && (
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "13px",
                            fontFamily: "var(--font-sans)",
                            fontWeight: 500,
                            color:
                              msg.type === "success"
                                ? "var(--green)"
                                : "#c94040",
                          }}
                        >
                          {msg.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.summaryContainer}>
                {/* ---> "Payment Received" Indicator <--- */}
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Payment Received?</span>
                  <span
                    style={{
                      ...styles.summaryBadge,
                      backgroundColor: isPaymentReceived
                        ? "var(--green)"
                        : "#fee2e2",
                      color: isPaymentReceived ? "white" : "#991b1b",
                    }}
                  >
                    {isPaymentReceived
                      ? `YES (৳${advance.toFixed(2)})`
                      : "NO (Pending)"}
                  </span>
                </div>

                {orderData.coupon_code && (
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Coupon Applied</span>
                    <span
                      style={{
                        ...styles.summaryBadge,
                        backgroundColor: "#e5e7eb",
                        color: "var(--ink)",
                      }}
                    >
                      {orderData.coupon_code}
                    </span>
                  </div>
                )}

                <div style={styles.summaryTotalRow}>
                  <span style={styles.summaryTotalLabel}>
                    Total Order Price
                  </span>
                  <span
                    style={{
                      ...styles.summaryBadge,
                      fontSize: "16px",
                      backgroundColor: "transparent",
                      color: "var(--ink)",
                    }}
                  >
                    ৳{(orderData.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "60px 24px",
    minHeight: "70vh",
  },
  header: { textAlign: "center", marginBottom: "40px" },
  title: {
    fontFamily: "var(--font-serif)",
    fontSize: "36px",
    color: "var(--ink)",
    margin: "0 0 16px 0",
  },
  bodyText: {
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    color: "var(--stone)",
  },

  searchBox: {
    background: "#fcfbf8",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "40px",
  },
  form: { display: "flex", gap: "12px" },
  input: {
    flex: 1,
    padding: "16px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontFamily: "var(--font-mono)",
    fontSize: "16px",
    outline: "none",
    letterSpacing: "0.05em",
  },
  searchBtn: {
    padding: "0 32px",
    background: "var(--ink)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    cursor: "pointer",
  },
  error: {
    marginTop: "16px",
    color: "#c94040",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 500,
    textAlign: "center",
  },

  resultCard: {
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "white",
    overflow: "hidden",
    animation: "popIn 0.3s ease-out",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f4f3f0",
    padding: "24px",
    borderBottom: "1px solid var(--border)",
  },
  label: {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--stone)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "8px",
  },
  monoText: {
    fontFamily: "var(--font-mono)",
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--ink)",
    letterSpacing: "0.05em",
  },
  statusBadge: {
    padding: "6px 12px",
    borderRadius: "4px",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    display: "inline-block",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    padding: "32px 24px",
    borderBottom: "1px solid var(--border)",
  },
  valueText: {
    fontFamily: "var(--font-sans)",
    fontSize: "15px",
    color: "var(--ink)",
    lineHeight: 1.6,
  },

  itemsSection: {
    padding: "32px 24px",
    borderBottom: "1px solid var(--border)",
  },
  itemList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "16px",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "16px",
    borderBottom: "1px dashed var(--border)",
  },
  itemName: {
    fontFamily: "var(--font-sans)",
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--ink)",
  },
  itemVariant: {
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    color: "var(--stone)",
    marginTop: "4px",
  },
  itemPriceQty: {
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    color: "var(--ink)",
  },

  paymentSection: {
    padding: "32px 24px",
  },
  paymentBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "20px",
    marginTop: "12px",
  },
  currentTxRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  updateTxContainer: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "16px",
    marginTop: "16px",
  },
  txForm: {
    display: "flex",
    gap: "8px",
  },
  txInput: {
    flex: 1,
    padding: "10px 14px",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    textTransform: "uppercase",
    outline: "none",
  },
  txBtn: {
    padding: "0 20px",
    background: "var(--stone)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },

  summaryContainer: {
    padding: "24px",
    background: "#fafafa",
    borderTop: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: "var(--font-sans)",
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--stone)",
  },
  summaryBadge: {
    padding: "6px 12px",
    borderRadius: "6px",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  summaryTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid var(--border)",
    paddingTop: "16px",
    marginTop: "4px",
  },
  summaryTotalLabel: {
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    color: "var(--ink)",
    fontWeight: 700,
  },
};
