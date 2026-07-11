import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";
import { bdDistricts, getThanasForDistrict } from "../data/bdLocations";

export default function Checkout() {
  const { cart, cartTotal, clearCart, removeFromCart, updateQuantity } =
    useCart();
  const [courierSettings, setCourierSettings] = useState(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    district: "",
    thana: "",
    postalCode: "",
    paymentMethod: "cod",
    transactionId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successId, setSuccessId] = useState(null);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);

  useEffect(() => {
    async function fetchCourierSettings() {
      const { data, error } = await supabase
        .from("courier_fee")
        .select("*")
        .eq("id", 1)
        .single();

      if (data && !error) setCourierSettings(data);
    }
    fetchCourierSettings();
  }, []);

  const shippingFee =
    formData.district === "Dhaka"
      ? Number(courierSettings?.inside_dhaka || 60)
      : formData.district
        ? Number(courierSettings?.outside_dhaka || 120)
        : 0;

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      discountAmount = cartTotal * (appliedCoupon.discount_value / 100);
    } else if (appliedCoupon.discount_type === "fixed") {
      discountAmount = Number(appliedCoupon.discount_value);
    }
  }
  discountAmount = Math.min(discountAmount, cartTotal);
  const finalTotal = cartTotal - discountAmount + shippingFee;
  const availableThanas = getThanasForDistrict(formData.district);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "district" && { thana: "" }),
    }));
  };

  const generateDisplayId = () =>
    "ZAY-" + Math.random().toString(36).substr(2, 6).toUpperCase();

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsVerifyingCoupon(true);
    setCouponMessage("");

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponInput.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !coupon) {
      setCouponMessage("Invalid or expired discount code.");
      setAppliedCoupon(null);
    } else {
      const now = new Date();
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        setCouponMessage("This code has expired.");
      } else if (
        coupon.usage_limit &&
        coupon.used_count >= coupon.usage_limit
      ) {
        setCouponMessage("This code has reached its usage limit.");
      } else if (cartTotal < coupon.min_spend) {
        setCouponMessage(
          `Add ৳${(coupon.min_spend - cartTotal).toFixed(2)} more to use this code.`,
        );
      } else {
        setAppliedCoupon(coupon);
        setCouponMessage("Discount applied successfully!");
      }
    }
    setIsVerifyingCoupon(false);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    if (cart.length === 0) {
      setErrorMsg("Your bag is empty.");
      setIsSubmitting(false);
      return;
    }

    try {
      const displayId = generateDisplayId();
      const fullAddress = `${formData.address}, ${formData.thana}, ${formData.district} - ${formData.postalCode}`;
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const formattedCartItems = cart.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error } = await supabase.rpc("process_checkout", {
        p_display_id: displayId,
        p_name: fullName,
        p_email: formData.email,
        p_phone: formData.phone,
        p_address: fullAddress,
        p_total: finalTotal,
        p_tx_id: formData.transactionId || null,
        p_cart_items: formattedCartItems,
        p_advance: 0, // Admin sets this manually now
        p_due: finalTotal,
        p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
      });

      if (error) {
        if (error.message.includes("Out of stock")) {
          throw new Error("An item in your cart sold out during checkout!");
        }
        throw error;
      }

      if (appliedCoupon) {
        await supabase.rpc("increment_coupon_usage", {
          p_coupon_code: appliedCoupon.code,
        });
      }

      clearCart();
      setSuccessId(displayId);
    } catch (err) {
      setErrorMsg(err.message || "Failed to process order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div style={styles.successWrapper}>
        <div style={styles.successCard}>
          <div style={styles.checkCircle}>✓</div>
          <h2 style={styles.successTitle}>Order Received!</h2>
          <p style={styles.successText}>
            Thank you! Your order has been placed successfully using Cash on
            Delivery.
          </p>
          <div style={styles.idBox}>
            <span style={styles.idLabel}>ORDER ID</span>
            <h3 style={styles.idValue}>{successId}</h3>
          </div>
          <p style={styles.successNote}>
            <strong>What happens next?</strong>
            <br />
            Our team will call you shortly from{" "}
            <strong>+880 966 679 1110</strong> to confirm your order details and
            arrange the delivery.
          </p>
          <div style={styles.successActions}>
            <Link to="/track-order" style={styles.primaryBtn}>
              Track Order
            </Link>
            <Link to="/shop" style={styles.outlineBtn}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      <div className="checkout-header">
        <h1 style={styles.pageTitle}>Secure Checkout</h1>
        <Link to="/shop" style={styles.backLink}>
          &larr; Return to Shop
        </Link>
      </div>

      {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

      <div className="checkout-layout">
        {/* --- TOP SECTION: ORDER SUMMARY --- */}
        <div style={styles.summaryBox}>
          <h3 style={styles.summaryTitle}>Order Summary</h3>

          <div style={styles.cartItems}>
            {cart.map((item, idx) => (
              <div key={idx} style={styles.itemRow}>
                <img
                  src={item.image || "/placeholder.jpg"}
                  alt={item.name}
                  style={styles.itemImage}
                />

                <div style={styles.itemDetailsWrapper}>
                  <div style={styles.itemHeaderRow}>
                    <div style={styles.itemName}>{item.name}</div>
                    <div style={styles.itemPrice}>
                      ৳{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  {item.variant_name && (
                    <div style={styles.itemMeta}>{item.variant_name}</div>
                  )}

                  <div style={styles.itemActionsRow}>
                    <div style={styles.qtyContainer}>
                      <button
                        type="button"
                        style={styles.qtyBtn}
                        onClick={() =>
                          updateQuantity(item.cartItemId, item.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span style={styles.qtyValue}>{item.quantity}</span>
                      <button
                        type="button"
                        style={styles.qtyBtn}
                        onClick={() =>
                          updateQuantity(item.cartItemId, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.maxStock}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartItemId)}
                      style={styles.removeBtn}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div style={styles.emptyCart}>Your bag is empty.</div>
            )}
          </div>

          <div style={styles.couponSection}>
            <div style={styles.couponInputGroup}>
              <input
                type="text"
                placeholder="Discount code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                style={styles.couponInput}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={isVerifyingCoupon || !couponInput.trim()}
                style={styles.applyBtn}
              >
                {isVerifyingCoupon ? "..." : "Apply"}
              </button>
            </div>
            {couponMessage && (
              <p
                style={{
                  ...styles.couponMessage,
                  color: appliedCoupon ? "var(--green)" : "#b91c1c",
                }}
              >
                {couponMessage}
              </p>
            )}
          </div>

          <div style={styles.totalsBlock}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Subtotal</span>
              <span style={styles.totalValue}>৳{cartTotal.toFixed(2)}</span>
            </div>

            {appliedCoupon && (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>
                  Discount ({appliedCoupon.code})
                </span>
                <span style={{ ...styles.totalValue, color: "var(--green)" }}>
                  -৳{discountAmount.toFixed(2)}
                </span>
              </div>
            )}

            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Shipping</span>
              <span style={styles.totalValue}>
                {formData.district === ""
                  ? "Calculated next"
                  : `৳${shippingFee.toFixed(2)}`}
              </span>
            </div>
            <div style={{ ...styles.totalRow, ...styles.finalTotalRow }}>
              <span style={styles.finalTotalLabel}>Total</span>
              <span style={styles.finalTotalValue}>
                ৳{finalTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* --- BOTTOM SECTION: FORM --- */}
        <div style={styles.formSection}>
          <form
            onSubmit={handleSubmitOrder}
            id="checkout-form"
            style={{ display: "flex", flexDirection: "column", gap: "32px" }}
          >
            {/* STEP 1: CONTACT */}
            <section style={styles.stepSection}>
              <div style={styles.stepHeader}>
                <span style={styles.stepNumber}>1</span>
                <h2 style={styles.stepTitle}>Contact Information</h2>
              </div>
              <div style={styles.stepBody}>
                <div className="grid2">
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Email Address</label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Phone Number</label>
                    <input
                      required
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="+880 1..."
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* STEP 2: SHIPPING */}
            <section style={styles.stepSection}>
              <div style={styles.stepHeader}>
                <span style={styles.stepNumber}>2</span>
                <h2 style={styles.stepTitle}>Shipping Address</h2>
              </div>
              <div style={styles.stepBody}>
                <div className="grid2">
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>First Name</label>
                    <input
                      required
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="First name"
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Last Name</label>
                    <input
                      required
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Street Address / Apartment</label>
                  <input
                    required
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="House, Road, Block..."
                  />
                </div>

                <div className="grid3">
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>District</label>
                    <select
                      required
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      style={styles.select}
                    >
                      <option value="" disabled>
                        Select District
                      </option>
                      {bdDistricts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Thana / Upazila</label>
                    <select
                      required
                      name="thana"
                      value={formData.thana}
                      onChange={handleInputChange}
                      style={styles.select}
                      disabled={!formData.district}
                    >
                      <option value="" disabled>
                        Select Thana
                      </option>
                      {availableThanas.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Postal Code</label>
                    <input
                      required
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="e.g. 1212"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* STEP 3: PAYMENT */}
            <section style={styles.stepSection}>
              <div style={styles.stepHeader}>
                <span style={styles.stepNumber}>3</span>
                <h2 style={styles.stepTitle}>Payment Method</h2>
              </div>
              <div style={styles.stepBody}>
                <div
                  style={{
                    padding: "24px",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 16px 0",
                      fontFamily: "var(--font-sans)",
                      color: "var(--ink)",
                      fontSize: "16px",
                    }}
                  >
                    Cash on Delivery (COD)
                  </h4>

                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "14px",
                      color: "var(--stone)",
                      marginBottom: "20px",
                      lineHeight: 1.6,
                    }}
                  >
                    You can place your order right now without any advance
                    payment. Once your order is received,{" "}
                    <strong>
                      our team will call you to confirm the details.
                    </strong>
                  </p>

                  <div
                    style={{
                      background: "#fff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      marginBottom: "20px",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        color: "var(--ink)",
                        fontSize: "14px",
                      }}
                    >
                      (Optional) Want faster delivery?
                    </strong>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        color: "var(--stone)",
                        lineHeight: 1.6,
                      }}
                    >
                      You can optionally pay the courier fee (
                      <strong>৳{shippingFee.toFixed(2)}</strong>) in advance via
                      bKash/Nagad to{" "}
                      <strong>
                        {courierSettings?.bkash_number || "our number"}
                      </strong>{" "}
                      and enter the TrxID below. Otherwise, just leave it blank
                      and click Complete Order!
                    </p>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Transaction ID (Optional)
                    </label>
                    <input
                      type="text"
                      name="transactionId"
                      value={formData.transactionId}
                      onChange={handleInputChange}
                      style={{
                        ...styles.input,
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                      }}
                      placeholder="Leave blank for Call-to-Confirm"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* FINAL CHECKOUT BUTTON */}
            <div style={styles.submitWrapper}>
              <button
                form="checkout-form"
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                style={styles.submitBtn}
              >
                {isSubmitting
                  ? "Processing..."
                  : `Complete Order • ৳${finalTotal.toFixed(2)}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
				.checkout-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
				.checkout-layout { display: flex; flex-direction: column; gap: 40px; }
				.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
				.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
				input:focus, select:focus { border-color: var(--ink) !important; outline: none; }
				@media (max-width: 600px) {
					.checkout-header { flex-direction: column; align-items: flex-start; gap: 12px; }
					.grid2 { grid-template-columns: 1fr; }
					.grid3 { grid-template-columns: 1fr 1fr; }
				}
				@media (max-width: 400px) {
					.grid3 { grid-template-columns: 1fr; }
				}
			`}</style>
    </div>
  );
}

