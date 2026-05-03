// Six dichotomies driving the personality quiz.
// Each axis is bipolar — answers shift the score toward one pole or the other.
// "negative" pole listed first, "positive" pole second (sign convention).
export type AxisId =
  | 'wired_wild'           // wired (-) ↔ wild (+)         — I/E analogue
  | 'streetwise_cerebral'  // streetwise (-) ↔ cerebral (+) — S/N analogue
  | 'iron_empath'          // iron (-) ↔ empath (+)         — T/F analogue
  | 'runner_operator'      // runner (-) ↔ operator (+)     — J/P analogue
  | 'awakened_mundane'     // awakened (-) ↔ mundane (+)
  | 'human_metahuman';     // human (-) ↔ metahuman (+)

export interface QuizChoice {
  text: string;
  // +1 shifts the score toward the positive pole; -1 toward the negative pole.
  delta: 1 | -1;
}

export interface QuizQuestion {
  id: string;            // stable identifier (e.g. "q_alley_01")
  axis: AxisId;
  prompt: string;        // diegetic scenario, second-person
  choices: [QuizChoice, QuizChoice];
}

// A completed quiz produces an integer score per axis in the range [-5, +5].
export type AxisScores = Record<AxisId, number>;
