export interface IssueDetail {
  ruleId: string;
  field: string;
  title: string;
  severity: string;
  detectedValue?: string;
  explanation: string;
  evidence?: string;
  recommendation?: string;
  source?: string;
  gazetteReference?: string;
}

export interface ReportCreatePayload {
  verdict: 'PASS' | 'REVIEW';
  productName?: string;
  mrp?: string;
  netQuantity?: string;
  manufacturer?: string;
  dateDeclaration?: string;
  consumerCare?: string;
  issueCount?: number;
  issues: IssueDetail[];
  rawOcr?: string;
  userRemarks?: string;
  localReportId?: string;
}

export interface ReportResponse {
  id: string;
  status: string;
}

export interface ReportRead {
  id: string;
  createdAt: string;
  verdict: string;
  productName?: string;
  mrp?: string;
  netQuantity?: string;
  manufacturer?: string;
  dateDeclaration?: string;
  consumerCare?: string;
  issueCount: number;
  issues: IssueDetail[];
  rawOcr?: string;
  userRemarks?: string;
  localReportId?: string;
}

// Robust resolution of backend API Base URL:
// Reads VITE_API_URL if defined; defaults to local FastAPI server http://localhost:8000
const rawApiUrl =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:8000';

// Sanitize URL:
// 1. Strip trailing slashes (e.g. "https://api.onrender.com/" -> "https://api.onrender.com")
// 2. Strip redundant trailing '/api' (e.g. "https://api.onrender.com/api" -> "https://api.onrender.com")
// This ensures all endpoints formed as `${API_BASE_URL}/api/...` are clean without // or /api/api
export const API_BASE_URL = String(rawApiUrl)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');


/**
 * Health check to verify backend server accessibility.
 */
export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Submits client-screened observation to the backend SQLite registry.
 * Image is intentionally NOT transmitted; privacy and zero server-side OCR preserved.
 */
export async function submitReport(payload: ReportCreatePayload): Promise<ReportResponse> {
  const response = await fetch(`${API_BASE_URL}/api/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = `Server error (${response.status})`;
    try {
      const data = await response.json();
      if (data && data.detail) {
        errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // Ignore JSON parse errors on non-json error responses
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Retrieves recent compliance screening reports from the backend registry.
 */
export async function getReports(limit: number = 50): Promise<ReportRead[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reports?limit=${limit}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      let errorDetail = `Failed to retrieve reports (${response.status})`;
      try {
        const data = await response.json();
        if (data && data.detail) {
          errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        }
      } catch {
        // Fallback
      }
      throw new Error(errorDetail);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error('Unable to connect to reporting server. Please ensure the backend is running.');
    }
    throw err;
  }
}

/**
 * Retrieves a single compliance screening report by ID.
 */
export async function getReport(id: string): Promise<ReportRead> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reports/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Report not found (ID: ${id})`);
      }
      let errorDetail = `Failed to retrieve report ${id} (${response.status})`;
      try {
        const data = await response.json();
        if (data && data.detail) {
          errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        }
      } catch {
        // Fallback
      }
      throw new Error(errorDetail);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error('Unable to connect to reporting server. Please ensure the backend is running.');
    }
    throw err;
  }
}

export interface AnalyticsSummary {
  totalScans: number;
  passCount: number;
  reviewCount: number;
  passRate: number;
  totalIssues: number;
  isDemonstrationData: boolean;
  lastUpdated: string;
  disclaimer: string;
}

export interface IssueFrequencyItem {
  field: string;
  ruleReference: string;
  count: number;
  percentage: number;
}

export interface IssuesBreakdown {
  items: IssueFrequencyItem[];
  totalIssues: number;
  isDemonstrationData: boolean;
}

export interface CategoryBreakdownItem {
  category: string;
  screenings: number;
  reviewCount: number;
  reviewRate: number;
}

export interface CategoriesBreakdown {
  items: CategoryBreakdownItem[];
  isDemonstrationData: boolean;
}

export interface TrendItem {
  period: string;
  scans: number;
  reviews: number;
}

export interface TrendsResponse {
  items: TrendItem[];
  isDemonstrationData: boolean;
}

