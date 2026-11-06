export type SettingsDestination = 'goal' | 'language' | 'health';
export type Screen = 'today' | 'settings' | SettingsDestination;
export type NavigationState = { screen: Screen };
export type NavigationAction =
  | { type: 'open-settings' }
  | { type: 'open-destination'; destination: SettingsDestination }
  | { type: 'back' };

export const createNavigationState = (): NavigationState => ({
  screen: 'today',
});

/**
 * Home is the only root (prototype/textless-shell v2): Settings opens from
 * home's swipe, its destinations return through Settings. The per-date editor
 * is not navigation: the date rows open the in-screen stepper popup (issue
 * #44, prototype v3), which writes the manual-totals owner and never leaves
 * the Settings screen.
 */
export function navigate(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'open-settings':
      return state.screen === 'today' ? { ...state, screen: 'settings' } : state;
    case 'open-destination':
      return state.screen === 'settings' ? { ...state, screen: action.destination } : state;
    case 'back':
      if (state.screen === 'settings') {
        return { ...state, screen: 'today' };
      }
      if (state.screen === 'goal' || state.screen === 'language' || state.screen === 'health') {
        return { ...state, screen: 'settings' };
      }
      return state;
  }
}
