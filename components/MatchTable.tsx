import React, { useState } from 'react';
import { ReconciliationItem, MatchStatus, FixType } from '../types';
import { AlertCircle, CheckCircle, HelpCircle, XCircle, Search, Sparkles, ArrowRight, Copy, AlertOctagon } from 'lucide-react';

interface Props {
  items: ReconciliationItem[];
}

const StatusBadge: React.FC<{ status: MatchStatus }> = ({ status }) => {
  switch (status) {
    case MatchStatus.MATCHED:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1" /> Matched
        </span>
      );
    case MatchStatus.VARIANCE:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <HelpCircle className="w-3 h-3 mr-1" /> Variance
        </span>
      );
    case MatchStatus.MISSING_IN_BOOK:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" /> Missing in GL
        </span>
      );
    case MatchStatus.MISSING_IN_BANK:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <AlertCircle className="w-3 h-3 mr-1" /> Missing in Bank
        </span>
      );
    case MatchStatus.POTENTIAL_DUPLICATE:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <Copy className="w-3 h-3 mr-1" /> Duplicate
        </span>
      );
    case MatchStatus.DATA_ERROR:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
          <AlertOctagon className="w-3 h-3 mr-1" /> Data Error
        </span>
      );
    default:
        return null;
  }
};

const SmartFixBadge: React.FC<{ item: ReconciliationItem }> = ({ item }) => {
    if (!item.suggestedFix) return null;

    const fix = item.suggestedFix;
    let confidenceColor = fix.confidence > 85 ? 'text-blue-700 bg-blue-50' : (fix.confidence > 70 ? 'text-amber-600 bg-amber-50' : 'text-slate-600 bg-slate-50');
    if (fix.type === FixType.REMOVE_DUPLICATE) confidenceColor = 'text-red-700 bg-red-50';

    return (
        <div className="mt-2 p-3 rounded-lg border border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-blue-700">AI Smart Fix</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${confidenceColor}`}>
                    {fix.confidence}% Confidence
                </span>
            </div>
            <p className="text-xs text-slate-700 mb-1 font-medium">{fix.reasoning}</p>
            
            <div className="flex items-center gap-2 text-xs bg-white/60 p-1.5 rounded border border-slate-200/50">
                {fix.type === FixType.ID_CORRECTION && (
                    <>
                        <span className="text-slate-400 line-through">{fix.originalValue}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">{fix.suggestedValue}</span>
                        <span className="text-slate-500 ml-1">(Update Ref ID)</span>
                    </>
                )}
                {fix.type === FixType.AMOUNT_CORRECTION && (
                    <>
                        <span className="text-slate-400 line-through">{Number(fix.originalValue).toLocaleString()}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">{Number(fix.suggestedValue).toLocaleString()}</span>
                         <span className="text-slate-500 ml-1">(Update Amount)</span>
                    </>
                )}
                 {fix.type === FixType.CREATE_ENTRY && (
                    <span className="text-blue-600 font-medium">Create new GL entry for {fix.suggestedValue === "Manual Fix" ? "Manual Review" : Number(fix.suggestedValue).toLocaleString()}</span>
                )}
                {fix.type === FixType.REMOVE_DUPLICATE && (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Flag as Duplicate / Do Not Process
                    </span>
                )}
            </div>
        </div>
    );
};

export const MatchTable: React.FC<Props> = ({ items }) => {
  const [filter, setFilter] = useState<MatchStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'ALL' || item.status === filter;
    const matchesSearch = searchTerm === '' || 
      item.bankTransaction?.invoice_number.includes(searchTerm) ||
      item.bookTransaction?.description.includes(searchTerm) ||
      (item.bankTransaction?.total_amount || '').toString().includes(searchTerm) ||
      (item.bookTransaction?.amount || '').toString().includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const formatCurrency = (val: number | undefined) => {
      if (val === undefined) return '-';
      if (isNaN(val)) return <span className="text-rose-500 font-bold">Invalid</span>;
      return val.toLocaleString('en-US', {minimumFractionDigits: 2});
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
        <h3 className="text-lg font-semibold text-slate-800">Detailed Transaction Log</h3>
        
        <div className="flex flex-col sm:flex-row gap-2">
           <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search invoice or amount..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 bg-slate-50 focus:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as MatchStatus | 'ALL')}
          >
            <option value="ALL">All Statuses</option>
            <option value={MatchStatus.MATCHED}>Matched</option>
            <option value={MatchStatus.VARIANCE}>Variance</option>
            <option value={MatchStatus.MISSING_IN_BOOK}>Missing in GL</option>
            <option value={MatchStatus.MISSING_IN_BANK}>Missing in Bank</option>
            <option value={MatchStatus.POTENTIAL_DUPLICATE}>Duplicates</option>
            <option value={MatchStatus.DATA_ERROR}>Data Errors</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-blue-50/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Bank Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Invoice / Ref</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-blue-800 uppercase tracking-wider">Bank Amount</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-blue-800 uppercase tracking-wider">Book Amount</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-blue-800 uppercase tracking-wider">Difference</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider w-1/4">Analysis & Fixes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredItems.length === 0 ? (
                <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">
                        No transactions found matching your criteria.
                    </td>
                </tr>
            ) : (
                filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                    <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 align-top">
                    {item.bankTransaction?.transaction_date || item.bookTransaction?.posting_date || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 align-top">
                        <div className="flex flex-col">
                            <span>{item.bankTransaction?.invoice_number || '-'} <span className="text-slate-400 text-xs font-normal">(Bank)</span></span>
                            <span>{item.bookTransaction?.description || '-'} <span className="text-slate-400 text-xs font-normal">(Book)</span></span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600 font-mono align-top">
                    {formatCurrency(item.bankTransaction?.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600 font-mono align-top">
                    {formatCurrency(item.bookTransaction?.amount)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold align-top ${item.amountDifference === 0 ? 'text-slate-400' : 'text-red-600'}`}>
                    {item.amountDifference !== 0 ? item.amountDifference.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 align-top">
                        {item.notes.length > 0 && !item.suggestedFix && (
                            <ul className="list-disc list-inside mb-1 text-slate-500">
                                {item.notes.map((note, i) => <li key={i}>{note}</li>)}
                            </ul>
                        )}
                        <SmartFixBadge item={item} />
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
          <span>Showing {filteredItems.length} transactions</span>
      </div>
    </div>
  );
};