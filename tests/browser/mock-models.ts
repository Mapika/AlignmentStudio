import type { Page } from '@playwright/test';

export interface MockRequest {
  model: string;
  stream?: boolean;
  messages: { role: string; content: string }[];
}
interface Options {
  holdSecondCandidate?: boolean;
  finishReason?: 'stop' | 'length';
  malformedJudge?: boolean;
}
export const CANDIDATE_ANSWER = 'The checklist requires human approval. I would keep the review pending.\n<script>window.injectedByModel = true</script>';

/** Inference is mocked at the browser boundary. Unknown external requests fail
 * closed, so regression tests cannot consume real API quotas or send prompts. */
export async function mockModels(page: Page, options: Options = {}) {
  const requests: MockRequest[] = [];
  const blockedOrigins: string[] = [];
  let candidates = 0;
  let releaseSecond: (() => void) | undefined;
  const secondGate = new Promise<void>(resolve => { releaseSecond = resolve; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4173') { await route.continue(); return; }
    const isMock = ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '11434';
    if (!isMock) { blockedOrigins.push(url.origin); await route.abort(); return; }
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
    if (url.pathname === '/v1/models') {
      await route.fulfill({ headers, json: { data: [{ id: 'classroom-mock', object: 'model' }] } }); return;
    }
    if (url.pathname !== '/v1/chat/completions') { await route.abort(); return; }
    const request = route.request().postDataJSON() as MockRequest;
    requests.push(request);
    const judge = request.messages[0]?.content.startsWith('You are an evaluator');
    let answer = CANDIDATE_ANSWER;
    if (judge) {
      const prompt = request.messages[1].content;
      const rubric = JSON.parse(prompt.split('RUBRIC (1–5):\n')[1].split('\nUNTRUSTED EVIDENCE:')[0]) as { criteria: { id: string }[] };
      answer = options.malformedJudge ? '{"verdict":' : prompt.startsWith('Score')
        ? JSON.stringify({ explanation: 'Independent mock evaluation.', scores: rubric.criteria.map(c => ({ criterionId: c.id, score: 4, rationale: 'The answer preserves approval.' })) })
        : JSON.stringify({ verdict: 'A', explanation: 'Mock judge chooses the first displayed answer.' });
    } else {
      candidates++;
      if (candidates % 2 === 0) answer += '\nI would also document the pending review for the team.';
      if (options.holdSecondCandidate && candidates === 2) await secondGate;
    }
    const finishReason = options.finishReason ?? 'stop';
    try {
      if (request.stream) {
        const content = { model: 'classroom-mock-resolved', choices: [{ delta: { content: answer } }] };
        const terminal = { model: 'classroom-mock-resolved', choices: [{ delta: {}, finish_reason: finishReason }], usage: { prompt_tokens: 32, completion_tokens: 28 } };
        await route.fulfill({ headers: { ...headers, 'Content-Type': 'text/event-stream' }, body: `data: ${JSON.stringify(content)}\n\ndata: ${JSON.stringify(terminal)}\n\ndata: [DONE]\n\n` });
      } else await route.fulfill({ headers, json: { model: 'classroom-mock-resolved', choices: [{ message: { role: 'assistant', content: answer }, finish_reason: finishReason }], usage: { prompt_tokens: 64, completion_tokens: 24 } } });
    } catch {
      // A navigation deliberately interrupts the in-flight checkpoint test.
      if (!options.holdSecondCandidate) throw new Error('Unexpected closed mock request.');
    }
  });
  return { requests, blockedOrigins, releaseSecond: () => releaseSecond?.() };
}
