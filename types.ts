export interface BankTransaction {
  id: string; // Unique ID for React keys
  account_no: string;
  settlement_date: string;
  transaction_date: string;
  time: string;
  invoice_number: string;
  product: string;
  liter: number;
  price: number;
  amount_before_vat: number;
  vat: number;
  total_amount: number;
  wht_1_percent: number;
  total_amount_after_wd: number;
  merchant_id: string;
  fuel_brand: string;
  raw_date: Date;
}

export interface BookTransaction {
  id: string; // Unique ID for React keys
  document_no: string;
  posting_date: string;
  description: string; // Maps to invoice_number usually
  amount: number;
  raw_date: Date;
}

export enum MatchStatus {
  MATCHED = 'MATCHED',
  VARIANCE = 'VARIANCE',
  MISSING_IN_BOOK = 'MISSING_IN_BOOK',
  MISSING_IN_BANK = 'MISSING_IN_BANK',
  POTENTIAL_DUPLICATE = 'POTENTIAL_DUPLICATE',
  DATA_ERROR = 'DATA_ERROR',
}

export enum FixType {
  AMOUNT_CORRECTION = 'AMOUNT_CORRECTION',
  ID_CORRECTION = 'ID_CORRECTION',
  CREATE_ENTRY = 'CREATE_ENTRY',
  REMOVE_DUPLICATE = 'REMOVE_DUPLICATE',
}

export interface SuggestedFix {
  type: FixType;
  originalValue: string | number;
  suggestedValue: string | number;
  reasoning: string;
  confidence: number; // 0 to 100
}

export interface ReconciliationItem {
  id: string;
  status: MatchStatus;
  bankTransaction?: BankTransaction;
  bookTransaction?: BookTransaction;
  amountDifference: number;
  notes: string[];
  suggestedFix?: SuggestedFix;
}

export interface ReconciliationSummary {
  totalBankItems: number;
  totalBookItems: number;
  matchedCount: number;
  varianceCount: number;
  missingInBookCount: number;
  missingInBankCount: number;
  totalBankAmount: number;
  totalBookAmount: number;
  matchRate: number;
}

export interface ErrorPattern {
  category: string;
  count: number;
  percentage: number;
  impactAmount: number;
}

export interface ReconciliationInsights {
  healthScore: number; // 0-100
  executiveSummary: string;
  topErrorPatterns: ErrorPattern[];
  processRecommendations: string[];
  aiLearnings: string[];
  avgPostingLagDays: number;
}