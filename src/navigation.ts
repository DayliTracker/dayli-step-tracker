export type PrimaryTab = 'today' | 'progress';
export type SettingsDestination = 'goal' | 'language' | 'health';
export type Screen = PrimaryTab | 'settings' | SettingsDestination;
export type NavigationState = { screen: Screen; settingsOrigin: PrimaryTab };
export type NavigationAction =
  | { type: 'select-tab'; tab: PrimaryTab }
  | { type: 'open-settings' }
  | { type: 'open-destination'; destination: SettingsDestination }
  | { type: 'back' };

export const createNavigationState = (): NavigationState => ({
  screen: 'today', settingsOrigin: 'today',
});

export function navigate(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'select-tab': return { ...state, screen: action.tab };
    case 'open-settings': return {
      screen: 'settings',
      settingsOrigin: state.screen === 'today' || state.screen === 'progress'
        ? state.screen : state.settingsOrigin,
    };
    case 'open-destination':
      return state.screen === 'settings' ? { ...state, screen: action.destination } : state;
    case 'back':
      if (state.screen === 'settings') return { ...state, screen: state.settingsOrigin };
      if (state.screen === 'goal' || state.screen === 'language' || state.screen === 'health') {
        return { ...state, screen: 'settings' };
      }
      return state;
  }
}
