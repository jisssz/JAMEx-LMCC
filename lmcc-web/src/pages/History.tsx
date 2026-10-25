import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Eye,
  FileText,
  MoreVertical,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { getReports, ReportRead } from '../services/api';
import { getLocalReports, LocalReport } from '../services/storage/localReports';
import { exportInspectionReportPdf } from '../services/export/reportExporter';

interface InspectionRecord {
  id: string;
  name: string;
  category: string;
  weight: string;
  imageUrl: string;
  mrp: string;
  netQty: string;
  packer: string;
  address: string;
  genericName: string;
  consumerCare: string;
  status: 'Compliant' | 'Needs review' | 'Non-compliant';
  confidence: number;
  date: string;
  isDemo?: boolean;
}

const mockInspections: InspectionRecord[] = [
  {
    id: 'INSP-2025-001284',
    name: "Lay's Classic",
    category: 'Snacks & Chips',
    weight: '52 g',
    imageUrl: '/samples/lays.png',
    mrp: '₹ 20.00',
    netQty: '52 g',
    packer: 'PepsiCo India Holdings Pvt. Ltd.',
    address: 'Pune, Maharashtra',
    genericName: 'Potato chips',
    consumerCare: '1800 22 4020',
    status: 'Compliant',
    confidence: 94,
    date: '12 Oct 2025, 14:32',
    isDemo: true,
  },
  {
    id: 'INSP-2025-001283',
    name: 'Coca-Cola',
    category: 'Beverages',
    weight: '500 ml',
    imageUrl: '/samples/cola.jpg',
    mrp: '₹ 40.00',
    netQty: '500 ml',
    packer: 'Coca-Cola India Pvt. Ltd.',
    address: 'Gurugram, Haryana',
    genericName: 'Carbonated water',
    consumerCare: '1800 180 2653',
    status: 'Needs review',
    confidence: 78,
    date: '11 Oct 2025, 10:21',
    isDemo: true,
  },
  {
    id: 'INSP-2025-001282',
    name: 'Britannia Biscuits',
    category: 'Bakery',
    weight: '200 g',
    imageUrl: '/samples/britannia.jpg',
    mrp: '₹ 30.00',
    netQty: '200 g',
    packer: 'Britannia Industries Ltd.',
    address: 'Kolkata, West Bengal',
    genericName: 'Biscuits',
    consumerCare: '1800 425 4449',
    status: 'Compliant',
    confidence: 96,
    date: '11 Oct 2025, 09:15',
    isDemo: true,
  },
  {
    id: 'INSP-2025-001281',
    name: 'Maggi Noodles',
    category: 'Instant Food',
    weight: '70 g',
    imageUrl: '/samples/maggi.jpg',
    mrp: '₹ 14.00',
    netQty: '70 g',
    packer: 'Nestlé India Ltd.',
    address: 'New Delhi',
    genericName: 'Instant Noodles',
    consumerCare: '1800 103 1947',
    status: 'Non-compliant',
    confidence: 62,
    date: '10 Oct 2025, 18:40',
    isDemo: true,
  },
  {
    id: 'INSP-2025-001280',
    name: 'Cadbury Choco Bar',
    category: 'Confectionery',
    weight: '40 g',
    imageUrl: '/samples/dairymilk.jpg',
    mrp: '₹ 20.00',
    netQty: '40 g',
    packer: 'Mondelez India Foods Pvt. Ltd.',
    address: 'Mumbai, Maharashtra',
    genericName: 'Milk Chocolate',
    consumerCare: '1800 22 7080',
    status: 'Compliant',
    confidence: 91,
    date: '10 Oct 2025, 16:12',
    isDemo: true,
  },
  {
    id: 'INSP-2025-001279',
    name: 'Kurkure Masala',
    category: 'Snacks & Chips',
    weight: '90 g',
    imageUrl: '/samples/lays.png',
    mrp: '₹ 20.00',
    netQty: '90 g',
    packer: 'PepsiCo India Holdings Pvt. Ltd.',
    address: 'Pune, Maharashtra',
    genericName: 'Extruded Snack',
    consumerCare: '1800 22 4020',
    status: 'Compliant',
    confidence: 89,
    date: '09 Oct 2025, 13:27',
    isDemo: true,
  },
  {
    id: 'INSP-2025-001278',
    name: 'Parle-G Biscuits',
    category: 'Bakery',
    weight: '100 g',
    imageUrl: '/samples/britannia.jpg',
    mrp: '₹ 10.00',
    netQty: '100 g',
    packer: 'Parle Products Pvt. Ltd.',
    address: 'Mumbai, Maharashtra',
    genericName: 'Glucose Biscuits',
    consumerCare: '1800 22 2111',
    status: 'Needs review',
    confidence: 76,
    date: '09 Oct 2025, 11:05',
    isDemo: true,
  },
  {
    id: 'INSP-2025-001277',
    name: 'Amul Milk',
    category: 'Dairy',
    weight: '1 L',
    imageUrl: '/samples/cola.jpg',
    mrp: '₹ 60.00',
    netQty: '1 L',
    packer: 'GCMMF (Amul)',
    address: 'Anand, Gujarat',
    genericName: 'Pasteurized Milk',
    consumerCare: '1800 258 3333',
    status: 'Compliant',
    confidence: 93,
    date: '08 Oct 2025, 09:50',
    isDemo: true,
  },
];

