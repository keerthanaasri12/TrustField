import React, { useState, useEffect } from 'react';
import { RiskResult } from '../../types/domain.ts';
import { Sparkles, HelpCircle, ArrowDownRight, Layers, Sliders, ShieldCheck } from 'lucide-react';

interface ExplainabilityPanelProps {
  riskResult: RiskResult;
  caseId: string;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ riskResult, caseId }) => {
  const [explanation, setExplanation] = useState<string>('');
  const [source, setSource] = useState<'DETERMINISTIC_GROUNDED' | 'AI_GROUNDED_MODEL'>('DETERMINISTIC_GROUNDED');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchExplanation() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/cases/${caseId}/explain`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setExplanation(data.explanation);
            setSource(data.source);
          }
        }
      } catch (err) {
        console.warn('Could not fetch server explanation, using local deterministic fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchExplanation();
    return () => {
      isMounted = false;
    };
  }, [caseId]);

  return (
    <div className="space-y-6">
      {/* Overview Score & Protocol */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {riskResult.components.map((comp) => {
          const pct = Math.round((comp.score / comp.max) * 100);
          return (
            <div key={comp.name} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">{comp.name}</span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {comp.score}/{comp.max}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${
                    pct >= 80 ? 'bg-rose-600' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block text-right font-mono">
                {pct}% severity contribution
              </span>
            </div>
          );
        })}
      </div>

      {/* Grounded Signals List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h4 className="font-semibold text-sm text-slate-900 mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Grounded Signal Evidence ({riskResult.signals.length} Signals)
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          Every signal is strictly grounded in observed telemetry and reported facts. No demographic profiling or external black-box inferences.
        </p>

        <div className="space-y-3">
          {riskResult.signals.map((sig, idx) => (
            <div key={sig.id} className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-slate-400 font-mono">#{idx + 1}</span>
                  {sig.title}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    sig.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {sig.severity}
                  </span>
                  <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                    {sig.id}
                  </span>
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed">{sig.evidence}</p>
              <div className="text-[11px] text-slate-500 font-mono pt-1">
                Source Fields: {sig.sourceFields.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* True Counterfactual Analysis (Required by Section E2) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h4 className="font-semibold text-sm text-slate-900 mb-1 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          Counterfactual Sensitivity Recalculation
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          Shows exact recomputed score if a given observed signal fact had not been present. Never relies on static approximations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {riskResult.counterfactuals.map((cf) => (
            <div key={cf.removeSignalId} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="font-mono text-[10px] text-slate-500 uppercase block mb-1">
                If Absent: {cf.removeSignalId}
              </span>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-slate-400 line-through mr-2 font-mono">{cf.scoreBefore}</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{cf.scoreAfter}</span>
                  <span className="text-slate-500 text-[11px]"> / 100</span>
                </div>
                <div className="text-emerald-700 font-mono font-bold flex items-center text-xs">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>-{cf.delta} pts</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grounded AI / Deterministic Explanation Panel */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h4 className="font-semibold text-sm">Grounded Intervention Explanation</h4>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
            {source === 'AI_GROUNDED_MODEL' ? 'Server-Side Gemini Grounded' : 'Deterministic Rule Grounded'}
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 animate-pulse">Generating grounded explanation from detected facts...</p>
        ) : (
          <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
            {explanation || 'Loading grounded explanation...'}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Engine Version: {riskResult.engineVersion}</span>
          <span>Simulation Mode: Synthetic Data Only</span>
        </div>
      </div>
    </div>
  );
};
