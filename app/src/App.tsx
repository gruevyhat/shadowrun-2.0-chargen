import { useReducer } from 'react';
import { AppContext, reducer, initialState } from './ui/store';
import type { AppState } from './ui/store';
import { LandingScreen } from './ui/LandingScreen';
import { QuizScreen } from './ui/QuizScreen';
import { SheetScreen } from './ui/SheetScreen';
import { BuilderScreen } from './ui/BuilderScreen';
import { generate } from './engine/generate';
import { parseCode, encodeAxes, decodeManualBuild } from './ui/characterCode';

// Read a character code out of the URL hash at module load time (runs once).
// If valid, clears the hash so the URL stays clean.
const APP_INITIAL_STATE: AppState = (() => {
  const hash = window.location.hash.slice(1);
  if (!hash) return initialState;

  let character = null;
  if (hash.startsWith('m:')) {
    character = decodeManualBuild(hash);
  } else {
    const parsed = parseCode(hash);
    if (parsed) {
      character = generate({
        edition:          'sr2',
        archetype:        parsed.archetype,
        magicDisposition: parsed.magicDisposition,
        seed:             parsed.seed,
        ...(parsed.axisScores ? { axisCode: encodeAxes(parsed.axisScores) } : {}),
      });
    }
  }

  if (character) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return { screen: { tag: 'sheet', character }, quizAnswers: {} };
  }
  return initialState;
})();

export default function App() {
  const [state, dispatch] = useReducer(reducer, APP_INITIAL_STATE);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {state.screen.tag === 'landing' && <LandingScreen />}
      {state.screen.tag === 'quiz'    && <QuizScreen />}
      {state.screen.tag === 'builder' && <BuilderScreen />}
      {state.screen.tag === 'sheet'   && <SheetScreen />}
    </AppContext.Provider>
  );
}
