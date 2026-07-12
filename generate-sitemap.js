import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabasePublishableKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabse = createClient(supabaseUrl, supabasePublishableKey);
const SITE_URL = "https://www.zaytaa.com";

async function generateSitemap() {
  try {
    console.log("fetching products for sitemap");

    const { data: products, error } = await supabse
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true);
    if (error) throw error;

    const staticRoutes = [
      "/",
      "/shop",
      "/shop?bestseller=true",
      "/shop?newarrival=true",
    ];

    // Build the XML structure
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add static routes
    staticRoutes.forEach((route) => {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}${route}</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    // Add dynamic product routes
    products.forEach((product) => {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/product/${product.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(product.updated_at || Date.now()).toISOString()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    // Write the file to your public folder
    // Note: If using Vite, it goes in '/public'. If CRA, '/public'.
    fs.writeFileSync("./public/sitemap.xml", xml);
    console.log("✅ sitemap.xml successfully generated!");
  } catch (err) {
    console.error("error generating sitemap");
  }
}
