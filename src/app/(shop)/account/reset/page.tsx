import type { Metadata } from "next";
import { ResetForm } from "@/components/ResetForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default function ResetPage() {
  return (
    <div className="pt-12">
      <h1 className="display text-[clamp(2rem,4.2vw,3.25rem)]">Choose a new password</h1>
      <ResetForm />
    </div>
  );
}
