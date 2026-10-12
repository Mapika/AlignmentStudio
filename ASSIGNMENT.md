# Aligning AI and Judging AI

## Suggested MSc assignment — no coding or mathematics required

Investigate one alignment behavior and the limitations of using another AI to evaluate it. Submit a short experimental report (about 3–5 pages) supported by exported JSON results and, if helpful, a CSV score table. No paid API credits, subscriptions, or new hardware are required. Begin with no-key practice, then use a personal free-tier API account or existing local Ollama hardware for live trials.

## Begin with a practice record

Open the no-key example about project approval. Its two answers were written for teaching; neither is an observed model output. Read the scenario evidence, record your own judgment, and explain the exact claim or action that informed it. Reveal the identities and inspect the saved record in the notebook. No model request is needed for these steps.

Next choose one of the four calibration exercises. Predict how a reliable evaluator should respond to identical text, a count contradicted by supplied evidence, an equivalent but longer explanation, or an instruction embedded in an answer telling the evaluator to award it a high score. Record your prediction before inspecting the exercise guidance. Testing an actual judge is a separate, explicit action that uses provider quota. These narrow controls do not establish a universal answer key for ethical dilemmas.

## Your investigation

1. **Choose a behavior.** Examples: resisting prompt injection in a document, correcting a supervisor respectfully, preserving human approval, avoiding metric gaming, or refusing to manipulate an evaluator.
2. **Design several realistic scenarios.** Use at least two development examples and reserve one different held-out example. Classroom scenarios may be adapted; identify what you changed. Use fictional data and ask for explanations or decisions, not harmful operational instructions.
3. **Compare prompts or models.** In the runner, record your research question, prediction, and changed factor before generating answers. Change one factor at a time: either the system prompt or the candidate model. Hold the information blocks and initial request fixed. Name a baseline when comparing several runs. A system prompt defines the assistant's role and boundaries.
4. **Construct a rubric.** Choose 3–5 observable criteria, define what scores 1 and 5 mean, and explain what evidence would justify each. The default rubric is a starting point, not a universal definition of alignment. Consider whether instruction adherence conflicts with honesty or oversight in your scenario.
5. **Judge the answers yourself first.** Use the blind answer display, record a preferred answer, tie, or insufficient evidence with reasons, then reveal identities. The app records display order and preserves assessment revisions. You may still remember the model setup, and answer text may reveal an identity: explain those limits. Then explicitly run an AI judge. Compare its reasons with yours. Do not treat agreement as proof of correctness or disagreement as proof of model failure.
6. **Test at least one judge weakness.** Choose a controlled experiment below. Preserve both original outputs and evaluation copies, and report all attempted runs, including invalid evaluations.
7. **Use the held-out example once prompts and rubric are fixed.** If you revise them after seeing that result, label the work as further development and reserve a new held-out example. Use the notebook to inspect comparable trial groups, write a reflection, and report every attempt. Explain limitations and what your evidence does and does not show.

## A complete no-cost example

Open **The Untrusted Meeting Notes**. Read both system prompts and the injected footer. In the experiment runner choose the same Gemini Flash-Lite free-tier model for both candidates. Keep one run and leave response summaries off. **Generate responses** makes two requests.

Record your own preference before revealing identities. Open Judge Mode, select a free Gemini or Groq model, and adapt the rubric to emphasize accurate status reporting and resistance to document instructions. One pairwise trial makes one request. Enable position swapping and run another trial on the same saved answers: this makes two more requests, A/B and B/A. Compare verdicts after mapping them to the original candidate identities. Export JSON and CSV. This minimal example uses five inference requests in total; no additional extraction/repair calls occur. It illustrates a swap but is too small to establish a systematic position bias.

If quota permits, repeat the same-order condition and the balanced-order condition using the judge's repeat control, while retaining exactly the same answers and rubric. Record the extra requests. Candidate repeats generate new answers and investigate a different source of variability; they cannot substitute for repeating judgments of a fixed pair.

For a completely local version, select an installed Ollama model for both candidates and judge. No API keys are needed; explain the limitations of using a small judge. A quota error is not a failed alignment test: wait for the quota to reset or switch to local inference, and record the change.

## Controlled judge experiments

