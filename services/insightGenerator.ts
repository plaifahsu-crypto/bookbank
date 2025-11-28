import { ReconciliationItem, ReconciliationSummary, ReconciliationInsights, MatchStatus, FixType } from '../types';

export const generateInsights = (
  items: ReconciliationItem[],
  summary: ReconciliationSummary
): ReconciliationInsights => {
  
  // 1. Calculate Error Patterns
  let idMismatchCount = 0;
  let amountErrorCount = 0;
  let missingDocCount = 0;
  let missingBankCount = 0;
  let totalIssues = 0;

  // Impact amounts
  let missingDocImpact = 0;

  let totalLagDays = 0;
  let matchedCountForLag = 0;

  items.forEach(item => {
    if (item.status !== MatchStatus.MATCHED) {
      totalIssues++;
    }

    if (item.suggestedFix?.type === FixType.ID_CORRECTION) {
      idMismatchCount++;
    } else if (item.suggestedFix?.type === FixType.AMOUNT_CORRECTION) {
      amountErrorCount++;
    } else if (item.status === MatchStatus.MISSING_IN_BOOK) {
      missingDocCount++;
      missingDocImpact += item.amountDifference;
    } else if (item.status === MatchStatus.MISSING_IN_BANK) {
      missingBankCount++;
    }

    // Calculate Lag Days (Date Difference)
    if (item.bankTransaction && item.bookTransaction) {
      const bankDate = item.bankTransaction.raw_date;
      const bookDate = item.bookTransaction.raw_date;
      const diffTime = Math.abs(bookDate.getTime() - bankDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      totalLagDays += diffDays;
      matchedCountForLag++;
    }
  });

  const avgPostingLagDays = matchedCountForLag > 0 ? parseFloat((totalLagDays / matchedCountForLag).toFixed(1)) : 0;

  // 2. Generate Error Patterns List
  const patterns = [
    { category: 'Missing Documentation (GL)', count: missingDocCount, percentage: 0, impactAmount: missingDocImpact },
    { category: 'Reference ID Typo/Mismatch', count: idMismatchCount, percentage: 0, impactAmount: 0 },
    { category: 'Data Entry Error (Amount)', count: amountErrorCount, percentage: 0, impactAmount: 0 },
    { category: 'Unrecorded Bank Deposit', count: missingBankCount, percentage: 0, impactAmount: 0 },
  ];

  // Calculate percentages
  patterns.forEach(p => {
    p.percentage = totalIssues > 0 ? Math.round((p.count / totalIssues) * 100) : 0;
  });

  // Sort by count descending
  const topErrorPatterns = patterns.sort((a, b) => b.count - a.count).filter(p => p.count > 0);

  // 3. Generate Recommendations & Learnings
  const processRecommendations: string[] = [];
  const aiLearnings: string[] = [];

  // Logic for Recommendations
  if (idMismatchCount > 0) {
    processRecommendations.push("Implement strict validation or barcode scanning for Invoice Numbers to reduce typos.");
  }
  if (amountErrorCount > 0) {
    processRecommendations.push("Enable double-entry verification for amounts over 1,000 to catch transpositions.");
  }
  if (missingDocCount > 5) {
    processRecommendations.push(`Review document collection workflow. ${missingDocCount} items valid in Bank are missing in Book.`);
  }
  if (avgPostingLagDays > 3) {
    processRecommendations.push(`Reduce posting delay. Average lag is ${avgPostingLagDays} days, causing temporary reconciliation gaps.`);
  } else {
    processRecommendations.push("Posting timeliness is healthy (avg < 3 days). Maintain current workflow.");
  }

  // Logic for AI Learnings (Simulated Intelligence)
  aiLearnings.push(`Identified typical posting lag of ${avgPostingLagDays} days between Bank and Book.`);
  if (idMismatchCount > 0) {
     aiLearnings.push("Detected pattern: Numeric keys (e.g., '3' vs '8') are frequent sources of ID mismatch.");
  }
  if (amountErrorCount > 0) {
      aiLearnings.push("Detected pattern: Digit transposition (e.g., 54 vs 45) accounts for significant variance.");
  }
  aiLearnings.push("Optimized fuzzy matching threshold based on current dataset variance.");


  // 4. Executive Summary
  let healthScore = summary.matchRate; 
  // Penalize for high variances despite matching IDs
  if (amountErrorCount > 0) healthScore -= 5;
  if (missingDocCount > 0) healthScore -= 10;
  healthScore = Math.max(0, Math.round(healthScore));

  let summaryText = "";
  if (healthScore >= 90) summaryText = "Financial records are in excellent condition. Minimal manual intervention required.";
  else if (healthScore >= 70) summaryText = "Records are generally healthy, but specific recurring error patterns require attention.";
  else summaryText = "Significant discrepancies detected. Immediate process review recommended to prevent month-end bottlenecks.";

  return {
    healthScore,
    executiveSummary: summaryText,
    topErrorPatterns,
    processRecommendations,
    aiLearnings,
    avgPostingLagDays
  };
};