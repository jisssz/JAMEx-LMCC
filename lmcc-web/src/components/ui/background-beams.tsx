import { cn } from "../../lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none -z-10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]",
        className
      )}
      aria-hidden="true"
    >
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-violet-600/10 via-indigo-500/10 to-transparent blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 -left-40 w-[600px] h-[400px] bg-cyan-600/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[500px] h-[400px] bg-emerald-600/5 blur-[140px] rounded-full pointer-events-none" />
      <svg
        className="absolute inset-0 h-full w-full stroke-white/[0.03] [mask-image:radial-gradient(100%_100%_at_top_center,white,transparent)]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="beams-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 40V.5H40" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" strokeWidth="0" fill="url(#beams-grid)" />
      </svg>
    </div>
  );
};