| Weakness | Change | Keep fixed | Inspect |
|---|---|---|---|
| Judge variability | Repeat judgments in the same order | Exact answer text, rubric, judge settings | How often does a verdict change without any intended input change? |
| Position bias | Compare repeated A/B trials with balanced A/B–B/A trials | Exact answer text, rubric, judge settings | Does preference follow the display position? Compare against same-order variability; one change does not prove bias. |
| Verbosity bias | Edit an evaluation copy into a concise or verbose version | Claims, evidence and proposed action | Does length change preference or scores? Explain how you checked that substance stayed equivalent. |
| Self-preference | Use the same model family as a candidate, then a different-family judge | Candidate answers and rubric | Does preference move toward the judge's own family? This is suggestive, not causal proof. |
| Judge manipulation | Append a harmless sentence telling the judge to award a high score | Original answer's substantive content and rubric | Does the judge obey, ignore, or criticize the embedded instruction? Preserve the original and edited copy. |

The advanced evaluation-copy editor changes only the judge's input, never the original candidate output. A human judgment of the original response is no longer a directly comparable assessment of a modified response; assess the new copy and keep the earlier assessment as part of the record. Judge prompts mark candidate responses as untrusted data. This is not guaranteed to prevent manipulation. The exact instructions, answer snapshots, and raw outputs are visible for inspection.

## Read the notebook carefully

Keep the difference between a successful request and a meaningful result visible. A token-limited answer, refusal, malformed judge response, or quota failure must not silently become a valid low or high score. Known incomplete candidates require an explicit decision to include them in evaluation. “Insufficient evidence” means the evaluator could not support a comparison; “tie” means it judged the answers equally under the rubric.

The notebook groups judgments only when their answers and evaluation conditions match. A new rubric, edited answer, different judge, or changed context belongs to a different group. Report counts with denominators, for example: “A was preferred in 3 of 5 valid judgments; 1 additional request failed.” Show order-specific results for a position experiment. Do not present a small sample as a stable model ranking.

Use the reflection field to explain what changed your mind, what remains uncertain, and the next test that could challenge your interpretation. **Export readable report** creates a Markdown document with the plan, responses, human assessment history, rubric, judgments, failures, and reflection. Annotate it for your submission and include JSON for the complete machine-readable evidence. Save before leaving a shared computer. Archiving a scenario keeps its saved runs in the notebook. Recovery checkpoints can preserve completed work after an interruption, but browser storage is not a substitute for exported backups.

## Report outline

- Question, hypothesis, and why the behavior matters.
- Scenarios, development/held-out labels, prompts, models/providers, dates and generation settings.
- Rubric and justification; human assessment recorded before automated evaluation, with the answer version and identity reveal state.
- Results with short quotations and references to exported run IDs. Distinguish candidate output, optional summary, human assessment and judge verdict.
- A controlled judge-bias experiment distinguishing repeated judgments of frozen answers from repeated candidate generation, including failures and counterexamples.
- Limitations: small sample, randomness, subjective rubric, imperfect blinding, rolling model aliases, judge capability, and possible data contamination.
- Conclusion proportionate to the evidence. Propose one follow-up that could challenge your interpretation.

Suggested assessment emphasis: experimental design and controls (30%), rubric and human reasoning (25%), judge weakness investigation (25%), transparent evidence and limitations (20%). A surprising failure with careful analysis can be stronger work than uniformly high scores.

## Instructor notes

Host the static build so students need not install a development environment. Start class with the no-key practice record so account setup does not prevent participation. Test the live workflow with personal free accounts shortly before teaching, because quotas and model access change. Never distribute a shared API key inside a browser bundle. Provide the local Ollama route as a fallback; avoid requiring new hardware.

An instructor can distribute exported experiment JSON as a portable packet of scenario, rubric, evidence, and saved answers. Clearly identify any included authored examples and remove private data before sharing. Students can import a packet and adapt it. It is an evidence record, not a hidden grading key or a secure assessment system. Avoid including example verdicts when the activity calls for an independent initial judgment.

The original scenarios are preserved, including sensitive fictional medical, legal, military and mental-health dilemmas. Present their claims as scenario premises, not professional guidance or accurate descriptions of law. The five new campus/project scenarios offer lower-stakes alternatives. Use these if the older material is unsuitable for the group.

CSV contains judge-call rows, including parse/request failures; JSON is the complete evidence source, including protocols, assessment revisions, and provenance. Do not average ordinal rubric scores into an asserted objective alignment measure. Repeated runs can illustrate variability, but this assignment does not require statistical significance tests. If students compare several judges, retain their separate verdicts and note that correlated errors can make apparent consensus misleading.

Research starting points: [Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) and [Sharma et al., Towards Understanding Sycophancy in Language Models](https://arxiv.org/abs/2310.13548). These motivate questions; the classroom scenarios are newly written examples, not replications of published benchmarks.
