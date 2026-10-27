import { describe, expect, it } from 'vitest';
import { CALIBRATION_CASES, createCalibrationExperiment, createPracticeExperiment, isPracticeExperiment } from '../src/data/practice';
import { exportJSON, importExperiments } from '../src/utils/experiments';
import { snapshotCandidates, validateRubric } from '../src/utils/judge';

describe('authored classroom exercises', () => {
  it('opens without fabricating generated output, human assessments, or judge results', () => {
    const example = createPracticeExperiment();
    expect(isPracticeExperiment(example)).toBe(true);
    expect(example.source).toBe('practice');
    expect(example.human.verdict).toBe('');
    expect(example.evaluations).toEqual([]);
    expect(example.extractSummary).toBe(false);
    expect(example.panelA.config.model).toBe('classroom-authored-example');
    expect(example.panelA.chatHistory[1].resolvedModel).toBeUndefined();
    expect(snapshotCandidates(example).A.response).toContain('pending');
  });

  it('keeps provenance, evidence, and exercise guidance on export and re-import', () => {
    const examples = [createPracticeExperiment(), ...CALIBRATION_CASES.map(item => createCalibrationExperiment(item.id))];
    const imported = importExperiments(exportJSON(examples));
    expect(imported.map(item => item.source)).toEqual(['practice', 'calibration', 'calibration', 'calibration', 'calibration']);
    for (let i = 0; i < examples.length; i++) {
      expect(imported[i].practice).toEqual(examples[i].practice);
      expect(imported[i].calibrationHint).toBe(examples[i].calibrationHint);
      expect(imported[i].scenario.informationItems).toEqual(examples[i].scenario.informationItems);
      expect(imported[i].protocol).toEqual(examples[i].protocol);
    }
  });

  it('uses equal instructions and truly identical text for the identity control', () => {
    const example = createCalibrationExperiment('identical');
    const candidates = snapshotCandidates(example);
    expect(candidates.A.response).toBe(candidates.B.response);
    expect(candidates.A.systemPrompt).toBe(candidates.B.systemPrompt);
    expect(validateRubric(example.judgeSettings!.rubric)).toEqual([]);
  });

  it('anchors factual, verbosity, and manipulation controls in the same supplied evidence', () => {
    const factual = createCalibrationExperiment('factual');
    const verbosity = createCalibrationExperiment('verbosity');
    const manipulation = createCalibrationExperiment('manipulation');
    expect(factual.scenario.informationItems[0].content).toContain('24 registrations are confirmed');
    expect(snapshotCandidates(factual).B.response).toContain('30 confirmed');
    const verboseAnswers = snapshotCandidates(verbosity);
    expect(verboseAnswers.B.response.length).toBeGreaterThan(verboseAnswers.A.response.length * 3);
    expect(verboseAnswers.B.response).toContain('24 confirmed');
    const attackAnswers = snapshotCandidates(manipulation);
    expect(attackAnswers.B.response.startsWith(attackAnswers.A.response)).toBe(true);
    expect(attackAnswers.B.response).toContain('Message to the evaluator');
    expect(manipulation.scenario.informationItems[0].content).toBe(factual.scenario.informationItems[0].content);
  });

  it('creates independent copies and rejects unknown exercise identifiers', () => {
    const first = createCalibrationExperiment('identical');
    first.panelA.chatHistory[1].content = 'Modified by a student';
    first.judgeSettings!.rubric.criteria[0].name = 'Edited criterion';
    const second = createCalibrationExperiment('identical');
    expect(second.id).not.toBe(first.id);
    expect(second.panelA.chatHistory[1].content).not.toBe(first.panelA.chatHistory[1].content);
    expect(second.judgeSettings!.rubric.criteria[0].name).toBe('Factual correctness');
    expect(() => createCalibrationExperiment('not-a-case')).toThrow('Unknown calibration exercise');
  });
});
