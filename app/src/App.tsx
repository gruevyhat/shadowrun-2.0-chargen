import { useReducer } from 'react';
import { AppContext, reducer, initialState } from './ui/store';
import { LandingScreen } from './ui/LandingScreen';
import { QuizScreen } from './ui/QuizScreen';
import { SheetScreen } from './ui/SheetScreen';
import { BuilderScreen } from './ui/BuilderScreen';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {state.screen.tag === 'landing' && <LandingScreen />}
      {state.screen.tag === 'quiz'    && <QuizScreen />}
      {state.screen.tag === 'builder' && <BuilderScreen />}
      {state.screen.tag === 'sheet'   && <SheetScreen />}
    </AppContext.Provider>
  );
}
