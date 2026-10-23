import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck,
  X,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { ExtractedLabel } from '../../models/ExtractedLabel';
import { Verdict } from '../../models/Verdict';
import { RulesEngine } from '../../services/rules/rulesEngine';

interface HumanReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLabel: ExtractedLabel;
  onApplyReview: (updatedLabel: ExtractedLabel, newVerdict: Verdict) => void;
}

export const HumanReviewModal: React.FC<HumanReviewModalProps> = ({
  isOpen,
  onClose,
  initialLabel,
  onApplyReview,
}) => {
  const [formData, setFormData] = useState({
    productName: initialLabel.productName || '',
    mrp: initialLabel.mrp || '',
    netQuantity: initialLabel.netQuantity || '',
    manufacturer: initialLabel.manufacturer || '',
    address: initialLabel.address || '',
    packingDate: initialLabel.packingDate || initialLabel.manufactureDate || '',
    consumerCare: initialLabel.consumerCare || '',
    reviewerName: initialLabel.reviewerName || '',
    reviewerNotes: initialLabel.reviewerNotes || '',
    resolveConflicts: false,
  });

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouchedFields((prev) => new Set(prev).add(field));
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedFieldsList = Array.from(touchedFields);

    const updatedLabel: ExtractedLabel = {
      ...initialLabel,
      productName: formData.productName.trim() || undefined,
      mrp: formData.mrp.trim() || undefined,
      netQuantity: formData.netQuantity.trim() || undefined,
      manufacturer: formData.manufacturer.trim() || undefined,
      address: formData.address.trim() || undefined,
      packingDate: formData.packingDate.trim() || undefined,
      consumerCare: formData.consumerCare.trim() || undefined,
      isHumanVerified: true,
      humanVerifiedFields: updatedFieldsList,
      reviewerName: formData.reviewerName.trim() || undefined,
      reviewerNotes: formData.reviewerNotes.trim() || undefined,
    };

    // If reviewer resolved conflicts, clear the conflict flags
    if (formData.resolveConflicts) {
      updatedLabel.hasConflict = false;
      updatedLabel.hasProductClash = false;
    }

    // Re-evaluate deterministically with statutory RulesEngine
    const rulesEngine = new RulesEngine();
    const newVerdict = rulesEngine.evaluate(updatedLabel);

    onApplyReview(updatedLabel, newVerdict);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl bg-[#0d121c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 bg-[#121927] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base flex items-center gap-2">
                    Human Review & Declaration Correction
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Forensic Audit
                    </span>
                  </h3>
                  <p className="text-xs text-white/50">
                    Correct OCR noise, resolve multi-panel conflicts, and re-screen deterministically.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Conflicts Banner (if any) */}
              {(initialLabel.hasConflict || (initialLabel.conflictDetails && initialLabel.conflictDetails.length > 0)) && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-medium text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Discrepancy Detected Across Scanned Panels</span>
                  </div>
                  {initialLabel.conflictDetails?.map((detail, idx) => (
                    <p key={idx} className="text-xs text-amber-200/80 font-mono pl-6">
                      • {detail}
                    </p>
                  ))}
                  <label className="flex items-center gap-2 pt-1 pl-6 cursor-pointer text-xs text-white/90">
                    <input
                      type="checkbox"
                      checked={formData.resolveConflicts}
                      onChange={(e) => setFormData((p) => ({ ...p, resolveConflicts: e.target.checked }))}
                      className="rounded border-white/20 bg-black/40 text-teal-500 focus:ring-teal-400"
                    />
                    <span>Mark multi-panel discrepancy as reconciled via physical package examination</span>
                  </label>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/70">Product / Commodity Name</label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => handleFieldChange('productName', e.target.value)}
                    placeholder="e.g. Parle-G Gold Biscuits"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Maximum Retail Price */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/70 flex items-center justify-between">
                    <span>Maximum Retail Price (MRP)</span>
                    <span className="text-[10px] text-teal-400 font-mono">Rule 6(1)(da)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.mrp}
                    onChange={(e) => handleFieldChange('mrp', e.target.value)}
                    placeholder="e.g. ₹99.00 (Incl. of all taxes)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                {/* Net Quantity */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/70 flex items-center justify-between">
                    <span>Net Quantity</span>
                    <span className="text-[10px] text-teal-400 font-mono">Rule 6(1)(c)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.netQuantity}
                    onChange={(e) => handleFieldChange('netQuantity', e.target.value)}
                    placeholder="e.g. 500 g or 1 L"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                {/* Month/Year Date */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/70 flex items-center justify-between">
                    <span>Month & Year of MFD / PKD</span>
                    <span className="text-[10px] text-teal-400 font-mono">Rule 6(1)(d)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.packingDate}
                    onChange={(e) => handleFieldChange('packingDate', e.target.value)}
                    placeholder="e.g. 09/2026 or Sep 2026"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                {/* Manufacturer */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-white/70 flex items-center justify-between">
                    <span>Manufacturer / Packer / Importer</span>
                    <span className="text-[10px] text-teal-400 font-mono">Rule 6(1)(a)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
                    placeholder="e.g. Parle Products Pvt Ltd"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-white/70 flex items-center justify-between">
                    <span>Complete Registered / Premises Address</span>
                    <span className="text-[10px] text-teal-400 font-mono">Rule 6(1)(a)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="e.g. North Level Crossing, Vile Parle East, Mumbai 400057"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Consumer Care */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-white/70 flex items-center justify-between">
                    <span>Consumer Care Contact / Helpline / Email</span>
                    <span className="text-[10px] text-teal-400 font-mono">Rule 6(1)(e)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.consumerCare}
                    onChange={(e) => handleFieldChange('consumerCare', e.target.value)}
                    placeholder="e.g. 1800-222-777 / care@parle.biz"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Reviewer Audit Section */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 pt-3">
                <div className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  Inspector Provenance & Audit Log
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Reviewer Name / Badge ID</label>
                    <input
                      type="text"
                      value={formData.reviewerName}
                      onChange={(e) => setFormData((p) => ({ ...p, reviewerName: e.target.value }))}
                      placeholder="e.g. Officer K. Menon (ID: LM-849)"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Review Justification / Notes</label>
                    <input
                      type="text"
                      value={formData.reviewerNotes}
                      onChange={(e) => setFormData((p) => ({ ...p, reviewerNotes: e.target.value }))}
                      placeholder="e.g. Corrected glare-truncated postal PIN code."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-teal-500/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Apply Corrections & Re-Screen
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
