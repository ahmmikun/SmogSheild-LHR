import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 backdrop-blur-xl transition-colors",
        "border-slate-300 bg-white/85 hover:border-blue-500/50",
        "dark:border-blue-500/20 dark:bg-slate-900/80 dark:hover:border-blue-500/50",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400", className)}
      {...props}
    />
  );
}
