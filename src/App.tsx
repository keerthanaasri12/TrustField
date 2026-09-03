import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar.tsx';
import { CustomerPortal } from './components/customer/CustomerPortal.tsx';
import { CommandCenter } from './components/analyst/CommandCenter.tsx';
import { RedTeamLab } from './components/redteam/RedTeamLab.tsx';
import { Role, RiskResult } from './types/domain.ts';
import { generateSyntheticDataset } from './data/synthetic-generator.ts';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function App() {
  const [dataset, setDataset] = useState(() => generateSyntheticDataset());
  const [activeRole, setActiveRole] = useState<Role>('CUSTOMER');
  const [activeView, setActiveView] = useState<'CUSTOMER' | 'ANALYST' | 'RED_TEAM'>('CUSTOMER');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseRequestNonce, setCaseRequestNonce] = useState<number>(0);

  // Customer state
  const [customer, setCustomer] = useState(dataset.customers[0]);

  const handleToggleTrustedContact = (optIn: boolean) => {
    setCustomer((prev) => ({
      ...prev,
      trustedContactOptIn: optIn,
    }));
  };

  const handlePaymentSubmitted = async (payment: {
    recipient: string;
    amountInr: number;
    channel: 'UPI' | 'IMPS' | 'NEFT';
    note: string;
    scamResponses?: Record<string, boolean | 'UNSURE'>;
  }): Promise<{
    caseId: string;
    riskResult: RiskResult;
    isPaused: boolean;
    lossPreventedInr: number;
  }> => {
    const idempotencyKey = `idemp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await fetch('/api/v1/payments/simulate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': activeRole,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        customerId: customer.id,
        recipient: payment.recipient,
        amountInr: payment.amountInr,
        channel: payment.channel,
        note: payment.note,
        scamResponses: payment.scamResponses,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Payment simulation failed');
    }

    const data = await res.json();
    return data;
  };

  const handleOpenCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCaseRequestNonce(Date.now());
    setActiveView('ANALYST');
    setActiveRole('ANALYST');
  };

  const handleLoadRaviCase = () => {
    setSelectedCaseId('CASE-2026-0915');
    setCaseRequestNonce(Date.now());
    setActiveView('ANALYST');
    setActiveRole('ANALYST');
  };

  const handleViewChange = (view: 'CUSTOMER' | 'ANALYST' | 'RED_TEAM') => {
    setActiveView(view);
    if (view === 'CUSTOMER') {
      setActiveRole('CUSTOMER');
    } else if (view === 'ANALYST') {
      setActiveRole('ANALYST');
    } else if (view === 'RED_TEAM') {
      setActiveRole('ADMIN');
    }
  };

  const handleResetDemo = async () => {
    try {
      await fetch('/api/v1/simulator/reset', { method: 'POST' });
      const fresh = generateSyntheticDataset();
      setDataset(fresh);
      setCustomer(fresh.customers[0]);
      setSelectedCaseId(null);
      setCaseRequestNonce(0);
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      <Navbar
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        activeView={activeView}
        onViewChange={handleViewChange}
        onLoadRaviCase={handleLoadRaviCase}
        onResetDemo={handleResetDemo}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {activeView === 'CUSTOMER' && (
          <CustomerPortal
            customer={customer}
            onPaymentSubmitted={handlePaymentSubmitted}
            onToggleTrustedContact={handleToggleTrustedContact}
            onOpenCase={handleOpenCase}
            onViewChange={handleViewChange}
            onLoadRaviCase={handleLoadRaviCase}
          />
        )}

        {activeView === 'ANALYST' && (
          <CommandCenter
            onOpenCase={handleOpenCase}
            selectedCaseId={selectedCaseId}
            caseRequestNonce={caseRequestNonce}
            onCloseSelectedCase={() => setSelectedCaseId(null)}
            onViewChange={handleViewChange}
            onLoadRaviCase={handleLoadRaviCase}
          />
        )}

        {activeView === 'RED_TEAM' && (
          <RedTeamLab
            onOpenCase={handleOpenCase}
            onViewChange={handleViewChange}
          />
        )}
      </main>

      {/* Trust & Safety Synthetic Disclaimer Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">
              TRUSTSHIELD AI — Synthetic Prototype for Customer Social Engineering & Manipulation Detection
            </p>
            <p className="text-[11px] text-slate-500">
              Strictly synthetic data. No connection to live banking or payment systems. Zero autonomous AI financial decisions.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-300 font-mono">
              Deterministic Engine v2.6.4
            </span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              All Systems Ready
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
