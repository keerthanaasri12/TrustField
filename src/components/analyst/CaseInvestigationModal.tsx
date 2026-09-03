import React, { useState } from 'react';
import {
  CaseRecord,
  Role,
  CaseState,
} from '../../types/domain.ts';
import { ExplainabilityPanel } from './ExplainabilityPanel.tsx';
import { FraudNetworkExplorer } from './FraudNetworkExplorer.tsx';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  History,
  Share2,
  Sliders,
  User,
  Smartphone,
  Landmark,
  Layers,
  PhoneCall,
  Clock,
  Lock,
} from 'lucide-react';

interface CaseInvestigationModalProps {
  caseRecord: CaseRecord;
  onClose: () => void;
  onDecisionSubmitted: (decisionData: {
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_REVIEW' | 'CONFIRM_SCAM';
    reasonCode: string;
    notes: string;
    analystName: string;
  }) => Promise<void>;
  onTriggerTrustedContact: (action: 'REQUEST' | 'VERIFY_SAFE' | 'VERIFY_CONCERN') => Promise<void>;
}

export const CaseInvestigationModal: React.FC<CaseInvestigationModalProps> = ({
  caseRecord,
  onClose,
  onDecisionSubmitted,
  onTriggerTrustedContact,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SIGNALS' | 'NETWORK' | 'AUDIT'>('OVERVIEW');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Decision Form State
  const [decisionType, setDecisionType] = useState<'CONFIRM_SCAM' | 'REQUEST_REVIEW' | 'APPROVE' | 'REJECT'>('CONFIRM_SCAM');
  const [reasonCode, setReasonCode] = useState('SCAM_ACCOUNT_FREEZE_CONFIRMED');
  const [notes, setNotes] = useState('Customer manipulated by impersonator threatening account freeze. Dispatched hold to prevent ₹75,000 loss.');
  const [analystName, setAnalystName] = useState('Analyst Priya Sharma');

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || notes.length < 5) {
      setActionError('Analyst notes must be at least 5 characters long.');
      return;
    }
    setActionError(null);
    setIsSubmitting(true);
    try {
      await onDecisionSubmitted({
        decision: decisionType,
        reasonCode,
        notes,
        analystName,
      });
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
              caseRecord.riskResult.score >= 80 ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
            }`}>
              {caseRecord.riskResult.score}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">{caseRecord.id}</h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {caseRecord.status}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ₹{(caseRecord?.amountInr ?? 0).toLocaleString('en-IN')} Intercepted
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customer: <strong>{caseRecord.customerName}</strong> ({caseRecord.customerId}) • Payee: <span className="font-mono">{caseRecord.recipientId}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-900 border-b border-slate-800 flex items-center gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Investigation Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SIGNALS')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SIGNALS'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Explainability & Counterfactuals</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NETWORK')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'NETWORK'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Mule Syndicate Graph</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail ({caseRecord.auditEvents.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Top Banner Alert */}
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-950">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold text-sm">
                      {caseRecord.riskResult.policy.action} Triggered
                    </span>
                    <p className="text-rose-800 text-[11px] mt-0.5">
                      Social engineering attack: <strong>{caseRecord.scamLabel}</strong>. Estimated loss prevented: <strong>₹{(caseRecord?.amountInr ?? 0).toLocaleString('en-IN')}</strong>.
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs bg-rose-200/80 px-2 py-1 rounded text-rose-900 font-bold">
                  {caseRecord.riskResult.policy.reasonCode}
                </span>
              </div>

              {/* 3-Column Intelligence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Customer Baseline */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Customer Baseline
                  </h4>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Normal Range:</span>
                      <span className="font-mono font-medium text-slate-800">₹500 - ₹2,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Transfer:</span>
                      <span className="font-mono font-bold text-rose-700">₹{(caseRecord?.amountInr ?? 0).toLocaleString('en-IN')} (37.5x)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Percentile Spike:</span>
                      <span className="font-mono font-bold text-rose-700">99.8th percentile</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Normal Location:</span>
                      <span className="text-slate-800 font-medium">Pune, Maharashtra</span>
                    </div>
                  </div>
                </div>

                {/* 2. Device & Session */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    Device & Session Telemetry
                  </h4>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">New Device:</span>
                      <span className="font-bold text-rose-700">Yes (Android 14)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">First Observed:</span>
                      <span className="font-mono text-slate-800">09:10:14 (5m before txn)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IP Risk Score:</span>
                      <span className="font-mono text-amber-700 font-bold">0.75 (Cellular Proxy)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Session Anomaly:</span>
                      <span className="font-mono text-rose-700 font-bold">0.45 (Elevated)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Beneficiary & Mule Link */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    Beneficiary Intelligence
                  </h4>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payee ID:</span>
                      <span className="font-mono font-medium text-slate-800">{caseRecord.recipientId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Beneficiary Age:</span>
                      <span className="font-mono font-bold text-rose-700">0 Days (Added 09:12)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mule Cluster Links:</span>
                      <span className="font-mono font-bold text-purple-700">8 Nodes (Direct Hop 1)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Prior System Flags:</span>
                      <span className="font-mono text-rose-700 font-bold">1 Flagged Alert</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trusted Contact State & Action */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-blue-600" />
                    Trusted Contact Status: {caseRecord.trustedContact.name} ({caseRecord.trustedContact.relationship})
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Masked Phone: {caseRecord.trustedContact.phoneMasked} • Current State: <strong className="font-mono text-slate-800">{caseRecord.trustedContact.status}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {caseRecord.trustedContact.status === 'NOT_REQUESTED' && (
                    <button
                      type="button"
                      onClick={() => onTriggerTrustedContact('REQUEST')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Dispatch Verification SMS
                    </button>
                  )}
                  {caseRecord.trustedContact.status === 'REQUESTED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onTriggerTrustedContact('VERIFY_SAFE')}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Mark Verified Safe
                      </button>
                      <button
                        type="button"
                        onClick={() => onTriggerTrustedContact('VERIFY_CONCERN')}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Mark Verified Concern
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Analyst Decision Action Box (Section D2.7) */}
              <div className="bg-white p-5 rounded-xl border-2 border-blue-200/80 shadow-xs space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    Analyst Final Determination (Immutable Audit Record)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requires confirmed reason code and descriptive audit explanation before updating case state machine.
                  </p>
                </div>

                {actionError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                <form onSubmit={handleExecuteDecision} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Decision Action</label>
                      <select
                        value={decisionType}
                        onChange={(e) => setDecisionType(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 cursor-pointer"
                      >
                        <option value="CONFIRM_SCAM">CONFIRM SCAM & PROTECT (₹75k)</option>
                        <option value="REQUEST_REVIEW">ESCALATE FOR SENIOR AUDIT</option>
                        <option value="APPROVE">OVERRIDE & APPROVE DISPATCH</option>
                        <option value="REJECT">REJECT SIMULATION</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Reason Code</label>
                      <input
                        type="text"
                        value={reasonCode}
                        onChange={(e) => setReasonCode(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Analyst Identity</label>
                      <input
                        type="text"
                        value={analystName}
                        onChange={(e) => setAnalystName(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Investigation Evidence Notes & Rationalization
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{isSubmitting ? 'Recording Audit Record...' : 'Confirm Decision & Commit Audit Trail'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'SIGNALS' && (
            <ExplainabilityPanel riskResult={caseRecord.riskResult} caseId={caseRecord.id} />
          )}

          {activeTab === 'NETWORK' && (
            <FraudNetworkExplorer
              graph={{
                nodes: [
                  { id: 'node-cust-ravi', type: 'Customer', label: `${caseRecord.customerName} (${caseRecord.customerId})`, flagged: false, properties: { city: 'Pune' } },
                  { id: 'node-acc-ravi', type: 'Account', label: `Account ${caseRecord.accountNumberMasked}`, flagged: false, properties: { balance: '₹2.84L' } },
                  { id: 'node-dev-new', type: 'Device', label: 'Android 14 (New Device)', flagged: true, properties: { firstSeen: '09:10:14' } },
                  { id: 'node-ben-quickpay', type: 'Beneficiary', label: caseRecord.recipientId, flagged: true, properties: { ageDays: 0, flags: 1 } },
                  { id: 'node-mule-cluster', type: 'MuleCluster', label: 'Synthetic Mule Cluster #8', flagged: true, properties: { nodes: 8, risk: 'Critical' } },
                  { id: 'node-mule-m1', type: 'Beneficiary', label: 'fastpay.node1@okhdfc', flagged: true, properties: { flags: 4 } },
                  { id: 'node-mule-m2', type: 'Beneficiary', label: 'settlement.safe8@icici', flagged: true, properties: { flags: 6 } },
                ],
                edges: [
                  { id: 'e1', source: 'node-cust-ravi', target: 'node-acc-ravi', relationship: 'OWNS', evidence: 'Account in Pune branch' },
                  { id: 'e2', source: 'node-cust-ravi', target: 'node-dev-new', relationship: 'USES', evidence: 'Enrolled device via SMS OTP at 09:10' },
                  { id: 'e3', source: 'node-acc-ravi', target: 'node-ben-quickpay', relationship: 'ADDED_BENEFICIARY', evidence: 'Payee added at 09:12 (3 min before attempt)' },
                  { id: 'e4', source: 'node-acc-ravi', target: 'node-ben-quickpay', relationship: 'SENT_SIMULATED_PAYMENT', evidence: '₹75,000 transfer initiated at 09:15' },
                  { id: 'e5', source: 'node-ben-quickpay', target: 'node-mule-cluster', relationship: 'LINKED_TO', evidence: 'Directly linked to 8-node mule syndicate ring' },
                  { id: 'e6', source: 'node-mule-cluster', target: 'node-mule-m1', relationship: 'LINKED_TO', evidence: 'Syndicate cash dispersion node' },
                  { id: 'e7', source: 'node-mule-cluster', target: 'node-mule-m2', relationship: 'LINKED_TO', evidence: 'Off-ramp cash out node' },
                ],
              }}
              highlightNodeId="node-ben-quickpay"
            />
          )}

          {activeTab === 'AUDIT' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">Immutable Case Audit History</h4>
                  <p className="text-xs text-slate-500">Append-only compliance record of all actor decisions and engine transitions</p>
                </div>
                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {caseRecord.auditEvents.length} Events Logged
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {caseRecord.auditEvents.map((ev, idx) => (
                  <div key={ev.id || idx} className="p-4 hover:bg-slate-50/70 transition-colors text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{ev.action}</span>
                        <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          {ev.actorRole}
                        </span>
                        <span className="text-slate-500">by {ev.actor}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                      <span>Transition: {ev.previousState} ➔ {ev.newState}</span>
                      <span>•</span>
                      <span>Reason: {ev.reasonCode}</span>
                      <span>•</span>
                      <span>Correlation: {ev.correlationId}</span>
                    </div>
                    {ev.notes && (
                      <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] mt-1">
                        {ev.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
