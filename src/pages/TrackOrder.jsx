import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function TrackOrder() {
  const [trackingId, setTrackingId] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [newTxId, setNewTxId] = useState("");
  const [isUpdatingTx, setIsUpdatingTx] = useState(false);
  const [txMessage, setTxMessage] = useState({ type: "", text: "" });

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setOrderData(null);
    setTxMessage({ type: "", text: "" });
    setNewTxId("");

    if (!trackingId.trim()) return;

    setLoading(true);

    try {
      const { data: order, error: orderError } = await supabase.rpc(
        "get_tracking_details",
        { tracking_id: trackingId.trim().toUpperCase() },
      );

      if (orderError) throw orderError;

      if (!order) {
        setErrorMsg(
          "We couldn't find an order with that tracking ID. Please check it and try again.",
        );
      } else {
        setOrderData(order);
      }
    } catch (err) {
      console.error("Tracking error:", err);
      setErrorMsg("An error occurred while looking up your order.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    if (!newTxId.trim() || !orderData) return;

    setIsUpdatingTx(true);
    setTxMessage({ type: "", text: "" });

    try {
      const formattedTxId = newTxId.trim().toUpperCase();
      const { error } = await supabase
        .from("orders")
        .update({ transaction_id: formattedTxId })
        .eq("display_id", orderData.display_id);

      if (error) throw error;

      setOrderData((prev) => ({ ...prev, transaction_id: formattedTxId }));
      setTxMessage({
        type: "success",
        text: "Transaction ID updated successfully! We will verify it shortly.",
      });
      setNewTxId("");
    } catch (err) {
      console.error("Update error:", err);
      setTxMessage({
        type: "error",
        text: "Failed to update Transaction ID. Please try again.",
      });
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

  // Logic for Simplified Payment Statuses
  let isCourierPaid = false;
  let isTotalPaid = false;

  if (orderData) {
    const advance = Number(orderData.advance_paid) || 0;
    const total = Number(orderData.total_amount) || 0;

    // If ANY money is paid, courier charge is considered paid
    isCourierPaid = advance > 0;
    // If advance equals or exceeds total, it's fully paid
    isTotalPaid = advance >= total;
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Track Your Order</h1>
        <p style={styles.bodyText}>
          Enter your tracking ID below to check the current status of your
          shipment.
        </p>
      </div>

      <div style={styles.searchBox}>
        <form onSubmit={handleTrackOrder} style={styles.form}>
          <input
            type="text"
            placeholder="e.g. AXIO-9A8B7C"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" disabled={loading} style={styles.searchBtn}>
            {loading ? "Searching..." : "Track"}
          </button>
        </form>
        {errorMsg && <div style={styles.error}>{errorMsg}</div>}
      </div>

      {orderData && (
        <div style={styles.resultCard}>
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
              <div style={styles.valueText}>{orderData.shipping_address}</div>
            </div>

            <div style={styles.detailBlock}>
              <span style={styles.label}>ORDER DATE</span>
              <div style={styles.valueText}>
                {new Date(orderData.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
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
                    Need to add or update your payment TrxID? Enter it below.
                  </p>
                  <form
                    onSubmit={handleUpdateTransaction}
                    style={styles.txForm}
                  >
                    <input
                      type="text"
                      placeholder="Enter new bKash/Nagad TrxID"
                      value={newTxId}
                      onChange={(e) => setNewTxId(e.target.value)}
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
                  {txMessage.text && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "13px",
                        fontFamily: "var(--font-sans)",
                        fontWeight: 500,
                        color:
                          txMessage.type === "success"
                            ? "var(--green)"
                            : "#c94040",
                      }}
                    >
                      {txMessage.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ---> NEW: SIMPLIFIED STATUS UI <--- */}
          <div style={styles.summaryContainer}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Courier Charge</span>
              <span
                style={{
                  ...styles.summaryBadge,
                  backgroundColor: isCourierPaid ? "var(--green)" : "#fee2e2",
                  color: isCourierPaid ? "white" : "#991b1b",
                }}
              >
                {isCourierPaid ? "PAID" : "DUE"}
              </span>
            </div>
            <div style={styles.summaryTotalRow}>
              <span style={styles.summaryTotalLabel}>
                Total Order Price (৳{(orderData.total_amount || 0).toFixed(2)})
              </span>
              <span
                style={{
                  ...styles.summaryBadge,
                  fontSize: "14px",
                  backgroundColor: isTotalPaid ? "var(--green)" : "#fee2e2",
                  color: isTotalPaid ? "white" : "#991b1b",
                }}
              >
                {isTotalPaid ? "PAID" : "DUE"}
              </span>
            </div>
          </div>
        </div>
      )}
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
    textTransform: "uppercase",
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
