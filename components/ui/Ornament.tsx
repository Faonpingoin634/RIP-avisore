/** Quiet separator: a hairline with a small diamond (deliberately not a religious symbol). */
export default function Ornament({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 text-candle/70 ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-mist" />
      <span className="text-xs">◆</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-mist" />
    </div>
  );
}
