import { ScamLabel } from '../types/domain.ts';

export interface ClassificationResult {
  label: ScamLabel;
  confidence: number;
  matchedCues: string[];
  explanation: string;
  disclaimer: string;
}

interface PatternRule {
  label: ScamLabel;
  keywords: string[];
  weight: number;
  description: string;
}

const RULES: PatternRule[] = [
  {
    label: 'ACCOUNT_FREEZE_SCAM',
    keywords: ['freeze', 'blocked', 'suspend', 'kyc pending', 'bank manager', 'rbi notice', 'police alert', 'immediately transfer', 'safe account'],
    weight: 1.0,
    description: 'Threat of imminent bank account freeze or suspension unless funds transferred to a temporary safe vault.',
  },
  {
    label: 'DIGITAL_ARREST',
    keywords: ['digital arrest', 'cbi', 'customs', 'narcotics', 'parcel seized', 'skype call', 'stay on call', 'warrant', 'money laundering'],
    weight: 1.2,
    description: 'Impersonation of law enforcement/customs placing victim under simulated digital arrest to extort clearance funds.',
  },
  {
    label: 'KYC_SCAM',
    keywords: ['kyc update', 'pan link', 'aadhaar verification', 'sim expire', 'telecom block', 'apk', 'quick support'],
    weight: 0.9,
    description: 'Phishing under pretext of urgent KYC or SIM update requiring installation of malicious helper app.',
  },
  {
    label: 'FAKE_INVESTMENT',
    keywords: ['guaranteed return', 'telegram vip', 'crypto task', 'part time job', 'youtube like', 'double money', 'profit withdrawal'],
    weight: 1.0,
    description: 'Task-based or Ponzi investment scam promising hyper-returns on initial deposits.',
  },
  {
    label: 'QR_SCAM',
    keywords: ['scan qr to receive', 'pin to receive', 'olx buyer', 'army officer', 'advance token', 'qr code payment'],
    weight: 0.95,
    description: 'Manipulation tricking the victim into entering their UPI PIN under the false pretext of receiving money.',
  },
  {
    label: 'FAKE_SUPPORT',
    keywords: ['refund support', 'customer care', 'anydesk', 'teamviewer', 'rustdesk', 'toll free', 'reversal request'],
    weight: 1.1,
    description: 'Fraudulent support desk prompting victim to install remote desktop access software.',
  },
  {
    label: 'ACCOUNT_TAKEOVER',
    keywords: ['otp share', 'forward sms', 'sim swap', 'new device login', 'unauthorized device', 'credential reset'],
    weight: 1.1,
    description: 'Credential compromise leading to unauthorized device access and session hijacking.',
  },
];

/**
 * Deterministic, rule-grounded social engineering classifier.
 * Never claims to be an unexplainable black-box neural net.
 * Directly grounded in user responses and explicit text cues.
 */
export function classifyManipulationText(
  text: string,
  questionResponses?: Record<string, boolean | 'UNSURE'>
): ClassificationResult {
  const normalized = (text || '').toLowerCase();
  const matchedRules: Array<{ label: ScamLabel; matched: string[]; score: number; description: string }> = [];

  for (const rule of RULES) {
    const hits: string[] = [];
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        hits.push(kw);
      }
    }

    if (hits.length > 0) {
      const score = Math.min(1.0, (hits.length * 0.35 + 0.3) * rule.weight);
      matchedRules.push({
        label: rule.label,
        matched: hits,
        score,
        description: rule.description,
      });
    }
  }

  // Factor in explicit question responses
  if (questionResponses) {
    if (questionResponses['account_freeze'] === true || questionResponses['pressure'] === true) {
      const existing = matchedRules.find((r) => r.label === 'ACCOUNT_FREEZE_SCAM');
      if (existing) {
        existing.score = Math.min(0.98, existing.score + 0.3);
        existing.matched.push('confirmed urgency & freeze threat responses');
      } else {
        matchedRules.push({
          label: 'ACCOUNT_FREEZE_SCAM',
          matched: ['confirmed urgency & freeze threat responses'],
          score: 0.85,
          description: 'High-confidence coercion using urgent threats of account freeze.',
        });
      }
    }

    if (questionResponses['unknown_app'] === true) {
      const existing = matchedRules.find((r) => r.label === 'FAKE_SUPPORT');
      if (existing) {
        existing.score = Math.min(0.95, existing.score + 0.25);
        existing.matched.push('confirmed remote app installation');
      } else {
        matchedRules.push({
          label: 'FAKE_SUPPORT',
          matched: ['confirmed remote app installation'],
          score: 0.82,
          description: 'Remote access application installed under fraudulent guidance.',
        });
      }
    }

    if (questionResponses['promise_reward'] === true) {
      const existing = matchedRules.find((r) => r.label === 'FAKE_INVESTMENT');
      if (existing) {
        existing.score = Math.min(0.95, existing.score + 0.25);
        existing.matched.push('confirmed guaranteed profit/reward offer');
      } else {
        matchedRules.push({
          label: 'FAKE_INVESTMENT',
          matched: ['confirmed guaranteed profit/reward offer'],
          score: 0.80,
          description: 'High-return investment inducement.',
        });
      }
    }
  }

  if (matchedRules.length === 0) {
    return {
      label: 'NONE',
      confidence: 0,
      matchedCues: [],
      explanation: 'No known social-engineering manipulation cues detected in entered context.',
      disclaimer: 'Deterministic syntactic rule matcher. Does not make financial decisions.',
    };
  }

  matchedRules.sort((a, b) => b.score - a.score);
  const best = matchedRules[0];

  return {
    label: best.label,
    confidence: Number(Math.min(0.99, best.score).toFixed(2)),
    matchedCues: best.matched,
    explanation: best.description,
    disclaimer: 'Deterministic rule classifier for simulated demonstration purposes only.',
  };
}
