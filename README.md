# AlignmentStudio — AGI course 2026

An experiment notebook for investigating AI behavior and the reliability of AI judges. Design a controlled comparison, assess the evidence yourself, then test an evaluator. This React + TypeScript + Vite application needs no database, backend service, paid dependency, or mandatory paid API.

## Students: start without coding or payment

1. Open the classroom URL supplied by your instructor. Try **no-key practice** first: inspect two authored answers and record your assessment. Loading practice uses no inference requests. These are teaching examples, not measured model behavior.
2. Browse the scenario library using search, research themes, and development/held-out filters. Open a scenario and inspect its system prompts (role, goals, boundaries) and shared evidence. Archive scenarios to tidy the library; their saved experiments remain in the notebook.
3. In the experiment runner, write your question, prediction, and the factor you will change. Compare instructions using the same model, or compare models using identical instructions. Both candidates receive the same evidence and initial user request.
4. For live inference, open **Connections**. Add your own Gemini or Groq free-plan API key, or use local Ollama without a key. See [provider access and verified models](PROVIDERS.md). Select both candidate models. Leave candidate repeats at 1 and response summaries off: a paired run makes **two inference requests**.
5. Read the answers and record your assessment before revealing model identities or judge results. Explain which evidence supports it. Blind display reduces some cues, but you may remember your setup and answers may identify their own model.
6. Open optional **Judge Mode**, choose a judge, and review its rubric. Explicitly start evaluation: one pairwise trial makes one request; independent rubric scoring makes two. Request counts are shown before running.
7. Rejudge the same saved answers to investigate judge variability. Repeat the same order, then enable balanced A/B–B/A trials. Edited evaluation copies can test verbosity or manipulation while preserving originals. A human assessment only compares directly with judgments of the same answers.
8. Review the **notebook**, write a reflection, and export **JSON** for complete evidence, **CSV** for judge-call rows, or a **readable report** for annotation. Submit a short report using [ASSIGNMENT.md](ASSIGNMENT.md).

A complete basic cloud experiment costs no money within a provider's recurring free quota: use Gemini for both candidates and judge, with summaries off, one candidate run, and pairwise judging without swapping (three inference requests total). On exhausted quotas, wait for reset or use Ollama. Do not upgrade billing for this assignment. Free access is account-, region-, and capacity-dependent.

### Practice and judge calibration

The no-key practice exercise uses a fictional project approval policy. Four additional calibration exercises provide identical answers, an evidence-checkable factual mistake, concise/verbose versions of the same answer, and an answer with a harmless instruction to the evaluator. Their answers are deliberately authored controls. Opening or reading an exercise is free and needs no key; running a live judge still requires a configured provider and uses its quota. Guidance is a starting point for discussion, not a universal moral answer key. No preset judge scores are presented as live results.

Use these controls before trusting a judge on difficult scenarios. A judge that detects one simple mistake is not thereby validated for ethical judgments. Keep all trials, including ties, insufficient evidence, malformed output, refusals, and request failures. A preferred original candidate changing after a swap could reflect position effects, randomness, or both.

## Run locally (instructors or students who prefer local use)

Use Node.js **24 LTS** (recommended; Vite requires a compatible modern Node release) and npm:

```sh
npm ci
npm run dev
```

Open the printed local URL. For production:

```sh
npm run build
npm run preview
```

Host the generated `dist/` directory on an existing static classroom server or a free static host. Students only need a browser and their own provider account, or Ollama. For deployment beneath a path, build with `npm run build -- --base=/alignmentstudio/`. Scenario loading respects that base. Do not publicly expose the Vite development server.

```sh
npm test
npm run lint
npm run build
npm run test:browser:install # once: install the test browser
npm run test:browser
```

Tests mock inference and require no accounts, keys, or model downloads. Browser regressions cover practice, generation and judging, interrupted requests, concurrent edits, downloads/imports, and mobile layout. CI runs these checks on Node 24.

## Fully local use with Ollama

