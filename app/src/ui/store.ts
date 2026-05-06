import { createContext, useContext, useReducer } from 'react';
import type { Character } from '../engine/types';
import type { QuizAnswers } from '../quiz/score';
import type { Contact } from './contactsGenerator';

export interface IdentityOverrides {
  runnerName?:     string;
  realName?:       string;
  pastProfession?: string;
  personality?:    string;
  moralCode?:      string;
  goals?:          string;
  lovesHates?:     string;
  languages?:      string;
  appearance?:     string;
  background?:     string;
  contacts?:       Contact[];
}

export type Screen =
  | { tag: 'landing' }
  | { tag: 'quiz' }
  | { tag: 'sheet'; character: Character; identityOverrides?: IdentityOverrides }

export interface AppState {
  screen: Screen;
  quizAnswers: QuizAnswers;
}

export type AppAction =
  | { type: 'GO_LANDING' }
  | { type: 'GO_QUIZ' }
  | { type: 'ANSWER_QUESTION'; questionId: string; choiceIdx: 0 | 1 }
  | { type: 'SHOW_CHARACTER'; character: Character; identityOverrides?: IdentityOverrides }
  | { type: 'REROLL_CHARACTER'; character: Character }

export const initialState: AppState = {
  screen: { tag: 'landing' },
  quizAnswers: {},
};

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'GO_LANDING':
      return { ...state, screen: { tag: 'landing' } };
    case 'GO_QUIZ':
      return { screen: { tag: 'quiz' }, quizAnswers: {} };
    case 'ANSWER_QUESTION':
      return {
        ...state,
        quizAnswers: { ...state.quizAnswers, [action.questionId]: action.choiceIdx },
      };
    case 'SHOW_CHARACTER':
      return { ...state, screen: { tag: 'sheet', character: action.character, identityOverrides: action.identityOverrides } };
    case 'REROLL_CHARACTER':
      return { ...state, screen: { tag: 'sheet', character: action.character, identityOverrides: (state.screen as Extract<Screen, { tag: 'sheet' }>).identityOverrides } };
  }
}

export const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { useReducer };