export interface BrandSurveillanceItem {
  manufacturer: string;
  screenings: number;
  reviewCount: number;
  reviewRate: number;
}

export interface BrandsResponse {
  items: BrandSurveillanceItem[];
  isDemonstrationData: boolean;
  notice: string;
}

export const FALLBACK_DEMO_SUMMARY: AnalyticsSummary = {
  totalScans: 1420,
  passCount: 1048,
  reviewCount: 372,
  passRate: 73.8,
  totalIssues: 565,
  isDemonstrationData: true,
  lastUpdated: new Date().toISOString(),
  disclaimer:
    'Screening observations are advisory consumer indicators. Does not constitute official judicial non-compliance.',
};

export const FALLBACK_DEMO_ISSUES: IssuesBreakdown = {
  items: [
    { field: 'MRP / Unit Sale Price', ruleReference: 'Rule 6(1)(e)', count: 184, percentage: 32.6 },
    { field: 'Date of Mfg / Expiry', ruleReference: 'Rule 6(1)(d)', count: 112, percentage: 19.8 },
    { field: 'Consumer Care Helpline', ruleReference: 'Rule 6(1)(g)', count: 98, percentage: 17.3 },
    { field: 'Net Quantity & Fonts', ruleReference: 'Rule 6(1)(c) & R-7', count: 76, percentage: 13.5 },
    { field: 'Manufacturer / Packer Address', ruleReference: 'Rule 6(1)(a)-(b)', count: 64, percentage: 11.3 },
    { field: 'Multi-Panel Discrepancy', ruleReference: 'Rule 6 Consistency', count: 31, percentage: 5.5 },
  ],
  totalIssues: 565,
  isDemonstrationData: true,
};

export const FALLBACK_DEMO_CATEGORIES: CategoriesBreakdown = {
  items: [
    { category: 'Packaged Foods & Staples', screenings: 520, reviewCount: 126, reviewRate: 24.2 },
    { category: 'Snacks & Confectionery', screenings: 380, reviewCount: 108, reviewRate: 28.4 },
    { category: 'Beverages & Dairy', screenings: 240, reviewCount: 52, reviewRate: 21.7 },
    { category: 'Personal Care & Toiletries', screenings: 180, reviewCount: 56, reviewRate: 31.1 },
    { category: 'Household & Cleaning', screenings: 100, reviewCount: 30, reviewRate: 30.0 },
  ],
  isDemonstrationData: true,
};

export const FALLBACK_DEMO_TRENDS: TrendsResponse = {
  items: [
    { period: 'Apr 2024', scans: 140, reviews: 42 },
    { period: 'May 2024', scans: 185, reviews: 51 },
    { period: 'Jun 2024', scans: 220, reviews: 58 },
    { period: 'Jul 2024', scans: 265, reviews: 69 },
    { period: 'Aug 2024', scans: 310, reviews: 78 },
    { period: 'Sep 2024', scans: 300, reviews: 74 },
  ],
  isDemonstrationData: true,
};

export const FALLBACK_DEMO_BRANDS: BrandsResponse = {
  items: [
    { manufacturer: 'Britannia Industries Ltd', screenings: 142, reviewCount: 28, reviewRate: 19.7 },
    { manufacturer: 'Parle Products Pvt Ltd', screenings: 128, reviewCount: 24, reviewRate: 18.8 },
    { manufacturer: 'ITC Limited', screenings: 115, reviewCount: 22, reviewRate: 19.1 },
    { manufacturer: 'Nestle India Ltd', screenings: 98, reviewCount: 19, reviewRate: 19.4 },
    { manufacturer: 'Hindustan Unilever Ltd', screenings: 86, reviewCount: 16, reviewRate: 18.6 },
    { manufacturer: 'Regional / Local Packers', screenings: 310, reviewCount: 148, reviewRate: 47.7 },
  ],
  isDemonstrationData: true,
  notice:
    'Screening counts represent automated consumer observations and do not reflect official judicial or regulatory violations.',
};

