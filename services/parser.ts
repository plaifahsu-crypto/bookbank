import { BankTransaction, BookTransaction } from '../types';

// Helper to parse "1,234.56" to 1234.56
const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // If string contains non-numeric chars other than currency symbols, it might be NaN
  const cleanValue = value.replace(/,/g, '').trim();
  if (cleanValue === '' || isNaN(Number(cleanValue))) return NaN; 
  return parseFloat(cleanValue);
};

// Helper to parse "d/m/yyyy" to Date object
const parseDate = (dateStr: string): Date => {
  if (!dateStr || dateStr.trim() === '') return new Date(NaN); // Return Invalid Date
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    // Note: Month is 0-indexed in JS
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    
    // Basic validation for parts
    if (isNaN(day) || isNaN(month) || isNaN(year)) return new Date(NaN);
    
    return new Date(year, month, day);
  }
  
  // Fallback for other formats
  const d = new Date(dateStr);
  return d;
};

// Simple CSV line splitter that respects quotes
const splitCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
};

export const parseBankCSV = (csvContent: string): BankTransaction[] => {
  const lines = csvContent.split('\n').filter(l => l.trim() !== '');
  const transactions: BankTransaction[] = [];
  
  // Skip header (index 0)
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length < 10) continue; // Skip malformed lines

    // Based on provided CSV structure:
    // account_no, settlement_date, transaction_date, time, invoice_number, product, liter, price, amount_before_vat, vat, total_amount, ...
    
    transactions.push({
      id: `bank-${i}`,
      account_no: cols[0],
      settlement_date: cols[1],
      transaction_date: cols[2],
      time: cols[3],
      invoice_number: cols[4],
      product: cols[5],
      liter: parseFloat(cols[6] || '0'),
      price: parseFloat(cols[7] || '0'),
      amount_before_vat: parseCurrency(cols[8]),
      vat: parseCurrency(cols[9]),
      total_amount: parseCurrency(cols[10]),
      wht_1_percent: parseCurrency(cols[11]),
      total_amount_after_wd: parseCurrency(cols[12]),
      merchant_id: cols[13],
      fuel_brand: cols[14],
      raw_date: parseDate(cols[2]) // Use transaction date
    });
  }
  return transactions;
};

export const parseBookCSV = (csvContent: string): BookTransaction[] => {
  const lines = csvContent.split('\n').filter(l => l.trim() !== '');
  const transactions: BookTransaction[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length < 4) continue;

    // Based on provided CSV structure:
    // document_no, posting_date, description, amount
    
    transactions.push({
      id: `book-${i}`,
      document_no: cols[0],
      posting_date: cols[1],
      description: cols[2],
      amount: parseCurrency(cols[3]),
      raw_date: parseDate(cols[1])
    });
  }
  return transactions;
};