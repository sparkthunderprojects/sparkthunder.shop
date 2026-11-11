import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { ImportForm } from "./ImportForm";

export const metadata = { title: "Import products" };

export default async function ImportPage() {
  await requireAdmin();
  return (
    <>
      <div className="adm-h"><div><h1>Import or bulk edit products</h1><p>Change prices, stock, names, tags and visibility for many products at once, or add new ones, from a spreadsheet.</p></div><Link className="adm-btn" href="/admin/products">Back to products</Link></div>
      <section className="adm-card" style={{ display: "grid", gap: 8 }}>
        <h2>How it works</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
          <li><a href="/admin/export/products" download>Download your products as CSV</a>, open it in Excel or Google Sheets, and change what you want.</li>
          <li>Save as CSV and choose the file below. You see exactly what will change before anything happens.</li>
          <li>Check the preview, then press Apply.</li>
        </ol>
        <p className="adm-hint" style={{ margin: 0 }}>Columns you can use: Slug (required), SKU, Name, Franchise, Category, Price, Compare price, Stock, In stock, Published, Tags, Description. Blank cells are left alone. A slug that does not exist yet creates a new product (it also needs SKU, Name, Franchise, Category and Price) and starts hidden unless Published is yes. Photos and options are edited in the product editor.</p>
      </section>
      <ImportForm />
    </>
  );
}
