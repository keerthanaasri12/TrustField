import React, { useState } from 'react';
import {
  ShieldAlert,
  Send,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  HelpCircle,
  PhoneCall,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { SyntheticCustomer } from '../../data/synthetic-generator.ts';
import { RiskResult } from '../../types/domain.ts';

interface CustomerPortalProps {
  customer: SyntheticCustomer;
  onPaymentSubmitted: (payment: {
    recipient: string;
    amountInr: number;
    channel: 'UPI' | 'IMPS' | 'NEFT';
    note: string;
    scamResponses?: Record<string, boolean | 'UNSURE'>;
  }) => Promise<{
    caseId: string;
    riskResult: RiskResult;
    isPaused: boolean;
    lossPreventedInr: number;
  }>;
  onToggleTrustedContact: (optIn: boolean) => void;
  onOpenCase: (caseId: string) => void;
  onViewChange?: (view: 'CUSTOMER' | 'ANALYST' | 'RED_TEAM') => void;
  onLoadRaviCase?: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  customer,
  onPaymentSubmitted,
  onToggleTrustedContact,
  onOpenCase,
  onViewChange,
  onLoadRaviCase,
}) => {
  // Form State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<'UPI' | 'IMPS' | 'NEFT'>('UPI');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Flow State
  const [activeDecision, setActiveDecision] = useState<{
    caseId: string;
    riskResult: RiskResult;
    isPaused: boolean;
    amountInr: number;
  } | null>(null);

  // Modals
  const [showScamCheckModal, setShowScamCheckModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Scam context questions state
  const [scamAnswers, setScamAnswers] = useState<Record<string, boolean | 'UNSURE'>>({
    pressure: false,
    account_freeze: false,
    official_impersonation: false,
    unknown_app: false,
    promise_reward: false,
  });

  const handlePrefillRaviAttack = () => {
    setRecipient('quickpay.help@upi');
    setAmount('75000');
    setChannel('UPI');
    setNote('Urgent penalty clearance per bank officer instructions');
    setValidationError(null);
    setScamAnswers({
      pressure: true,
      account_freeze: true,
      official_impersonation: true,
      unknown_app: false,
      promise_reward: false,
    });
  };

  const handleStartPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid positive payment amount in INR.');
      return;
    }
    if (!recipient.trim() || recipient.length < 4) {
      setValidationError('Please enter a valid recipient UPI ID or account number.');
      return;
    }
    setValidationError(null);

    // If amount is high (> ₹20,000) or unusual for Ravi (> ₹2,000), show contextual check
    if (parsedAmount > 2000) {
      setShowScamCheckModal(true);
    } else {
      executePayment();
    }
  };

  const executePayment = async (customAnswers?: Record<string, boolean | 'UNSURE'>) => {
    setIsSubmitting(true);
    try {
      const result = await onPaymentSubmitted({
        recipient,
        amountInr: parseFloat(amount),
        channel,
        note,
        scamResponses: customAnswers || scamAnswers,
      });

      setActiveDecision({
        caseId: result.caseId,
        riskResult: result.riskResult,
        isPaused: result.isPaused,
        amountInr: parseFloat(amount),
      });

      if (result.isPaused) {
        setShowPauseModal(true);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setValidationError('Simulation failed to dispatch. Check network connectivity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Customer Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
            <span>Verified Retail Banking Profile</span>
            <span className="text-slate-300">•</span>
            <span>Pune Branch</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Primary Savings: <span className="font-mono font-medium text-slate-700">{customer.accountNumberMasked}</span> | Mobile: {customer.phoneMasked}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Balance card */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80 min-w-[200px]">
            <p className="text-xs text-slate-500 font-medium">Available Balance</p>
            <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              ₹{(customer?.balanceInr ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Synthetic demo funds
            </p>
          </div>

          {/* Trusted Contact setting */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Trusted Contact Shield
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={customer.trustedContactOptIn}
                  onChange={(e) => onToggleTrustedContact(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight max-w-[220px]">
              {customer.trustedContactOptIn ? (
                <>Alerts <strong>{customer.trustedContactName}</strong> ({customer.trustedContactRelationship}) if extreme coercion is flagged.</>
              ) : (
                <>Opted out. Paused payments will not notify family members.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Showcase & Direct Navigation Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Quick Navigation & Showcase:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-quick-load-ravi"
            type="button"
            onClick={() => {
              handlePrefillRaviAttack();
              if (onLoadRaviCase) {
                onLoadRaviCase();
              } else {
                onOpenCase('CASE-2026-0915');
              }
            }}
            title="Prefill and inspect Ravi Kumar account freeze coercion case"
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Ravi Case (₹75k)</span>
          </button>

          <button
            id="btn-quick-security-command"
            type="button"
            onClick={() => {
              if (onViewChange) {
                onViewChange('ANALYST');
              } else {
                onOpenCase('CASE-2026-0915');
              }
            }}
            title="Open Security Command Center"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
            <span>Review in Security Center</span>
          </button>

          <button
            id="btn-quick-red-team"
            type="button"
            onClick={() => {
              if (onViewChange) {
                onViewChange('RED_TEAM');
              }
            }}
            title="Open Red-Team Social-Engineering Simulator"
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Terminal className="w-3.5 h-3.5 text-rose-600" />
            <span>Red-Team Lab</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Payment Simulation Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 text-base">Make a Simulated Transfer</h2>
                <p className="text-xs text-slate-500">Evaluates social-engineering & manipulation signals before dispatch</p>
              </div>
              <button
                type="button"
                onClick={handlePrefillRaviAttack}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 border border-blue-200/80 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Prefill Ravi's Attack (₹75k)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleStartPayment} className="p-6 space-y-4">
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{validationError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payee UPI ID / VPA or Account
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. quickpay.help@upi, friend@okhdfc"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 75000"
                      min="1"
                      step="1"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                      required
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Ravi's typical range: ₹500–₹2,000
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
                  >
                    <option value="UPI">UPI (Instant Transfer)</option>
                    <option value="IMPS">IMPS (Immediate Payment)</option>
                    <option value="NEFT">NEFT (Electronic Funds)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Note (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Clearance penalty / safe account transfer"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Evaluating Manipulation Signals...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Initiate Simulated Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Risk Evaluation Result (if active) */}
          {activeDecision && (
            <div className={`p-6 rounded-xl border transition-all ${
              activeDecision.isPaused
                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                : activeDecision.riskResult.band === 'HIGH'
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activeDecision.isPaused ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {activeDecision.isPaused ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">
                      {activeDecision.isPaused
                        ? `Payment Paused: Score ${activeDecision.riskResult.score}/100`
                        : `Payment Permitted: Score ${activeDecision.riskResult.score}/100`}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Policy Protocol: <span className="font-mono font-semibold">{activeDecision.riskResult.policy.action}</span> ({activeDecision.riskResult.policy.reasonCode})
                    </p>
                  </div>
                </div>

                <button
                  id="btn-inspect-active-case"
                  type="button"
                  onClick={() => onOpenCase(activeDecision.caseId)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Review this case in Security Command Center"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Review in Security Center</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Detected Grounded Signals */}
              <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Detected Evidence Signals ({activeDecision.riskResult.signals.length}):
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {activeDecision.riskResult.signals.map((sig) => (
                    <div key={sig.id} className="bg-white/80 rounded-md p-2.5 border border-slate-200/70 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{sig.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          sig.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sig.severity}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{sig.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Recent Normal Transactions & Baseline (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Baseline Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Behavioral Protection Baseline
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              TRUSTSHIELD monitors subtle manipulation deviations without inspecting private contents.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Typical Payment Range</span>
                <span className="font-mono font-medium text-slate-800">₹500 – ₹2,000</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Primary Registered Location</span>
                <span className="font-medium text-slate-800">Pune, Maharashtra</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Primary Device</span>
                <span className="font-medium text-slate-800">Pixel 7a (Trusted 2+ yrs)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Typical Active Hours</span>
                <span className="font-mono text-slate-800">09:00 - 21:00 IST</span>
              </div>
            </div>
          </div>

          {/* Normal Recent Transactions */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm">Recent Normal Activity</h3>
              <span className="text-[11px] text-slate-400 font-mono">Last 7 Days</span>
            </div>

            <div className="space-y-3">
              {customer.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{tx.recipient}</p>
                    <p className="text-[11px] text-slate-400">{tx.category} • {tx.channel}</p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-semibold text-slate-800">₹{(tx?.amountInr ?? 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-emerald-600">Settled Safe</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Need Help / Report Scam */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-5">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
              Suspect a Scam or Impersonator?
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              If someone is on the phone asking you to transfer funds to a "safe vault" or clear an arrest, stop immediately.
            </p>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span>Report Coercion & View Official Helplines</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Scam Context Questionnaire */}
      {showScamCheckModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Quick Security Check</h3>
                <p className="text-xs text-slate-500">Your answers help us protect you from coercive fraud.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              Transferring <strong>₹{(Number(amount) || 0).toLocaleString('en-IN')}</strong> is significantly higher than your typical transactions (₹500–₹2,000). Please answer honestly:
            </p>

            <div className="space-y-3 text-xs mb-6">
              {/* Question 1 */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <p className="font-medium text-slate-800 mb-2">
                  1. Is someone on a call pressuring or rushing you to make this transfer right now?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScamAnswers((prev) => ({ ...prev, pressure: true }))}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs border ${
                      scamAnswers.pressure === true
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setScamAnswers((prev) => ({ ...prev, pressure: false }))}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs border ${
                      scamAnswers.pressure === false
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setScamAnswers((prev) => ({ ...prev, pressure: 'UNSURE' }))}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs border ${
                      scamAnswers.pressure === 'UNSURE'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Unsure
                  </button>
                </div>
              </div>

              {/* Question 2 */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <p className="font-medium text-slate-800 mb-2">
                  2. Did someone claim your bank account, SIM card, or parcel will be frozen/blocked/seized?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScamAnswers((prev) => ({ ...prev, account_freeze: true }))}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs border ${
                      scamAnswers.account_freeze === true
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setScamAnswers((prev) => ({ ...prev, account_freeze: false }))}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs border ${
                      scamAnswers.account_freeze === false
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setScamAnswers((prev) => ({ ...prev, account_freeze: 'UNSURE' }))}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs border ${
                      scamAnswers.account_freeze === 'UNSURE'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Unsure
                  </button>
                </div>
              </div>

              {/* Question 3 */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <p className="font-medium text-slate-800 mb-2">
                  3. Did the caller claim to be a Police, CBI, Customs, or Senior Bank official?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScamAnswers((prev) => ({ ...prev, official_impersonation: true }))}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs border ${
                      scamAnswers.official_impersonation === true
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setScamAnswers((prev) => ({ ...prev, official_impersonation: false }))}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs border ${
                      scamAnswers.official_impersonation === false
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowScamCheckModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel Transfer
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowScamCheckModal(false);
                  executePayment(scamAnswers);
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Continue with Risk Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Critical Protection Pause Screen */}
      {showPauseModal && activeDecision && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-rose-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="text-center mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                SIMULATED DISPATCH INTERCEPTED
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">
                Simulated Payment Paused
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Policy Reason: <span className="font-mono font-semibold text-slate-800">P-CRITICAL-04 (Score: {activeDecision.riskResult.score}/100)</span>
              </p>
            </div>

            {/* Clear reassurance */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1 mb-4">
              <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Zero Money Left Your Account
              </p>
              <p className="text-emerald-700 text-[11px]">
                Your ₹{(activeDecision?.amountInr ?? 75000).toLocaleString('en-IN')} remains completely safe in your account. No money has moved.
              </p>
            </div>

            {/* Grounded reasons */}
            <div className="space-y-2 text-xs mb-4">
              <p className="font-semibold text-slate-800">Why was this intercepted?</p>
              <ul className="space-y-1 text-slate-600 list-disc list-inside text-[11px]">
                <li>Unprecedented transaction amount (37.5x higher than your normal range)</li>
                <li>Device newly added minutes ago without historical trust baseline</li>
                <li>Beneficiary linked to known synthetic mule dispersion clusters</li>
                <li>Urgent coercion and account freeze threats reported</li>
              </ul>
            </div>

            {/* Trusted contact status */}
            {customer.trustedContactOptIn && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 mb-5 flex items-start gap-2.5">
                <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Trusted Contact Alert Triggered</p>
                  <p className="text-[11px] text-blue-700">
                    A safe notification has been queued for your trusted contact <strong>{customer.trustedContactName}</strong> ({customer.trustedContactRelationship}) to help protect you.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-modal-review-security-center"
                type="button"
                onClick={() => {
                  setShowPauseModal(false);
                  onOpenCase(activeDecision.caseId);
                }}
                className="w-full sm:w-1/2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Review in Security Center</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPauseModal(false);
                  setShowReportModal(true);
                }}
                className="w-full sm:w-1/2 py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Report Coercion & Helpline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Scam Report & Emergency Guidance */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Official Guidance & Report</h3>
                <p className="text-xs text-slate-500">Government Cybercrime Helpline & Official Bank Protocol</p>
              </div>
            </div>

            {!reportSubmitted ? (
              <div className="space-y-4 text-xs">
                {/* Official Indian Helplines */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    National Cyber Crime Reporting Portal (India)
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    If you are currently facing intimidation, digital arrest threats, or extortion:
                  </p>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 font-mono font-bold text-slate-900">
                    <span>Helpline Toll-Free:</span>
                    <span className="text-blue-600 text-sm">1930</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Official Portal: <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-blue-600 underline">cybercrime.gov.in</a> (Notice: prototype does not automatically connect users).
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block font-medium text-slate-700">
                    Describe the scam or manipulation (Caller phone, threats made):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Caller claimed to be Inspector Sharma from Delhi Customs claiming a parcel in my name contained contraband."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    defaultValue="Caller claimed to be Senior Vigilance Manager from HDFC Bank demanding ₹75,000 transfer to temporary vault to avoid RBI freeze."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportSubmitted(true)}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Submit Synthetic Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Report Acknowledged</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Your synthetic incident report has been logged to the immutable case audit trail. Remember to disconnect any ongoing unknown calls immediately.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReportSubmitted(false);
                    setShowReportModal(false);
                  }}
                  className="px-5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg mt-2"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
