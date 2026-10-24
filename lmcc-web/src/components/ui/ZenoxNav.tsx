import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Scale, Menu, X, ChevronRight, Sparkles, House, CircleHelp, History as HistoryIcon, BarChart3, WandSparkles, Map, ScanLine, FileText } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Badge } from './badge';
import { Button } from './button';

interface ZenoxNavProps {
  onOpenHowItWorks?: () => void;
}

export const ZenoxNav: React.FC<ZenoxNavProps> = ({ onOpenHowItWorks }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredDockIndex, setHoveredDockIndex] = useState<number | null>(null);
  const [focusedDockIndex, setFocusedDockIndex] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();

  const navLinks = [
    { label: 'Home', path: '/', Icon: House },
    { label: 'Dashboard', path: '/dashboard', Icon: BarChart3 },
    { label: 'Scan Product', path: '/scan', Icon: ScanLine },
    { label: 'Image Enhancement', path: '/image-enhancement', Icon: WandSparkles },
    { label: 'Rules', path: '/rules', Icon: Scale },
    { label: 'History', path: '/history', Icon: HistoryIcon },
    { label: 'India Map', path: '/india-map', Icon: Map },
    { label: 'Reports', path: '/reports', Icon: FileText },
    { label: 'How it works', action: 'how-it-works', Icon: CircleHelp },
    { label: 'Surveillance', path: '/authority-dashboard', Icon: BarChart3 },
  ];

  const handleNavClick = (link: typeof navLinks[0]) => {
    setMobileMenuOpen(false);
    if (link.action === 'how-it-works') {
      if (onOpenHowItWorks) {
        onOpenHowItWorks();
      } else {
        if (location.pathname !== '/') {
          navigate('/#how-it-works');
        } else {
          const el = document.getElementById('how-it-works');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      }
      return;
    }
    if (link.path) {
      navigate(link.path);
    }
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    if (path === '/authority-dashboard') return location.pathname === '/authority-dashboard' || location.pathname === '/authority';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-3 z-50 w-full px-3 sm:px-5 max-w-[1600px] mx-auto">
      <nav className="relative flex items-center justify-between px-5 sm:px-7 py-3 rounded-full bg-[#080c16]/90 border border-white/[0.08] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all">
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 via-violet-500/20 to-transparent border border-white/10 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400/50 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-300">
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-white font-sans">JAMH X</span>
              <Badge variant="pass" className="text-[10px] px-1.5 py-0 uppercase">
                LMCC
              </Badge>
            </div>
            <span className="hidden sm:inline text-[11px] font-sans text-slate-400 -mt-0.5">
              Legal Metrology Compliance
            </span>
          </div>
        </div>

        {/* Desktop Menu Links */}
        <div
          className="jamex-nav-dock hidden lg:flex items-center gap-0.5 bg-white/[0.03] p-1 rounded-full border border-white/[0.05]"
          onMouseLeave={() => setHoveredDockIndex(null)}
        >
          {navLinks.map((link, index) => {
            const active = isActive(link.path);
            const Icon = link.Icon;
            const emphasizedIndex = hoveredDockIndex ?? focusedDockIndex;
            const distance = emphasizedIndex === null ? Infinity : Math.abs(index - emphasizedIndex);
            const scale = reducedMotion ? 1 : distance === 0 ? 1.22 : distance === 1 ? 1.1 : 1;
            const lift = reducedMotion ? 0 : distance === 0 ? -7 : distance === 1 ? -3 : 0;
            return (
              <motion.button
                key={link.label}
                type="button"
                onClick={() => handleNavClick(link)}
                onMouseEnter={() => setHoveredDockIndex(index)}
                onFocus={() => setFocusedDockIndex(index)}
                onBlur={() => setFocusedDockIndex(null)}
                animate={{ scale, y: lift }}
                transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.55 }}
                aria-label={link.label}
                aria-current={active ? 'page' : undefined}
                className={`jamex-dock-item relative flex h-10 px-2.5 items-center justify-center gap-1.5 text-[11px] 2xl:text-xs font-sans font-medium cursor-pointer rounded-full ${
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 bg-white/[0.1] border border-white/[0.12] rounded-full shadow-sm"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-[18px] w-[18px]" aria-hidden="true" />
                <span className="relative z-10 hidden whitespace-nowrap 2xl:inline">{link.label}</span>
                <span className={`jamex-dock-tooltip ${distance === 0 || focusedDockIndex === index ? 'is-visible' : ''}`} aria-hidden="true">{link.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Desktop Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            size="sm"
            variant="glass"
            onClick={() => navigate('/scan')}
            className="jamex-scan-cta rounded-full px-5 text-xs font-semibold gap-2 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/10 text-white"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scan Product</span>
            <span className="text-slate-400 font-normal">→</span>
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button
            size="sm"
            variant="glass"
            onClick={() => navigate('/scan')}
            className="rounded-full px-3 py-1 text-xs font-semibold gap-1"
          >
            <span>Scan</span>
            <span>→</span>
          </Button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full text-slate-300 hover:text-white bg-white/5 border border-white/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mt-2 p-5 rounded-3xl bg-[#090d16]/95 border border-white/[0.08] backdrop-blur-3xl shadow-2xl space-y-2 text-sm font-sans"
          >
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleNavClick(link)}
                  className={`w-full text-left py-2.5 px-3 rounded-xl transition-all flex items-center justify-between ${
                    active
                      ? 'bg-white/10 text-white font-semibold'
                      : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              );
            })}
            <div className="pt-2">
              <Button
                variant="default"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/scan');
                }}
                className="w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Product Inspection</span>
                <span>→</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default ZenoxNav;
