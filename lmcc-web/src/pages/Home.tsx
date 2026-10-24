import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Map,
  WandSparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import ZenoxNav from '../components/ui/ZenoxNav';
import HowItWorksModal from '../components/ui/HowItWorksModal';
import InspectionStudio from '../components/hero/InspectionStudio';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import './reference-workspace.css';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [isHowItWorksOpen, setIsHowItWorksOpen] = React.useState(false);

  const statutoryRules = [
    {
      num: '01',
      title: 'Maximum Retail Price',
      rule: 'Rule 6(1)(da)',
      desc: 'Review the declared retail price, currency and inclusive-of-tax wording, with unit sale price where applicable.',
      gazette: 'G.S.R. 629(E)',
      badgeVariant: 'pass' as const,
    },
    {
      num: '02',
      title: 'Net Quantity',
      rule: 'Rule 6(1)(c)',
      desc: 'Check the declared quantity and unit against the photographed label, including goods sold by count.',
      gazette: 'Standard SI Units',
      badgeVariant: 'pass' as const,
    },
    {
      num: '03',
      title: 'Date of Manufacture / Packing',
      rule: 'Rule 6(1)(d)',
      desc: 'Locate manufacturing or packing dates and review unclear, missing or conflicting date evidence.',
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
      rule: 'Rule 6(1)(n)',
      desc: 'Review the declared consumer contact name, address, telephone number and email alongside the package evidence.',
      gazette: 'Toll-free / Customer Care',
      badgeVariant: 'review' as const,
    },
  ];

  return (
    <div className="lmcc-home min-h-screen text-slate-100 flex flex-col justify-between selection:bg-violet-500 selection:text-white relative overflow-hidden">

      {/* Floating Zenox Navigation */}
      <ZenoxNav onOpenHowItWorks={() => setIsHowItWorksOpen(true)} />

      {/* Main Container */}
      <main className="home-refined relative z-10 w-full max-w-[1440px] mx-auto px-5 sm:px-8 pt-10 pb-12 sm:pt-12 sm:pb-16 space-y-16 sm:space-y-20">
        {/* ==================================================== */}
        {/* HERO SECTION */}
        {/* ==================================================== */}
        <section className="relative pt-4 sm:pt-10">
          <div className="studio-hero grid items-center">
            {/* Left Hero Column */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="min-w-0 flex flex-col items-start text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>JAMEx-LMCC · Evidence-led inspection</span>
              </div>

              <h1 className="studio-heading hero-display text-white tracking-tight font-normal leading-[1.05]">
                Screen labels. <br />
                Verify laws. <br />
                <span className="font-display-italic text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-indigo-200 to-emerald-300">
                  Protect consumers.
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-lg leading-relaxed font-sans font-normal">
                From package to evidence. Extract label declarations, review uncertain details, and screen packaged commodities against deterministic Legal Metrology rules.
              </p>

              {/* Action Buttons */}
              <div className="mt-9 flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="default"
                  onClick={() => navigate('/scan')}
                  className="studio-primary rounded-full gap-2.5 px-8"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Live Scan</span>
                  <ArrowRight className="w-4 h-4" />
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
                  <span>On-device OCR</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-violet-400" />
                  <span>Human review</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Deterministic rules</span>
                </div>
              </div>
            </motion.div>

            <InspectionStudio />
          </div>
        </section>

        {/* ==================================================== */}
        {/* STATUTORY RULES — ACETERNITY BENTO GRID */}
        {/* ==================================================== */}
        <motion.section
          id="what-we-check"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="space-y-8 scroll-mt-24"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2">
                <span>Screening scope</span>
              </div>
              <h2 className="section-display text-white text-3xl sm:text-4xl font-normal tracking-tight">
                Five declarations to review.
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
                    <span>Reference context</span>
                    <span className="text-slate-400">{rule.gazette}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* ==================================================== */}
        {/* MARKET SURVEILLANCE TELEMETRY */}
        {/* ==================================================== */}
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="border-t border-white/[0.08] pt-12 space-y-10"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="text-xs font-mono text-violet-400 uppercase tracking-wider mb-2">
                Inspection toolkit
              </div>
              <h2 className="section-display text-white text-3xl sm:text-4xl font-normal tracking-tight">
                From evidence to review.
              </h2>
              <p className="mt-2 text-sm text-slate-400 max-w-md font-sans">
                Review package photographs, revisit saved reports, and explore clearly labelled demonstration views.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/authority-dashboard')}
              className="rounded-full gap-2 self-start md:self-auto"
            >
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <span>View demo surveillance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Card className="p-7">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Inspection Evidence</span>
              <div className="font-display text-4xl text-white font-normal mt-2">Multi-panel</div>
              <p className="text-xs text-slate-400 mt-2 font-sans">Combine declarations from multiple package photographs.</p>
            </Card>
            <Link to="/image-enhancement" className="home-tool-link p-7">
              <WandSparkles className="h-5 w-5 text-violet-300"/><span className="mt-3 block text-[11px] font-mono text-slate-500 uppercase tracking-wider">Image Enhancement</span><div className="mt-2 font-display text-2xl text-white">Local tools</div><p className="mt-2 text-xs text-slate-400">Review quality and compare a deterministic working copy.</p>
            </Link>
            <Link to="/india-map" className="home-tool-link p-7">
              <Map className="h-5 w-5 text-cyan-300"/><span className="mt-3 block text-[11px] font-mono text-slate-500 uppercase tracking-wider">India Compliance Map</span><div className="mt-2 font-display text-2xl text-white">Jurisdictions</div><p className="mt-2 text-xs text-slate-400">Browse states and territories; geographic evidence is clearly scoped.</p>
            </Link>

            <Card className="p-7">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Rule Screening</span>
              <div className="font-display text-4xl text-emerald-400 font-normal mt-2">Evidence-led</div>
              <p className="text-xs text-slate-400 mt-2 font-sans">Uncertain or conflicting declarations are flagged for human review.</p>
            </Card>

            <Card className="p-7">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Inspection Records</span>
              <div className="font-display text-4xl text-cyan-400 font-normal mt-2">Exportable</div>
              <p className="text-xs text-slate-400 mt-2 font-sans">Review inspection history and export PDF or CSV reports.</p>
            </Card>
          </div>
        </motion.section>

        {/* ==================================================== */}
        {/* SCANNER CALL TO ACTION */}
        {/* ==================================================== */}
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="relative rounded-3xl bg-gradient-to-r from-violet-950/40 via-[#0c101d] to-indigo-950/40 border border-violet-500/20 p-10 sm:p-16 text-center shadow-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-radial-gradient from-violet-600/10 to-transparent pointer-events-none" />
          <div className="max-w-xl mx-auto flex flex-col items-center space-y-6 relative z-10">
            <h2 className="section-display text-white text-3xl sm:text-4xl font-normal tracking-tight">
              Ready to verify a <span className="font-display-italic text-violet-300">commodity?</span>
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed font-sans max-w-md">
              Capture a package with your camera or upload label photographs. Review extracted declarations and screening findings before saving a report.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5 w-full">
              <Button
                size="lg"
                variant="default"
                onClick={() => navigate('/scan')}
                className="reference-primary rounded-full px-8 gap-2"
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
        </motion.section>

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
