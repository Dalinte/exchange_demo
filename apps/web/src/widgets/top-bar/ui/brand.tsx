export function Brand() {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <span
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded
                   bg-[linear-gradient(135deg,var(--brand-2),var(--brand))]
                   text-[13px] font-extrabold text-[#181a20]"
      >
        D
      </span>
      <span className="text-[15px] font-bold tracking-tight">Demo Exchange</span>
      <span className="badge">PAPER</span>
    </div>
  );
}
