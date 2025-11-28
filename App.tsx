import React, { useState } from 'react';
import { UploadCloud, FileText, Check, AlertTriangle, PlayCircle } from 'lucide-react';
import { parseBankCSV, parseBookCSV } from './services/parser';
import { reconcileData } from './services/reconciliationEngine';
import { generateInsights } from './services/insightGenerator';
import { BankTransaction, BookTransaction, ReconciliationItem, ReconciliationSummary, ReconciliationInsights } from './types';
import { DashboardCharts } from './components/DashboardCharts';
import { MatchTable } from './components/MatchTable';
import { InsightsPanel } from './components/InsightsPanel';

// Hardcoded demo data from the prompt to allow instant testing
const DEMO_BANK_CSV = `account_no,settlement_date,transaction_date,time,invoice_number,product,liter,price,amount_before_vat,vat,total_amount,wht_1_percent,total_amount_after_wd,merchant_id,fuel_brand
123456789,1/9/2025,1/9/2025,19:21:15,395443,DIESEL (PTT),65,32,"1,943.93",136.07,"2,080.00",19.44,"2,060.56",1235001074,PTT
123456789,1/9/2025,1/9/2025,15:01:09,934785,DIESEL (PTT),50,32.12,"1,500.93",105.07,"1,606.00",15.01,"1,590.99",1024261188,PTT
123456789,1/9/2025,1/9/2025,13:45:26,441282,DIESEL (PTT),70.603,32.01,"2,112.15",147.85,"2,260.00",21.12,"2,238.88",1208001468,PTT
123456789,1/9/2025,1/9/2025,12:58:37,641858,HI DIESEL S (BCP),155.67,32.12,"4,672.90",327.1,"5,000.00",46.73,"4,953.27",1068401574,ESSO
123456789,2/9/2025,2/9/2025,11:12:32,249171,HI DIESEL S (BCP),43.74,32.01,"1,308.41",91.59,"1,400.00",13.08,"1,386.92",1086002228,BCP
123456789,2/9/2025,2/9/2025,14:28:08,965451,DIESEL (PTT),27,32.03,808.22,56.58,864.8,8.08,856.72,1000020346,PTT`;

const DEMO_BOOK_CSV = `document_no,posting_date,description,amount
1,1/9/2025,395443,"2,080.00"
2,1/9/2025,934785,"1,606.00"
3,1/9/2025,441282,"2,260.00"
4,1/9/2025,641858,"5,000.00"
5,1/9/2025,585585,"2,110.00"
6,2/9/2025,857576,"5,044.00"
7,2/9/2025,249171,"1,400.00"
11,2/9/2025,965451,864.80`;

function App() {
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ items: ReconciliationItem[]; summary: ReconciliationSummary } | null>(null);
  const [insights, setInsights] = useState<ReconciliationInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBankUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBankFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleBookUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBookFile(e.target.files[0]);
      setError(null);
    }
  };

  const processFiles = async (bankText?: string, bookText?: string) => {
    setIsProcessing(true);
    setResults(null);
    setInsights(null);
    setError(null);

    try {
      let bankContent = bankText;
      let bookContent = bookText;

      // If text not provided, read files
      if (!bankContent && bankFile) {
        bankContent = await bankFile.text();
      }
      if (!bookContent && bookFile) {
        bookContent = await bookFile.text();
      }

      if (!bankContent || !bookContent) {
        throw new Error("Please upload both Bank and Book CSV files.");
      }

      const bankData = parseBankCSV(bankContent);
      const bookData = parseBookCSV(bookContent);

      if (bankData.length === 0 || bookData.length === 0) {
        throw new Error("Could not parse transactions. Please check file format.");
      }

      // Simulate network delay for "AI" feel
      await new Promise(resolve => setTimeout(resolve, 800));

      const reconciliationResults = reconcileData(bankData, bookData);
      setResults(reconciliationResults);

      // Generate Insights
      const aiInsights = generateInsights(reconciliationResults.items, reconciliationResults.summary);
      setInsights(aiInsights);

    } catch (err: any) {
      setError(err.message || "An error occurred during reconciliation.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50/30 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg shadow-blue-200 shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">AutoReconcile AI</h1>
          </div>
          <button 
            onClick={() => processFiles(DEMO_BANK_CSV, DEMO_BOOK_CSV)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            <PlayCircle className="w-4 h-4" /> Load Demo Data
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Bank File Input */}
          <div className={`border-2 border-dashed rounded-xl p-8 transition-colors ${bankFile ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-white'}`}>
            <div className="flex flex-col items-center text-center">
              <div className={`p-3 rounded-full mb-4 ${bankFile ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {bankFile ? <Check className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Bank Statement (CSV)</h3>
              <p className="text-sm text-slate-500 mb-4">{bankFile ? bankFile.name : "Upload your bank CSV file"}</p>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleBankUpload}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          </div>

          {/* Book File Input */}
          <div className={`border-2 border-dashed rounded-xl p-8 transition-colors ${bookFile ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-white'}`}>
            <div className="flex flex-col items-center text-center">
              <div className={`p-3 rounded-full mb-4 ${bookFile ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {bookFile ? <Check className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">General Ledger / Book (CSV)</h3>
              <p className="text-sm text-slate-500 mb-4">{bookFile ? bookFile.name : "Upload your internal GL records"}</p>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleBookUpload}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Button & Errors */}
        <div className="flex flex-col items-center mb-10">
          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm font-medium border border-red-100">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <button
            onClick={() => processFiles()}
            disabled={isProcessing || (!bankFile && !bookFile)}
            className={`
              px-8 py-3 rounded-full font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5
              ${isProcessing || (!bankFile && !bookFile) 
                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200'}
            `}
          >
            {isProcessing ? 'Analyzing Data...' : 'Start Reconciliation'}
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div className="animate-fade-in space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-200 transition-colors">
                <p className="text-xs font-medium text-slate-500 uppercase">Match Rate</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{results.summary.matchRate.toFixed(1)}%</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-200 transition-colors">
                <p className="text-xs font-medium text-slate-500 uppercase">Total Matched</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{results.summary.matchedCount}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-200 transition-colors">
                <p className="text-xs font-medium text-slate-500 uppercase">Variances</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">{results.summary.varianceCount}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-200 transition-colors">
                <p className="text-xs font-medium text-slate-500 uppercase">Unreconciled Items</p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                    {results.summary.missingInBookCount + results.summary.missingInBankCount}
                </p>
              </div>
            </div>

            {insights && <InsightsPanel insights={insights} />}
            <DashboardCharts summary={results.summary} items={results.items} />
            <MatchTable items={results.items} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;