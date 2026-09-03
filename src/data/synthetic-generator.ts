import {
  CaseRecord,
  NetworkGraph,
  ScamLabel,
  AnalyticsSummary,
} from '../types/domain.ts';
import { RAVI_KUMAR_RISK_INPUT } from '../risk-engine/fixtures/ravi-fixture.ts';
import { evaluateRisk } from '../risk-engine/engine.ts';

export const DEMO_SEED = 'trustshield-2026';

/**
 * Deterministic PRNG (Mulberry32) initialized from seed string
 */
function createPrng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export interface SyntheticCustomer {
  id: string;
  name: string;
  accountNumberMasked: string;
  balanceInr: number;
  city: string;
  phoneMasked: string;
  deviceFingerprint: string;
  riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'DIGITALLY_FRAGILE';
  trustedContactOptIn: boolean;
  trustedContactName?: string;
  trustedContactPhoneMasked?: string;
  trustedContactRelationship?: string;
  recentTransactions: Array<{
    id: string;
    recipient: string;
    amountInr: number;
    category: string;
    channel: 'UPI' | 'IMPS' | 'NEFT';
    timestamp: string;
    status: 'COMPLETED' | 'PAUSED';
  }>;
}

export interface ScamPreset {
  id: string;
  label: ScamLabel;
  name: string;
  description: string;
  simulatedAmountInr: number;
  attackerName: string;
  channel: 'UPI' | 'IMPS';
  simulatedCues: string[];
  expectedFriction: string;
  demoScript: string;
  events: Array<{ step: number; title: string; detail: string; timestamp: string; actor: string }>;
}