const styles = {
  pageWrapper: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "clamp(24px, 4vw, 60px) clamp(16px, 4vw, 32px)",
    minHeight: "80vh",
  },
  pageTitle: {
    fontFamily: "var(--font-serif)",
    fontSize: "clamp(28px, 4vw, 36px)",
    color: "var(--ink)",
    margin: 0,
  },
  backLink: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    color: "var(--stone)",
    textDecoration: "none",
    fontWeight: 500,
    transition: "color 0.2s",
  },

  formSection: { display: "flex", flexDirection: "column", gap: "32px" },

  stepSection: { display: "flex", flexDirection: "column", gap: "24px" },
  stepHeader: { display: "flex", alignItems: "center", gap: "16px" },
  stepNumber: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    background: "var(--ink)",
    color: "white",
    borderRadius: "50%",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    fontWeight: 700,
  },
  stepTitle: {
    fontFamily: "var(--font-sans)",
    fontSize: "20px",
    fontWeight: 600,
    color: "var(--ink)",
    margin: 0,
  },
  stepBody: { paddingLeft: "44px" },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
  },
  label: {
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--stone)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    padding: "14px 16px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontFamily: "var(--font-sans)",
    fontSize: "15px",
    backgroundColor: "#fff",
    transition: "all 0.2s",
  },
  select: {
    padding: "14px 16px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontFamily: "var(--font-sans)",
    fontSize: "15px",
    backgroundColor: "#fff",
    cursor: "pointer",
    appearance: "none",
    transition: "all 0.2s",
  },

  errorBox: {
    padding: "16px 20px",
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 500,
    marginBottom: "32px",
  },

  summaryBox: {
    background: "#fafafa",
    padding: "clamp(24px, 4vw, 40px)",
    borderRadius: "16px",
    border: "1px solid var(--border)",
  },
  summaryTitle: {
    fontFamily: "var(--font-sans)",
    fontSize: "20px",
    fontWeight: 600,
    color: "var(--ink)",
    margin: "0 0 24px 0",
  },
  cartItems: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    marginBottom: "32px",
    maxHeight: "500px",
    overflowY: "auto",
    paddingRight: "8px",
  },
  itemRow: {
    display: "flex",
    gap: "16px",
    paddingBottom: "24px",
    borderBottom: "1px solid var(--border)",
  },
  itemImage: {
    width: "70px",
    height: "90px",
    objectFit: "cover",
    borderRadius: "6px",
    background: "#fff",
    border: "1px solid var(--border)",
  },
  itemDetailsWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  itemHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  itemName: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--ink)",
    lineHeight: 1.4,
  },
  itemPrice: {
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--ink)",
    whiteSpace: "nowrap",
  },
  itemMeta: {
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    color: "var(--stone)",
    marginTop: "4px",
  },
  itemActionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "12px",
  },

  qtyContainer: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    background: "#fff",
  },
  qtyBtn: {
    background: "none",
    border: "none",
    width: "28px",
    height: "28px",
    cursor: "pointer",
    color: "var(--ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontFamily: "var(--font-mono)",
  },
  qtyValue: {
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    color: "var(--ink)",
    minWidth: "24px",
    textAlign: "center",
    fontWeight: 600,
  },

  removeBtn: {
    background: "none",
    border: "none",
    color: "var(--stone)",
    fontSize: "12px",
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    textDecoration: "underline",
    padding: "4px",
  },
  emptyCart: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    color: "var(--stone)",
    textAlign: "center",
    padding: "24px 0",
  },

  couponSection: {
    marginBottom: "32px",
    paddingBottom: "32px",
    borderBottom: "1px solid var(--border)",
  },
  couponInputGroup: { display: "flex", gap: "12px" },
  couponInput: {
    flex: 1,
    padding: "14px 16px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    outline: "none",
    textTransform: "uppercase",
    background: "#fff",
  },
  applyBtn: {
    padding: "0 24px",
    background: "var(--stone)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  couponMessage: {
    marginTop: "12px",
    fontSize: "13px",
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
  },

  totalsBlock: { display: "flex", flexDirection: "column", gap: "16px" },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    color: "var(--stone)",
  },
  totalValue: {
    fontFamily: "var(--font-mono)",
    fontSize: "15px",
    color: "var(--ink)",
    fontWeight: 500,
  },
  finalTotalRow: {
    marginTop: "8px",
    paddingTop: "24px",
    borderTop: "2px solid var(--border)",
  },
  finalTotalLabel: {
    fontFamily: "var(--font-sans)",
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--ink)",
  },
  finalTotalValue: {
    fontFamily: "var(--font-mono)",
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--ink)",
    letterSpacing: "-0.5px",
  },

  submitWrapper: { marginTop: "16px", paddingLeft: "44px" },
  submitBtn: {
    width: "100%",
    padding: "18px",
    background: "var(--ink)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.1s, opacity 0.2s",
  },

  successWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "70vh",
    padding: "24px",
  },
  successCard: {
    background: "white",
    padding: "clamp(32px, 6vw, 56px)",
    borderRadius: "16px",
    border: "1px solid var(--border)",
    textAlign: "center",
    maxWidth: "540px",
    width: "100%",
    boxShadow: "0 20px 40px rgba(0,0,0,0.04)",
  },
  checkCircle: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: "var(--green)",
    color: "white",
    fontSize: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 32px auto",
  },
  successTitle: {
    fontFamily: "var(--font-serif)",
    fontSize: "32px",
    margin: "0 0 12px 0",
    color: "var(--ink)",
  },
  successText: {
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    color: "var(--stone)",
    margin: "0 0 32px 0",
    lineHeight: 1.5,
  },
  idBox: {
    background: "#fafafa",
    border: "1px solid var(--border)",
    padding: "24px",
    borderRadius: "12px",
    marginBottom: "20px",
  },
  idLabel: {
    display: "block",
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--stone)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "8px",
  },
  idValue: {
    margin: 0,
    fontFamily: "var(--font-mono)",
    fontSize: "28px",
    color: "var(--ink)",
    fontWeight: 700,
  },
  successNote: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    color: "var(--stone)",
    marginBottom: "40px",
    lineHeight: 1.6,
  },
  successActions: {
    display: "flex",
    gap: "16px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryBtn: {
    padding: "14px 28px",
    background: "var(--ink)",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    transition: "opacity 0.2s",
  },
  outlineBtn: {
    padding: "14px 28px",
    background: "white",
    color: "var(--ink)",
    border: "1px solid var(--border)",
    textDecoration: "none",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    transition: "background 0.2s",
  },
};
