import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  Users,
  CheckCircle2,
  TrendingUp,
  Activity,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  Terminal,
  UserCheck,
} from 'lucide-react';
import { CaseRecord, AnalyticsSummary } from '../../types/domain.ts';
import { CaseInvestigationModal } from './CaseInvestigationModal.tsx';
import { generateSyntheticDataset } from '../../data/synthetic-generator.ts';

interface CommandCenterProps {
  onOpenCase: (caseId: string) => void;
  selectedCaseId?: string | null;
  caseRequestNonce?: number;
  onCloseSelectedCase?: () => void;
  onViewChange?: (view: 'CUSTOMER' | 'ANALYST' | 'RED_TEAM') => void;
  onLoadRaviCase?: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  onOpenCase,
  selectedCaseId,
  caseRequestNonce,
  onCloseSelectedCase,
  onViewChange,
  onLoadRaviCase,
}) => {
  // Cases list state
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [riskBand, setRiskBand] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [sortField, setSortField] = useState<'createdAt' | 'amountInr' | 'riskScore'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  // Analytics KPI
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  // Active modal
  const [inspectingCase, setInspectingCase] = useState<CaseRecord | null>(null);

  // Simulated live telemetry feed
  const [liveEvents, setLiveEvents] = useState<
    Array<{ id: string; time: string; customer: string; amount: number; score: number; action: string }>
  >([]);

  // Fetch Cases
  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sort: sortField,
        order: sortOrder,
      });
      if (search) params.set('search', search);
      if (riskBand !== 'ALL') params.set('riskBand', riskBand);
      if (status !== 'ALL') params.set('status', status);

      const res = await fetch(`/api/v1/cases?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases);
        setTotal(data.total);
        setTotalPages(data.totalPages);

        // If a caseId was passed via props or URL, load it
        if (selectedCaseId) {
          const matched = data.cases.find((c: CaseRecord) => c.id === selectedCaseId);
          if (matched) setInspectingCase(matched);
        }
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Analytics & Initial Feed
  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/v1/analytics/summary');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  useEffect(() => {
    fetchCases();
    fetchAnalytics();
  }, [page, riskBand, status, sortField, sortOrder]);

  // Load single case by ID if specified or triggered by nonce
  useEffect(() => {
    if (selectedCaseId) {
      let isMounted = true;
      fetch(`/api/v1/cases/${selectedCaseId}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((c) => {
          if (isMounted && c && c.id) {
            setInspectingCase(c);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch case from API, checking local fallback:', err);
          if (isMounted) {
            const matched = cases.find((c) => c.id === selectedCaseId);
            if (matched) {
              setInspectingCase(matched);
            } else if (selectedCaseId === 'CASE-2026-0915') {
              const fresh = generateSyntheticDataset();
              setInspectingCase(fresh.raviCase);
            }
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [selectedCaseId, caseRequestNonce]);

  // Simulated live event feed polling
  useEffect(() => {
    const syntheticStream = [
      { id: 'ev-1', time: '10:14:02', customer: 'Suresh Patil', amount: 1200, score: 14, action: 'APPROVE' },
      { id: 'ev-2', time: '10:14:28', customer: 'Neha Joshi', amount: 4500, score: 28, action: 'APPROVE' },
      { id: 'ev-3', time: '10:14:55', customer: 'Ravi Kumar', amount: 75000, score: 97, action: 'PAUSE_AND_VERIFY' },
      { id: 'ev-4', time: '10:15:12', customer: 'Ananya Roy', amount: 15000, score: 68, action: 'STEP_UP_VERIFY' },
      { id: 'ev-5', time: '10:15:40', customer: 'Vikram Mehta', amount: 900, score: 11, action: 'APPROVE' },
    ];
    setLiveEvents(syntheticStream);

    const interval = setInterval(() => {
      // Deterministic slight rotation for live appearance
      setLiveEvents((prev) => {
        const next = [...prev];
        const first = next.shift();
        if (first) {
          first.time = new Date().toLocaleTimeString();
          next.push(first);
        }
        return next;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleDecision = async (decisionData: {
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_REVIEW' | 'CONFIRM_SCAM';
    reasonCode: string;
    notes: string;
    analystName: string;
  }) => {
    if (!inspectingCase) return;
    const res = await fetch(`/api/v1/cases/${inspectingCase.id}/decisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': 'ANALYST',
      },
      body: JSON.stringify(decisionData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to apply decision');
    }

    // Refresh case and list
    fetchCases();
    fetchAnalytics();
    const updated = await fetch(`/api/v1/cases/${inspectingCase.id}`).then((r) => r.json());
    setInspectingCase(updated);
  };

  const handleTrustedContact = async (action: 'REQUEST' | 'VERIFY_SAFE' | 'VERIFY_CONCERN') => {
    if (!inspectingCase) return;
    const res = await fetch(`/api/v1/cases/${inspectingCase.id}/trusted-contact-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': 'ANALYST',
      },
      body: JSON.stringify({ action, notes: `Analyst action: ${action}` }),
    });

    if (res.ok) {
      const updated = await res.json();
      setInspectingCase(updated);
      fetchCases();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Monitored</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {(analytics?.transactionsMonitored ?? 12480).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Synthetic volume</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">High Risk Flagged</span>
          <p className="text-xl font-bold font-mono text-amber-600 mt-1">
            {(analytics?.highRiskFlagged ?? 412).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Score &gt;= 70</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">Critical Paused</span>
          <p className="text-xl font-bold font-mono text-rose-600 mt-1">
            {(analytics?.pausedInterventions ?? 184).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">P-CRITICAL-04</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Loss Prevented</span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            ₹{(((analytics?.totalLossPreventedInr ?? 14250000)) / 10000000).toFixed(2)} Cr
          </p>
          <span className="text-[10px] text-slate-400">Intercepted total</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active Cases</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {(analytics?.activeInvestigations ?? 28).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">In triage queue</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">False Positive Est.</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {analytics?.falsePositiveDemoRate ?? 1.8}%
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">Calibrated</span>
        </div>
      </div>

      {/* Synthetic Live Feed ticker */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-4 text-xs overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300">Live Telemetry Stream:</span>
        </div>
        <div className="flex items-center gap-4 divide-x divide-slate-800 text-[11px] font-mono">
          {liveEvents.map((ev) => (
            <div key={ev.id} className="pl-4 first:pl-0 flex items-center gap-2">
              <span className="text-slate-500">{ev.time}</span>
              <span className="text-slate-300 font-sans">{ev.customer}</span>
              <span className="text-slate-400">₹{(ev?.amount ?? 0).toLocaleString('en-IN')}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                ev.score >= 80 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'
              }`}>
                {ev.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Review Queue Table & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              Manipulation Review Queue
            </h2>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-medium">
              {total} Total Cases
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => e.key === 'Enter' && fetchCases()}
                placeholder="Search case, customer, or payee..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Risk Band Filter */}
            <select
              value={riskBand}
              onChange={(e) => {
                setRiskBand(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Risk Band"
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
            >
              <option value="ALL">All Risk Bands</option>
              <option value="CRITICAL">Critical (80-100)</option>
              <option value="HIGH">High (60-79)</option>
              <option value="MEDIUM">Medium (35-59)</option>
              <option value="LOW">Low (0-34)</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Case Status"
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="TRUSTED_CONTACT_PENDING">TC Pending</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED_SCAM">Resolved Scam</option>
              <option value="RESOLVED_SAFE">Resolved Safe</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchCases}
              aria-label="Refresh Cases Queue"
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Direct Load Ravi Story Trigger */}
            <button
              id="btn-inspect-ravi-analyst"
              type="button"
              onClick={() => {
                if (onLoadRaviCase) {
                  onLoadRaviCase();
                } else {
                  onOpenCase('CASE-2026-0915');
                }
              }}
              title="Inspect the flagship Ravi Kumar account freeze coercion case"
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Load Ravi Case</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Case ID</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Amount (INR)</th>
                <th className="p-3.5">Payee</th>
                <th className="p-3.5">Score / Policy</th>
                <th className="p-3.5">Scam Category</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Loading queue records...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No matching cases found in synthetic dataset.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setInspectingCase(c)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 font-mono font-bold text-blue-700">
                      {c.id}
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-900">{c.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.customerId}</p>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      ₹{(c?.amountInr ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {c.recipientId}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                          c.riskResult.score >= 80
                            ? 'bg-rose-100 text-rose-800'
                            : c.riskResult.score >= 60
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.riskResult.score}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {c.riskResult.policy.action}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      {c.scamLabel}
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                        c.status === 'OPEN'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : c.status === 'IN_REVIEW'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : c.status === 'RESOLVED_SCAM'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingCase(c);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total records)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md font-medium cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Case Investigation Drawer / Modal */}
      {inspectingCase && (
        <CaseInvestigationModal
          caseRecord={inspectingCase}
          onClose={() => {
            setInspectingCase(null);
            if (onCloseSelectedCase) onCloseSelectedCase();
          }}
          onDecisionSubmitted={handleDecision}
          onTriggerTrustedContact={handleTrustedContact}
        />
      )}
    </div>
  );
};
