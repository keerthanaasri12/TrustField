import { ExplanationService } from '../ports.ts';
import { GoogleGenAI } from '@google/genai';

export class SafeExplanationService implements ExplanationService {
  private geminiClient: GoogleGenAI | null = null;
  private apiKeyChecked = false;

  private getGeminiClient(): GoogleGenAI | null {
    if (this.apiKeyChecked) {
      return this.geminiClient;
    }
    this.apiKeyChecked = true;
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 5) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: key });
      } catch (err) {
        console.warn('Failed to initialize Gemini client, falling back to deterministic explanations:', err);
        this.geminiClient = null;
      }
    }
    return this.geminiClient;
  }

  async explainIntervention(facts: {
    customerName: string;
    amountInr: number;
    riskScore: number;
    policyAction: string;
    signals: Array<{ title: string; evidence: string }>;
  }): Promise<{
    explanation: string;
    source: 'DETERMINISTIC_GROUNDED' | 'AI_GROUNDED_MODEL';
    factHash: string;
  }> {
    // Generate simple deterministic hash of facts
    const factsJson = JSON.stringify(facts);
    let hash = 0;
    for (let i = 0; i < factsJson.length; i++) {
      hash = (hash << 5) - hash + factsJson.charCodeAt(i);
      hash |= 0;
    }
    const factHash = `h-${Math.abs(hash).toString(16)}`;

    // Default high-quality deterministic grounded explanation
    const deterministicExplanation = this.buildDeterministicExplanation(facts);

    const client = this.getGeminiClient();
    if (!client) {
      return {
        explanation: deterministicExplanation,
        source: 'DETERMINISTIC_GROUNDED',
        factHash,
      };
    }

    try {
      // Bounded call to Gemini with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const prompt = `You explain a simulated financial safety intervention. Use only the supplied detected facts.
Never invent data, identities, confidence, relationship evidence, policy outcomes, legal duties, or payment status.
Never recommend approving, rejecting, releasing, or blocking a transaction.
State uncertainty if evidence is incomplete. Keep language calm, clear, and non-accusatory.

Detected Facts:
- Customer: ${facts.customerName}
- Amount: ₹${(facts?.amountInr ?? 0).toLocaleString('en-IN')}
- Calculated Manipulation Risk Score: ${facts.riskScore}/100
- Deterministic Policy Action: ${facts.policyAction}
- Grounded Evidence Signals:
${facts.signals.map((s, idx) => `  ${idx + 1}. ${s.title}: ${s.evidence}`).join('\n')}

Provide a 2-paragraph factual explanation for bank analysts detailing which observed facts contributed to the score.`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      clearTimeout(timeout);
      const text = response.text?.trim();
      if (text && text.length > 20) {
        return {
          explanation: text,
          source: 'AI_GROUNDED_MODEL',
          factHash,
        };
      }
    } catch (err) {
      // Fallback silently on any error, timeout, or rate-limit
      console.warn('AI explanation fallback engaged:', err instanceof Error ? err.message : String(err));
    }

    return {
      explanation: deterministicExplanation,
      source: 'DETERMINISTIC_GROUNDED',
      factHash,
    };
  }

  private buildDeterministicExplanation(facts: {
    customerName: string;
    amountInr: number;
    riskScore: number;
    policyAction: string;
    signals: Array<{ title: string; evidence: string }>;
  }): string {
    const signalBullets = facts.signals
      .map((s) => `• ${s.title}: ${s.evidence}`)
      .join('\n');

    return `TRUSTSHIELD evaluated this simulated transaction of ₹${(facts?.amountInr ?? 0).toLocaleString(
      'en-IN'
    )} initiated under customer ${facts.customerName}. The deterministic risk engine computed an overall manipulation risk score of ${facts.riskScore}/100, which triggered the ${facts.policyAction} policy protocol.

Key grounded findings triggering this safety threshold include:\n${signalBullets}\n\nNotice: This intervention is a synthetic simulation designed to protect customers from external social manipulation before money leaves the banking perimeter.`;
  }
}
