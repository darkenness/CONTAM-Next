/**
 * L-19: Shared labeled input field with optional unit suffix.
 */
export function InputField({ label, value, onChange, unit, type = 'text', step, min, max, disabled }: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  unit?: string;
  type?: string;
  step?: string;
  min?: string | number;
  max?: string | number;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <input type={type} value={value} step={step} min={min} max={max} disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring bg-background disabled:opacity-50" />
        {unit && <span className="text-[10px] text-muted-foreground min-w-[24px]">{unit}</span>}
      </div>
    </label>
  );
}
