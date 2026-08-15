import type { SpecStatus } from "../specs/model";

const STATUS_COPY: Record<SpecStatus, { label: string; symbol: string }> = {
  implemented: { label: "Implemented", symbol: "✓" },
  partial: { label: "Partial", symbol: "◐" },
  future: { label: "Future", symbol: "◇" },
};

export function StatusBadge({ status }: { status: SpecStatus }) {
  const copy = STATUS_COPY[status];
  return (
    <span className={`status-badge status-${status}`}>
      <span aria-hidden="true" className="status-symbol">
        {copy.symbol}
      </span>
      {copy.label}
    </span>
  );
}
