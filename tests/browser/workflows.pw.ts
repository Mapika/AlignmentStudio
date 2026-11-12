import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mockModels, CANDIDATE_ANSWER } from './mock-models';

async function openPractice(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'practice-run' }).click();
  await expect(page.getByText('Practice: ready to launch?', { exact: true }).first()).toBeVisible();
}
async function openNotebook(page: Page) {
  await page.getByRole('button', { name: /^Notebook \d/ }).click();
  await expect(page.getByRole('heading', { name: 'Experiment notebook' })).toBeVisible();
}
async function openLiveExperiment(page: Page) {
  await page.goto('/');
  await page.getByLabel('Search scenarios').fill('Untrusted Meeting Notes');
  await page.getByRole('button', { name: 'Open The Untrusted Meeting Notes', exact: true }).click();
  // Classroom scenarios open straight into the experiment; this one compares two prompts on one model.
  await page.getByLabel('Model for both candidates provider', { exact: true }).selectOption('Ollama');
  await page.getByRole('checkbox', { name: /Blind human review/ }).uncheck();
}

test('authored practice needs no key or inference and remains accessible after archiving', async ({ page }) => {
  const mock = await mockModels(page);
  await openPractice(page);
  await expect(page.getByText(/We are not ready to launch under the stated policy/).first()).toBeVisible();
  await page.getByRole('button', { name: 'AlignmentStudio home' }).click();
  await page.getByLabel('Search scenarios').fill('Practice: ready to launch?');
  await page.getByLabel('Scenario actions: Practice: ready to launch?', { exact: true }).click();
  await page.getByRole('button', { name: 'Archive Practice: ready to launch?', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Practice: ready to launch?', exact: true })).toHaveCount(0);
  await openNotebook(page);
  await expect(page.getByRole('heading', { name: 'Practice: ready to launch?' })).toBeVisible();
  await page.getByRole('button', { name: 'Open evidence →' }).click();
  await expect(page.getByText(/We are not ready to launch under the stated policy/).first()).toBeVisible();
  expect(mock.requests).toHaveLength(0);
  expect(mock.blockedOrigins).toEqual([]);
});

test('JSON download and re-import retain evidence and exclude credentials', async ({ page }, testInfo) => {
  const mock = await mockModels(page);
  await page.addInitScript(() => sessionStorage.setItem('alignment-api-keys-session-v1', JSON.stringify({ gemini: 'never-export-this-key' })));
  await openPractice(page);
  await openNotebook(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export JSON/ }).click();
  const download = await downloadPromise;
  const destination = testInfo.outputPath('notebook.json');
  await download.saveAs(destination);
  const text = await readFile(destination, 'utf8');
  const exported = JSON.parse(text);
  expect(exported).toHaveLength(1);
  expect(exported[0].source).toBe('practice');
  expect(text).not.toContain('never-export-this-key');
  await page.getByLabel('Import saved experiments (JSON)').setInputFiles(destination);
  await expect(page.getByText(/Imported 1 experiment/)).toBeVisible();
  await openNotebook(page);
  await expect(page.getByRole('heading', { name: 'Practice: ready to launch?' })).toHaveCount(2);
  expect(mock.requests).toHaveLength(0);
});

test('completed answers survive reloading during the next candidate request', async ({ page }) => {
  const mock = await mockModels(page, { holdSecondCandidate: true });
  await openLiveExperiment(page);
  await page.getByRole('button', { name: /^Generate responses/ }).click();
  await expect.poll(() => mock.requests.filter(request => request.stream).length).toBe(2);
  await expect(page.getByRole('region', { name: 'Candidate A response', exact: true }).getByText(CANDIDATE_ANSWER, { exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  mock.releaseSecond();
  await openNotebook(page);
  // The interrupted run is kept, grouped with the other attempts that did not finish.
  await page.locator('summary').filter({ hasText: /^Did not finish/ }).click();
  await page.getByRole('button', { name: 'Open evidence →' }).click();
  await expect(page.getByRole('region', { name: 'Candidate A response', exact: true }).getByText(CANDIDATE_ANSWER, { exact: true })).toBeVisible();
  await expect(page.getByText(/Interrupted response/)).toBeVisible();
  expect(mock.requests.filter(request => request.stream)).toHaveLength(2);
});

test('narrow screens retain reachable navigation and practice evidence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mock = await mockModels(page);
  await openPractice(page);
  await expect(page.getByText(/We are not ready to launch under the stated policy/).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const notebook = page.getByRole('button', { name: /^Notebook \d/ });
  await notebook.scrollIntoViewIfNeeded();
  const box = await notebook.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await openNotebook(page);
  await expect(page.getByRole('button', { name: 'Open evidence →' })).toBeVisible();
  expect(mock.requests).toHaveLength(0);
});

test('concurrent edits in two tabs recover both versions of the same experiment', async ({ page, context }) => {
  const firstMock = await mockModels(page);
  await openPractice(page);
  const secondPage = await context.newPage();
  const secondMock = await mockModels(secondPage);
  await secondPage.goto('/');
  await openNotebook(secondPage);
  await secondPage.getByRole('button', { name: 'Open evidence →' }).click();
  await expect(secondPage.getByLabel('Reflection', { exact: true })).toBeVisible();
  await Promise.all([
    page.getByLabel('Reflection', { exact: true }).fill('First tab: preserve the human approval boundary.'),
    secondPage.getByLabel('Reflection', { exact: true }).fill('Second tab: investigate misleading completion claims.'),
  ]);
  await expect.poll(async () => page.evaluate(() => Object.entries(localStorage)
    .filter(([key]) => key.startsWith('alignment-experiment-record-v1:'))
    .map(([, value]) => JSON.parse(value).experiment.protocol?.reflection).filter(Boolean).sort())).toEqual([
      'First tab: preserve the human approval boundary.',
      'Second tab: investigate misleading completion claims.',
    ]);
  await page.reload();
  await openNotebook(page);
  await expect(page.getByRole('heading', { name: 'Practice: ready to launch?' })).toHaveCount(2);
  await expect(page.getByText('First tab: preserve the human approval boundary.')).toBeVisible();
  await expect(page.getByText('Second tab: investigate misleading completion claims.')).toBeVisible();
  expect(firstMock.requests.length + secondMock.requests.length).toBe(0);
});

test('repeated balanced judging freezes answers and maps swapped verdicts to original candidates', async ({ page }) => {
  const mock = await mockModels(page);
  await openLiveExperiment(page);
  await page.getByRole('button', { name: /^Generate responses/ }).click();
  await expect(page.getByRole('button', { name: /^Notebook \d/ })).toBeEnabled();
  await expect(page.getByRole('region', { name: 'Candidate A response', exact: true }).getByText(CANDIDATE_ANSWER, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, 'injectedByModel'))).toBeUndefined();
  await page.getByRole('combobox', { name: 'Your preference', exact: true }).selectOption('A');
  await page.getByRole('textbox', { name: 'Your evidence and reasoning', exact: true }).fill('Human-only browser test reasoning.');
  await page.getByRole('button', { name: 'Save my assessment', exact: true }).click();
  await expect(page.getByText('Saved · answers and rubric match')).toBeVisible();
  await page.getByText('Configure and run an evaluation', { exact: true }).click();
  await page.getByLabel('Judge model provider', { exact: true }).selectOption('Ollama');
  await page.getByRole('combobox', { name: 'Judge repeats on the same answers', exact: true }).selectOption('2');
  await page.getByRole('checkbox', { name: /^Balance positions:/ }).check();
  await page.getByRole('button', { name: 'Run judge — 4 requests', exact: true }).click();
  await page.locator('summary').filter({ hasText: /^Evaluation 1 · 4\/4 valid · complete$/ }).click();
  await expect(page.getByText('4 valid / 4 planned requests', { exact: true })).toBeVisible();
  await expect(page.getByText('2 of 2 order pairs changed verdict. Random variation can also cause changes.', { exact: true })).toBeVisible();
  expect(mock.requests.filter(request => request.stream)).toHaveLength(2);
  const judges = mock.requests.filter(request => !request.stream);
  expect(judges).toHaveLength(4);
  const stimuli = judges.map(request => JSON.parse(request.messages[1].content.split('\nUNTRUSTED EVIDENCE:\n')[1]).candidates.map((candidate: { response: string }) => candidate.response));
  expect(stimuli[0][0]).toBe(CANDIDATE_ANSWER);
  expect(stimuli[1]).toEqual([...stimuli[0]].reverse());
  expect(stimuli[2]).toEqual(stimuli[1]);
  expect(stimuli[3]).toEqual(stimuli[0]);
  expect(JSON.stringify(judges)).not.toContain('Human-only browser test reasoning.');
  expect(mock.blockedOrigins).toEqual([]);
});

test('a truncated first answer stops the batch and cannot be judged against a missing answer', async ({ page }) => {
  const mock = await mockModels(page, { finishReason: 'length' });
  await openLiveExperiment(page);
  await page.getByRole('button', { name: /^Generate responses/ }).click();
  await expect(page.getByRole('button', { name: /^Notebook \d/ })).toBeEnabled();
  await page.getByText('Configure and run an evaluation', { exact: true }).click();
  await page.getByLabel('Judge model provider', { exact: true }).selectOption('Ollama');
  const runJudge = page.getByRole('button', { name: 'Run judge — 1 request', exact: true });
  await expect(runJudge).toBeDisabled();
  await expect(page.getByText(/Candidate A was truncated/)).toBeVisible();
  await page.getByRole('switch', { name: 'Advanced options' }).click();
  await page.getByText('Answer variants and advanced options', { exact: true }).click();
  await page.getByRole('checkbox', { name: /^Explicitly include truncated or blocked/ }).check();
  await expect(runJudge).toBeDisabled();
  await expect(page.getByText('Candidate B needs a completed response before judging.', { exact: true }).last()).toBeVisible();
  expect(mock.requests.filter(request => request.stream)).toHaveLength(1);
  expect(mock.requests.filter(request => !request.stream)).toHaveLength(0);
});

test('blind assessment unlocks judging and malformed output is retained without repair requests', async ({ page }) => {
  const mock = await mockModels(page, { malformedJudge: true });
  await openPractice(page);
  await expect(page.getByRole('heading', { name: /Ask an AI judge/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reveal identities & continue', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Your preference', exact: true }).selectOption('Tie');
  await page.getByRole('textbox', { name: 'Your evidence and reasoning', exact: true }).fill('A provisional assessment for the malformed-output exercise.');
  await page.getByRole('button', { name: 'Save my assessment', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal identities & continue', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Identities revealed.' })).toBeVisible();
  await page.getByText('Configure and run an evaluation', { exact: true }).click();
  await page.getByLabel('Judge model provider', { exact: true }).selectOption('Ollama');
  await page.getByRole('button', { name: 'Run judge — 1 request', exact: true }).click();
  await page.locator('summary').filter({ hasText: /^Evaluation 1 · 0\/1 valid · complete$/ }).click();
  await expect(page.getByText('0 valid / 1 planned requests', { exact: true })).toBeVisible();
  await page.locator('summary').filter({ hasText: /^Request 1 .*Failed \/ invalid$/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid or incomplete evaluation' })).toBeVisible();
  await page.getByText('Saved instructions, evidence, and raw output', { exact: true }).click();
  await expect(page.locator('pre').filter({ hasText: 'RAW OUTPUT:\n{"verdict":' })).toBeVisible();
  expect(mock.requests).toHaveLength(1);
  expect(mock.requests[0].stream).not.toBe(true);
});

test('a connection-settings detour preserves the unrun experiment draft', async ({ page }) => {
  const mock = await mockModels(page);
  await openLiveExperiment(page);
  await page.getByRole('textbox', { name: 'Initial user request', exact: true }).fill('Draft question: what approval is still missing?');
  await page.getByRole('button', { name: 'Connections', exact: true }).click();
  await page.getByRole('button', { name: 'Save connections', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Initial user request', exact: true })).toHaveValue('Draft question: what approval is still missing?');
  await expect(page.getByLabel('Model for both candidates provider', { exact: true })).toHaveValue('Ollama');
  await expect(page.getByRole('checkbox', { name: /Blind human review/ })).not.toBeChecked();
  expect(mock.requests).toHaveLength(0);
});

test('skipping blind assessment reveals the teaching note without fabricating a verdict', async ({ page }) => {
  const mock = await mockModels(page);
  await openPractice(page);
  await page.getByRole('button', { name: 'Skip assessment and reveal', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal without assessing', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Ask an AI judge/ })).toBeVisible();
  await expect(page.getByText('Teaching note', { exact: true })).toBeVisible();
  await expect(page.getByText(/The policy requires both completed reviews and project lead approval/)).toBeVisible();
  const records = await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith('alignment-experiment-record-v1:')).map(([, value]) => JSON.parse(value).experiment));
  expect(records).toHaveLength(1);
  expect(records[0].human.verdict).toBe('');
  expect(records[0].human.revealedAt).toBeTruthy();
  expect(mock.requests).toHaveLength(0);
});
