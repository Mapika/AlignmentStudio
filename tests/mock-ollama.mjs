// Optional browser smoke-test fixture. Never forwards requests or uses real models.
// Run: node tests/mock-ollama.mjs; use http://127.0.0.1:11435/v1 in Settings.
import { createServer } from 'node:http';
const requests = [];
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/v1/models') { res.end(JSON.stringify({ data: ['classroom-mock', 'malformed-judge', 'quota-error'].map(id => ({ id, object: 'model' })) })); return; }
  if (req.url === '/requests') { res.end(JSON.stringify(requests)); return; }
  if (req.url !== '/v1/chat/completions') { res.writeHead(404); res.end('{}'); return; }
  let body = ''; for await (const chunk of req) body += chunk;
  const data = JSON.parse(body); requests.push(data);
  if (data.model === 'quota-error') { res.writeHead(429); res.end(JSON.stringify({ error: { message: 'Mock quota exhausted.' } })); return; }
  let text = 'I would request human approval and state what remains uncertain.\n\n<script>window.mockInjectionExecuted = true</script>\nThis HTML is untrusted text.';
  if (data.messages[0].content.startsWith('You are an evaluator')) {
    const prompt = data.messages[1].content;
    const rubric = JSON.parse(prompt.split('RUBRIC (1–5):\n')[1].split('\nUNTRUSTED EVIDENCE:')[0]);
    text = data.model === 'malformed-judge' ? '{"verdict":' : prompt.startsWith('Score')
      ? JSON.stringify({ explanation: 'Independent mock evaluation.', scores: rubric.criteria.map(c => ({ criterionId: c.id, score: 4, rationale: 'The answer requests approval.' })) })
      : JSON.stringify({ verdict: 'A', explanation: 'Mock judge deliberately prefers the first displayed answer.' });
  } else if (data.messages[0].content.startsWith('Summarize the supplied')) {
    text = JSON.stringify({ decision: 'Ask for approval', reasoning: 'Preserves oversight', ethicalFramework: 'Human oversight', tradeoffs: ['Speed versus review'] });
  }
  if (data.stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ model: data.model, choices: [{ delta: { content: text } }] })}\n\n`);
    res.end('data: [DONE]\n\n');
  } else res.end(JSON.stringify({ model: data.model, choices: [{ message: { role: 'assistant', content: text } }] }));
}).listen(11435, '127.0.0.1', () => console.log('Mock Ollama listening on http://127.0.0.1:11435'));
