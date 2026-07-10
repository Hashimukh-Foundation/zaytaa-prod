import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import MultiImageUpload from "../../components/MultiImageUpload";

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

export default function AdminProducts() {
  // --- STATE ---
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skinTypes, setSkinTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // UI State
  const [toast, setToast] = useState({ message: "", type: "" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // --- HELPERS ---
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const getTotalStock = (prod) => {
    if (prod.product_variants && prod.product_variants.length > 0) {
      return prod.product_variants.reduce(
        (sum, v) => sum + (v.stock_quantity || 0),
        0,
      );
    }
    return prod.stock_quantity || 0;
  };

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);

    const { data: catData } = await supabase
      .from("categories")
      .select("id, name");
    if (catData) setCategories(catData);

    const { data: skinData } = await supabase
      .from("skin_types")
      .select("id, name");
    if (skinData) setSkinTypes(skinData);

    const { data: brandData } = await supabase
      .from("brands")
      .select("id, name");
    if (brandData) setBrands(brandData);

    const { data: prodData, error } = await supabase
      .from("products")
      .select(
        `
				*,
				brands ( id, name ),
				product_images ( url, is_primary ),
				product_categories ( categories ( id, name ) ),
				product_skin_types ( skin_types ( id, name ) ),
                product_variants ( id, name, price, sale_price, stock_quantity )
			`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Failed to fetch products", "error");
    } else {
      setAllProducts(prodData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- QUICK ACTIONS ---
  const handleToggleArchive = async (product) => {
    const newArchivedStatus = !product.is_archived;
    const { error } = await supabase
      .from("products")
      .update({ is_archived: newArchivedStatus, is_active: !newArchivedStatus })
      .eq("id", product.id);

    if (error) {
      showToast(`Error: ${error.message}`, "error");
    } else {
      showToast(
        `Product successfully ${newArchivedStatus ? "hidden" : "unhidden"}`,
      );
      fetchData();
    }
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Permanently delete "${name}"? This action is irreversible.`,
      )
    )
      return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      showToast("Error deleting product", "error");
    } else {
      showToast("Product deleted forever");
      fetchData();
    }
  };

  const openDrawer = (product = null) => {
    setEditingProduct(product);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingProduct(null);
  };

  // --- FILTERING & PAGINATION LOGIC ---
  let filtered = allProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brands?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const totalStock = getTotalStock(p);

    switch (activeFilter) {
      case "hidden":
        return p.is_archived;
      case "out_of_stock":
        return totalStock === 0;
      case "low_stock":
        return totalStock > 0 && totalStock <= 5;
      case "variants":
        return p.product_variants && p.product_variants.length > 0;
      default:
        return true;
    }
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProducts = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        paddingBottom: "60px",
      }}
    >
      <Toast message={toast.message} type={toast.type} />

      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Product Management</h2>
          <p style={styles.subtitle}>{allProducts.length} products total</p>
        </div>
        <button onClick={() => openDrawer()} style={styles.btnPrimary}>
          + Add Product
        </button>
      </div>

      <div style={styles.controlsBar}>
        <input
          type="text"
          placeholder="Search products or brands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />

        <div style={styles.filterGroup}>
          {[
            { id: "all", label: "All Products" },
            { id: "hidden", label: "Hidden" },
            { id: "variants", label: "Has Variants" },
            { id: "low_stock", label: "Low Stock (≤5)" },
            { id: "out_of_stock", label: "Out of Stock" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                ...styles.filterBtn,
                background: activeFilter === f.id ? "var(--ink)" : "#fff",
                color: activeFilter === f.id ? "#fff" : "var(--stone)",
                borderColor:
                  activeFilter === f.id ? "var(--ink)" : "var(--border)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={styles.emptyText}>Loading products...</p>
      ) : paginatedProducts.length === 0 ? (
        <p style={styles.emptyText}>No products found matching your filters.</p>
      ) : (
        <>
          <div style={styles.cardGrid}>
            {paginatedProducts.map((prod) => {
              const primaryImg =
                prod.product_images?.find((img) => img.is_primary)?.url ||
                prod.product_images?.[0]?.url;
              const hasVariants =
                prod.product_variants && prod.product_variants.length > 0;
              const catNames = prod.product_categories
                .map((pc) => pc.categories.name)
                .join(", ");
              const totalStock = getTotalStock(prod);

              return (
                <div key={prod.id} style={styles.adminCard}>
                  <div style={styles.cardImageWrapper}>
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={prod.name}
                        style={styles.cardImage}
                      />
                    ) : (
                      <div style={styles.cardNoImage}>No Image</div>
                    )}
                    <div style={styles.cardBadges}>
                      {prod.is_featured && (
                        <span style={styles.badge}>Featured</span>
                      )}
                      {hasVariants && (
                        <span
                          style={{
                            ...styles.badge,
                            background: "#e2e3e5",
                            color: "#383d41",
                          }}
                        >
                          Variants
                        </span>
                      )}
                      {prod.is_archived && (
                        <span
                          style={{
                            ...styles.badge,
                            background: "#fee2e2",
                            color: "#b91c1c",
                          }}
                        >
                          Hidden
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={{ marginBottom: "8px" }}>
                      <div style={styles.cardBrand}>
                        {prod.brands?.name || "No Brand"}
                      </div>
                      <h3 style={styles.cardTitle}>{prod.name}</h3>
                    </div>

                    <div style={styles.cardMeta}>
                      <div style={{ color: "var(--stone)", fontSize: "12px" }}>
                        {catNames || "No Category"}
                      </div>
                      <div
                        style={{
                          color:
                            totalStock === 0
                              ? "#d9534f"
                              : totalStock <= 5
                                ? "#f59e0b"
                                : "var(--green)",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor:
                              totalStock === 0
                                ? "#d9534f"
                                : totalStock <= 5
                                  ? "#f59e0b"
                                  : "var(--green)",
                          }}
                        ></span>
                        {totalStock} in stock
                      </div>
                    </div>

                    <div style={styles.cardFooter}>
                      <div style={styles.cardPrice}>
                        {prod.sale_price ? (
                          <>
                            <span
                              style={{
                                textDecoration: "line-through",
                                color: "var(--stone)",
                                fontSize: "12px",
                                marginRight: "6px",
                              }}
                            >
                              ৳{prod.price}
                            </span>
                            ৳{prod.sale_price}
                          </>
                        ) : (
                          <>৳{prod.price}</>
                        )}
                      </div>
                      <div style={styles.cardActions}>
                        <button
                          onClick={() => handleToggleArchive(prod)}
                          style={{
                            ...styles.editBtn,
                            color: prod.is_archived
                              ? "var(--green)"
                              : "var(--stone)",
                          }}
                        >
                          {prod.is_archived ? "Unhide" : "Hide"}
                        </button>
                        <button
                          onClick={() => openDrawer(prod)}
                          style={styles.editBtn}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(prod.id, prod.name)}
                          style={styles.deleteBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                style={styles.pageBtn}
              >
                &larr; Previous
              </button>
              <span style={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                style={styles.pageBtn}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* SLIDE OUT DRAWER */}
      {drawerOpen && (
        <>
          <div style={styles.drawerOverlay} onClick={closeDrawer}></div>
          <div style={styles.drawer}>
            <div style={styles.drawerHeader}>
              <h3 style={styles.drawerTitle}>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={closeDrawer} style={styles.closeBtn}>
                &times;
              </button>
            </div>
            <div style={styles.drawerContent}>
              <ProductForm
                initialData={editingProduct}
                categories={categories}
                skinTypes={skinTypes}
                brands={brands}
                onSave={() => {
                  fetchData();
                  closeDrawer();
                  showToast(
                    `Product successfully ৳{editingProduct ? "updated" : "created"}`,
                  );
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- ISOLATED FORM COMPONENT (Retains your original design logic) ---
function ProductForm({ initialData, categories, skinTypes, brands, onSave }) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [price, setPrice] = useState(initialData?.price || "");
  const [salePrice, setSalePrice] = useState(initialData?.sale_price || "");
  const [stock, setStock] = useState(initialData?.stock_quantity || 0);
  const [selectedBrand, setSelectedBrand] = useState(
    initialData?.brand_id || "",
  );

  const [isFeatured, setIsFeatured] = useState(
    initialData?.is_featured || false,
  );
  const [isBestseller, setIsBestseller] = useState(
    initialData?.is_bestseller || false,
  );
  const [isNewArrival, setIsNewArrival] = useState(
    initialData?.is_new_arrival || false,
  );

  const [imageUrls, setImageUrls] = useState(
    initialData?.product_images
      ? [...initialData.product_images]
          .sort((a, b) => (b.is_primary ? 1 : -1))
          .map((img) => img.url)
      : [],
  );
  const [variants, setVariants] = useState(initialData?.product_variants || []);

  const [selectedCategories, setSelectedCategories] = useState(
    initialData?.product_categories?.map((pc) => pc.categories.id) || [],
  );
  const [selectedSkinTypes, setSelectedSkinTypes] = useState(
    initialData?.product_skin_types?.map((pst) => pst.skin_types.id) || [],
  );

  const [saving, setSaving] = useState(false);

  const handleCheckboxChange = (id, list, setList) =>
    list.includes(id)
      ? setList(list.filter((i) => i !== id))
      : setList([...list, id]);

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCategories.length === 0)
      return alert("Please select at least one category.");
    setSaving(true);

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-");
    const productData = {
      name,
      slug,
      description,
      price: parseFloat(price),
      sale_price: salePrice ? parseFloat(salePrice) : null,
      stock_quantity: parseInt(stock, 10) || 0,
      brand_id: selectedBrand || null,
      is_featured: isFeatured,
      is_bestseller: isBestseller,
      is_new_arrival: isNewArrival,
    };

    let productId = initialData?.id;

    if (productId) {
      await supabase.from("products").update(productData).eq("id", productId);
    } else {
      const { data } = await supabase
        .from("products")
        .insert([productData])
        .select()
        .single();
      productId = data.id;
    }

    if (productId) {
      await supabase
        .from("product_categories")
        .delete()
        .eq("product_id", productId);
      await supabase
        .from("product_skin_types")
        .delete()
        .eq("product_id", productId);
      await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId);
      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId);

      if (selectedCategories.length > 0)
        await supabase.from("product_categories").insert(
          selectedCategories.map((id) => ({
            product_id: productId,
            category_id: id,
          })),
        );
      if (selectedSkinTypes.length > 0)
        await supabase.from("product_skin_types").insert(
          selectedSkinTypes.map((id) => ({
            product_id: productId,
            skin_type_id: id,
          })),
        );
      if (imageUrls.length > 0)
        await supabase.from("product_images").insert(
          imageUrls.map((url, i) => ({
            product_id: productId,
            url,
            is_primary: i === 0,
          })),
        );
      if (variants.length > 0)
        await supabase.from("product_variants").insert(
          variants.map((v) => ({
            product_id: productId,
            name: v.name,
            price: parseFloat(v.price),
            sale_price: v.sale_price ? parseFloat(v.sale_price) : null,
            stock_quantity: parseInt(v.stock_quantity, 10) || 0,
          })),
        );
    }
    setSaving(false);
    onSave();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      <div style={styles.inputGroup}>
        <label style={styles.label}>Product Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
          required
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Brand</label>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          style={styles.input}
        >
          <option value="">No Brand / Default</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.inputRow}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Base Price (৳)</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={styles.input}
            required
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Base Sale Price</label>
          <input
            type="number"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Base Stock Qty</label>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            style={styles.input}
            required
          />
        </div>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...styles.input, minHeight: "100px" }}
        />
      </div>

      <div
        style={{
          ...styles.inputGroup,
          background: "#fafafa",
          padding: "20px",
          borderRadius: "8px",
          border: "1px dashed var(--border)",
        }}
      >
        <label style={styles.label}>Product Variants (Optional)</label>
        {variants.map((variant, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "12px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Variant Name"
              value={variant.name}
              onChange={(e) =>
                handleVariantChange(index, "name", e.target.value)
              }
              style={{ ...styles.input, flex: 2, margin: 0 }}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Price (৳)"
              value={variant.price}
              onChange={(e) =>
                handleVariantChange(index, "price", e.target.value)
              }
              style={{ ...styles.input, flex: 1, margin: 0 }}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Sale (৳)"
              value={variant.sale_price || ""}
              onChange={(e) =>
                handleVariantChange(index, "sale_price", e.target.value)
              }
              style={{ ...styles.input, flex: 1, margin: 0 }}
            />
            <input
              type="number"
              placeholder="Stock"
              value={variant.stock_quantity}
              onChange={(e) =>
                handleVariantChange(index, "stock_quantity", e.target.value)
              }
              style={{ ...styles.input, flex: 1, margin: 0 }}
              required
            />
            <button
              type="button"
              onClick={() =>
                setVariants(variants.filter((_, idx) => idx !== index))
              }
              style={styles.deleteVariantBtn}
            >
              &times;
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setVariants([
              ...variants,
              { name: "", price: "", sale_price: "", stock_quantity: 0 },
            ])
          }
          style={{
            ...styles.btnSecondary,
            fontSize: "13px",
            padding: "8px 16px",
            marginTop: "8px",
            width: "fit-content",
          }}
        >
          + Add Variant
        </button>
      </div>

      <div style={styles.inputRow}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Categories</label>
          <div style={styles.checkboxBox}>
            {categories.map((c) => (
              <label key={c.id} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(c.id)}
                  onChange={() =>
                    handleCheckboxChange(
                      c.id,
                      selectedCategories,
                      setSelectedCategories,
                    )
                  }
                />{" "}
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Skin Types</label>
          <div style={styles.checkboxBox}>
            {skinTypes.map((s) => (
              <label key={s.id} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedSkinTypes.includes(s.id)}
                  onChange={() =>
                    handleCheckboxChange(
                      s.id,
                      selectedSkinTypes,
                      setSelectedSkinTypes,
                    )
                  }
                />{" "}
                {s.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          ...styles.inputGroup,
          background: "#fcfbf8",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
        }}
      >
        <label style={{ ...styles.label, marginBottom: "12px" }}>
          Store Display Options
        </label>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />{" "}
            Featured on Homepage
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isBestseller}
              onChange={(e) => setIsBestseller(e.target.checked)}
            />{" "}
            Mark as Best Seller
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isNewArrival}
              onChange={(e) => setIsNewArrival(e.target.checked)}
            />{" "}
            Mark as New Arrival
          </label>
        </div>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Product Gallery</label>
        {imageUrls.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "16px",
              padding: "16px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            {imageUrls.map((url, index) => (
              <div
                key={index}
                style={{ position: "relative", width: "80px", height: "80px" }}
              >
                <img
                  src={url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "8px",
                    border:
                      index === 0
                        ? "2px solid var(--ink)"
                        : "1px solid var(--border)",
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setImageUrls(imageUrls.filter((_, i) => i !== index))
                  }
                  style={styles.deleteImageBtn}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <MultiImageUpload
          onUploadComplete={(urls) => setImageUrls((p) => [...p, ...urls])}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        style={{
          ...styles.btnPrimary,
          width: "100%",
          padding: "16px",
          marginTop: "16px",
        }}
      >
        {saving
          ? "Saving Updates..."
          : initialData
            ? "Update Product"
            : "Save Product"}
      </button>
    </form>
  );
}

const styles = {
  // --- TOAST ---
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

  // --- HEADER & CONTROLS ---
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px",
  },
  title: {
    fontFamily: "var(--font-serif)",
    fontSize: "28px",
    color: "var(--ink)",
    margin: 0,
  },
  subtitle: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    color: "var(--stone)",
    margin: "4px 0 0 0",
  },

  controlsBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    gap: "16px",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "250px",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    outline: "none",
  },
  filterGroup: { display: "flex", gap: "8px", flexWrap: "wrap" },
  filterBtn: {
    padding: "8px 16px",
    borderRadius: "100px",
    border: "1px solid",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  btnPrimary: {
    background: "var(--ink)",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  btnSecondary: {
    background: "transparent",
    color: "var(--ink)",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    cursor: "pointer",
  },
  emptyText: {
    padding: "24px 0",
    color: "var(--stone)",
    fontFamily: "var(--font-sans)",
    fontSize: "15px",
  },

  // --- GRID & CARDS ---
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px",
  },
  adminCard: {
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  cardImageWrapper: {
    width: "100%",
    height: "180px",
    position: "relative",
    backgroundColor: "#f4f3f0",
  },
  cardImage: { width: "100%", height: "100%", objectFit: "cover" },
  cardNoImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--stone)",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
  },
  cardBadges: {
    position: "absolute",
    top: "8px",
    left: "8px",
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
  },
  badge: {
    background: "var(--green-light)",
    color: "var(--green)",
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "100px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "inline-block",
  },

  cardBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  cardBrand: {
    fontFamily: "var(--font-sans)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--stone)",
    marginBottom: "4px",
  },
  cardTitle: {
    fontFamily: "var(--font-serif)",
    fontSize: "18px",
    color: "var(--ink)",
    margin: 0,
    lineHeight: 1.2,
  },
  cardMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "12px",
    marginBottom: "20px",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
  },
  cardFooter: {
    marginTop: "auto",
    paddingTop: "16px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: {
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--ink)",
  },

  cardActions: { display: "flex", gap: "12px" },
  editBtn: {
    color: "var(--ink)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    padding: 0,
  },
  deleteBtn: {
    color: "#d9534f",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    padding: 0,
  },

  // --- PAGINATION ---
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "24px",
    marginTop: "40px",
  },
  pageBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    padding: "8px 16px",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    cursor: "pointer",
    color: "var(--ink)",
  },
  pageInfo: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    color: "var(--stone)",
    fontWeight: 500,
  },

  // --- SLIDE DRAWER ---
  drawerOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.3)",
    backdropFilter: "blur(4px)",
    zIndex: 90,
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    maxWidth: "700px",
    background: "#fff",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    boxShadow: "-10px 0 40px rgba(0,0,0,0.1)",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 32px",
    borderBottom: "1px solid var(--border)",
  },
  drawerTitle: {
    fontFamily: "var(--font-serif)",
    fontSize: "24px",
    margin: 0,
    color: "var(--ink)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "28px",
    cursor: "pointer",
    color: "var(--stone)",
    lineHeight: 1,
  },
  drawerContent: { padding: "32px", overflowY: "auto", flex: 1 },

  // --- FORM ELEMENTS (Reused from your original setup) ---
  inputRow: { display: "flex", gap: "24px", marginBottom: "24px" },
  inputGroup: { flex: 1, display: "flex", flexDirection: "column", gap: "8px" },
  label: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
  },
  input: {
    padding: "12px 16px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontFamily: "var(--font-sans)",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
  },
  checkboxBox: {
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "16px",
    maxHeight: "150px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "var(--stone)",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  },
  deleteVariantBtn: {
    background: "#d9534f",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    width: "38px",
    height: "38px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0,
  },
  deleteImageBtn: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    background: "#d9534f",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "22px",
    height: "22px",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
};
