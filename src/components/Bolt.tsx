export function Bolt({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true" className={className}>
      <polygon points="14,0 2,18 10,18 7,32 22,12 13,12" fill="currentColor" />
    </svg>
  );
}
