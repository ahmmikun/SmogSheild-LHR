import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:bg-slate-400 disabled:shadow-none dark:disabled:bg-slate-700",
  secondary:
    "border border-slate-300 bg-white text-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost: "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800",
};

export function Button({
  variant = "secondary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