export const SCAM_PRESETS: ScamPreset[] = [
  {
    id: 'preset-freeze',
    label: 'ACCOUNT_FREEZE_SCAM',
    name: 'Account Freeze & Fake Bank Officer (Ravi Case)',
    description: 'Impersonation of a bank supervisor claiming an imminent RBI account freeze, directing transfer to a "secure temporary escrow".',
    simulatedAmountInr: 75000,
    attackerName: 'quickpay.help@upi',
    channel: 'UPI',
    simulatedCues: [
      'Caller claimed to be Senior Bank Vigilance Officer',
      'Threatened account suspension within 15 minutes',
      'Demanded fund transfer to "safe clearing vault"',
    ],
    expectedFriction: 'PAUSE_AND_VERIFY (97/100) -> ₹75,000 Saved',
    demoScript: 'Walk the judge through Ravi Kumar’s attempted ₹75,000 transfer on a newly paired Android phone.',
    events: [
      { step: 1, title: 'Unfamiliar Device Registered', detail: 'Android 14 device enrolled from unfamiliar ISP in Pune at 09:10', timestamp: '09:10:14', actor: 'Device Subsystem' },
      { step: 2, title: 'Rapid Beneficiary Addition', detail: 'quickpay.help@upi registered as beneficiary without cooling window at 09:12', timestamp: '09:12:05', actor: 'Customer / Manipulator' },
      { step: 3, title: 'Payment Initiation (37.5x Baseline)', detail: 'High-value ₹75,000 UPI transfer triggered at 09:15', timestamp: '09:15:20', actor: 'Customer' },
      { step: 4, title: 'Manipulation Cues Confirmed', detail: 'Urgent freeze threat & official impersonation detected via context check', timestamp: '09:15:35', actor: 'Risk Engine' },
      { step: 5, title: 'Autonomous Intervention: PAUSE', detail: 'Score 97/100. P-CRITICAL-04 triggered. ₹75,000 dispatch paused.', timestamp: '09:15:42', actor: 'Policy Engine' },
    ],
  },
  {
    id: 'preset-digital-arrest',
    label: 'DIGITAL_ARREST',
    name: 'Digital Arrest / Police Impersonation',
    description: 'Fraudsters impersonate CBI / Customs officials over video, holding the victim under "virtual custody" to extort verification deposits.',
    simulatedAmountInr: 120000,
    attackerName: 'customs.clearance.audit@upi',
    channel: 'IMPS',
    simulatedCues: [
      'Victim kept on Skype video call for 4 hours',
      'Fake arrest warrant shown on screen',
      'Demanded refundable audit deposit',
    ],
    expectedFriction: 'PAUSE_AND_VERIFY (94/100)',
    demoScript: 'Simulate high-stress video coercion with fake badge credentials.',
    events: [
      { step: 1, title: 'VoIP Call Connection', detail: 'Long duration unknown VoIP session active', timestamp: '08:00:00', actor: 'Network' },
      { step: 2, title: 'Coercive Threat Delivery', detail: 'Fake customs arrest warrant served via messaging app', timestamp: '08:45:00', actor: 'Impersonator' },
      { step: 3, title: 'Beneficiary Override', detail: 'High-risk audit account added', timestamp: '09:05:00', actor: 'Customer' },
      { step: 4, title: '₹1.2L Transfer Attempt', detail: 'Exceeds normal monthly savings baseline', timestamp: '09:18:00', actor: 'Customer' },
      { step: 5, title: 'Protective Freeze', detail: 'Policy triggers immediate hold and trusted contact alert', timestamp: '09:18:20', actor: 'Policy Engine' },
    ],
  },
  {
    id: 'preset-fake-invest',
    label: 'FAKE_INVESTMENT',
    name: 'Telegram Part-Time Task / VIP Investment',
    description: 'Victim tricked into paying tiered "recharge tasks" with promises of guaranteed 40% daily profit.',
    simulatedAmountInr: 45000,
    attackerName: 'vip.wealthgrow@upi',
    channel: 'UPI',
    simulatedCues: [
      'Joined Telegram group with fake earning screenshots',
      'Small initial ₹500 test returned ₹700',
      'Now pressured to deposit ₹45,000 VIP tier',
    ],
    expectedFriction: 'VERIFY_AND_DELAY (78/100)',
    demoScript: 'Demonstrate incremental entrapment and velocity spike.',
    events: [
      { step: 1, title: 'Micro-payment Test', detail: 'Initial ₹500 deposit rewarded with fake ₹200 bonus', timestamp: 'Yesterday', actor: 'Attacker' },
      { step: 2, title: 'VIP Upsell Pressure', detail: 'Victim told funds will lock unless next tier fulfilled', timestamp: '10:00:00', actor: 'Telegram Bot' },
      { step: 3, title: 'High Velocity Attempt', detail: '₹45,000 transfer queued to flagged merchant node', timestamp: '10:30:00', actor: 'Customer' },
      { step: 4, title: 'Mule Exposure Match', detail: 'Payee linked to known crypto-arbitrage mule node', timestamp: '10:30:15', actor: 'Graph Engine' },
      { step: 5, title: 'Cooling-Off Delay', detail: '15-minute delay applied with task scam advisory', timestamp: '10:30:20', actor: 'Policy Engine' },
    ],
  },
  {
    id: 'preset-kyc',
    label: 'KYC_SCAM',
    name: 'Urgent SIM / Bank KYC Expiration',
    description: 'SMS alert warning customer their SIM will be blocked within 2 hours unless ₹10 reactivation fee is paid via APK.',
    simulatedAmountInr: 25000,
    attackerName: 'telecom.kyc.portal@upi',
    channel: 'UPI',
    simulatedCues: ['SMS threatened SIM deactivation', 'Instructed to download QuickSupport APK'],
    expectedFriction: 'PAUSE_AND_VERIFY (89/100)',
    demoScript: 'Demonstrate SMS phishing combined with malicious remote app overlay.',
    events: [
      { step: 1, title: 'Smishing Delivery', detail: 'Urgent KYC SMS received with link', timestamp: '09:00:00', actor: 'Smishing Gateway' },
      { step: 2, title: 'Sideloaded APK', detail: 'Remote management tool installed via sideload', timestamp: '09:12:00', actor: 'Device' },
      { step: 3, title: 'Unusual Session', detail: 'Simultaneous background overlay active', timestamp: '09:20:00', actor: 'OS Context' },
      { step: 4, title: 'Transfer Initiated', detail: '₹25,000 routed to unfamiliar recipient', timestamp: '09:22:00', actor: 'Remote Access' },
      { step: 5, title: 'Hard Override Activated', detail: 'P-OVERRIDE-ATO enforced due to remote overlay', timestamp: '09:22:15', actor: 'Policy Engine' },
    ],
  },
  {
    id: 'preset-qr',
    label: 'QR_SCAM',
    name: 'OLX Buyer "Scan QR to Receive Money"',
    description: 'Buyer pretends to send money for used item by sending a QR code, tricking seller into entering PIN.',
    simulatedAmountInr: 15000,
    attackerName: 'olx.verified.merchant@upi',
    channel: 'UPI',
    simulatedCues: ['Buyer claimed UPI PIN is required to receive funds', 'Sent dynamic collect request QR code'],
    expectedFriction: 'WARN_AND_CONFIRM (52/100)',
    demoScript: 'Show classic collect request reversal education dialog.',
    events: [
      { step: 1, title: 'Marketplace Chat', detail: 'Buyer agrees to purchase furniture without negotiation', timestamp: '11:00:00', actor: 'OLX User' },
      { step: 2, title: 'QR Code Shared', detail: 'Send QR code marked "RBI Approved Receive Payment"', timestamp: '11:05:00', actor: 'Attacker' },
      { step: 3, title: 'Collect Request Received', detail: 'Customer scans QR requesting ₹15,000 debit', timestamp: '11:06:00', actor: 'Payment Gateway' },
      { step: 4, title: 'Inverted Flow Warning', detail: 'Engine detects debit request disguised as credit', timestamp: '11:06:05', actor: 'Risk Engine' },
      { step: 5, title: 'Cautionary Interstitial', detail: 'Clear warning: UPI PIN is ONLY entered to SEND money', timestamp: '11:06:10', actor: 'UI Layer' },
    ],
  },
  {
    id: 'preset-support',
    label: 'FAKE_SUPPORT',
    name: 'Search Engine Imposter Customer Care',
    description: 'Victim dialed a sponsored Google ad phone number for airline or courier refund and was guided to install AnyDesk.',
    simulatedAmountInr: 38000,
    attackerName: 'airhelp.refunds@upi',
    channel: 'UPI',
    simulatedCues: ['Found toll-free number on search engine', 'Agent asked victim to install AnyDesk for verification'],
    expectedFriction: 'PAUSE_AND_VERIFY (91/100)',
    demoScript: 'Demonstrate search ad spoofing coupled with desktop screen mirroring.',
    events: [
      { step: 1, title: 'Call to Spoofed Number', detail: 'Victim connects to fake airline support agent', timestamp: '14:00:00', actor: 'Caller' },
      { step: 2, title: 'Remote Tool Prompt', detail: 'Agent commands customer to install screen sharing', timestamp: '14:08:00', actor: 'Attacker' },
      { step: 3, title: 'Session Anomaly', detail: 'Active screen cast during banking payment flow', timestamp: '14:14:00', actor: 'Device Telemetry' },
      { step: 4, title: '₹38,000 Reversal Scam', detail: 'Agent asks customer to test reversal with ₹38,000', timestamp: '14:15:00', actor: 'Attacker' },
      { step: 5, title: 'Protective Block', detail: 'Manipulative screen sharing detected. Transaction paused.', timestamp: '14:15:10', actor: 'Policy Engine' },
    ],
  },
  {
    id: 'preset-ato',
    label: 'ACCOUNT_TAKEOVER',
    name: 'Credential Harvesting & Session Hijacking',
    description: 'Attacker logs in from a clean emulator using phished netbanking credentials and triggers immediate drain.',
    simulatedAmountInr: 85000,
    attackerName: 'crypto.gateway.settle@upi',
    channel: 'IMPS',
    simulatedCues: ['Login from completely new device', 'Immediate password and profile change', 'No prior baseline history'],
    expectedFriction: 'PAUSE_AND_VERIFY (96/100)',
    demoScript: 'Simulate high-privilege account takeover with device mismatch.',
    events: [
      { step: 1, title: 'Brute Force / Phished Token', detail: 'Session established from datacenter IP in Netherlands', timestamp: '03:10:00', actor: 'Adversary' },
      { step: 2, title: 'Password Reset', detail: 'Self-service credential update performed', timestamp: '03:12:00', actor: 'Adversary' },
      { step: 3, title: 'Mule Addition', detail: 'Unverified crypto off-ramp payee registered', timestamp: '03:14:00', actor: 'Adversary' },
      { step: 4, title: 'Dispatch Attempt', detail: '₹85,000 IMPS dispatch requested at off-peak hours', timestamp: '03:15:00', actor: 'Adversary' },
      { step: 5, title: 'Hard Stop & Lock', detail: 'Session revoked; account frozen for customer protection', timestamp: '03:15:10', actor: 'Policy Engine' },
    ],
  },
];