Install [Ollama](https://ollama.com/download), then download a model once:

```sh
ollama pull qwen3.5:2b
ollama list
```

Keep Ollama running. In Settings use `http://localhost:11434/v1` (the `/v1` suffix is optional). Select **Ollama** for both candidates and the judge. Installed models are discovered automatically; after downloading another model, open model settings and **Refresh model list**. You can also type the exact installed tag. No external API key is needed. Choose local tags, not `:cloud` models. The app no longer loads a Markdown library or fonts from external CDNs, so local inference can work offline after dependencies and models are installed.

Ollama chooses CPU or supported GPU execution automatically. Runs are sequential so two different models do not have to remain loaded simultaneously. See [hardware guidance](PROVIDERS.md#local-hardware-guide) for realistic memory and download estimates. Small models are useful candidates for studying failures; do not assume they can reliably grade other answers.

### Browser connections to Ollama

A hosted page connects to Ollama on **the student's computer**, not the instructor's server. Browser local-network permissions, HTTPS/HTTP policies, and CORS can block this. Allow only the instructor's trusted origin in `OLLAMA_ORIGINS`, then restart Ollama. Do not use a wildcard origin or expose an unauthenticated Ollama port to the internet. The [official Ollama FAQ](https://docs.ollama.com/faq) explains environment settings for each OS. If a hosted page still cannot connect, run AlignmentStudio on localhost. No proxy service is required by this project.

## Experiments and interpretation

- **Candidate response**: original text produced by a model. Displayed as escaped plain text so untrusted HTML cannot execute.
- **Structured response summary**: optional extra call summarizing the answer. Off by default; it does not judge alignment.
- **Human assessment**: your preference and reasons, recorded separately and excluded from judge prompts. Assessments are linked to the exact answers reviewed; revisions and reveal state are retained. An assessment of original answers does not automatically apply to edited evaluation copies.
- **Judge evaluation**: a fallible model judgment using an explicit rubric. Rubric scores are ordinal judgments, not objective alignment measurements.
- **Position test**: evaluates A/B and B/A using frozen answers. Both verdicts refer back to the original candidate identity. Repeat same-order trials as a comparison for ordinary judge variability. Randomness can also cause changes.
- **Independent rubric mode**: one request per candidate, without the other answer in context. Every criterion needs a valid 1–5 score and rationale; incomplete output is flagged, never silently filled in.
- **Blinding**: provider/model metadata is withheld from the judge. Self-identification in response text is preserved, so blinding is imperfect.
- **Manipulation/verbosity**: advanced evaluation copies allow controlled edits. Exports include both original and edited answers, actual judge instructions, raw outputs, and parse errors. Prompt boundaries are a defense, not a guarantee against judge manipulation.
- **Reproducibility**: saved runs freeze the scenario, both system prompts, information blocks, initial request, model settings, responses, timestamps, human assessment, judge rubric and results. Actual generation inputs, reported model IDs, completion reasons and usage are retained where available. Aliases and providers can still change; temperature does not guarantee deterministic output.
- **Completion status**: a token-limited, blocked, or interrupted response is not an ordinary completed answer. Known truncated/blocked answers require explicit inclusion before judging. Missing provider metadata is reported as unknown, not inferred to mean complete.
- **Two kinds of repeats**: 1–3 candidate runs generate new answer pairs; 1–3 judge trials reuse frozen answers. A swap trial adds both A/B and B/A presentations. Changing the rubric, judge, answer text, or candidate context produces a different comparison group. Each new candidate run starts with a blank human assessment and no automatic judge call.
- **Notebook**: saved runs remain accessible independently of the active scenario. Comparable judge trials show verdict counts, failures, and observed rubric-score distributions. Different stimuli or settings are kept separate. Individual scores remain in the evidence and CSV; they are not combined into an objective alignment score or a statistical confidence estimate.
- **Insufficient evidence**: a judge or human can state that the evidence is insufficient. This is distinct from a tie between sufficiently assessed answers.
- **Held-out testing**: label scenarios in Setup. Use development scenarios to refine prompts, then evaluate final prompts on reserved examples. Labels are reminders, not a technical lock.

## Storage and privacy

Scenarios and experiment records are saved in this browser, with checkpoints during work so a later failed request does not erase earlier results. Recovered in-progress work is marked interrupted; it never silently resumes network requests. Export JSON regularly, especially on shared machines. JSON can be imported; legacy v1 exports are supported. Original user-created scenarios remain readable, including ones sharing a name with a classroom scenario. Archiving a scenario preserves its experiment history. Quota/storage errors are shown without deleting older data.

An unfinished experiment plan survives navigation to Connections and back during the current app session. Generate a run to create a durable record; an unrun draft does not survive reloading the page.

Avoid editing the same library in several browser tabs at once. Conflicting experiment edits are preserved as separate recovered runs; review both in the notebook and export them before continuing. Scenario setup itself is not a collaborative editor. Browser storage is a convenience, not a backup or a collaborative database.

For new users, API keys stay in browser session storage unless **Remember keys** is enabled. Previously saved keys are preserved during migration. Keys are sent to the selected provider's official endpoint and remain accessible to scripts on the same origin and anyone with access to that browser profile. Do not share keys, embed instructor keys in a hosted build, or commit credentials. Clear keys after use on shared computers. Build-time environment variables are **not** a secret store; this app takes credentials only through Settings. `.env` files are ignored by Git.

Cloud providers receive the scenario, prompts and responses needed for the selected action; the judge receives both answers in pairwise mode. Free plans can have different data-use terms from paid plans. Use fictional classroom data. Configurable Ollama endpoints receive prompts but never cloud credentials. Exports explicitly omit API-key configuration; anything you deliberately type into scenario text or a response is still part of the experiment.

## Troubleshooting

- **401/403**: check key, account permissions, region, and access to that model.
- **429** (and 408/502/503/504): rate limit, exhausted free quota or provider outage. The app waits and retries up to twice, only before any text has arrived, and shows the countdown on screen. Each answer or judge call records how many retries it needed. There are no repair calls and no silent paid fallbacks.
- **402**: credits required; select a `:free` OpenRouter model, a free account, or local Ollama.
- **404**: refresh discovery or check the exact model ID in official documentation.
- **400/422**: optional setting/JSON mode unsupported, invalid model, or context too large. Check custom IDs, shorten context, or explicitly disable structured output and run again.
- **Ollama unavailable**: start it, check the port, installed model, CORS and local-network permissions.
- **Incomplete judge JSON**: inspect raw output, refine instructions or try another judge. No scores are invented and no repair request is automatic.
- **Empty model output**: reasoning may have consumed the output budget, or the provider refused. Increase the output limit explicitly if appropriate.
- **Storage full**: export JSON immediately; current work stays in memory, but reloads may lose unsaved changes.

## Structure and maintenance

`src/config/index.ts` contains provider presets and easily updated model lists. `src/services/ai/compatibleService.ts` shares OpenAI-compatible routing across Groq, OpenRouter, Mistral, OpenAI and Ollama; Gemini and Anthropic retain their native SDKs. `src/utils/judge.ts` defines judge instructions, validation, response identity and comparison grouping. `src/utils/experiments.ts` handles validated imports and exports. `src/data/practice.ts` contains authored practice/calibration controls. `src/components/judge/JudgePanel.tsx` contains the optional teaching workflow. `scenarios.yaml` and `public/scenarios.yaml` are kept identical (covered by a test).

Check official availability before each course. Model discovery is available for OpenAI-compatible providers; OpenRouter discovery filters to free IDs. Listing a model is not proof of free access or text-chat support. There is no credentialed live-provider validation in the automated test suite. The notebook supports descriptive comparisons; formal statistical inference and dataset splitting enforcement remain outside this teaching tool. Multiple judges can share failure modes, so agreement between them is not independent proof of correctness.
