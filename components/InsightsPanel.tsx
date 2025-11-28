import React from 'react';
import { ReconciliationInsights } from '../types';
import { Brain, Lightbulb, TrendingUp, Activity } from 'lucide-react';

interface Props {
  insights: ReconciliationInsights;
}

export const InsightsPanel: React.FC<Props> = ({ insights }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      {/* 1. Executive Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-3 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              AI Executive Summary
            </h3>
            <p className="text-slate-600 mt-1 max-w-3xl">
              {insights.executiveSummary}
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-100 shadow-sm">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase">Health Score</p>
              <p className={`text-2xl font-bold ${insights.healthScore > 80 ? 'text-blue-600' : 'text-amber-500'}`}>
                {insights.healthScore}/100
              </p>
            </div>
             <div className="w-px h-10 bg-slate-200"></div>
             <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase">Avg Lag</p>
              <p className="text-2xl font-bold text-slate-700">
                {insights.avgPostingLagDays} <span className="text-sm font-normal text-slate-400">days</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Error Patterns */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-red-500" />
          Top Error Causes
        </h4>
        <div className="space-y-4">
          {insights.topErrorPatterns.length === 0 ? (
             <p className="text-sm text-slate-500 italic">No significant errors detected.</p>
          ) : (
            insights.topErrorPatterns.map((pattern, idx) => (
                <div key={idx} className="relative">
                <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{pattern.category}</span>
                    <span className="text-slate-500">{pattern.count} items ({pattern.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                        className="bg-red-400 h-2 rounded-full" 
                        style={{ width: `${pattern.percentage}%` }}
                    ></div>
                </div>
                {pattern.impactAmount > 0 && (
                     <p className="text-xs text-slate-400 mt-1">Impact: {pattern.impactAmount.toLocaleString()} THB</p>
                )}
                </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Process Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Process Improvements
        </h4>
        <ul className="space-y-3">
          {insights.processRecommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
              <div className="min-w-[6px] h-[6px] rounded-full bg-amber-400 mt-1.5"></div>
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* 4. AI Learnings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-indigo-500" />
          AI Knowledge Base
        </h4>
        <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100/50 h-full">
            <ul className="space-y-3">
            {insights.aiLearnings.map((learning, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-indigo-400 mt-0.5">•</span>
                {learning}
                </li>
            ))}
            </ul>
        </div>
      </div>

    </div>
  );
};