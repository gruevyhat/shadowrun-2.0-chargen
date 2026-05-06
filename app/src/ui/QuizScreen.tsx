import { useState } from 'react';
import { useApp } from './store';
import { presentationOrder } from '../quiz/order';
import { scoreAnswers } from '../quiz/score';
import { axisScoresToIntent } from '../quiz/mapping';
import { generate } from '../engine/generate';
import { encodeAxes } from './characterCode';
import { AxisStar } from './AxisStar';
import type { AxisScores } from '../quiz/types';

const QUESTIONS = presentationOrder();

// ── Screen ────────────────────────────────────────────────────────────────

export function QuizScreen() {
  const { state, dispatch } = useApp();
  const answers  = state.quizAnswers;
  const [showResults, setShowResults] = useState(false);
  const [scores, setScores]           = useState<AxisScores | null>(null);

  const answeredCount = Object.keys(answers).length;
  const currentIdx    = answeredCount;
  const done          = currentIdx >= QUESTIONS.length;

  function handleAnswer(questionId: string, choiceIdx: 0 | 1) {
    const newAnswers = { ...answers, [questionId]: choiceIdx };
    dispatch({ type: 'ANSWER_QUESTION', questionId, choiceIdx });
    if (Object.keys(newAnswers).length >= QUESTIONS.length) {
      const s = scoreAnswers(QUESTIONS, newAnswers);
      setScores(s);
      setTimeout(() => setShowResults(true), 300);
    }
  }

  function handleGenerate() {
    if (!scores) return;
    const seed     = Math.floor(Math.random() * 0xffffffff);
    const axisCode = encodeAxes(scores);
    const intent   = { ...axisScoresToIntent(scores, seed), axisCode };
    dispatch({ type: 'SHOW_CHARACTER', character: generate(intent) });
  }

  const q        = QUESTIONS[currentIdx];
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);

  // ── Axis results view ─────────────────────────────────────────────────
  if (done && showResults && scores) {
    return (
      <div className="screen quiz">
        <div className="quiz-header">
          <button className="btn-ghost" onClick={() => dispatch({ type: 'GO_LANDING' })}>← BACK</button>
          <span className="quiz-progress-label">PROFILE COMPLETE</span>
        </div>
        <div className="quiz-results">
          <p className="quiz-results-label">// AXIS PROFILE</p>
          <AxisStar scores={scores} />
          <button className="btn btn-primary quiz-generate-btn" onClick={handleGenerate}>
            <span className="btn-label">GENERATE RUNNER</span>
            <span className="btn-sub">build character from this profile</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Generating spinner ────────────────────────────────────────────────
  if (done && !showResults) {
    return (
      <div className="screen quiz">
        <div className="quiz-header">
          <button className="btn-ghost" onClick={() => dispatch({ type: 'GO_LANDING' })}>← BACK</button>
        </div>
        <div className="quiz-done">
          <p className="quiz-generating-text">ANALYSING PROFILE</p>
          <div className="quiz-generating-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  // ── Question view ──────────────────────────────────────────────────────
  return (
    <div className="screen quiz">
      <div className="quiz-header">
        <button className="btn-ghost" onClick={() => dispatch({ type: 'GO_LANDING' })}>← BACK</button>
        <span className="quiz-progress-label">{answeredCount} / {QUESTIONS.length}</span>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-card">
        <div className="quiz-question-area">
          <p className="quiz-counter">// {currentIdx + 1}</p>
          <p className="quiz-prompt">{q.prompt}</p>
        </div>
        <div className="quiz-choices">
          {q.choices.map((choice, idx) => (
            <button
              key={idx}
              className="btn btn-choice"
              onClick={() => handleAnswer(q.id, idx as 0 | 1)}
            >
              {choice.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
