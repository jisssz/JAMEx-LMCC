import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Scale,
  Menu,
  X,
  House,
  LayoutDashboard,
  ScanLine,
  WandSparkles,
  ShieldAlert,
  Clock,
  MapPin,
  FileText,
  Bell,
  ArrowRight,
  CircleHelp,
} from 'lucide-react';
import HowItWorksModal from './HowItWorksModal';

interface NavItem {
  label: string;
  path: string;
  Icon: React.ElementType;
}

const navLinks: NavItem[] = [
  { label: 'Home', path: '/', Icon: House },
  { label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { label: 'Scan Product', path: '/scan', Icon: ScanLine },
  { label: 'Image Enhancement', path: '/image-enhancement', Icon: WandSparkles },
  { label: 'Rules', path: '/rules', Icon: ShieldAlert },
  { label: 'History', path: '/history', Icon: Clock },
  { label: 'India Map', path: '/india-map', Icon: MapPin },
  { label: 'Reports', path: '/reports', Icon: FileText },
];

export const ZenoxNav: React.FC<{ onOpenHowItWorks?: () => void }> = ({ onOpenHowItWorks }) => {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  const showHelp = () => {
    setOpen(false);
    if (onOpenHowItWorks) onOpenHowItWorks();
    else setHelp(true);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#06080e]/95 backdrop-blur-md border-b border-white/[0.08]">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#ff7a3d] focus:text-slate-950 focus:rounded-md"
          href="#product-content"
          onClick={(event) => {
            const main = document.querySelector('main');
            if (main) {
              event.preventDefault();
              main.tabIndex = -1;
              main.focus();
              main.scrollIntoView({ behavior: 'instant' });
            }
          }}
        >
          Skip to content
        </a>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group" aria-label="JAMH X Home">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/40 transition shadow-sm shadow-cyan-500/10">
              <Scale size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-tight text-[15px] sm:text-base">JAMH X</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-medium text-emerald-400 leading-none">
                  LMCC
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-sans tracking-normal -mt-0.5 hidden xs:block">
                Legal Metrology Compliance
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main navigation" className="hidden xl:flex items-center gap-1.5">
            {navLinks.map(({ label, path, Icon }) => {
              const isActive =
                path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition duration-150 ${
                    isActive
                      ? 'border border-[#ff7a3d]/50 bg-[#ff7a3d]/10 text-[#ff935e]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-[#ff7a3d]' : 'text-slate-400'} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action Group: Scan Product CTA, Notifications, Profile Avatar, Mobile Menu Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Primary Orange Scan Button */}
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#ff6b2c] to-[#ff7a3d] hover:from-[#ff7a3d] hover:to-[#ff935e] text-slate-950 font-semibold text-xs transition shadow-md shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
            >
              <ScanLine size={14} className="stroke-[2.5]" aria-hidden="true" />
              <span className="hidden sm:inline">Scan Product</span>
              <ArrowRight size={13} className="stroke-[2.5]" aria-hidden="true" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer relative"
                aria-label="View notifications (1 unread)"
              >
                <Bell size={15} />
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  1
                </span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#090d16] border border-white/[0.1] shadow-2xl p-4 text-xs z-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="font-semibold text-white">Notifications</span>
                    <span className="text-[10px] text-slate-400">1 unread</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>Statutory Advisory</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Rule 6(1)(d) post-dated package advisory flagged for recent batch INSP-2025-001284.
                    </p>
                    <span className="text-[10px] text-slate-500">10 mins ago</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 text-white font-semibold text-xs flex items-center justify-center border border-white/20 shadow-sm"
              title="Signed in as Inspector J"
            >
              J
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              ref={toggle}
              type="button"
              onClick={() => setOpen(!open)}
              className="xl:hidden w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              aria-expanded={open}
              aria-controls="product-mobile-menu"
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {open && (
          <nav
            id="product-mobile-menu"
            className="xl:hidden border-t border-white/[0.08] bg-[#06080e]/98 px-4 py-4 space-y-1.5"
            aria-label="Mobile navigation"
          >
            {navLinks.map(({ label, path, Icon }) => {
              const isActive =
                path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
              return (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'border border-[#ff7a3d]/40 bg-[#ff7a3d]/10 text-[#ff935e]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#ff7a3d]' : 'text-slate-400'} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              );
            })}
            <button
              type="button"
              onClick={showHelp}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.04]"
            >
              <CircleHelp size={16} className="text-slate-400" />
              <span>How it works</span>
            </button>
          </nav>
        )}
      </header>

      {!onOpenHowItWorks && <HowItWorksModal isOpen={help} onClose={() => setHelp(false)} />}
    </>
  );
};

export default ZenoxNav;
