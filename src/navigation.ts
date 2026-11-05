export type SettingsDestination = 'goal' | 'language' | 'health';
export type Screen = 'today' | 'settings' | SettingsDestination | 'manual';
export type NavigationState = { screen: Screen; manualDate: string | null };
export type NavigationAction =
  | { type: 'open-settings' }
  | { type: 'open-destination'; destination: SettingsDestination }
  | { type: 'open-manual'; dateKey: string }
  | { type: 'back' };

export const createNavigationState = (): NavigationState => ({
  screen: 'today', manualDate: null,
});

/**
 * Home is the only root (prototype/textless-shell v2): Settings opens from
 * home's swipe, its destinations return through Settings, and the manual
 * editor — reached from the date rows in Settings' progress section —
 * returns to Settings, then home.
 */
export function navigate(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'open-settings':
      return state.screen === 'today' ? { ...state, screen: 'settings' } : state;
    case 'open-destination':
      return state.screen === 'settings' ? { ...state, screen: action.destination } : state;
    case 'open-manual':
      // The manual editor is reached from a date row in Settings' progress
      // section, so the date is the row's local date key; the store still
      // refuses writes outside the seven-date window.
      return state.screen === 'settings'
        ? { ...state, screen: 'manual', manualDate: action.dateKey }
        : state;
    case 'back':
      if (state.screen === 'settings') {
        return { ...state, screen: 'today' };
      }
      if (state.screen === 'manual' || state.screen === 'goal'
        || state.screen === 'language' || state.screen === 'health') {
        return { ...state, screen: 'settings' };
      }
      return state;
  }
}
