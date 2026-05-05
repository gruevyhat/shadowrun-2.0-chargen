import { useState } from 'react';
import { useApp } from './store';
import { presentationOrder } from '../quiz/order';
import { scoreAnswers } from '../quiz/score';
import { axisScoresToIntent } from '../quiz/mapping';
import { generate } from '../engine/generate';
import { encodeAxes } from './characterCode';
import type { AxisScores } from '../quiz/types';

const QUESTIONS = presentationOrder();

const AXIS_LABELS: { id: keyof AxisScores; neg: string; pos: string }[] = [
  { id: 'wired_wild',          neg: 'WIRED',      pos: 'WILD'       },
  { id: 'streetwise_cerebral', neg: 'STREETWISE', pos: 'CEREBRAL'   },
  { id: 'iron_empath',         neg: 'IRON',       pos: 'EMPATH'     },
  { id: 'runner_operator',     neg: 'RUNNER',     pos: 'OPERATOR'   },
  { id: 'awakened_mundane',    neg: 'AWAKENED',   pos: 'MUNDANE'    },
  { id: 'human_metahuman',     neg: 'HUMAN',      pos: 'METAHUMAN'  },
];

// ── Six-pointed star (radar chart) ───────────────────────────────────────

const AXIS_COLORS = ['#00ffcc', '#ff2255', '#aaff00', '#ff8800', '#bb44ff', '#00aaff'];

function AxisStar({ scores }: { scores: AxisScores }) {
  const cx = 180, cy = 180, R = 95, LR = 136;

  // 12 vertices at 30° intervals define the dodecagon grid and axis endpoints.
  // Axis i uses vertex i (positive pole) and vertex i+6 (negative pole) as its diameter.
  const verts = Array.from({ length: 12 }, (_, j) => {
    const a = ((j * 30 - 90) * Math.PI) / 180;
    return { dx: Math.cos(a), dy: Math.sin(a) };
  });

  const dodecPoints = (r: number) =>
    verts.map(({ dx, dy }) => `${cx + r * dx},${cy + r * dy}`).join(' ');

  const anchor = (dx: number) => dx > 0.3 ? 'start' : dx < -0.3 ? 'end' : 'middle';

  return (
    <svg viewBox="0 0 360 360" className="axis-star" aria-hidden="true">
      {/* Grid dodecagons */}
      {[R / 3, (R * 2) / 3, R].map(r => (
        <polygon key={r} points={dodecPoints(r)}
          fill="none" stroke="var(--border)" strokeWidth="0.7" />
      ))}

      {/* 6 diameter axis lines, color-coded */}
      {AXIS_LABELS.map((_, i) => (
        <line key={i}
          x1={cx + R * verts[i].dx}     y1={cy + R * verts[i].dy}
          x2={cx + R * verts[i + 6].dx} y2={cy + R * verts[i + 6].dy}
          stroke={AXIS_COLORS[i]} strokeWidth="0.9" opacity="0.35"
        />
      ))}

      {/* Centre mark */}
      <circle cx={cx} cy={cy} r="2" fill="var(--border)" />

      {/* One dot per axis at signed position; no connecting polygon */}
      {AXIS_LABELS.map(({ id }, i) => {
        const r = (scores[id] / 5) * R;
        const x = cx + r * verts[i].dx;
        const y = cy + r * verts[i].dy;
        const col = AXIS_COLORS[i];
        return (
          <circle key={i} cx={x} cy={y} r="4.5"
            fill={col}
            style={{ filter: `drop-shadow(0 0 5px ${col})` }}
          />
        );
      })}

      {/* Labels: positive pole (full color) and negative pole (same color, dimmed) */}
      {AXIS_LABELS.map(({ neg, pos }, i) => {
        const col = AXIS_COLORS[i];
        const { dx: pdx, dy: pdy } = verts[i];
        const { dx: ndx, dy: ndy } = verts[i + 6];
        return (
          <g key={i}>
            <text x={cx + LR * pdx} y={cy + LR * pdy}
              textAnchor={anchor(pdx)} dominantBaseline="middle"
              fontSize="9.5" fill={col} letterSpacing="0.07em"
              fontFamily="'Courier New', monospace"
            >{pos}</text>
            <text x={cx + LR * ndx} y={cy + LR * ndy}
              textAnchor={anchor(ndx)} dominantBaseline="middle"
              fontSize="9.5" fill={col} opacity="0.5" letterSpacing="0.07em"
              fontFamily="'Courier New', monospace"
            >{neg}</text>
          </g>
        );
      })}
    </svg>
  );
}

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