export async function getAnalyticsSummary(demo?: boolean): Promise<AnalyticsSummary> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/summary${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_SUMMARY;
      throw new Error(`Failed to fetch analytics summary (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_SUMMARY;
    throw err;
  }
}

export async function getAnalyticsIssues(demo?: boolean): Promise<IssuesBreakdown> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/issues${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_ISSUES;
      throw new Error(`Failed to fetch issues breakdown (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_ISSUES;
    throw err;
  }
}

export async function getAnalyticsCategories(demo?: boolean): Promise<CategoriesBreakdown> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/categories${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_CATEGORIES;
      throw new Error(`Failed to fetch categories breakdown (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_CATEGORIES;
    throw err;
  }
}

export async function getAnalyticsTrends(demo?: boolean): Promise<TrendsResponse> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/trends${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_TRENDS;
      throw new Error(`Failed to fetch analytics trends (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_TRENDS;
    throw err;
  }
}

export async function getAnalyticsBrands(demo?: boolean): Promise<BrandsResponse> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/brands${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_BRANDS;
      throw new Error(`Failed to fetch brand surveillance (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_BRANDS;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Phase C: AI-Assisted Vision Package Label Extraction API Client
// ---------------------------------------------------------------------------

export interface ExtractedFieldItem {
  value?: string | null;
  confidence: number;
  status: 'detected' | 'uncertain' | 'not_detected';
  evidence_snippet?: string | null;
}

export interface VisionExtractionResponse {
  product_name: ExtractedFieldItem;
  mrp: ExtractedFieldItem;
  net_quantity: ExtractedFieldItem;
  manufacturer: ExtractedFieldItem;
  date_declaration: ExtractedFieldItem;
  consumer_care: ExtractedFieldItem;
  provider_used: string;
  is_ai_fallback: boolean;
  provenance: string;
  disclaimer: string;
}

export async function requestVisionExtraction(
  imageBase64: string,
  ocrTextContext?: string,
  lowConfidenceFields?: string[]
): Promise<VisionExtractionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/extract/vision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      image_base64: imageBase64,
      ocr_text_context: ocrTextContext,
      low_confidence_fields: lowConfidenceFields,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `AI Vision extraction failed (${response.status})`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Phase D: Grounded AI Compliance Copilot & Statutory Search API
// ---------------------------------------------------------------------------

export interface GroundedCitation {
  rule_id: string;
  clause: string;
  title: string;
  gazette_reference: string;
  summary: string;
}

export interface CopilotQueryRequest {
  query: string;
  verdict?: string;
  extracted_fields?: Record<string, any>;
  flagged_rules?: string[];
  commodity?: string;
}

export interface CopilotResponse {
  answer: string;
  citations: GroundedCitation[];
  suggested_followups: string[];
  is_offline_fallback: boolean;
  provider_used: string;
  legal_disclaimer: string;
}

export interface LegalRuleSearchItem {
  id: string;
  field: string;
  title: string;
  description: string;
  severity: string;
  source: string;
  gazetteReference: string;
  whatCanBeDetected: string;
  legalLimitations: string;
  enabled: boolean;
}

export interface LegalRuleSearchResponse {
  total: number;
  rules: LegalRuleSearchItem[];
}

export async function askComplianceCopilot(
  payload: CopilotQueryRequest
): Promise<CopilotResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/copilot/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Copilot request failed (${response.status})`);
    }

    return await response.json();
  } catch (err: any) {
    // Client-side offline fallback if network or server is unreachable
    console.warn('[Copilot API] Network unavailable, invoking client-side offline fallback:', err?.message);
    return getClientOfflineCopilotResponse(payload);
  }
}

export async function searchLegalRules(params?: {
  q?: string;
  field?: string;
  severity?: string;
}): Promise<LegalRuleSearchResponse> {
  const queryParts: string[] = [];
  if (params?.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
  if (params?.field) queryParts.push(`field=${encodeURIComponent(params.field)}`);
  if (params?.severity) queryParts.push(`severity=${encodeURIComponent(params.severity)}`);
  const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';

  const response = await fetch(`${API_BASE_URL}/api/rules/search${queryString}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Rules search failed (${response.status})`);
  }

  return response.json();
}

/**
 * Client-Side Grounded Offline Copilot Fallback.
 * Ensures that inspectors in remote or zero-connectivity environments
 * still receive grounded statutory explanations and Gazette citations.
 */