export const History: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All Status' | 'Compliant' | 'Needs review' | 'Non-compliant'>('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [timePeriodFilter, setTimePeriodFilter] = useState('All time');
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord>(mockInspections[0]);
  const [flyoutOpen, setFlyoutOpen] = useState(true);
  const [detailTab, setDetailTab] = useState<'extracted' | 'rules' | 'images' | 'report'>('extracted');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set([mockInspections[0].id]));

  // Combine real database records with mock data
  const [records, setRecords] = useState<InspectionRecord[]>(mockInspections);

  useEffect(() => {
    async function loadRealData() {
      try {
        const [serverList, localList] = await Promise.all([
          getReports(20).catch(() => [] as ReportRead[]),
          getLocalReports().catch(() => [] as LocalReport[]),
        ]);

        const realFormatted: InspectionRecord[] = [
          ...serverList.map((r) => ({
            id: r.id.slice(0, 16),
            name: r.productName || 'Inspected Package',
            category: 'Packaged Commodity',
            weight: r.netQuantity || 'Standard Pack',
            imageUrl: '/samples/lays.png',
            mrp: r.mrp || '₹ --',
            netQty: r.netQuantity || '--',
            packer: r.manufacturer || 'Registered Packer',
            address: 'Declared Premises',
            genericName: 'Packaged Commodity',
            consumerCare: r.consumerCare || 'Helpline declared',
            status: (r.verdict === 'PASS' ? 'Compliant' : 'Needs review') as 'Compliant' | 'Needs review',
            confidence: r.verdict === 'PASS' ? 95 : 74,
            date: new Date(r.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            isDemo: false,
          })),
          ...localList.map((l) => ({
            id: l.localId.slice(0, 16),
            name: l.payload.productName || 'Local Inspection',
            category: 'Offline Record',
            weight: l.payload.netQuantity || 'Standard Pack',
            imageUrl: '/samples/lays.png',
            mrp: l.payload.mrp || '₹ --',
            netQty: l.payload.netQuantity || '--',
            packer: l.payload.manufacturer || 'Local Packer',
            address: 'Local Premises',
            genericName: 'Packaged Commodity',
            consumerCare: l.payload.consumerCare || '--',
            status: (l.payload.verdict === 'PASS' ? 'Compliant' : 'Needs review') as 'Compliant' | 'Needs review',
            confidence: l.payload.verdict === 'PASS' ? 92 : 70,
            date: new Date(l.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            isDemo: false,
          })),
        ];

        if (realFormatted.length > 0) {
          // Put real inspections first, followed by reference mock inspections
          setRecords([...realFormatted, ...mockInspections]);
          setSelectedRecord(realFormatted[0]);
          setSelectedRows(new Set([realFormatted[0].id]));
        }
      } catch {
        // Fall back to clean mock records
      }
    }

    void loadRealData();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.packer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'All Status' || item.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'All Categories' || item.category === categoryFilter;

      let matchesTime = true;
      if (timePeriodFilter !== 'All time') {
        // Parse date for comparison if feasible
        const now = Date.now();
        const days = timePeriodFilter === 'Last 7 days' ? 7 : 30;
        const itemTime = Date.parse(item.date);
        if (!isNaN(itemTime)) {
          matchesTime = now - itemTime <= days * 24 * 60 * 60 * 1000;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesTime;
    });
  }, [records, searchQuery, statusFilter, categoryFilter, timePeriodFilter]);

  // Derived reconciled metrics
  const liveCount = useMemo(() => records.filter((r) => !r.isDemo).length, [records]);
  const demoCount = useMemo(() => records.filter((r) => r.isDemo).length, [records]);
  const compliantCount = useMemo(() => records.filter((r) => r.status === 'Compliant').length, [records]);
  const needsReviewCount = useMemo(() => records.filter((r) => r.status === 'Needs review').length, [records]);
  const nonCompliantCount = useMemo(() => records.filter((r) => r.status === 'Non-compliant').length, [records]);
  const compliantRate = records.length ? Math.round((compliantCount / records.length) * 100) : 0;
  const reviewRate = records.length ? Math.round((needsReviewCount / records.length) * 100) : 0;
  const nonCompliantRate = records.length ? Math.round((nonCompliantCount / records.length) * 100) : 0;

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  const handleSelectInspection = (record: InspectionRecord) => {
    setSelectedRecord(record);
    setFlyoutOpen(true);
    setSelectedRows(new Set([record.id]));
  };

  const handleExportSinglePdf = (record: InspectionRecord) => {
    exportInspectionReportPdf({
      reportId: record.id,
      timestamp: record.date,
      verdict: {
        overallStatus: record.status === 'Compliant' ? 'PASS' : 'REVIEW',
        details: [],
      },
      extractedLabel: {
        mrp: record.mrp,
        netQuantityRaw: record.netQty,
        manufacturer: record.packer,
        consumerCareRaw: record.consumerCare,
      },
      productName: record.name,
    });
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-orange-500/30 font-sans">
      <ZenoxNav />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* ==================================================== */}
        {/* HEADER SECTION (Matching Reference Image 3)         */}
        {/* ==================================================== */}
        <div className="space-y-1 pb-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>INSPECTION HISTORY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-sans tracking-tight text-white font-normal">
            Past Inspections
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            View, search and manage all your product inspections.
          </p>
        </div>

        {/* ==================================================== */}
        {/* TOP KPI CARDS (Matching Reference Image 3)           */}
        {/* ==================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Inspections */}
          <div className="bg-[#090d16] p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-600/15 border border-violet-500/25 text-violet-400 flex items-center justify-center shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono leading-none block">
                  {records.length}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Total ({liveCount} live · {demoCount} demo)
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Compliant */}
          <div className="bg-[#090d16] p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono leading-none block">
                  {compliantCount}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Compliant</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {compliantRate}%
            </span>
          </div>

          {/* Card 3: Needs Review */}
          <div className="bg-[#090d16] p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono leading-none block">
                  {needsReviewCount}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Needs review</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              {reviewRate}%
            </span>
          </div>

          {/* Card 4: Non-compliant */}
          <div className="bg-[#090d16] p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 flex items-center justify-center shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono leading-none block">
                  {nonCompliantCount}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Non-compliant</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-red-400 font-mono bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
              {nonCompliantRate}%
            </span>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SEARCH & FILTER TOOLBAR (Matching Reference Image 3) */}
        {/* ==================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#090d16] p-3 rounded-2xl border border-white/[0.08]">
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, brand, or inspection ID..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="All Status">All Status</option>
              <option value="Compliant">Compliant</option>
              <option value="Needs review">Needs review</option>
              <option value="Non-compliant">Non-compliant</option>
            </select>

            {/* Categories */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="All Categories">All Categories</option>
              <option value="Snacks & Chips">Snacks &amp; Chips</option>
              <option value="Beverages">Beverages</option>
              <option value="Bakery">Bakery</option>
              <option value="Dairy">Dairy</option>
              <option value="Instant Food">Instant Food</option>
              <option value="Confectionery">Confectionery</option>
              <option value="Packaged Commodity">Packaged Commodity</option>
            </select>

            {/* Time Period */}
            <select
              value={timePeriodFilter}
              onChange={(e) => setTimePeriodFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="All time">All time</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 7 days">Last 7 days</option>
            </select>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SPLIT TABLE & INSPECTOR VIEW (Matching Image 3)      */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Inspection Table (8 cols if flyout open, 12 cols if closed) */}
          <div className={flyoutOpen ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <div className="bg-[#090d16] rounded-3xl border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-black/30 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          className="accent-orange-500 rounded cursor-pointer"
                          onChange={(e) => {
                            if (e.target.checked) setSelectedRows(new Set(records.map((r) => r.id)));
                            else setSelectedRows(new Set());
                          }}
                        />
                      </th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Extracted Details</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Confidence</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredRecords.slice(0, 8).map((record) => {
                      const isSelected = selectedRecord?.id === record.id;
                      const isChecked = selectedRows.has(record.id);

                      return (
                        <tr
                          key={record.id}
                          onClick={() => handleSelectInspection(record)}
                          className={`hover:bg-white/[0.03] transition cursor-pointer ${
                            isSelected ? 'bg-orange-500/[0.05] border-l-2 border-orange-500' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRow(record.id)}
                              className="accent-orange-500 rounded cursor-pointer"
                            />
                          </td>

                          {/* Product Image & Title */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/[0.08] flex items-center justify-center p-1 shrink-0">
                                <img
                                  src={record.imageUrl}
                                  alt={record.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-white block text-xs">{record.name}</span>
                                  {record.isDemo ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-wide bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                      DEMO
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      LIVE
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 block mt-0.5">{record.weight}</span>
                              </div>
                            </div>
                          </td>

                          {/* Extracted Details */}
                          <td className="py-3 px-4 text-[11px]">
                            <div className="space-y-0.5">
                              <div>
                                <span className="text-slate-400">MRP: </span>
                                <span className="font-mono text-white font-medium">{record.mrp}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Net Qty: </span>
                                <span className="font-mono text-slate-300">{record.netQty}</span>
                              </div>
                              <div className="text-slate-400 truncate max-w-[180px]">
                                {record.packer}
                              </div>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                record.status === 'Compliant'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                  : record.status === 'Needs review'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                  : 'bg-red-500/10 text-red-400 border-red-500/25'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  record.status === 'Compliant'
                                    ? 'bg-emerald-400'
                                    : record.status === 'Needs review'
                                    ? 'bg-amber-400'
                                    : 'bg-red-400'
                                }`}
                              />
                              <span>{record.status}</span>
                            </span>
                          </td>

                          {/* Confidence Progress Bar */}
                          <td className="py-3 px-4">
                            <div className="space-y-1 w-24">
                              <span className="font-mono text-[11px] text-slate-300 block font-medium">
                                {record.confidence}%
                              </span>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    record.confidence >= 85
                                      ? 'bg-emerald-400'
                                      : record.confidence >= 70
                                      ? 'bg-amber-400'
                                      : 'bg-red-400'
                                  }`}
                                  style={{ width: `${record.confidence}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                            {record.date}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectInspection(record)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportSinglePdf(record)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                                title="Download PDF Report"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                                title="More Actions"
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/[0.06] bg-black/20 text-xs text-slate-400">
                <span>Showing {Math.min(filteredRecords.length, 8)} of {filteredRecords.length} filtered ({records.length} total)</span>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-white/[0.06] transition text-slate-400 hover:text-white">
                    <ChevronLeft size={14} />
                  </button>
                  <button className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30 font-medium">
                    1
                  </button>
                  <button className="px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition">2</button>
                  <button className="px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition">3</button>
                  <button className="px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition">4</button>
                  <button className="px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition">5</button>
                  <span className="px-1 text-slate-600">...</span>
                  <button className="px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition">161</button>
                  <button className="p-1.5 rounded-lg hover:bg-white/[0.06] transition text-slate-400 hover:text-white">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* RIGHT FLYOUT / DETAILS PANEL (4 cols)              */}
          {/* -------------------------------------------------- */}
          {flyoutOpen && selectedRecord && (
            <div className="lg:col-span-4 bg-[#090d16] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-5">
              {/* Flyout Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-orange-500 rounded-full" />
                  <span className="font-semibold text-white text-xs tracking-wide">
                    Inspection Details
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                      selectedRecord.status === 'Compliant'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                    }`}
                  >
                    {selectedRecord.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFlyoutOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Data Provenance Notice */}
              {selectedRecord.isDemo ? (
                <div className="px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span>Reference Demo Sample · Evaluated deterministically under SIH 2026.</span>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Live Inspection Record · Saved from camera / device screening.</span>
                </div>
              )}

              {/* Product Image & Title */}
              <div className="flex items-center gap-4 bg-black/40 p-3.5 rounded-2xl border border-white/[0.04]">
                <div className="w-16 h-16 rounded-xl bg-black/50 border border-white/[0.08] flex items-center justify-center p-1.5 shrink-0">
                  <img
                    src={selectedRecord.imageUrl}
                    alt={selectedRecord.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{selectedRecord.name}</h3>
                  <span className="text-xs text-slate-400 block mt-0.5">{selectedRecord.weight}</span>
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    {selectedRecord.id}
                  </span>
                </div>
              </div>

              {/* Quick Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-black/20 p-3 rounded-xl border border-white/[0.04]">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Date &amp; Time</span>
                  <span className="text-slate-300 text-[11px] font-medium mt-0.5 block">
                    {selectedRecord.date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Confidence</span>
                  <span className="text-emerald-400 text-[11px] font-mono font-medium mt-0.5 block">
                    {selectedRecord.confidence}%
                  </span>
                </div>
              </div>

              {/* Segmented Detail Tabs */}
              <div className="grid grid-cols-4 gap-1 border-b border-white/[0.06] text-xs pb-1">
                <button
                  type="button"
                  onClick={() => setDetailTab('extracted')}
                  className={`py-1.5 text-center font-medium transition cursor-pointer ${
                    detailTab === 'extracted'
                      ? 'text-orange-400 border-b-2 border-orange-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Extracted
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('rules')}
                  className={`py-1.5 text-center font-medium transition cursor-pointer ${
                    detailTab === 'rules'
                      ? 'text-orange-400 border-b-2 border-orange-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rule Results
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('images')}
                  className={`py-1.5 text-center font-medium transition cursor-pointer ${
                    detailTab === 'images'
                      ? 'text-orange-400 border-b-2 border-orange-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Images
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('report')}
                  className={`py-1.5 text-center font-medium transition cursor-pointer ${
                    detailTab === 'report'
                      ? 'text-orange-400 border-b-2 border-orange-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Report
                </button>
              </div>

              {/* Detail Content Body */}
              <div className="space-y-3 text-xs divide-y divide-white/[0.04]">
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-400">Product Name</span>
                  <span className="font-medium text-white text-right">{selectedRecord.name}</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-400">Generic Name</span>
                  <span className="font-medium text-white text-right">{selectedRecord.genericName}</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-400">Net Quantity</span>
                  <span className="font-mono text-white text-right">{selectedRecord.netQty}</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-400">MRP</span>
                  <span className="font-mono text-white text-right">{selectedRecord.mrp}</span>
                </div>
                <div className="pt-2 flex flex-col justify-between gap-1">
                  <span className="text-slate-400">Manufacturer / Packer</span>
                  <span className="font-medium text-white text-right break-words">{selectedRecord.packer}</span>
                </div>
                <div className="pt-2 flex flex-col justify-between gap-1">
                  <span className="text-slate-400">Address</span>
                  <span className="font-medium text-slate-300 text-right break-words">{selectedRecord.address}</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-400">Consumer Care</span>
                  <span className="font-mono text-white text-right">{selectedRecord.consumerCare}</span>
                </div>
              </div>

              {/* Bottom Actions Toolbar */}
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <button
                  type="button"
                  onClick={() => navigate('/results')}
                  className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText size={13} />
                  <span>View Full Report</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportSinglePdf(selectedRecord)}
                    className="py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/scan')}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b2c] to-[#ff7a3d] hover:from-[#ff7a3d] hover:to-[#ff935e] text-slate-950 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>New Scan</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