/**
 * Seeded Generator that guarantees stability for Ravi Kumar and full synthetic population
 */
export function generateSyntheticDataset(seed = DEMO_SEED) {
  const prng = createPrng(seed);

  // 1. Primary Customer: Ravi Kumar (CUS-2948)
  const ravi: SyntheticCustomer = {
    id: 'CUS-2948',
    name: 'Ravi Kumar',
    accountNumberMasked: '•••• •••• 8492',
    balanceInr: 284500, // ₹2.84L balance
    city: 'Pune',
    phoneMasked: '+91 98230 •••••',
    deviceFingerprint: 'dev-pune-pixel-7a-trusted',
    riskProfile: 'CONSERVATIVE',
    trustedContactOptIn: true,
    trustedContactName: 'Sunita Kumar',
    trustedContactPhoneMasked: '+91 98221 •••••',
    trustedContactRelationship: 'Spouse',
    recentTransactions: [
      { id: 'TXN-901', recipient: 'Swiggy Food Delivery', amountInr: 640, category: 'Food & Dining', channel: 'UPI', timestamp: '2026-09-02T19:42:00Z', status: 'COMPLETED' },
      { id: 'TXN-902', recipient: 'Shell Petrol Station Pune', amountInr: 1250, category: 'Fuel & Transport', channel: 'UPI', timestamp: '2026-09-02T08:15:00Z', status: 'COMPLETED' },
      { id: 'TXN-903', recipient: 'D-Mart Supermarket', amountInr: 1890, category: 'Groceries', channel: 'UPI', timestamp: '2026-09-01T17:30:00Z', status: 'COMPLETED' },
      { id: 'TXN-904', recipient: 'Torrent Power Bill', amountInr: 1420, category: 'Utilities', channel: 'NEFT', timestamp: '2026-08-28T10:00:00Z', status: 'COMPLETED' },
      { id: 'TXN-905', recipient: 'Apollo Pharmacy Baner', amountInr: 510, category: 'Healthcare', channel: 'UPI', timestamp: '2026-08-25T11:20:00Z', status: 'COMPLETED' },
    ],
  };

  // 2. Generate 500+ Synthetic Customers
  const indianFirstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Pari', 'Kiara', 'Myra', 'Riya', 'Isha', 'Meera', 'Ramesh', 'Suresh', 'Pooja', 'Deepak', 'Neha', 'Vikram', 'Priya', 'Amit', 'Sunita', 'Rajesh'];
  const indianLastNames = ['Sharma', 'Verma', 'Patel', 'Deshmukh', 'Kulkarni', 'Joshi', 'Mehta', 'Nair', 'Reddy', 'Rao', 'Iyer', 'Chatterjee', 'Banerjee', 'Singh', 'Gupta', 'Choudhury', 'Pillai', 'Shetty', 'Bhat', 'Menon'];
  const cities = ['Pune', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Delhi NCR', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh'];

  const customers: SyntheticCustomer[] = [ravi];
  for (let i = 2; i <= 520; i++) {
    const fn = indianFirstNames[Math.floor(prng() * indianFirstNames.length)];
    const ln = indianLastNames[Math.floor(prng() * indianLastNames.length)];
    const city = cities[Math.floor(prng() * cities.length)];
    const balance = Math.round(15000 + prng() * 650000);
    const hasTrusted = prng() > 0.45;

    customers.push({
      id: `CUS-${1000 + i}`,
      name: `${fn} ${ln}`,
      accountNumberMasked: `•••• •••• ${Math.floor(1000 + prng() * 9000)}`,
      balanceInr: balance,
      city,
      phoneMasked: `+91 9${Math.floor(1000 + prng() * 9000)} •••••`,
      deviceFingerprint: `dev-${city.toLowerCase()}-${i}`,
      riskProfile: prng() > 0.7 ? 'DIGITALLY_FRAGILE' : prng() > 0.4 ? 'MODERATE' : 'CONSERVATIVE',
      trustedContactOptIn: hasTrusted,
      trustedContactName: hasTrusted ? `${indianFirstNames[Math.floor(prng() * indianFirstNames.length)]} ${ln}` : undefined,
      trustedContactPhoneMasked: hasTrusted ? `+91 9${Math.floor(1000 + prng() * 9000)} •••••` : undefined,
      trustedContactRelationship: hasTrusted ? (prng() > 0.5 ? 'Spouse' : 'Child') : undefined,
      recentTransactions: [
        {
          id: `TXN-SYN-${i}-1`,
          recipient: 'Reliance Fresh Groceries',
          amountInr: Math.round(300 + prng() * 1500),
          category: 'Groceries',
          channel: 'UPI',
          timestamp: '2026-09-02T14:00:00Z',
          status: 'COMPLETED',
        },
        {
          id: `TXN-SYN-${i}-2`,
          recipient: 'Indian Oil Fuel Station',
          amountInr: Math.round(500 + prng() * 2000),
          category: 'Fuel',
          channel: 'UPI',
          timestamp: '2026-09-01T09:30:00Z',
          status: 'COMPLETED',
        },
      ],
    });
  }

  // 3. Pre-create the reproducible Ravi Kumar Case
  const raviRiskResult = evaluateRisk(RAVI_KUMAR_RISK_INPUT);
  const raviCase: CaseRecord = {
    id: 'CASE-2026-0915',
    customerId: ravi.id,
    customerName: ravi.name,
    accountNumberMasked: ravi.accountNumberMasked,
    paymentId: 'TXN-RAVI-0915',
    amountInr: 75000,
    recipientId: 'quickpay.help@upi',
    recipientName: 'QuickPay Support Clearance',
    channel: 'UPI',
    status: 'OPEN',
    createdAt: '2026-09-03T09:15:42Z',
    updatedAt: '2026-09-03T09:15:42Z',
    riskResult: raviRiskResult,
    riskInput: RAVI_KUMAR_RISK_INPUT,
    scamLabel: 'ACCOUNT_FREEZE_SCAM',
    manipulationCues: [
      'Caller claimed to be Senior Bank Vigilance Officer',
      'Threatened account suspension within 15 minutes',
      'Demanded fund transfer to "safe clearing vault"',
    ],
    trustedContact: {
      name: 'Sunita Kumar',
      relationship: 'Spouse',
      phoneMasked: '+91 98221 •••••',
      status: 'NOT_REQUESTED',
    },
    lossPreventedInr: 75000,
    assignedAnalyst: 'Unassigned',
    auditEvents: [
      {
        id: 'AUD-001',
        correlationId: 'corr-init-ravi-0915',
        caseId: 'CASE-2026-0915',
        actor: 'TrustShield Risk Engine',
        actorRole: 'ADMIN',
        action: 'PAYMENT_EVALUATED',
        previousState: 'EVALUATING',
        newState: 'PAUSED',
        reasonCode: 'P-CRITICAL-04',
        timestamp: '2026-09-03T09:15:42Z',
        notes: 'Simulated payment of ₹75,000 paused due to critical manipulation risk score 97/100.',
      },
    ],
  };

  // 4. Seeded Cases for Review Queue
  const seededCases: CaseRecord[] = [raviCase];
  const scamCasesConfig = [
    { customer: customers[10], scam: SCAM_PRESETS[1], status: 'OPEN' as const, analyst: 'Priya Sharma' },
    { customer: customers[25], scam: SCAM_PRESETS[2], status: 'IN_REVIEW' as const, analyst: 'Vikram Mehta' },
    { customer: customers[42], scam: SCAM_PRESETS[3], status: 'ESCALATED' as const, analyst: 'Priya Sharma' },
    { customer: customers[58], scam: SCAM_PRESETS[4], status: 'RESOLVED_SAFE' as const, analyst: 'Amit Joshi' },
    { customer: customers[77], scam: SCAM_PRESETS[5], status: 'RESOLVED_SCAM' as const, analyst: 'Vikram Mehta' },
    { customer: customers[93], scam: SCAM_PRESETS[6], status: 'OPEN' as const, analyst: 'Unassigned' },
  ];

  for (let idx = 0; idx < scamCasesConfig.length; idx++) {
    const item = scamCasesConfig[idx];
    const caseId = `CASE-2026-${1000 + idx + 1}`;
    seededCases.push({
      id: caseId,
      customerId: item.customer.id,
      customerName: item.customer.name,
      accountNumberMasked: item.customer.accountNumberMasked,
      paymentId: `TXN-SYN-${item.scam.id}`,
      amountInr: item.scam.simulatedAmountInr,
      recipientId: item.scam.attackerName,
      recipientName: item.scam.name,
      channel: item.scam.channel,
      status: item.status,
      createdAt: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - idx * 1800000).toISOString(),
      riskResult: {
        score: Math.round(75 + prng() * 23),
        band: 'CRITICAL',
        components: [
          { name: 'Behavioral Anomaly', score: 22, max: 25 },
          { name: 'Device & Session Risk', score: 18, max: 20 },
          { name: 'Beneficiary & Network Risk', score: 23, max: 25 },
          { name: 'Manipulation & Scam Context', score: 28, max: 30 },
        ],
        signals: [
          {
            id: 'SIG_UNUSUAL_AMOUNT',
            severity: 'HIGH',
            title: 'High Deviation From Usual Spending',
            evidence: `Amount exceeds 95th percentile baseline`,
            sourceFields: ['transaction.amountInr'],
          },
          {
            id: 'SIG_PRESSURE_FREEZE_CUE',
            severity: 'CRITICAL',
            title: 'Coercive Urgency Signal',
            evidence: 'Customer reported time-critical demands from counterparty',
            sourceFields: ['scamContext.responses.pressure'],
          },
        ],
        policy: {
          action: 'PAUSE_AND_VERIFY',
          reasonCode: 'P-CRITICAL-04',
          requiredSteps: ['Verify with account holder', 'Validate beneficiary identity'],
        },
        counterfactuals: [],
        engineVersion: 'v1.4.0-deterministic',
      },
      riskInput: RAVI_KUMAR_RISK_INPUT,
      scamLabel: item.scam.label,
      manipulationCues: item.scam.simulatedCues,
      trustedContact: {
        name: item.customer.trustedContactName || 'Family Member',
        relationship: item.customer.trustedContactRelationship || 'Spouse',
        phoneMasked: item.customer.trustedContactPhoneMasked || '+91 98000 •••••',
        status: 'NOT_REQUESTED',
      },
      lossPreventedInr: item.scam.simulatedAmountInr,
      assignedAnalyst: item.analyst,
      auditEvents: [
        {
          id: `AUD-${idx + 2}`,
          correlationId: `corr-${caseId}`,
          caseId,
          actor: 'TrustShield Risk Engine',
          actorRole: 'ADMIN',
          action: 'PAYMENT_EVALUATED',
          previousState: 'EVALUATING',
          newState: item.status === 'RESOLVED_SCAM' ? 'RESOLVED_SCAM' : 'OPEN',
          reasonCode: 'P-CRITICAL-04',
          timestamp: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
        },
      ],
    });
  }

  // 5. Build Graph for Ravi Kumar and Mule Cluster
  const graph: NetworkGraph = {
    nodes: [
      { id: 'node-cust-ravi', type: 'Customer', label: 'Ravi Kumar (CUS-2948)', flagged: false, properties: { city: 'Pune', status: 'Active' } },
      { id: 'node-acc-ravi', type: 'Account', label: 'Account •••• 8492', flagged: false, properties: { balance: '₹2.84L' } },
      { id: 'node-dev-known', type: 'Device', label: 'Pixel 7a (Pune)', flagged: false, properties: { trustScore: 'High', location: 'Pune' } },
      { id: 'node-dev-new', type: 'Device', label: 'New Android Device', flagged: true, properties: { firstSeen: '09:10:14', anomaly: '0.45' } },
      { id: 'node-ben-quickpay', type: 'Beneficiary', label: 'quickpay.help@upi', flagged: true, properties: { ageDays: 0, priorFlags: 1 } },
      { id: 'node-mule-cluster', type: 'MuleCluster', label: 'Synthetic Mule Cluster #8', flagged: true, properties: { size: 8, riskLevel: 'Critical' } },
      { id: 'node-mule-m1', type: 'Beneficiary', label: 'fastpay.node1@okhdfc', flagged: true, properties: { flags: 4 } },
      { id: 'node-mule-m2', type: 'Beneficiary', label: 'settlement.safe8@icici', flagged: true, properties: { flags: 6 } },
      { id: 'node-net-ctx', type: 'NetworkContext', label: 'Suspect Pune ISP Cell', flagged: true, properties: { ipRisk: 0.75 } },
    ],
    edges: [
      { id: 'edge-1', source: 'node-cust-ravi', target: 'node-acc-ravi', relationship: 'OWNS', evidence: 'Primary savings account opened in Pune branch' },
      { id: 'edge-2', source: 'node-cust-ravi', target: 'node-dev-known', relationship: 'USES', evidence: 'Registered trusted primary device with 2+ years history' },
      { id: 'edge-3', source: 'node-cust-ravi', target: 'node-dev-new', relationship: 'USES', evidence: 'Device enrolled at 09:10:14 using SMS OTP verification' },
      { id: 'edge-4', source: 'node-dev-new', target: 'node-net-ctx', relationship: 'OBSERVED_FROM', evidence: 'Session initiated via rotating commercial cellular IP' },
      { id: 'edge-5', source: 'node-acc-ravi', target: 'node-ben-quickpay', relationship: 'ADDED_BENEFICIARY', evidence: 'Beneficiary quickpay.help@upi added at 09:12 (3 min before txn)' },
      { id: 'edge-6', source: 'node-acc-ravi', target: 'node-ben-quickpay', relationship: 'SENT_SIMULATED_PAYMENT', evidence: 'Simulated transfer of ₹75,000 initiated at 09:15' },
      { id: 'edge-7', source: 'node-ben-quickpay', target: 'node-mule-cluster', relationship: 'LINKED_TO', evidence: 'Recipient address shares registration phone hash with synthetic mule ring' },
      { id: 'edge-8', source: 'node-mule-cluster', target: 'node-mule-m1', relationship: 'LINKED_TO', evidence: 'Identified fund dispersion node in synthetic syndicate' },
      { id: 'edge-9', source: 'node-mule-cluster', target: 'node-mule-m2', relationship: 'LINKED_TO', evidence: 'Identified crypto cash-out gateway in synthetic syndicate' },
    ],
  };

  // 6. Seeded Analytics Summary
  const analytics: AnalyticsSummary = {
    transactionsMonitored: 12480,
    highRiskFlagged: 412,
    pausedInterventions: 184,
    totalLossPreventedInr: 14250000, // ₹1.42 Crore synthetic loss prevented!
    medianRiskScore: 24,
    activeInvestigations: 28,
    falsePositiveDemoRate: 1.8, // 1.8%
    topScamTypologies: [
      { label: 'ACCOUNT_FREEZE_SCAM', count: 68, preventedInr: 5100000 },
      { label: 'DIGITAL_ARREST', count: 42, preventedInr: 4620000 },
      { label: 'FAKE_SUPPORT', count: 35, preventedInr: 2150000 },
      { label: 'FAKE_INVESTMENT', count: 24, preventedInr: 1480000 },
      { label: 'KYC_SCAM', count: 15, preventedInr: 900000 },
    ],
  };

  return {
    customers,
    raviCustomer: ravi,
    cases: seededCases,
    raviCase,
    graph,
    analytics,
    scamPresets: SCAM_PRESETS,
  };
}