function getClientOfflineCopilotResponse(payload: CopilotQueryRequest): CopilotResponse {
  const q = payload.query.toLowerCase();
  
  if (q.includes('override') || q.includes('pass') || q.includes('change verdict')) {
    return {
      answer:
        'Under Section 36 of the Legal Metrology Act, 2009, compliance verdicts are strictly deterministic code. The Copilot cannot manually override or alter an inspection verdict. If visual OCR misreadings occurred, use Human Review to correct declarations.',
      citations: [
        {
          rule_id: 'LM-ACT-2009-S36',
          clause: 'Section 36, Legal Metrology Act, 2009',
          title: 'Penalty for Non-Standard Packages',
          gazette_reference: 'Act No. 1 of 2010',
          summary: 'Mandates statutory penalties for manufacturing or distributing non-compliant packages.',
        },
      ],
      suggested_followups: [
        'How do I correct an OCR error via Human Review?',
        'What physical checks should the inspector conduct?',
      ],
      is_offline_fallback: true,
      provider_used: 'client-offline-grounded-engine',
      legal_disclaimer:
        'Client Offline Copilot. Statutory screening guidance based on PCR 2011.',
    };
  }

  return {
    answer:
      `Statutory Screening Guidance: For query "${payload.query}", mandatory declarations under Rule 6(1) of the Legal Metrology (Packaged Commodities) Rules, 2011 require clear indication of MRP inclusive of all taxes, net quantity in standard metric units, manufacturer/packer details, month/year of manufacture, and consumer care redressal cell details (G.S.R. 779(E) & G.S.R. 629(E)).`,
    citations: [
      {
        rule_id: 'LM-PCR-2011-R6-1-DA',
        clause: 'Rule 6(1)(da), PCR 2011',
        title: 'Maximum Retail Price (MRP)',
        gazette_reference: 'G.S.R. 779(E) dated 02-11-2021',
        summary: 'Retail sale price inclusive of all taxes.',
      },
      {
        rule_id: 'LM-PCR-2011-R6-1-C',
        clause: 'Rule 6(1)(c), PCR 2011',
        title: 'Net Quantity Declaration',
        gazette_reference: 'G.S.R. 202(E) read with Second Schedule',
        summary: 'Standard metric units of weight or measure.',
      },
    ],
    suggested_followups: [
      'Why was MRP flagged on this package?',
      'What physical verification is required for net quantity?',
      'How to resolve conflicting declarations across panels?',
    ],
    is_offline_fallback: true,
    provider_used: 'client-offline-grounded-engine',
    legal_disclaimer:
      'Client Offline Copilot. Statutory screening guidance based on PCR 2011.',
  };
}

// ---------------------------------------------------------------------------
// Feature 1: AI Inspection Summary API Client & Grounded Offline Engine
// ---------------------------------------------------------------------------

export interface AttentionItem {
  field: string;
  issueType: 'missing' | 'unreadable' | 'conflicting' | 'non_compliant' | string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | string;
  panelReference?: string;
}

export interface ApplicableStatutoryRule {
  ruleId: string;
  clause: string;
  title: string;
  citation: string;
  summary: string;
}

export interface InspectionSummaryRequest {
  verdict: 'PASS' | 'REVIEW' | string;
  productName?: string;
  declarations?: {
    mrp?: string;
    netQuantity?: string;
    manufacturer?: string;
    address?: string;
    dateDeclaration?: string;
    consumerCare?: string;
    [key: string]: any;
  };
  issues?: Array<{
    ruleId: string;
    field: string;
    title: string;
    severity?: string;
    detectedValue?: string;
    explanation?: string;
    evidence?: string;
    recommendation?: string;
    gazetteReference?: string;
  }>;
  panelContributions?: Array<{
    panelId?: string;
    panelType?: string;
    fieldsFound?: string[];
    textSnippet?: string;
  }>;
  isMultiPanel?: boolean;
  ocrQuality?: string;
  userRemarks?: string;
}

export interface InspectionSummaryResponse {
  overallSummary: string;
  keyFindings: string[];
  attentionItems: AttentionItem[];
  evidenceExplanation: string;
  applicableRules: ApplicableStatutoryRule[];
  recommendedNextSteps: string[];
  isOfflineFallback: boolean;
  providerUsed: string;
  disclaimer: string;
}

