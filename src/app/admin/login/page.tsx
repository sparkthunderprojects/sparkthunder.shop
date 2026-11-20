import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { hasSupabase, isDemo } from "@/lib/db/env";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  await connection();
  if (await getAdmin()) redirect("/admin");
  return (
    <div className={hasSupabase || isDemo ? "adm-login adm-shop" : "adm-login"}>
      {hasSupabase || isDemo ? (<>
        <main className="adm-login-main"><LoginForm /><div className="adm-login-foot">Spark Merchant by Sparkthunder</div></main>
        <aside className="adm-login-side" aria-hidden>
          <h2>Run every store from one place.</h2>
          <p>Products, orders, customers and analytics for all your brands, each store with its own look, languages and domain.</p>
          <ul><li>One login, many stores</li><li>Analytics with period comparisons</li><li>Built-in SEO, discounts and loyalty</li></ul>
        </aside>
      </>) : (
        <div className="adm-card" style={{ maxWidth: 560 }}>
          <h2>Connect Supabase to use the admin</h2>
          <ol style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
            <li>Create a Supabase project and add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your host.</li>
            <li>In the SQL editor run <code>supabase/schema.sql</code>, then <code>supabase/admin.sql</code>.</li>
            <li>In Authentication, add a user with the email and password you will sign in with. Run the admin script after creating the user, or sign in with Google as thegmpfury@gmail.com.</li>
            <li>Redeploy, then come back to this page.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
