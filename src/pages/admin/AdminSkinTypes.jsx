import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function AdminSkinTypes() {
	const [skinTypes, setSkinTypes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isAdding, setIsAdding] = useState(false);

	// form
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [saving, setSaving] = useState(false);

	const fetchSkinTypes = async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from("skin_types")
			.select("*")
			.order("name", { ascending: true });

		if (error) {
			console.error("error fetching skin types: ", error.message);
		} else {
			setSkinTypes(data);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchSkinTypes();
	}, []);

	// add new skin type to supabase
	const handleSave = async (e) => {
		e.preventDefault();
		setSaving(true);

		const slug = name
			.toLowerCase()
			.trim()
			.replace(/[\s\W-]+/g, "-");

		const { error } = await supabase.from("skin_types").insert([
			{
				name,
				slug,
				description,
			},
		]);
		setSaving(false);

		if (error) {
			alert("error saving skin type: " + error.message);
		} else {
			setName("");
			setDescription("");
			setIsAdding(false);
			fetchSkinTypes();
		}
	};

	const handleDelete = async (id, skinTypeName) => {
		if (!window.confirm(`Are you sure want to delete ${skinTypeName} ?`)) {
			return;
		}

		const { error } = await supabase.from("skin_types").delete().eq("id", id);

		if (error) {
			alert("error deleting skin type: " + error.message);
		} else {
			fetchSkinTypes(); //this refreshes the list
		}
	};

	// --- RENDER FORM VIEW ---
	if (isAdding) {
		return (
			<div>
				<div style={styles.header}>
					<h2 style={styles.title}>Add New Skin Type</h2>
					<button
						onClick={() => setIsAdding(false)}
						style={styles.btnSecondary}
					>
						Cancel
					</button>
				</div>

				<form onSubmit={handleSave} style={styles.formCard}>
					<div style={styles.inputGroup}>
						<label style={styles.label}>Skin Type Name</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							style={styles.input}
							required
							placeholder="e.g. Oily, Dry, Combination"
						/>
					</div>

					<div style={styles.inputGroup}>
						<label style={styles.label}>Description (Optional)</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							style={{ ...styles.input, minHeight: "100px" }}
							placeholder="A short description for the shop page..."
						/>
					</div>

					<button type="submit" style={styles.btnPrimary} disabled={saving}>
						{saving ? "Saving..." : "Save Skin Type"}
					</button>
				</form>
			</div>
		);
	}

	// --- RENDER TABLE VIEW ---
	return (
		<div>
			<div style={styles.header}>
				<h2 style={styles.title}>Skin Type Management</h2>
				<button onClick={() => setIsAdding(true)} style={styles.btnPrimary}>
					+ Add Skin Type
				</button>
			</div>

			<div style={styles.tableContainer}>
				{loading ? (
					<p style={{ padding: "24px" }}>Loading skin types...</p>
				) : skinTypes.length === 0 ? (
					<p style={{ padding: "24px", color: "var(--stone)" }}>
						No skin types found.
					</p>
				) : (
					<table style={styles.table}>
						<thead>
							<tr>
								<th style={styles.th}>Name</th>
								<th style={styles.th}>Slug</th>
								<th style={styles.th}>Description</th>
								<th style={styles.th}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{skinTypes.map((st) => (
								<tr key={st.id} style={styles.tr}>
									<td style={{ ...styles.td, fontWeight: 500 }}>{st.name}</td>
									<td style={{ ...styles.td, color: "var(--stone)" }}>
										/{st.slug}
									</td>
									<td style={{ ...styles.td, color: "var(--stone)" }}>
										{st.description || "—"}
									</td>
									<td style={styles.td}>
										<button
											onClick={() => handleDelete(st.id, st.name)}
											style={styles.deleteBtn}
										>
											Delete
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

const styles = {
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: "32px",
	},
	title: {
		fontFamily: "var(--font-serif)",
		fontSize: "28px",
		color: "var(--ink)",
		margin: 0,
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
	tableContainer: {
		background: "#fff",
		border: "1px solid var(--border)",
		borderRadius: "12px",
		overflow: "hidden",
	},
	table: {
		width: "100%",
		borderCollapse: "collapse",
		textAlign: "left",
	},
	th: {
		padding: "16px 24px",
		borderBottom: "1px solid var(--border)",
		background: "#fcfbf8",
		color: "var(--stone)",
		fontWeight: 500,
		fontSize: "13px",
		textTransform: "uppercase",
		letterSpacing: "0.05em",
	},
	tr: {
		borderBottom: "1px solid var(--border)",
	},
	td: {
		padding: "16px 24px",
		fontSize: "15px",
		verticalAlign: "middle",
	},
	deleteBtn: {
		color: "#d9534f",
		background: "transparent",
		border: "none",
		cursor: "pointer",
		fontSize: "14px",
		textDecoration: "underline",
	},
	formCard: {
		background: "#fff",
		border: "1px solid var(--border)",
		borderRadius: "12px",
		padding: "32px",
		maxWidth: "600px",
	},
	inputGroup: {
		marginBottom: "24px",
		display: "flex",
		flexDirection: "column",
		gap: "8px",
	},
	label: {
		fontSize: "14px",
		fontWeight: 500,
		color: "var(--ink)",
	},
	input: {
		padding: "12px 16px",
		border: "1px solid var(--border)",
		borderRadius: "8px",
		fontFamily: "var(--font-sans)",
		fontSize: "15px",
		outline: "none",
	},
};