/**
 * Requests an AI synthesized, evidence-grounded inspection summary.
 * If backend or network is offline, falls back seamlessly to the client-side
 * grounded PCR 2011 inspection summarizer.
 */
export async function requestInspectionSummary(
  payload: InspectionSummaryRequest
): Promise<InspectionSummaryResponse> {
  try {
    const requestBody = {
      verdict: payload.verdict,
      product_name: payload.productName,
      productName: payload.productName,
      extracted_declarations: payload.declarations || {},
      declarations: payload.declarations || {},
      flagged_rules: payload.issues?.map((i) => i.ruleId) || [],
      potential_violations: payload.issues || [],
      issues: payload.issues || [],
      evidence_snippets: payload.panelContributions || {},
      panelContributions: payload.panelContributions || {},
      isMultiPanel: payload.isMultiPanel,
    };

    const response = await fetch(`${API_BASE_URL}/api/inspection/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Inspection summary request failed (${response.status})`);
    }

    const data = await response.json();
    return {
      overallSummary: data.overallSummary || data.overall_summary || '',
      keyFindings: data.keyFindings || data.key_findings || [],
      attentionItems:
        data.attentionItems ||
        (Array.isArray(data.declarations_requiring_attention)
          ? data.declarations_requiring_attention.map((d: any) =>
              typeof d === 'string'
                ? {
                    field: d,
                    issueType: 'missing',
                    description: d,
                    severity: 'high',
                  }
                : d
            )
          : []),
      evidenceExplanation: Array.isArray(data.evidence_explanation)
        ? data.evidence_explanation.join(' ')
        : data.evidenceExplanation || data.evidence_explanation || '',
      applicableRules:
        Array.isArray(data.applicable_rules) && typeof data.applicable_rules[0] === 'string'
          ? data.applicable_rules.map((r: string) => ({
              ruleId: 'LM-PCR-2011',
              clause: r,
              title: r,
              citation: r,
              summary: r,
            }))
          : data.applicableRules || data.applicable_rules || [],
      recommendedNextSteps: data.recommendedNextSteps || data.recommended_next_steps || [],
      isOfflineFallback: data.isOfflineFallback ?? !data.is_ai_generated,
      providerUsed: data.providerUsed || data.provider_used || 'ai-inspection-engine',
      disclaimer:
        data.disclaimer ||
        'Statutory screening summary. Official legal verdicts remain deterministic code per PCR 2011.',
    };
  } catch (err: any) {
    console.warn('[Inspection Summary API] Server unavailable, falling back to client-side statutory engine:', err?.message);
    return getClientOfflineInspectionSummary(payload);
  }
}

/**
 * Client-Side Grounded Offline Inspection Summary Engine.
 * Synthesizes an evidence-based statutory briefing adhering strictly to
 * the Legal Metrology (Packaged Commodities) Rules, 2011.
 * Guaranteed 100% offline resilience and zero hallucination of legal outcomes.
 */
