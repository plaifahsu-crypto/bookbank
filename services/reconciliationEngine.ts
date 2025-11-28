import { BankTransaction, BookTransaction, ReconciliationItem, MatchStatus, ReconciliationSummary, SuggestedFix, FixType } from '../types';

// Helper: Calculate Levenshtein distance for fuzzy string matching
const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion/deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// Helper: Detect Digit Transposition (e.g., 54 vs 45)
const isTranspositionError = (val1: number, val2: number): boolean => {
  const diff = Math.abs(val1 - val2);
  if (diff === 0) return false;
  
  // Stricter check: do they contain the same digits?
  const s1 = val1.toFixed(2).replace('.', '').split('').sort().join('');
  const s2 = val2.toFixed(2).replace('.', '').split('').sort().join('');
  return s1 === s2;
};

// Helper: Calculate days difference between two dates
const getDaysDiff = (d1: Date, d2: Date): number => {
  if (!d1 || !d2 || isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((d1.getTime() - d2.getTime()) / oneDay));
};

export const reconcileData = (
  bankData: BankTransaction[],
  bookData: BookTransaction[]
): { items: ReconciliationItem[]; summary: ReconciliationSummary } => {
  
  const results: ReconciliationItem[] = [];
  const bookUsedIndices = new Set<string>();
  const bankUsedIndices = new Set<string>();
  const matchedInvoiceNumbers = new Set<string>();

  // Index Book Data by normalized ID
  const bookMap = new Map<string, BookTransaction[]>();
  bookData.forEach(item => {
    const key = item.description.trim();
    if (!bookMap.has(key)) bookMap.set(key, []);
    bookMap.get(key)?.push(item);
  });

  // --- PASS 0: Data Integrity Check ---
  // Identify items with invalid data (NaN amounts, Invalid Dates)
  bankData.forEach(bankItem => {
      if (isNaN(bankItem.total_amount) || isNaN(bankItem.raw_date.getTime())) {
          bankUsedIndices.add(bankItem.id);
          results.push({
              id: `rec-err-${bankItem.id}`,
              status: MatchStatus.DATA_ERROR,
              bankTransaction: bankItem,
              amountDifference: 0,
              notes: ['Invalid Data: Contains NaN amount or invalid date format. Check source CSV.'],
              suggestedFix: {
                  type: FixType.CREATE_ENTRY, // Placeholder action
                  originalValue: "Invalid",
                  suggestedValue: "Manual Fix",
                  reasoning: "Data corrupted. Please correct source file.",
                  confidence: 100
              }
          });
      }
  });

  bookData.forEach(bookItem => {
      if (isNaN(bookItem.amount) || isNaN(bookItem.raw_date.getTime())) {
          bookUsedIndices.add(bookItem.id);
          results.push({
              id: `rec-err-${bookItem.id}`,
              status: MatchStatus.DATA_ERROR,
              bookTransaction: bookItem,
              amountDifference: 0,
              notes: ['Invalid GL Data: Contains NaN amount or invalid date format.'],
          });
      }
  });

  // --- PASS 1: Exact ID Matches (Primary Key Logic) ---
  bankData.forEach(bankItem => {
    if (bankUsedIndices.has(bankItem.id)) return; // Skip if already processed (e.g. error)

    const key = bankItem.invoice_number.trim();
    const potentialMatches = bookMap.get(key);

    if (potentialMatches && potentialMatches.length > 0) {
      // 1.1 Exact Amount Match
      let bestMatch = potentialMatches.find(
        p => Math.abs(p.amount - bankItem.total_amount) < 0.01 && !bookUsedIndices.has(p.id)
      );

      // 1.2 Variance (ID matches, Amount differs)
      if (!bestMatch) {
        const availableMatches = potentialMatches.filter(p => !bookUsedIndices.has(p.id));
        if (availableMatches.length > 0) {
          bestMatch = availableMatches[0];
        }
      }

      if (bestMatch) {
        bookUsedIndices.add(bestMatch.id);
        bankUsedIndices.add(bankItem.id);
        matchedInvoiceNumbers.add(key); // Track that this Invoice ID has been reconciled

        let status = MatchStatus.MATCHED;
        let notes: string[] = [];
        let diff = bankItem.total_amount - bestMatch.amount;
        let suggestedFix: SuggestedFix | undefined = undefined;

        const dayDiff = getDaysDiff(bankItem.raw_date, bestMatch.raw_date);
        if (dayDiff > 7) {
          notes.push(`Warning: Significant date discrepancy (${dayDiff} days).`);
        }

        if (Math.abs(diff) > 0.01) {
          status = MatchStatus.VARIANCE;
          
          if (isTranspositionError(bankItem.total_amount, bestMatch.amount)) {
            notes.push(`Possible digit transposition detected.`);
            suggestedFix = {
              type: FixType.AMOUNT_CORRECTION,
              originalValue: bestMatch.amount,
              suggestedValue: bankItem.total_amount,
              reasoning: "Digit transposition detected (e.g. 54 vs 45). Bank data is authoritative.",
              confidence: 95
            };
          } else if (Math.abs(diff) === 1000 || Math.abs(diff) === 100 || Math.abs(diff) === 10 || Math.abs(diff) === 0.1) {
             notes.push(`Magnitude error detected.`);
             suggestedFix = {
              type: FixType.AMOUNT_CORRECTION,
              originalValue: bestMatch.amount,
              suggestedValue: bankItem.total_amount,
              reasoning: "Difference is a power of 10. Likely typo in decimal placement or zero count.",
              confidence: 90
            };
          } else {
             notes.push(`Amount mismatch.`);
             suggestedFix = {
              type: FixType.AMOUNT_CORRECTION,
              originalValue: bestMatch.amount,
              suggestedValue: bankItem.total_amount,
              reasoning: "Amount mismatch detected. Please verify receipt/invoice.",
              confidence: 60
            };
          }
        }

        results.push({
          id: `rec-${bankItem.id}`,
          status,
          bankTransaction: bankItem,
          bookTransaction: bestMatch,
          amountDifference: diff,
          notes,
          suggestedFix
        });
      }
    }
  });

  // --- PASS 2: AI Smart Matching for Orphans (Scoring System) ---
  const unmatchedBank: BankTransaction[] = bankData.filter(b => !bankUsedIndices.has(b.id));
  const unmatchedBook: BookTransaction[] = bookData.filter(b => !bookUsedIndices.has(b.id));

  unmatchedBank.forEach(bankItem => {
    // DUPLICATE CHECK: If this invoice number was already matched in Pass 1, this is a duplicate in Bank
    if (matchedInvoiceNumbers.has(bankItem.invoice_number.trim())) {
        bankUsedIndices.add(bankItem.id);
        results.push({
            id: `rec-dup-${bankItem.id}`,
            status: MatchStatus.POTENTIAL_DUPLICATE,
            bankTransaction: bankItem,
            amountDifference: bankItem.total_amount,
            notes: ['Duplicate ID in Bank. This Invoice Number was already matched successfully.'],
            suggestedFix: {
                type: FixType.REMOVE_DUPLICATE,
                originalValue: bankItem.total_amount,
                suggestedValue: 0,
                reasoning: "Double charge detected. Invoice ID already reconciled.",
                confidence: 100
            }
        });
        return; // Skip further matching for this item
    }

    // Candidates: Book items with EXACT amount (or very close)
    const candidates: BookTransaction[] = unmatchedBook.filter(
      b => !bookUsedIndices.has(b.id) && Math.abs(b.amount - bankItem.total_amount) < 0.01
    );

    let bestCandidate: BookTransaction | null = null;
    let bestScore = -1;
    let matchReason: 'ID_TYPO' | 'WRONG_REF' | null = null;
    let bestConfidence = 0;

    candidates.forEach(candidate => {
      let score = 0;
      let currentReason: 'ID_TYPO' | 'WRONG_REF' | null = null;
      let currentConfidence = 0;

      // 1. ID Similarity Score (0-50 points)
      const idDistance = getLevenshteinDistance(bankItem.invoice_number, candidate.description);
      const idLength = Math.max(bankItem.invoice_number.length, candidate.description.length);
      const similarityPct = (1 - idDistance / idLength);

      if (idDistance <= 2 || candidate.description.includes(bankItem.invoice_number)) {
        score += 50; // Strong ID match (Typo)
        currentReason = 'ID_TYPO';
        currentConfidence = idDistance === 0 ? 99 : (idDistance === 1 ? 95 : 85);
      } else {
         score += similarityPct * 20; 
      }

      // 2. Date Proximity Score (0-50 points)
      const dayDiff = getDaysDiff(bankItem.raw_date, candidate.raw_date);
      if (dayDiff === 0) {
        score += 50;
        if (!currentReason) {
            currentReason = 'WRONG_REF';
            currentConfidence = 85;
        }
      } else if (dayDiff <= 1) {
        score += 40;
        if (!currentReason) {
            currentReason = 'WRONG_REF';
            currentConfidence = 80;
        }
      } else if (dayDiff <= 3) {
        score += 30;
        if (!currentReason) {
            currentReason = 'WRONG_REF';
            currentConfidence = 70;
        }
      } else if (dayDiff <= 7) {
        score += 10;
        if (!currentReason) {
            currentReason = 'WRONG_REF';
            currentConfidence = 50;
        }
      } else {
        score -= 20;
      }

      // Update best candidate
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
        matchReason = currentReason;
        bestConfidence = currentConfidence;
      }
    });

    if (bestCandidate && bestScore >= 30) {
      bookUsedIndices.add((bestCandidate as BookTransaction).id);
      bankUsedIndices.add(bankItem.id);

      let suggestedFix: SuggestedFix | undefined;
      let notes: string[] = [];
      const chosenCandidate = bestCandidate as BookTransaction;

      if (matchReason === 'ID_TYPO') {
        notes.push("Possible invoice number typo.");
        suggestedFix = {
          type: FixType.ID_CORRECTION,
          originalValue: chosenCandidate.description,
          suggestedValue: bankItem.invoice_number,
          reasoning: `Found entry with matching amount and similar ID (Levenshtein Dist: ${getLevenshteinDistance(bankItem.invoice_number, chosenCandidate.description)}).`,
          confidence: bestConfidence
        };
      } else if (matchReason === 'WRONG_REF') {
        notes.push("Possible misclassified reference number.");
        const dayDiff = getDaysDiff(bankItem.raw_date, chosenCandidate.raw_date);
        suggestedFix = {
          type: FixType.ID_CORRECTION,
          originalValue: chosenCandidate.description,
          suggestedValue: bankItem.invoice_number,
          reasoning: `Found entry with exact amount on ${dayDiff === 0 ? 'same day' : `nearby date (${dayDiff}d diff)`}. Likely recorded under wrong Reference ID.`,
          confidence: bestConfidence
        };
      }

      results.push({
        id: `rec-smart-${bankItem.id}`,
        status: MatchStatus.VARIANCE, // Treated as Variance since ID needs fixing
        bankTransaction: bankItem,
        bookTransaction: chosenCandidate,
        amountDifference: 0,
        notes,
        suggestedFix
      });

    } else {
      results.push({
        id: `rec-${bankItem.id}`,
        status: MatchStatus.MISSING_IN_BOOK,
        bankTransaction: bankItem,
        amountDifference: bankItem.total_amount,
        notes: ['No matching record found in GL'],
        suggestedFix: {
            type: FixType.CREATE_ENTRY,
            originalValue: 'N/A',
            suggestedValue: bankItem.total_amount,
            reasoning: "Transaction valid in Bank. Create new GL entry.",
            confidence: 100
        }
      });
    }
  });

  // --- PASS 3: Remaining Book Items (Missing in Bank) ---
  bookData.forEach(bookItem => {
    if (!bookUsedIndices.has(bookItem.id)) {
      results.push({
        id: `rec-${bookItem.id}`,
        status: MatchStatus.MISSING_IN_BANK,
        bookTransaction: bookItem,
        amountDifference: -bookItem.amount,
        notes: ['Transaction in GL not found in Bank']
      });
    }
  });

  // Calculate Summary
  const summary: ReconciliationSummary = {
    totalBankItems: bankData.length,
    totalBookItems: bookData.length,
    matchedCount: results.filter(r => r.status === MatchStatus.MATCHED).length,
    varianceCount: results.filter(r => r.status === MatchStatus.VARIANCE).length,
    missingInBookCount: results.filter(r => r.status === MatchStatus.MISSING_IN_BOOK).length,
    missingInBankCount: results.filter(r => r.status === MatchStatus.MISSING_IN_BANK).length,
    totalBankAmount: bankData.reduce((sum, item) => isNaN(item.total_amount) ? sum : sum + item.total_amount, 0),
    totalBookAmount: bookData.reduce((sum, item) => isNaN(item.amount) ? sum : sum + item.amount, 0),
    matchRate: 0
  };

  summary.matchRate = (summary.matchedCount / Math.max(summary.totalBankItems, 1)) * 100;

  return { items: results, summary };
};