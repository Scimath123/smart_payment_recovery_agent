export function ProbabilityBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between font-mono text-xs text-muted">
        <span>{label}</span>
        <span className="text-foreground">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-panel-border">
        <div
          className="h-2 rounded-full bg-violet transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}