export function getClientOfflineInspectionSummary(
  payload: InspectionSummaryRequest
): InspectionSummaryResponse {
  const isPass = String(payload.verdict).toUpperCase() === 'PASS';
  const prodName = payload.productName || 'Pre-Packaged Commodity';
  const issues = payload.issues || [];
  const decl = payload.declarations || {};

  // Describe only the automated screen and its configured evidence; it is not a legal determination.
  const overallSummary = isPass
    ? `Automated screening of '${prodName}' did not flag any configured checks in the declarations detected by OCR. Confirm the package details and applicable requirements against the original label.`
    : `Automated screening of '${prodName}' flagged ${issues.length || 1} item(s) for review. Check the original package and confirm any unclear or missing declarations before drawing a conclusion.`;

  // 2. Synthesize Key Findings
  const keyFindings: string[] = [];
  if (isPass) {
    const detected = [
      decl.mrp && `MRP text detected: ${decl.mrp}.`,
      decl.netQuantity && `Net quantity text detected: ${decl.netQuantity}.`,
      decl.manufacturer && `Manufacturer/packer text detected: ${decl.manufacturer}.`,
      decl.address && `Address text detected: ${decl.address}.`,
      (decl.dateDeclaration || decl.packingDate) && `Date declaration text detected: ${decl.dateDeclaration || decl.packingDate}.`,
      decl.consumerCare && `Consumer care text detected: ${decl.consumerCare}.`,
    ].filter((item): item is string => Boolean(item));
    keyFindings.push(...detected);
    if (!detected.length) keyFindings.push('No configured issue was flagged; review the extracted text and original package.');
    if (payload.isMultiPanel) keyFindings.push('Multiple package panels were included in the screening; compare declarations on the original images.');
  } else {
    if (issues.length > 0) {
      issues.forEach((iss) => {
        keyFindings.push(`${iss.field}: ${iss.title} (${iss.severity?.toUpperCase() || 'HIGH'})`);
      });
    } else {
      keyFindings.push('One or more configured screening checks need review.');
    }
    if (!decl.mrp) {
      keyFindings.push('MRP was not detected in the provided OCR text.');
    }
    if (!decl.netQuantity) {
      keyFindings.push('Net quantity was not detected in the provided OCR text.');
    }
    if (!decl.manufacturer) {
      keyFindings.push('Manufacturer/packer was not detected in the provided OCR text.');
    }
  }

  // 3. Synthesize Declarations Requiring Attention
  const attentionItems: AttentionItem[] = [];
  if (isPass) {
    // PASS verdict has no attention items
  } else {
    if (issues.length > 0) {
      issues.forEach((iss) => {
        let issueType: AttentionItem['issueType'] = 'non_compliant';
        const txt = `${iss.title} ${iss.explanation || ''} ${iss.evidence || ''}`.toLowerCase();
        if (txt.includes('conflict') || txt.includes('discrepancy') || txt.includes('mismatch') || txt.includes('contradict')) {
          issueType = 'conflicting';
        } else if (
          !iss.detectedValue ||
          txt.includes('missing') ||
          txt.includes('not found') ||
          txt.includes('not detected') ||
          txt.includes('absent') ||
          txt.includes('could not be detected') ||
          txt.includes('no recognizable') ||
          txt.includes('no standard metric')
        ) {
          issueType = 'missing';
        } else if (
          txt.includes('unreadable') ||
          txt.includes('corrupt') ||
          txt.includes('ambiguous') ||
          txt.includes('noise') ||
          txt.includes('occluded') ||
          txt.includes('blur')
        ) {
          issueType = 'unreadable';
        }

        attentionItems.push({
          field: iss.field,
          issueType,
          description: iss.explanation || iss.title,
          severity: (iss.severity?.toLowerCase() as any) || 'high',
          panelReference: iss.evidence || 'Principal Display Panel',
        });
      });
    } else {
      // Synthesize based on missing declarations
      if (!decl.mrp) {
        attentionItems.push({
          field: 'Maximum Retail Price (MRP)',
          issueType: 'missing',
          description: 'No statutory MRP declaration inclusive of all taxes was detected on the package surface.',
          severity: 'critical',
          panelReference: 'Principal Display Panel',
        });
      }
      if (!decl.netQuantity) {
        attentionItems.push({
          field: 'Net Quantity',
          issueType: 'missing',
          description: 'Net quantity declaration in standard metric units (g, kg, ml, l) not detected.',
          severity: 'critical',
          panelReference: 'Principal Display Panel',
        });
      }
      if (!decl.manufacturer) {
        attentionItems.push({
          field: 'Manufacturer / Packer',
          issueType: 'missing',
          description: 'Manufacturer or packer name and commercial address not detected.',
          severity: 'high',
          panelReference: 'Side / Back Panel',
        });
      }
    }
  }

  // 4. Synthesize Evidence Explanation referencing panels/snippets
  let panelDesc = 'captured package image';
  if (payload.panelContributions && payload.panelContributions.length > 0) {
    panelDesc = `${payload.panelContributions.length} captured panel(s) [${payload.panelContributions.map((p, i) => p.panelType || `Panel ${i + 1}`).join(', ')}]`;
  }
  const evidencePoints: string[] = [];
  if (decl.mrp) evidencePoints.push(`MRP text detected: '${decl.mrp}'`);
  if (decl.netQuantity) evidencePoints.push(`Net quantity text detected: '${decl.netQuantity}'`);
  if (decl.manufacturer) evidencePoints.push(`Manufacturer text detected: '${decl.manufacturer}'`);
  if (decl.dateDeclaration) evidencePoints.push(`Date declaration text detected: '${decl.dateDeclaration}'`);
  if (decl.consumerCare) evidencePoints.push(`Consumer care cell found: '${decl.consumerCare}'`);

  const evidenceExplanation = isPass
    ? `OCR text was extracted from ${panelDesc}. Detected declaration text: ${evidencePoints.join('; ') || 'None'}. Confirm legibility and context on the original package.`
    : `Inspection evidence evaluated across ${panelDesc}. Detected declarations: ${evidencePoints.length ? evidencePoints.join('; ') : 'None'}. Deficiencies flagged: ${attentionItems.map((a) => `${a.field} (${a.issueType})`).join(', ') || 'Statutory declaration missing'}.`;

  // 5. Synthesize Applicable Statutory Rules
  const applicableRules: ApplicableStatutoryRule[] = [
    {
      ruleId: 'LM-PCR-2011-R6-1-DA',
      clause: 'Rule 6(1)(da), PCR 2011',
      title: 'Maximum Retail Price (MRP)',
      citation: 'G.S.R. 779(E) dated 02-11-2021',
      summary: 'Mandates retail sale price inclusive of all taxes, with unit sale price where applicable.',
    },
    {
      ruleId: 'LM-PCR-2011-R6-1-C',
      clause: 'Rule 6(1)(c), PCR 2011',
      title: 'Net Quantity Declaration',
      citation: 'G.S.R. 202(E) read with Second Schedule',
      summary: 'Mandates net weight or volume expressed strictly in standard metric units.',
    },
    {
      ruleId: 'LM-PCR-2011-R6-1-AB',
      clause: 'Rule 6(1)(a)-(b), PCR 2011',
      title: 'Manufacturer / Packer Identity',
      citation: 'Rule 6(1)(a) & (b), PCR 2011',
      summary: 'Requires name and complete address of manufacturer, packer, or importer.',
    },
    {
      ruleId: 'LM-PCR-2011-R6-1-D',
      clause: 'Rule 6(1)(d), PCR 2011',
      title: 'Date of Manufacture / Packing',
      citation: 'Rule 6(1)(d), PCR 2011',
      summary: 'Mandates month and year in which commodity is manufactured, packed, or imported.',
    },
    {
      ruleId: 'LM-PCR-2011-R6-1-G',
      clause: 'Rule 6(1)(g), PCR 2011',
      title: 'Consumer Care Redressal Cell',
      citation: 'G.S.R. 629(E)',
      summary: 'Requires contact telephone, email, and address for consumer grievance redressal.',
    },
  ];

  if (!isPass) {
    applicableRules.push({
      ruleId: 'LM-ACT-2009-S36',
      clause: 'Section 36, Legal Metrology Act, 2009',
      title: 'Penalty for Non-Standard Packages',
      citation: 'Act No. 1 of 2010',
      summary: 'Statutory penal provision for manufacturing, packing, or selling non-compliant commodities.',
    });
  }

  // 6. Recommended Next Steps
  const recommendedNextSteps: string[] = isPass
    ? [
        'Inspect physical font height and contrast against package background per Rule 7.',
        'Verify packaging seal integrity and tamper-evident band before retail release.',
        'Record screening result in enforcement archive or certificate repository.',
      ]
    : [
        'Perform physical verification of package crimps, folds, and underside for embossed declarations.',
        'If declaration is visible on the package, use "Review & Edit Declarations" to correct OCR data and re-screen.',
        'If declarations are missing on the physical pack, issue advisory notice under Section 36 of Legal Metrology Act, 2009.',
        'Examine secondary packaging or outer carton if commodity is sold as a bundled multi-pack.',
      ];

  return {
    overallSummary,
    keyFindings,
    attentionItems,
    evidenceExplanation,
    applicableRules,
    recommendedNextSteps,
    isOfflineFallback: true,
    providerUsed: 'client-offline-grounded-engine',
    disclaimer: 'Statutory screening summary. Official legal verdicts remain deterministic code per PCR 2011.',
  };
}




