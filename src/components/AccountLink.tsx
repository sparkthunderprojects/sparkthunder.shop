import Link from "@/components/LocaleLink";

export function AccountLink() {
  return (
    <Link href="/account" aria-label="My account" className="relative hidden h-10 w-10 items-center justify-center hover:bg-paper-2 sm:flex">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    </Link>
  );
}
