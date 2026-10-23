import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-violet-600/20 text-violet-300 border-violet-500/30",
        pass:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold",
        review:
          "border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold",
        destructive:
          "border-rose-500/30 bg-rose-500/10 text-rose-400 font-semibold",
        outline:
          "border-white/10 bg-white/[0.02] text-slate-300",
        secondary:
          "border-slate-700 bg-slate-800/80 text-slate-300",
        cyan:
          "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
