/* eslint-disable react-refresh/only-export-components */
import type { AxisScores } from '../quiz/types';

export const AXIS_LABELS: { id: keyof AxisScores; neg: string; pos: string }[] = [
  { id: 'wired_wild',          neg: 'WIRED',      pos: 'WILD'       },
  { id: 'streetwise_cerebral', neg: 'STREETWISE', pos: 'CEREBRAL'   },
  { id: 'iron_empath',         neg: 'IRON',       pos: 'EMPATH'     },
  { id: 'runner_operator',     neg: 'RUNNER',     pos: 'OPERATOR'   },
  { id: 'awakened_mundane',    neg: 'AWAKENED',   pos: 'MUNDANE'    },
  { id: 'human_metahuman',     neg: 'HUMAN',      pos: 'METAHUMAN'  },
];

const AXIS_COLORS = ['#00ffcc', '#ff2255', '#aaff00', '#ff8800', '#bb44ff', '#00aaff'];

export function AxisStar({ scores }: { scores: AxisScores }) {
  const cx = 180, cy = 180, R = 95, LR = 136;

  const verts = Array.from({ length: 12 }, (_, j) => {
    const a = ((j * 30 - 90) * Math.PI) / 180;
    return { dx: Math.cos(a), dy: Math.sin(a) };
  });

  const dodecPoints = (r: number) =>
    verts.map(({ dx, dy }) => `${cx + r * dx},${cy + r * dy}`).join(' ');

  const anchor = (dx: number) => dx > 0.3 ? 'start' : dx < -0.3 ? 'end' : 'middle';

  return (
    <svg viewBox="0 0 360 360" className="axis-star" aria-hidden="true">
      {[R / 3, (R * 2) / 3, R].map(r => (
        <polygon key={r} points={dodecPoints(r)}
          fill="none" stroke="var(--border)" strokeWidth="0.7" />
      ))}

      {AXIS_LABELS.map((_, i) => (
        <line key={i}
          x1={cx + R * verts[i].dx}     y1={cy + R * verts[i].dy}
          x2={cx + R * verts[i + 6].dx} y2={cy + R * verts[i + 6].dy}
          stroke={AXIS_COLORS[i]} strokeWidth="0.9" opacity="0.35"
        />
      ))}

      <circle cx={cx} cy={cy} r="2" fill="var(--border)" />

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
