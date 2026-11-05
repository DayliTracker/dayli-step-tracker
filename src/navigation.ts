export type PrimaryTab = 'today' | 'progress';
export type SettingsDestination = 'goal' | 'language' | 'health';
export type Screen = PrimaryTab | 'settings' | SettingsDestination | 'manual';
export type NavigationState = {
  screen: Screen; settingsOrigin: PrimaryTab; manualDate: string | null;
};
export type NavigationAction =
  | { type: 'select-tab'; tab: PrimaryTab }
  | { type: 'open-settings' }
  | { type: 'open-destination'; destination: SettingsDestination }
  | { type: 'open-manual'; dateKey: string }
  | { type: 'back' };

export const createNavigationState = (): NavigationState => ({
  screen: 'today', settingsOrigin: 'today', manualDate: null,
});

export function navigate(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'select-tab': return { ...state, screen: action.tab };
    case 'open-settings': return {
      ...state,
      screen: 'settings',
      settingsOrigin: state.screen === 'today' || state.screen === 'progress'
        ? state.screen : state.settingsOrigin,
    };
    case 'open-destination':
      return state.screen === 'settings' ? { ...state, screen: action.destination } : state;
    case 'open-manual':
      // The manual editor is reached from the Progress rows, so the tab it
      // returns to is the tab it was opened from. The date is the row's local
      // date key; the store still refuses writes outside the seven-date window.
      return state.screen === 'today' || state.screen === 'progress'
        ? { ...state, screen: 'manual', manualDate: action.dateKey, settingsOrigin: state.screen }
        : state;
    case 'back':
      if (state.screen === 'settings' || state.screen === 'manual') {
        return { ...state, screen: state.settingsOrigin };
      }
      if (state.screen === 'goal' || state.screen === 'language' || state.screen === 'health') {
        return { ...state, screen: 'settings' };
      }
      return state;
  }
}
