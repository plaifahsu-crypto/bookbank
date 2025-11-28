import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { ReconciliationSummary, ReconciliationItem, MatchStatus } from '../types';

interface Props {
  summary: ReconciliationSummary;
  items: ReconciliationItem[];
}

const COLORS = {
  [MatchStatus.MATCHED]: '#3B82F6', // Blue 500
  [MatchStatus.VARIANCE]: '#F59E0B', // Amber 500
  [MatchStatus.MISSING_IN_BOOK]: '#EF4444', // Red 500
  [MatchStatus.MISSING_IN_BANK]: '#8B5CF6', // Violet 500
  [MatchStatus.POTENTIAL_DUPLICATE]: '#F97316', // Orange 500
  [MatchStatus.DATA_ERROR]: '#E11D48', // Rose 600
};

export const DashboardCharts: React.FC<Props> = ({ summary, items }) => {
  // Recalculate duplicates count for chart (since summary interface might not have it explicitly)
  const duplicateCount = items.filter(i => i.status === MatchStatus.POTENTIAL_DUPLICATE).length;
  const errorCount = items.filter(i => i.status === MatchStatus.DATA_ERROR).length;

  const pieData = [
    { name: 'Matched', value: summary.matchedCount, color: COLORS.MATCHED },
    { name: 'Variance', value: summary.varianceCount, color: COLORS.VARIANCE },
    { name: 'Missing in Book', value: summary.missingInBookCount, color: COLORS.MISSING_IN_BOOK },
    { name: 'Missing in Bank', value: summary.missingInBankCount, color: COLORS.MISSING_IN_BANK },
    { name: 'Duplicates', value: duplicateCount, color: COLORS.POTENTIAL_DUPLICATE },
    { name: 'Data Errors', value: errorCount, color: COLORS.DATA_ERROR },
  ].filter(d => d.value > 0);

  // Group by Date for Bar Chart
  const dailyStats = new Map<string, { date: string; matched: number; issues: number }>();

  items.forEach(item => {
    // Skip data errors for the timeline chart to avoid crashes
    if (item.status === MatchStatus.DATA_ERROR) return;

    let dateStr = '';
    if (item.bankTransaction && item.bankTransaction.transaction_date) {
      dateStr = item.bankTransaction.transaction_date;
    } else if (item.bookTransaction && item.bookTransaction.posting_date) {
      dateStr = item.bookTransaction.posting_date;
    }
    
    if (!dateStr) return;

    if (!dailyStats.has(dateStr)) {
      dailyStats.set(dateStr, { date: dateStr, matched: 0, issues: 0 });
    }
    
    const day = dailyStats.get(dateStr)!;
    if (item.status === MatchStatus.MATCHED) {
      day.matched++;
    } else {
      day.issues++;
    }
  });

  // Convert map to array and sort by date roughly
  const barData = Array.from(dailyStats.values())
    .sort((a, b) => {
        try {
            // Helper to parse DD/MM/YYYY
            const parseD = (str: string) => {
                const parts = str.split('/');
                if(parts.length !== 3) return 0;
                return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0])).getTime();
            };
            return parseD(a.date) - parseD(b.date);
        } catch (e) {
            return 0;
        }
    })
    .slice(0, 10); // Show first 10 days to avoid overcrowding

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Pie Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Reconciliation Status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Daily Performance (Top 10 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip 
                 cursor={{fill: '#F0F9FF'}}
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar dataKey="matched" name="Matched" stackId="a" fill={COLORS.MATCHED} radius={[0, 0, 4, 4]} />
              <Bar dataKey="issues" name="Unmatched/Variance" stackId="a" fill={COLORS.MISSING_IN_BOOK} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};