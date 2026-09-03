import React from 'react';
import { ShieldCheck, ShieldAlert, UserCheck, Terminal, RotateCcw, Sparkles } from 'lucide-react';
import { Role } from '../../types/domain.ts';

interface NavbarProps {
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  activeView: 'CUSTOMER' | 'ANALYST' | 'RED_TEAM';
  onViewChange: (view: 'CUSTOMER' | 'ANALYST' | 'RED_TEAM') => void;
  onLoadRaviCase: () => void;
  onResetDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeRole,
  onRoleChange,
  activeView,
  onViewChange,
  onLoadRaviCase,
  onResetDemo,
}) => {
  return (
    <header className="bg-slate-950 text-slate-100 border-b border-slate-800 sticky top-0 z-40">
      {/* Synthetic Demo Notification Banner */}
      <div className="bg-amber-950/80 border-b border-amber-900/60 text-amber-200 px-4 py-1.5 text-xs text-center font-medium flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>
          <strong>SYNTHETIC DEMO ENVIRONMENT:</strong> All accounts, UPI IDs, transactions, and fraud indicators are simulated. Zero real funds or bank integrations.
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 min-h-16 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Differentiator */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={() => {
            onViewChange('CUSTOMER');
            onRoleChange('CUSTOMER');
          }}
          title="Return to Customer Portal"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30 shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white">TRUSTSHIELD</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                AI MVP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Customer Manipulation Pre-Dispatch Defense</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav aria-label="Main Navigation" className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            id="nav-tab-customer"
            type="button"
            onClick={() => {
              onViewChange('CUSTOMER');
              onRoleChange('CUSTOMER');
            }}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'CUSTOMER'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Customer Portal</span>
            <span className="sm:hidden">Portal</span>
          </button>

          <button
            id="nav-tab-security-command"
            type="button"
            onClick={() => {
              onViewChange('ANALYST');
              onRoleChange('ANALYST');
            }}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'ANALYST'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Security Command</span>
            <span className="sm:hidden">Security</span>
          </button>

          <button
            id="nav-tab-red-team"
            type="button"
            onClick={() => {
              onViewChange('RED_TEAM');
              onRoleChange('ADMIN');
            }}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'RED_TEAM'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Red-Team Lab</span>
            <span className="sm:hidden">Red-Team</span>
          </button>
        </nav>

        {/* Action Controls: Load Ravi Story & Reset */}
        <div className="flex items-center gap-2">
          <button
            id="nav-btn-load-ravi"
            type="button"
            onClick={onLoadRaviCase}
            title="Load the standard Ravi Kumar account-freeze case"
            className="px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 hover:text-blue-100 border border-blue-800 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Load Ravi Case</span>
          </button>

          <button
            id="nav-btn-reset-demo"
            type="button"
            onClick={onResetDemo}
            title="Reset seeded synthetic state"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
