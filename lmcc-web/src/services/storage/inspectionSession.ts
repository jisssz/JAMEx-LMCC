import { ExtractedLabel } from '../../models/ExtractedLabel';
import { Verdict } from '../../models/Verdict';

export interface InspectionPanelSnapshot {
  id: string;
  type: 'front' | 'back' | 'crimp' | 'other';
  label: string;
  previewUrl: string;
}

export interface ActiveInspectionSession {
  inspectionId: string;
  inspectionDate: string;
  productName: string;
  imagePreviewUrl: string;
  panels: InspectionPanelSnapshot[];
  extractedLabel: ExtractedLabel;
  verdict: Verdict;
  ocrConfidence?: number;
  ocrQuality?: 'GOOD' | 'FAIR' | 'POOR';
  isMultiPanel: boolean;
  isAiGenerated?: boolean;
  isDemo?: boolean;
}

const SESSION_STORAGE_KEY = 'lmcc_active_inspection_session';

/**
 * Saves current inspection session into sessionStorage for persistence across page refreshes.
 */
export function saveInspectionSession(session: ActiveInspectionSession): void {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('[LMCC-SESSION] Failed to save inspection session to sessionStorage', e);
    }
  }
}

/**
 * Retrieves the currently active inspection session from sessionStorage.
 */
export function getInspectionSession(): ActiveInspectionSession | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const data = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as ActiveInspectionSession;
      }
    } catch (e) {
      console.warn('[LMCC-SESSION] Failed to retrieve inspection session from sessionStorage', e);
    }
  }
  return null;
}

/**
 * Clears the active inspection session from sessionStorage.
 */
export function clearInspectionSession(): void {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
