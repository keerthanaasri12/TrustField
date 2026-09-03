import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ShieldAlert,
  AlertTriangle,
  Smartphone,
  PhoneCall,
  UserX,
  CreditCard,
  CheckCircle2,
  Sliders,
  Terminal,
  Clock,
  Layers,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { generateSyntheticDataset } from '../../data/synthetic-generator.ts';
import { evaluateRisk } from '../../risk-engine/engine.ts';
import { RAVI_KUMAR_RISK_INPUT } from '../../risk-engine/fixtures/ravi-fixture.ts';

interface RedTeamLabProps {
  onOpenCase?: (caseId: string) => void;
  onViewChange?: (view: 'CUSTOMER' | 'ANALYST' | 'RED_TEAM') => void;
}

export const RedTeamLab: React.FC<RedTeamLabProps> = ({
  onOpenCase,
  onViewChange,
}) => {
  const dataset = useMemo(() => generateSyntheticDataset(), []);
  const [selectedPresetId, setSelectedPresetId] = useState('preset-account-freeze');
  const [currentStep, setCurrentStep] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);

  // Active preset details
  const activePreset = dataset.scamPresets.find((p) => p.id === selectedPresetId) || dataset.scamPresets[0];

  // 5-Step Timeline for Account Freeze (Ravi Kumar Case)
  const raviSteps = [
    {
      step: 1,
      time: '09:05:22 IST',
      title: 'Phishing SMS Ingress',
      desc: 'SMS received: "URGENT: Your Savings Account •••• 8492 will be frozen today due to KYC non-compliance. Call 080-4928-1100 to prevent seizure."',
      icon: <Smartphone className="w-4 h-4 text-blue-500" />,
      telemetry: { dev: 'Normal', ben: 'None', score: 10, action: 'APPROVE' },
    },
    {
      step: 2,
      time: '09:10:14 IST',
      title: 'New Device Registration',
      desc: 'Caller instructs customer to enroll secondary device or proxy link under urgency. First-seen Android device logged in Pune perimeter.',
      icon: <UserX className="w-4 h-4 text-amber-500" />,
      telemetry: { dev: 'New Device (Android 14)', ben: 'None', score: 48, action: 'STEP_UP_VERIFY' },
    },
    {
      step: 3,
      time: '09:12:30 IST',
      title: 'Mule Beneficiary Enrolled',
      desc: 'Customer adds quickpay.help@upi as a "Reserve Bank Temporary Vault Payee". Beneficiary age is 0 days, linked to known syndicate ring.',
      icon: <CreditCard className="w-4 h-4 text-rose-500" />,
      telemetry: { dev: 'New Device', ben: 'quickpay.help@upi (0d)', score: 76, action: 'DELAY_AND_WARN' },
    },
    {
      step: 4,
      time: '09:14:10 IST',
      title: 'Coercive Active Call & Context Flags',
      desc: 'Active 18-minute cellular call detected. In-app scam questionnaire records reported freeze threats and official police/bank impersonation.',
      icon: <PhoneCall className="w-4 h-4 text-rose-600" />,
      telemetry: { dev: 'Active Coercion Call', ben: 'Flagged Mule Link', score: 89, action: 'PAUSE_AND_VERIFY' },
    },
    {
      step: 5,
      time: '09:15:00 IST',
      title: 'Pre-Dispatch Interception',
      desc: 'Customer submits ₹75,000 transfer (37.5x typical baseline). TRUSTSHIELD deterministic engine computes 97/100 and engages P-CRITICAL-04.',
      icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
      telemetry: { dev: 'Spike 37.5x Baseline', ben: 'Syndicate Hop 1', score: 97, action: 'PAUSE_AND_VERIFY' },
    },
  ];

  // Auto-play stepper
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= 5) {
            setIsPlaying(false);
            return 5;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const activeStepData = raviSteps[currentStep - 1] || raviSteps[4];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
            <Terminal className="w-4 h-4" />
            <span>Adversarial Manipulation Lab & Scenario Replayer</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Red-Team Social-Engineering Simulator</h1>
          <p className="text-xs text-slate-400 mt-1">
            Test policy bands and counterfactual interventions against synthetic adversary campaigns.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Scenario:</label>
          <select
            value={selectedPresetId}
            onChange={(e) => {
              setSelectedPresetId(e.target.value);
              setCurrentStep(5);
              setIsPlaying(false);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 cursor-pointer"
          >
            {dataset.scamPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} (₹{(preset?.simulatedAmountInr ?? 0).toLocaleString('en-IN')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Interactive Replay & Engine Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 5-Step Event Replay (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Deterministic 5-Step Timeline Replayer
                </h3>
                <p className="text-xs text-slate-500">
                  Step through Ravi Kumar's case from initial phishing bait to safety interception
                </p>
              </div>

              {/* Player Controls */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded shadow-2xs cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play scenario'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
                  disabled={currentStep >= 5}
                  className="p-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 rounded shadow-2xs cursor-pointer"
                  title="Step forward"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setIsPlaying(false);
                  }}
                  className="p-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded shadow-2xs cursor-pointer"
                  title="Reset to step 1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stepper Dots */}
            <div className="grid grid-cols-5 gap-2 my-4">
              {raviSteps.map((step) => (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => setCurrentStep(step.step)}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    currentStep === step.step
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                      : currentStep > step.step
                      ? 'border-slate-300 bg-slate-50 text-slate-700'
                      : 'border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold block">Step {step.step}</span>
                  <span className="text-[11px] font-medium truncate block">{step.time.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Current Step Detailed Card */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    {activeStepData.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Step {activeStepData.step}: {activeStepData.title}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">{activeStepData.time}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Computed Risk</span>
                  <span className={`font-mono text-lg font-bold ${
                    activeStepData.telemetry.score >= 80 ? 'text-rose-600' : 'text-slate-900'
                  }`}>
                    {activeStepData.telemetry.score}/100
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/70">
                {activeStepData.desc}
              </p>

              {/* Real-time Telemetry Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[9px]">Device:</span>
                  <span className="text-slate-800 font-medium truncate block">{activeStepData.telemetry.dev}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[9px]">Beneficiary:</span>
                  <span className="text-slate-800 font-medium truncate block">{activeStepData.telemetry.ben}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[9px]">Active Policy:</span>
                  <span className="text-blue-700 font-bold truncate block">{activeStepData.telemetry.action}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[9px]">Friction:</span>
                  <span className="text-rose-700 font-bold truncate block">
                    {activeStepData.telemetry.score >= 80 ? 'CRITICAL PAUSE' : 'PROGRESSIVE'}
                  </span>
                </div>
              </div>

              {/* Direct Link to Security Command Inspection */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-blue-50/90 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-blue-950">
                  <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Linked Flagship Case: <strong>CASE-2026-0915</strong> (₹75,000 Intercepted via Policy P-CRITICAL-04).
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="btn-redteam-inspect-ravi"
                    type="button"
                    onClick={() => {
                      if (onOpenCase) {
                        onOpenCase('CASE-2026-0915');
                      } else if (onViewChange) {
                        onViewChange('ANALYST');
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Open this case directly in the Security Command Center"
                  >
                    <span>Inspect in Security Command</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Active Preset & Manipulation Cues (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Scenario Profile
              </span>
              <h3 className="font-bold text-slate-900 text-base mt-2">{activePreset.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{activePreset.description}</p>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Target Vector:</span>
                <span className="font-semibold text-slate-800">{activePreset.label}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Beneficiary VPA:</span>
                <span className="font-mono text-slate-800">{activePreset.attackerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Simulated Attempt:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{(activePreset?.simulatedAmountInr ?? 0).toLocaleString('en-IN')} ({activePreset?.channel || 'UPI'})
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Intervention Policy:</span>
                <span className="font-mono font-bold text-blue-700">{activePreset.expectedFriction}</span>
              </div>
            </div>

            {/* Injected Manipulation Cues */}
            <div>
              <h4 className="font-semibold text-xs text-slate-800 uppercase tracking-wider mb-2">
                Simulated Manipulation Indicators
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {activePreset.simulatedCues.map((cue) => (
                  <span
                    key={cue}
                    className="text-xs font-mono px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-medium"
                  >
                    {cue}
                  </span>
                ))}
              </div>
            </div>

            {/* Safety Guarantee */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Synthetic Isolation Guarantee</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  This test suite executes in local memory against deterministic models without reaching external bank infrastructure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
