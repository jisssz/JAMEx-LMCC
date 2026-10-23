import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  ShieldCheck,
  Scale,
  AlertCircle,
  History as HistoryIcon,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  BarChart3,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ZenoxNav from '../components/ui/ZenoxNav';
import HowItWorksModal from '../components/ui/HowItWorksModal';
import { Spotlight } from '../components/ui/spotlight';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [isHowItWorksOpen, setIsHowItWorksOpen] = React.useState(false);

  const statutoryRules = [
    {
      num: '01',
      title: 'Maximum Retail Price',
      rule: 'Rule 6(1)(da)',
      desc: 'Mandatory declaration of retail price inclusive of all taxes, with explicit standard currency designation (₹ or Rs.) and unit sale price.',
      gazette: 'G.S.R. 629(E)',
      badgeVariant: 'pass' as const,
    },
    {
      num: '02',
      title: 'Net Quantity',
      rule: 'Rule 6(1)(c)',
      desc: 'Standard metric measurement (g, kg, ml, l) with uniform spacing and proper decimal formatting compliant with SI units.',
      gazette: 'Standard SI Units',
      badgeVariant: 'pass' as const,
    },
    {
      num: '03',
      title: 'Date of Manufacture / Packing',
      rule: 'Rule 6(1)(d)',
      desc: 'Month and year indication with explicit statutory prefix (MFD, PKD) and strict prohibition of post-dated declarations.',
      gazette: 'MM/YYYY or DD/MM/YYYY',
      badgeVariant: 'cyan' as const,
    },
    {
      num: '04',
      title: 'Manufacturer, Packer or Importer',
      rule: 'Rule 6(1)(a)',
      desc: 'Clear disclosure of the responsible corporate entity and registered address for domestic and imported packaged commodities.',
      gazette: 'Identity & Address',
      badgeVariant: 'pass' as const,
    },
    {
      num: '05',
      title: 'Consumer Care Details',
      rule: 'Rule 6(1)(e)',
      desc: 'Accessible consumer grievance contact details: telephone helpline number, email, or postal grievance redressal address.',
      gazette: 'Toll-free / Customer Care',
      badgeVariant: 'review' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-violet-500 selection:text-white relative overflow-hidden">
      {/* Restrained Aceternity Ambient Background Beams */}
      <BackgroundBeams />

      {/* Hero Spotlight */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="#8b5cf6"
      />

      {/* Floating Zenox Navigation */}
      <ZenoxNav onOpenHowItWorks={() => setIsHowItWorksOpen(true)} />

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-20 space-y-28 sm:space-y-36">
        {/* ==================================================== */}
        {/* HERO SECTION */}
        {/* ==================================================== */}
        <section className="relative pt-4 sm:pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Hero Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7 flex flex-col items-start text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Next-Gen Legal Metrology Surveillance</span>
              </div>

              <h1 className="hero-display text-white tracking-tight text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.05]">
                Screen labels. <br />
                Verify laws. <br />
                <span className="font-display-italic text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-indigo-200 to-emerald-300">
                  Protect consumers.
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-lg leading-relaxed font-sans font-normal">
                Autonomous on-device legal screening for pre-packaged commodities. Validate mandatory Rule 6 statutory declarations directly in your browser.
              </p>

              {/* Action Buttons */}
              <div className="mt-9 flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="default"
                  onClick={() => navigate('/scan')}
                  className="rounded-full shadow-violet-600/30 gap-2.5 px-8"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Live Scan</span>
                  <ArrowRight className="w-4 h-4 text-violet-200" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/scan?mode=upload')}
                  className="rounded-full gap-2 px-6"
                >
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  <span>Upload Image</span>
                </Button>

                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => navigate('/history')}
                  className="rounded-full gap-2 text-slate-400 hover:text-white"
                >
                  <HistoryIcon className="w-4 h-4" />
                  <span>History</span>
                </Button>
              </div>

              {/* Micro Trust Indicators */}
              <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-slate-400 border-t border-white/[0.08] pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>100% Offline Capable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-violet-400" />
                  <span>Zero-PII Privacy</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>LMR 2011 Verified</span>
                </div>
              </div>
            </motion.div>

            {/* Right Hero Column: Interactive Floating Scan Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative rounded-3xl p-6 bg-gradient-to-b from-[#0f1424] to-[#090d16] border border-white/[0.12] shadow-2xl backdrop-blur-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-200 font-sans">
                      Screening Radar Live
                    </span>
                  </div>
                  <Badge variant="pass">Rule 6 Verified</Badge>
                </div>

                <div className="my-5 space-y-3 font-sans text-xs">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-slate-400">MRP Declaration</span>
                    <span className="text-emerald-400 font-mono font-medium">₹ 99.00 (Rule 6(1)(da))</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-slate-400">Net Quantity</span>
                    <span className="text-emerald-400 font-mono font-medium">250 g (Rule 6(1)(c))</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-slate-400">Mfg / Packing Date</span>
                    <span className="text-emerald-400 font-mono font-medium">PKD 08/2026</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-slate-400">Consumer Care</span>
                    <span className="text-emerald-400 font-mono font-medium">1800-200-1122</span>
                  </div>
                </div>

                <Button
                  variant="default"
                  onClick={() => navigate('/scan')}
                  className="w-full rounded-xl py-3 font-medium text-xs justify-center"
                >
                  Inspect a Package Now →
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* STATUTORY RULES — ACETERNITY BENTO GRID */}
        {/* ==================================================== */}
        <section id="what-we-check" className="space-y-8 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2">
                <span>Statutory Scope</span>
              </div>
              <h2 className="section-display text-white text-3xl sm:text-4xl font-normal tracking-tight">
                Mandatory Declarations Under <span className="font-display-italic text-slate-300">Rule 6</span>
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rules')}
              className="self-start md:self-auto rounded-full text-xs"
            >
              <span>Explore Rule Library</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {statutoryRules.map((rule) => (
              <Card
                key={rule.num}
                className="hover:border-violet-500/40 hover:bg-[#101628]/90 transition-all duration-300 relative group overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      § {rule.num}
                    </span>
                    <Badge variant={rule.badgeVariant}>{rule.rule}</Badge>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-violet-300 transition-colors">
                      {rule.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {rule.desc}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Gazette Citation</span>
                    <span className="text-slate-400">{rule.gazette}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ==================================================== */}
        {/* MARKET SURVEILLANCE TELEMETRY */}
        {/* ==================================================== */}
        <section className="border-t border-white/[0.08] pt-12 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="text-xs font-mono text-violet-400 uppercase tracking-wider mb-2">
                Market Intelligence
              </div>
              <h2 className="section-display text-white text-3xl sm:text-4xl font-normal tracking-tight">
                Surveillance at <span className="font-display-italic text-slate-300">Scale.</span>
              </h2>
              <p className="mt-2 text-sm text-slate-400 max-w-md font-sans">
                Aggregated, zero-PII compliance telemetry helping consumer safety authorities detect systemic declaration omissions.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/authority-dashboard')}
              className="rounded-full gap-2 self-start md:self-auto"
            >
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <span>Explore Surveillance Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="p-7">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Surveillance Volume</span>
              <div className="font-display text-4xl text-white font-normal mt-2">1,420+</div>
              <p className="text-xs text-slate-400 mt-2 font-sans">Pilot multi-district screenings across 5 commodity sectors.</p>
            </Card>

            <Card className="p-7">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Zero False PASS</span>
              <div className="font-display text-4xl text-emerald-400 font-normal mt-2">100%</div>
              <p className="text-xs text-slate-400 mt-2 font-sans">Deterministic enforcement. Missing declarations mandate review.</p>
            </Card>

            <Card className="p-7">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Privacy by Design</span>
              <div className="font-display text-4xl text-cyan-400 font-normal mt-2">Zero PII</div>
              <p className="text-xs text-slate-400 mt-2 font-sans">Zero personal names, phone numbers, or facial data retained.</p>
            </Card>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SCANNER CALL TO ACTION */}
        {/* ==================================================== */}
        <section className="relative rounded-3xl bg-gradient-to-r from-violet-950/40 via-[#0c101d] to-indigo-950/40 border border-violet-500/20 p-10 sm:p-16 text-center shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-violet-600/10 to-transparent pointer-events-none" />
          <div className="max-w-xl mx-auto flex flex-col items-center space-y-6 relative z-10">
            <h2 className="section-display text-white text-3xl sm:text-4xl font-normal tracking-tight">
              Ready to verify a <span className="font-display-italic text-violet-300">commodity?</span>
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed font-sans max-w-md">
              Capture commodity packaging with your device camera or upload label photographs for instantaneous statutory validation.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5 w-full">
              <Button
                size="lg"
                variant="default"
                onClick={() => navigate('/scan')}
                className="rounded-full px-8 gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Camera Scan</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/scan?mode=upload')}
                className="rounded-full px-6 gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Photograph</span>
              </Button>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* LEGAL NOTICE */}
        {/* ==================================================== */}
        <section className="p-4 sm:p-5 flex items-start gap-3 text-xs text-slate-500 font-sans border-t border-white/[0.06]">
          <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-400">Statutory Notice:</strong> LMCC is an automated consumer screening aid. It does not issue official judicial determinations, certifications, or regulatory penalties. Declarations are evaluated against photographic evidence under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/[0.08] bg-[#06080e] py-8 text-xs text-slate-500 font-sans">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">JAMEx / LMCC</span>
            <span>· Legal Metrology Compliance Checker</span>
          </div>
          <div className="text-slate-500 text-xs">
            <span>Market Surveillance Platform · SIH 2026</span>
          </div>
        </div>
      </footer>

      {/* How It Works Video Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
};

export default Home;
