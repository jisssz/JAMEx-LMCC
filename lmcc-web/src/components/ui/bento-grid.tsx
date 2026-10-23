import React from "react";
import { cn } from "../../lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  badge,
  onClick,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "row-span-1 rounded-2xl group/bento hover:shadow-2xl transition duration-300 shadow-input p-5 bg-[#0c101d]/85 border border-white/[0.08] justify-between flex flex-col space-y-4 relative overflow-hidden backdrop-blur-xl",
        onClick && "cursor-pointer hover:border-violet-500/40 hover:bg-[#101628]/90",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/[0.03] to-transparent pointer-events-none" />
      {header}
      <div className="group-hover/bento:translate-x-1 transition duration-200 relative z-10">
        <div className="flex items-center justify-between mb-2">
          {icon && <div className="text-slate-300">{icon}</div>}
          {badge}
        </div>
        <div className="font-sans font-bold text-slate-100 text-sm mb-1">
          {title}
        </div>
        <div className="font-sans font-normal text-slate-400 text-xs leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
};
