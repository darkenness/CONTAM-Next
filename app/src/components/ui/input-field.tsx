/**
 * L-19: Shared labeled input field with optional unit suffix.
 * Grid layout: label 1/3, input 2/3.
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
    <div className="grid grid-cols-3 gap-x-3 items-center">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 text-right col-span-1 leading-tight">
        {label}
      </label>
      <div className="col-span-2 flex items-center gap-1.5">
        <input type={type} value={value} step={step} min={min} max={max} disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:opacity-50" />
        {unit && <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{unit}</span>}
      </div>
    </div>
  );
}
