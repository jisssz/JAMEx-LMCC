import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ZenoxNav from '../components/ui/ZenoxNav';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Scale, CheckCircle2, Sparkles, ArrowRight, Search, Bot } from 'lucide-react';
import { ComplianceCopilotSheet } from '../components/copilot/ComplianceCopilotSheet';
import './reference-workspace.css';

export const Rules: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState('01');
  const [category, setCategory] = useState('all');

  const rulesData = [
    {
      num: '01',
      title: 'Manufacturer, Packer or Importer',
      rule: 'Rule 6(1)(a) & 6(1)(ab)',
      citation: 'G.S.R. 427(E)',
      summary:
        'Every package must declare the name and complete address of the manufacturer, or where the manufacturer is not the packer, the name and address of the manufacturer and packer. For imported goods, the name and complete address of the importer must be declared.',
      criteria: [
        'Corporate entity name clearly identifiable',
        'Registered premise address including city, state, or postal PIN code',
        'Distinct qualification for domestic vs. imported goods',
      ],
    },
    {
      num: '02',
      title: 'Standard Net Quantity',
      rule: 'Rule 6(1)(c)',
      citation: 'Second Schedule Units',
      summary:
        'The net quantity, in terms of standard unit of weight or measure of the commodity contained in the package, must be declared using SI units (g, kg, ml, l, m) or by number where goods are sold by count.',
      criteria: [
        'Standard metric units only (non-metric like lbs/oz prohibited)',
        'Proper spacing between numerical value and unit symbol (e.g., 500 g, not 500g)',
        'Minimum font size compliant with package area schedule',
      ],
    },
    {
      num: '03',
      title: 'Month & Year of Manufacture or Packing',
      rule: 'Rule 6(1)(d)',
      citation: 'G.S.R. 779(E)',
      summary:
        'The month and year in which the commodity is manufactured, packed, or imported must be clearly indicated. Post-dated packaging dates relative to the date of inspection are strictly prohibited.',
      criteria: [
        'Explicit statutory prefix: MFD, MFG, or PKD',
        'Standard date format (MM/YYYY or DD/MM/YYYY)',
        'Prohibition of future post-dating beyond the current calendar month',
      ],
    },
    {
      num: '04',
      title: 'Maximum Retail Price & Unit Sale Price',
      rule: 'Rule 6(1)(da) & 6(1)(e)',
      citation: 'G.S.R. 629(E)',
      summary:
        'The maximum retail price at which the commodity in packaged form may be sold to the ultimate consumer, inclusive of all taxes. For pre-packaged commodities, the unit sale price (e.g. ₹ per g / ml) must also be stated where mandatory.',
      criteria: [
        'Mandatory phrasing: "Inclusive of all taxes" or "Incl. of all taxes"',
        'Recognized currency symbol (₹ or Rs.)',
        'Clear, legible printing not obscured by folds or crimps',
      ],
    },
    {
      num: '05',
      title: 'Consumer Care Cell Details',
      rule: 'Rule 6(1)(n)',
      citation: 'G.S.R. 2022 Amendment',
      summary:
        'Every package must declare the name, address, telephone number, and email address of the person or office that can be contacted in case of consumer complaints or queries.',
      criteria: [
        'Active toll-free number or customer care telephone line',
        'Designated consumer grievance email address',
        'Postal contact address of the grievance officer',
      ],
    },
  ];

  const filteredRules = rulesData.filter((r) => {
    if (category !== 'all' && category !== r.num) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (r.num === '04' && 'mrp price'.includes(q)) ||
      r.title.toLowerCase().includes(q) ||
      r.rule.toLowerCase().includes(q) ||
      r.citation.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.criteria.some((c) => c.toLowerCase().includes(q))
    );
  });
  const activeRule = filteredRules.find(rule => rule.num === selectedRule) ?? filteredRules[0];

  return (
    <div className="reference-workspace rules-workspace min-h-screen text-slate-100">
      <ZenoxNav />

      <main className="reference-main">
        {/* Editorial Header */}
        <header className="reference-header mb-8">
          <div>
          <div className="inline-flex items-center gap-2 text-violet-300 text-xs font-medium">
            <Scale className="w-3.5 h-3.5" />
            <span>Legal Metrology · Reference library</span>
          </div>
          <h1>Know the declarations.</h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed font-sans font-normal">
            Browse the five declaration references available in LMCC. Search a topic, select a reference, and review its screening criteria.
          </p>
          </div>
        </header>
        <div className="rules-layout">

        {/* Interactive Statutory Search & Copilot Trigger */}
        <aside className="reference-panel rules-browser" aria-label="Find a declaration">
          <label htmlFor="rule-search" className="reference-eyebrow">Search references</label>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="rule-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Topic, clause or citation…"
              className="w-full pl-9 pr-3.5 py-3 text-xs bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-violet-400 transition-colors"
            />
          </div>
          <label htmlFor="rule-category" className="mt-4 block text-xs text-slate-400">Declaration category</label>
          <select id="rule-category" value={category} onChange={event => setCategory(event.target.value)} className="reference-select">
            <option value="all">All declarations</option>
            {rulesData.map(rule => <option key={rule.num} value={rule.num}>{rule.title}</option>)}
          </select>
          <p role="status" className="my-4 text-xs text-slate-400">{filteredRules.length} of {rulesData.length} references</p>
          <nav aria-label="Declaration references" className="space-y-2">
            {filteredRules.map(rule => <button key={rule.num} type="button" aria-current={activeRule?.num === rule.num ? 'true' : undefined} onClick={() => setSelectedRule(rule.num)} className="rule-choice"><span className="text-xs text-violet-300">{rule.rule}</span><span className="mt-1 block text-sm">{rule.title}</span></button>)}
          </nav>
          {(searchQuery || category !== 'all') && <Button variant="ghost" className="mt-3 w-full" onClick={() => { setSearchQuery(''); setCategory('all'); }}>Clear filters</Button>}
        </aside>
        <section aria-label="Selected declaration" className="min-w-0">
          {!activeRule ? <div className="reference-panel reference-empty"><h2>No matching references</h2><p className="mt-2 text-sm text-slate-400">Try “MRP”, “quantity”, or clear your filters.</p></div> : <Card className="reference-panel p-6 sm:p-8">
            <p className="reference-eyebrow">Declaration {activeRule.num} / 05</p>
            <h2 className="mt-4">{activeRule.title}</h2>
            <Badge variant="outline" className="mt-4">{activeRule.rule}</Badge>
            <p className="mt-5 text-sm leading-7 text-slate-300">{activeRule.summary}</p>
            <div className="mt-7 border-t border-white/10 pt-6"><h3 className="text-sm font-semibold">Screening criteria</h3><ul className="mt-4 space-y-4">{activeRule.criteria.map(criterion => <li key={criterion} className="flex gap-3 text-sm leading-6 text-slate-300"><CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-violet-300"/>{criterion}</li>)}</ul></div>
            <p className="mt-7 text-xs leading-6 text-slate-400">These are the app’s reference summaries, not the full statutory text. Applicability and amendments require source verification.</p>
          </Card>}
        </section>
        <aside className="reference-panel rules-help" aria-label="Source and help">
          <p className="reference-eyebrow">Source context</p>
          <h2 className="mt-3">Legal Metrology</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">Packaged Commodities Rules, 2011</p>
          {activeRule && <dl className="mt-5 space-y-2 text-xs leading-6"><dt className="text-slate-400">Citation recorded in this library</dt><dd className="text-violet-200">{activeRule.citation}</dd></dl>}
          <p className="mt-4 text-xs leading-6 text-slate-400">The full gazette document is not included in this library.</p>
          <div className="my-6 border-t border-white/10"/>
          <h3 className="mb-3 text-sm font-semibold">Need help interpreting a label?</h3>
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 text-xs font-medium border border-violet-500/30 transition-colors cursor-pointer"
          >
            <Bot className="w-4 h-4 text-violet-300" />
            <span>Consult AI Copilot</span>
          </button>
          <Button className="reference-primary mt-3 w-full" onClick={() => navigate('/scan')}><Sparkles className="mr-2 h-4 w-4"/>Scan a package<ArrowRight className="ml-2 h-4 w-4"/></Button>
        </aside>
        </div>

      </main>

      <footer className="relative z-10 w-full border-t border-white/[0.08] bg-[#06080e] py-8 text-xs text-slate-500 font-sans">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          <span>LMCC · Legal Metrology Rules, 2011</span>
          <span>SIH 2026 · Team JAMH X4</span>
        </div>
      </footer>

      {/* Grounded Copilot Drawer */}
      <ComplianceCopilotSheet
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </div>
  );
};

export default Rules;
