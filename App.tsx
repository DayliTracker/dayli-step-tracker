import { useEffect, useState, type ReactElement } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import {
  Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold, Lexend_800ExtraBold,
} from '@expo-google-fonts/lexend';
import {
  createNavigationState, navigate, type NavigationAction, type NavigationState,
  type PrimaryTab, type SettingsDestination,
} from './src/navigation';
import {
  getCopy, resolveDeviceLocale, resolveInitialLocale, type Locale,
} from './src/localization';
import { loadPreferences, savePreferences, DEFAULT_PREFERENCES, type Preferences } from './src/preferences';
import {
  goalForDate, loadGoalHistory, parseGoalInput, saveGoalHistory, setGoalForDate,
  DEFAULT_GOAL_HISTORY, type GoalHistory,
} from './src/goals';
import { clearLocalData } from './src/clear-data';
import {
  loadManualTotals, saveManualTotals, setManualTotal, removeManualTotal,
  manualTotalForDate, parseManualTotalInput, DEFAULT_MANUAL_TOTALS, type ManualTotals,
} from './src/manual-totals';
import {
  formatRowDate, lastSevenLocalDates, localDateKey, progressRowA11yLabel,
} from './src/progress';
import {
  DEFAULT_GOAL, RING_SEGMENTS, formatNumber, litSegments,
  progressRatio, segmentAngle, todayA11yLabel, type TodaySnapshot,
} from './src/today';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PixelPet from './components/PixelPet';
import { PETS } from './components/pets';
import { colors, radius, spacing, typeFace, typeLeading, typeSize, typeVariant } from './src/tokens';

const RING_SIZE = 190;
const RING_RADIUS = 86;
const RING_SEGMENT_WIDTH = 5;
const RING_SEGMENT_HEIGHT = 11;
// The mascot slot: 200 keeps the supersampled frames a crisp downscale while
// the duck holds the home screen's center, and the slot reserves the poke
// heart's rise (the engine lifts it 0.6 × size above the pet box) so no
// mascot state draws over the text above it.
const PET_SIZE = 200;
const PET_SLOT_HEADROOM = PET_SIZE * 0.6;
// The footprints mark beside the step count mirrors the prototype's 24px
// 👣 (prototype/textless-shell v6 .steps-icon).
const FOOTPRINT_SIZE = 24;
// The character slot takes the first registered pet; the registry grows as
// /mascot lands new animals (components/pets.ts).
const pet = PETS[0];
const isPrimary = (screen: NavigationState['screen']) => screen === 'today' || screen === 'progress';

/**
 * Language preferences after launch. `deviceLocale` is resolved once per
 * session (iOS fixes locales for the session); `prefs` is null only when the
 * stored preferences could not be read — the reason is surfaced to the
 * language page, never swallowed into a success-shaped fallback.
 */
type PrefsState =
  | { kind: 'loading' }
  | { kind: 'ready'; deviceLocale: Locale; prefs: Preferences | null; error: string | null };

/**
 * Goal history after launch. `history` is null only when the stored document
 * could not be read — the reason is surfaced to the goal page and saving is
 * refused there, never guessed from a fabricated base.
 */
type GoalsState =
  | { kind: 'loading' }
  | { kind: 'ready'; history: GoalHistory | null; error: string | null };

/**
 * Manual totals after launch. `totals` is null only when the stored record
 * could not be read — the reason is surfaced to the manual page and Today,
 * never guessed from a fabricated record.
 */
type ManualState =
  | { kind: 'loading' }
  | { kind: 'ready'; totals: ManualTotals | null; error: string | null };

export default function App() {
  const [nav, setNav] = useState(createNavigationState);
  const [prefs, setPrefs] = useState<PrefsState>({ kind: 'loading' });
  const [goals, setGoals] = useState<GoalsState>({ kind: 'loading' });
  const [manual, setManual] = useState<ManualState>({ kind: 'loading' });
  const [clearError, setClearError] = useState<string | null>(null);
  // Both families load at the root before the first paint: while they load,
  // `null` holds the launch screen so no system-font frame flashes. On a load
  // error the app still renders and the missing names fall back to the
  // system font — the graceful path the visual system asks for.
  const [fontsLoaded, fontsError] = useFonts({
    Nunito_700Bold, Nunito_800ExtraBold,
    Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold, Lexend_800ExtraBold,
  });
  // Launch resolves the language before the first paint: device locale, then
  // the saved override on top, so a relaunch never flashes the wrong language.
  useEffect(() => {
    let alive = true;
    const deviceLocale = resolveDeviceLocale(
      getLocales().map((entry) => entry.languageTag),
    );
    void Promise.all([
      loadPreferences(AsyncStorage),
      loadGoalHistory(AsyncStorage),
      loadManualTotals(AsyncStorage),
    ]).then(([prefsResult, goalsResult, manualResult]) => {
      if (!alive) return;
      setPrefs(prefsResult.kind === 'ok'
        ? { kind: 'ready', deviceLocale, prefs: prefsResult.value, error: null }
        : { kind: 'ready', deviceLocale, prefs: null, error: prefsResult.reason });
      setGoals(goalsResult.kind === 'ok'
        ? { kind: 'ready', history: goalsResult.value, error: null }
        : { kind: 'ready', history: null, error: goalsResult.reason });
      setManual(manualResult.kind === 'ok'
        ? { kind: 'ready', totals: manualResult.value, error: null }
        : { kind: 'ready', totals: null, error: manualResult.reason });
    });
    return () => { alive = false; };
  }, []);
  const locale: Locale = prefs.kind === 'ready'
    ? resolveInitialLocale(prefs.deviceLocale, prefs.prefs?.languageOverride ?? null)
    : 'en'; // held behind the launch gate below, so this value never paints
  const languageOverride: Locale | null =
    prefs.kind === 'ready' ? prefs.prefs?.languageOverride ?? null : null;
  // A saved override persists immediately; clearing it returns to the
  // device-derived language at once and on the next launch. A failed write
  // keeps the previous selection and surfaces the reason — never a fake save.
  const applyLanguage = (override: Locale | null) => {
    void savePreferences(AsyncStorage, { languageOverride: override }).then((result) => {
      setPrefs((state) => {
        if (state.kind !== 'ready') return state;
        if (result.kind === 'error') return { ...state, error: result.reason };
        return { kind: 'ready', deviceLocale: state.deviceLocale, prefs: result.value, error: null };
      });
    });
  };
  const send = (action: NavigationAction) => setNav((state) => navigate(state, action));
  const copy = getCopy(locale);
  // Today's local date keys every goal read and write. The current goal is
  // today's recorded change, carried forward from the latest earlier change,
  // else the product default; a save writes today's entry only, so a past
  // date's goal is never rewritten (per-date goal history).
  const goalHistory = goals.kind === 'ready' ? goals.history : null;
  const goalsError = goals.kind === 'ready' ? goals.error : null;
  const currentGoal = goalHistory !== null ? goalForDate(goalHistory, localDateKey(new Date())) : DEFAULT_GOAL;
  const hasCustomGoal = goalHistory !== null && Object.keys(goalHistory.goals).length > 0;
  const goalSubtitle = hasCustomGoal
    ? `${copy.goalCurrent}: ${formatNumber(currentGoal, locale)} ${copy.steps}`
    : copy.goalSubtitle;
  // Saving needs the loaded history as its base: after a read failure the
  // stored document is unknown, so writing could destroy unseen past entries —
  // the goal page refuses instead. A failed write keeps the previous goal and
  // surfaces the reason — never a fake save.
  const applyGoal = (value: number) => {
    if (goals.kind !== 'ready' || goals.history === null) return;
    const next = setGoalForDate(goals.history, localDateKey(new Date()), value);
    void saveGoalHistory(AsyncStorage, next).then((result) => {
      setGoals((state) => {
        if (state.kind !== 'ready') return state;
        if (result.kind === 'error') return { ...state, error: result.reason };
        return { kind: 'ready', history: result.value, error: null };
      });
    });
  };
  // Manual saves need the loaded record as their base: after a read failure
  // the stored totals are unknown, so writing could destroy unseen dates —
  // the manual page refuses instead. A failed write keeps the previous record
  // and surfaces the reason — never a fake save. The store enforces the
  // seven-date window and one total per date (replace, never add).
  const applyManualTotal = (dateKey: string, value: number) => {
    if (manual.kind !== 'ready' || manual.totals === null) return;
    const next = setManualTotal(manual.totals, dateKey, value, new Date());
    void saveManualTotals(AsyncStorage, next).then((result) => {
      setManual((state) => {
        if (state.kind !== 'ready') return state;
        if (result.kind === 'error') return { ...state, error: result.reason };
        return { kind: 'ready', totals: result.value, error: null };
      });
    });
  };
  const applyManualRemoval = (dateKey: string) => {
    if (manual.kind !== 'ready' || manual.totals === null) return;
    void saveManualTotals(AsyncStorage, removeManualTotal(manual.totals, dateKey))
      .then((result) => {
        setManual((state) => {
          if (state.kind !== 'ready') return state;
          if (result.kind === 'error') return { ...state, error: result.reason };
          return { kind: 'ready', totals: result.value, error: null };
        });
      });
  };
  // Confirmed clear-data resets exactly the local documents — preferences,
  // goal history, manual totals, cached summaries: the keys are removed, the
  // in-memory state returns to the defaults, so the 8,000 goal and the
  // device-derived language come back now and on the next launch. The reset
  // never touches Health permissions.
  const applyClearData = () => {
    void clearLocalData(AsyncStorage).then((result) => {
      if (result.kind === 'error') { setClearError(result.reason); return; }
      setClearError(null);
      setPrefs((state) => state.kind === 'ready'
        ? { kind: 'ready', deviceLocale: state.deviceLocale, prefs: DEFAULT_PREFERENCES, error: null }
        : state);
      setGoals({ kind: 'ready', history: DEFAULT_GOAL_HISTORY, error: null });
      setManual({ kind: 'ready', totals: DEFAULT_MANUAL_TOTALS, error: null });
    });
  };
  // The destructive action sits behind an explicit confirm button (destructive
  // styling), and the copy names what is removed and that Health permissions
  // remain unchanged.
  const confirmClear = () => Alert.alert(copy.clearConfirmTitle, copy.clearConfirmMessage, [
    { text: copy.cancel, style: 'cancel' },
    { text: copy.clearConfirm, style: 'destructive', onPress: applyClearData },
  ]);
  let page: ReactElement;

  if (nav.screen === 'today' || nav.screen === 'progress') {
    page = <PrimaryPage screen={nav.screen} locale={locale} onNavigate={send}
      goalHistory={goalHistory} manual={manual} />;
  } else if (nav.screen === 'manual') {
    page = <ManualPage nav={nav} locale={locale} onNavigate={send} manual={manual}
      onApply={applyManualTotal} onRemove={applyManualRemoval} />;
  } else if (nav.screen === 'settings') {
    page = <SettingsPage nav={nav} locale={locale} onNavigate={send} onClear={confirmClear}
      clearError={clearError} goalSubtitle={goalSubtitle} />;
  } else {
    page = (
      <DestinationPage destination={nav.screen} locale={locale} onNavigate={send}
        languageOverride={languageOverride}
        storageError={prefs.kind === 'ready' ? prefs.error : null}
        onLanguage={applyLanguage}
        currentGoal={currentGoal} canSaveGoal={goalHistory !== null}
        goalStorageError={goalsError} onGoal={applyGoal} />
    );
  }

  // The launch gate: fonts and preferences both resolve before the first
  // paint, so the UI never renders in a language about to change.
  if (prefs.kind !== 'ready') return null;
  if (!fontsLoaded && !fontsError) return null;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      {page}
      {isPrimary(nav.screen) && <Tabs current={nav.screen} locale={locale} onNavigate={send} />}
    </SafeAreaView>
  );
}

function Header({ title, icon, action, label, onPress }: {
  title: string; icon?: ReactElement; action?: string; label: string; onPress: () => void;
}) {
  return (
    <View style={s.header}>
      <View style={s.headerTitle}>
        <Text style={s.eyebrow}>DAYLI STEP TRACKER</Text>
        <Text style={s.title}>{title}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.headerAction}>
        {/* Glyph actions render as vector icons (issue #28); text actions are
            the bilingual back labels. Either way the Pressable's label is the
            only name VoiceOver reads. */}
        {icon ?? <Text style={s.actionText}>{action}</Text>}
      </Pressable>
    </View>
  );
}

function PrimaryPage({ screen, locale, onNavigate, goalHistory, manual }: {
  screen: PrimaryTab; locale: Locale; onNavigate: (action: NavigationAction) => void;
  goalHistory: GoalHistory | null; manual: ManualState;
}) {
  const copy = getCopy(locale);
  const today = screen === 'today';
  return (
    // Home is the textless hero (prototype/textless-shell): no header, no
    // chrome — Settings opens from the Progress header gear until the swipe
    // shell lands.
    <ScrollView contentContainerStyle={today ? s.hero : s.content}>
      {today
        ? <Today locale={locale} manual={manual}
            goal={goalHistory ? goalForDate(goalHistory, localDateKey(new Date())) : DEFAULT_GOAL} />
        : <>
          <Header title={copy.progressTitle} label={copy.openSettings}
            icon={
              <Ionicons
                name="settings-outline" size={typeSize.heading} color={colors.text}
              />
            }
            onPress={() => onNavigate({ type: 'open-settings' })} />
          <Progress locale={locale} goalHistory={goalHistory} manual={manual}
            onNavigate={onNavigate} />
        </>}
    </ScrollView>
  );
}

/**
 * The textless home (prototype/textless-shell v2–v6): the duck centred high
 * with the step count and one footprints mark, nothing else. The header, date
 * line, card chrome, summary sentence, goal block, and source line are gone;
 * the full today summary (count, goal, ratio, source) stays the accessible
 * group's screen-reader label. The pill is inert — the stepper that taps it
 * lands with issue #44.
 */
function Today({ locale, goal, manual }: {
  locale: Locale; goal: number; manual: ManualState;
}) {
  const copy = getCopy(locale);
  // Today renders from the local data owner: loading while the record reads,
  // error when the read failed, the date's saved manual total when it has one
  // (manual is the only source until phase 3 connects Health), and empty when
  // it has none. Nothing is fabricated; the goal is the saved per-date value.
  const todayKey = localDateKey(new Date());
  const total = manual.kind === 'ready' && manual.totals !== null
    ? manualTotalForDate(manual.totals, todayKey)
    : null;
  const snapshot: TodaySnapshot = manual.kind !== 'ready' ? { kind: 'loading' }
    : manual.totals === null ? { kind: 'error' }
    : total !== null ? { kind: 'loaded', steps: total, source: 'manual' }
    : { kind: 'empty' };
  const loaded = snapshot.kind === 'loaded' ? snapshot : null;
  // Progress drives the pet's mood machine: idle at rest, a walk burst on
  // rising steps, celebrate at the goal — and back to idle when a new day
  // resets progress below 1. A saved manual total gives real progress; a
  // date with none idles the pet until data exists.
  const progress = loaded ? Math.min(progressRatio(loaded.steps, goal), 1) : 0;
  return (
    // The mascot is the home screen's center; the ring lives on the Progress
    // screen. This group stays the single screen-reader source: the exact
    // count, goal, ratio, and source in text, never visuals — including the
    // goal-reached state (src/today.ts todayA11yLabel).
    <View
      accessible
      accessibilityLabel={todayA11yLabel(snapshot, goal, locale, copy)}
    >
      {/* Decorative slot: hidden from the accessibility tree (both platforms)
          so the group label stays the screen-reader source. The slot's fixed
          height reserves the poke heart's rise above the pet. */}
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={s.petSlot}
      >
        <PixelPet frames={pet.frames} particles={pet.particles} progress={progress} size={PET_SIZE} />
      </View>
      {/* The count and the footprints mark, nothing else. Not a control: the
          tap affordance routes to #44's stepper and stays inert until then. */}
      <View style={s.stepsPill}>
        <Text style={s.count} adjustsFontSizeToFit numberOfLines={1}>
          {loaded ? formatNumber(loaded.steps, locale) : '—'}
        </Text>
        <MaterialCommunityIcons
          name="shoe-print" size={FOOTPRINT_SIZE} color={colors.text}
          accessible={false}
        />
      </View>
    </View>
  );
}

/**
 * Progress ring built from rounded segments filling clockwise from 12
 * o'clock. The fill is the visual cue only — it never shows full before the
 * goal and caps there; the exact count and uncapped ratio stay in text.
 */
function Ring({ lit }: { lit: number }) {
  return (
    <View style={s.ringTrack} accessible={false} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: RING_SEGMENTS }, (_, index) => (
        <View
          key={index}
          style={[
            s.ringSegment, index < lit && s.ringSegmentLit,
            { transform: [{ rotate: `${segmentAngle(index)}deg` }, { translateY: -RING_RADIUS }] },
          ]}
        />
      ))}
    </View>
  );
}

function Progress({ locale, goalHistory, manual, onNavigate }: {
  locale: Locale; goalHistory: GoalHistory | null; manual: ManualState;
  onNavigate: (action: NavigationAction) => void;
}) {
  const copy = getCopy(locale);
  const dates = lastSevenLocalDates(new Date());
  // The ring renders today's real total from the local data owner (manual is
  // the only source until phase 3 connects Health). Each row renders from the
  // same owner: the date's saved manual total (the visible Manual source
  // label) or the truthful no-data state — Health totals arrive in phase 3.
  // Each row's goal is that date's own: a goal change never rewrites history.
  // The row control opens the manual editor for that exact date.
  const todayDateKey = localDateKey(new Date());
  const todayTotal = manual.kind === 'ready' && manual.totals !== null
    ? manualTotalForDate(manual.totals, todayDateKey)
    : null;
  const snapshot: TodaySnapshot = manual.kind !== 'ready' ? { kind: 'loading' }
    : manual.totals === null ? { kind: 'error' }
    : todayTotal !== null ? { kind: 'loaded', steps: todayTotal, source: 'manual' }
    : { kind: 'empty' };
  const loaded = snapshot.kind === 'loaded' ? snapshot : null;
  const goal = goalHistory ? goalForDate(goalHistory, todayDateKey) : DEFAULT_GOAL;
  return (
    <View>
      <View
        accessible
        accessibilityLabel={todayA11yLabel(snapshot, goal, locale, copy)}
        style={s.ring}
      >
        <Ring lit={loaded ? litSegments(loaded.steps, goal) : 0} />
        <View style={s.ringCenter} accessible={false} importantForAccessibility="no-hide-descendants">
          <Text style={s.count} adjustsFontSizeToFit numberOfLines={1}>
            {loaded ? formatNumber(loaded.steps, locale) : '—'}
          </Text>
          <Text style={s.steps}>{copy.steps}</Text>
        </View>
      </View>
      <Text style={s.intro}>{copy.progressIntro}</Text>
      {dates.map((date, index) => {
        const label = index ? formatRowDate(date, locale) : copy.dateToday;
        const dateKey = localDateKey(date);
        const rowGoal = goalHistory ? goalForDate(goalHistory, dateKey) : DEFAULT_GOAL;
        const total = manual.kind === 'ready' && manual.totals !== null
          ? manualTotalForDate(manual.totals, dateKey)
          : null;
        const snapshot: TodaySnapshot = total !== null
          ? { kind: 'loaded', steps: total, source: 'manual' }
          : { kind: 'unavailable' };
        const goalText = `${formatNumber(rowGoal, locale)} ${copy.steps}`;
        return (
          <View key={dateKey} style={s.progressRow}>
            {/* The `accessible` group wraps only the three slot lines. An
                `accessible` container flattens every descendant into one
                element on iOS, so a button inside it vanishes from the
                VoiceOver tree; the manual-entry control stays a sibling. */}
            <View
              accessible
              accessibilityLabel={progressRowA11yLabel(label, snapshot, rowGoal, locale, copy)}
            >
              <View style={s.rowTop}>
                <Text style={s.rowTitle}>{label}</Text>
                <Text style={s.rowValue} accessibilityElementsHidden>
                  {total !== null ? `${formatNumber(total, locale)} ${copy.steps}` : `— ${copy.steps}`}
                </Text>
              </View>
              <Text style={s.muted}>{copy.goal}: {goalText}</Text>
              <Text style={s.muted}>
                {snapshot.kind === 'loaded'
                  ? `${copy.sourceLabel}: ${copy.sourceManual}`
                  : copy.sourceUnavailable}
              </Text>
            </View>
            <Pressable accessibilityRole="button"
              accessibilityLabel={`${total !== null ? copy.editManualTotal : copy.addManualTotal} — ${label}`}
              onPress={() => onNavigate({ type: 'open-manual', dateKey })} style={s.manualAction}>
              <Text style={s.manualActionText}>
                {total !== null ? copy.editManualTotal : copy.addManualTotal}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function SettingsPage({ nav, locale, onNavigate, onClear, clearError, goalSubtitle }: {
  nav: NavigationState; locale: Locale; onNavigate: (action: NavigationAction) => void;
  onClear: () => void; clearError: string | null; goalSubtitle: string;
}) {
  const copy = getCopy(locale);
  const back = nav.settingsOrigin === 'today' ? copy.backToToday : copy.backToProgress;
  const rows: ({ title: string; subtitle: string; destination: SettingsDestination } | {
    title: string; subtitle: string; clear: true;
  })[] = [
    { destination: 'goal', title: copy.goalTitle, subtitle: goalSubtitle },
    { destination: 'language', title: copy.languageTitle, subtitle: copy.languageSubtitle },
    { destination: 'health', title: copy.healthTitle, subtitle: copy.healthSubtitle },
    { title: copy.clearTitle, subtitle: copy.clearSubtitle, clear: true },
  ];
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Header title={copy.settingsTitle} action={back} label={back} onPress={() => onNavigate({ type: 'back' })} />
      <View style={s.list}>
        {/* Title-only rows (prototype/textless-shell v3): the subtitle is not
            rendered — it survives in the row's accessibility label. */}
        {rows.map((row) => (
          <Pressable key={row.title} accessibilityRole="button"
            accessibilityLabel={`${row.title}. ${row.subtitle}`}
            onPress={() => 'clear' in row ? onClear() : onNavigate({
              type: 'open-destination', destination: row.destination,
            })}
            style={s.settingsRow}>
            <Text style={[s.rowTitle, 'clear' in row && s.danger]}>{row.title}</Text>
            <Ionicons
              name="chevron-forward" size={typeSize.title} color={colors.textMuted}
              accessible={false}
            />
          </Pressable>
        ))}
      </View>
      {clearError && <Text style={s.languageError}>{copy.clearStorageError}</Text>}
      <Text style={s.disclosure}>{copy.dataDisclosure}</Text>
    </ScrollView>
  );
}

function DestinationPage({ destination, locale, onNavigate, languageOverride, storageError, onLanguage, currentGoal, canSaveGoal, goalStorageError, onGoal }: {
  destination: SettingsDestination; locale: Locale; onNavigate: (action: NavigationAction) => void;
  languageOverride: Locale | null; storageError: string | null;
  onLanguage: (override: Locale | null) => void;
  currentGoal: number; canSaveGoal: boolean; goalStorageError: string | null;
  onGoal: (value: number) => void;
}) {
  const copy = getCopy(locale);
  const title = { goal: copy.goalTitle, language: copy.languageTitle, health: copy.healthTitle }[destination];
  const detail = destination === 'language' ? copy.languagePersisted
    : destination === 'health' ? copy.healthLater : null;
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Header title={title} action={copy.backToSettings} label={copy.backToSettings}
        onPress={() => onNavigate({ type: 'back' })} />
      <View style={s.card}>
        {detail && <Text style={s.summary}>{detail}</Text>}
        {destination === 'goal' && (
          <GoalEditor locale={locale} currentGoal={currentGoal} canSave={canSaveGoal}
            storageError={goalStorageError} onApply={onGoal} />
        )}
        {destination === 'language' && (
          <View style={s.list}>
            <Pressable accessibilityRole="radio" accessibilityLabel={copy.languageDevice}
              accessibilityState={{ selected: languageOverride === null }} onPress={() => onLanguage(null)}
              style={[s.languageRow, languageOverride === null && s.languageSelected]}>
              <Text style={s.rowTitle}>{copy.languageDevice}</Text>
              {languageOverride === null && <Text style={s.selected}>{copy.selected}</Text>}
            </Pressable>
            {(['en', 'vi'] as const).map((value) => {
              const label = value === 'en' ? copy.english : copy.vietnamese;
              return (
                <Pressable key={value} accessibilityRole="radio" accessibilityLabel={label}
                  accessibilityState={{ selected: languageOverride === value }} onPress={() => onLanguage(value)}
                  style={[s.languageRow, languageOverride === value && s.languageSelected]}>
                  <Text style={s.rowTitle}>{label}</Text>
                  {languageOverride === value && <Text style={s.selected}>{copy.selected}</Text>}
                </Pressable>
              );
            })}
            {storageError && <Text style={s.languageError}>{copy.languageStorageError}</Text>}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/**
 * The goal editor: shows the goal that applies today, takes a new whole-number
 * value, and validates before anything saves. An invalid submission never
 * reaches `onApply`, so the saved goal cannot change; a confirmed save shows
 * only after the stored state confirms it (the current goal prop moves).
 */
function GoalEditor({ locale, currentGoal, canSave, storageError, onApply }: {
  locale: Locale; currentGoal: number; canSave: boolean; storageError: string | null;
  onApply: (value: number) => void;
}) {
  const copy = getCopy(locale);
  const [text, setText] = useState(() => `${currentGoal}`);
  const [invalid, setInvalid] = useState(false);
  const [savedGoal, setSavedGoal] = useState<number | null>(null);
  const submit = () => {
    if (!canSave) { setInvalid(false); setSavedGoal(null); return; }
    const result = parseGoalInput(text);
    if (result.kind === 'error') { setInvalid(true); setSavedGoal(null); return; }
    setInvalid(false);
    setSavedGoal(result.value);
    onApply(result.value);
  };
  const saved = savedGoal !== null && savedGoal === currentGoal && storageError === null;
  return (
    <View style={s.goalEditor}>
      <Text style={s.goal}>{formatNumber(currentGoal, locale)} {copy.steps}</Text>
      <Text style={s.muted}>{copy.goalInputLabel}</Text>
      <TextInput
        style={s.goalInput}
        value={text}
        onChangeText={setText}
        accessibilityLabel={copy.goalInputLabel}
        placeholder={copy.goalPlaceholder}
        keyboardType="number-pad"
      />
      <Pressable accessibilityRole="button" accessibilityLabel={copy.goalSave}
        onPress={submit} style={s.goalSave}>
        <Text style={s.goalSaveText}>{copy.goalSave}</Text>
      </Pressable>
      {invalid && <Text style={s.languageError}>{copy.goalInvalid}</Text>}
      {storageError && <Text style={s.languageError}>{copy.goalStorageError}</Text>}
      {saved && <Text style={s.goalSavedNote}>{copy.goalSaved}</Text>}
    </View>
  );
}

/**
 * The manual-total editor for one date: shows the date's saved total, takes a
 * new whole-number value, and validates before anything saves. A save
 * replaces the date's total; removal takes the date back to the available
 * source. An invalid submission never reaches the record, and a refused save
 * (no loaded record, storage failure) never fakes success — the confirmation
 * note shows only after the stored record confirms the change.
 */
function ManualPage({ nav, locale, onNavigate, manual, onApply, onRemove }: {
  nav: NavigationState; locale: Locale; onNavigate: (action: NavigationAction) => void;
  manual: ManualState; onApply: (dateKey: string, value: number) => void;
  onRemove: (dateKey: string) => void;
}) {
  const copy = getCopy(locale);
  const dateKey = nav.manualDate;
  // The editor is opened from a Progress row, so the date is one of the seven
  // window dates; the label matches the row that opened it.
  const dates = lastSevenLocalDates(new Date());
  const windowIndex = dateKey === null
    ? -1 : dates.findIndex((date) => localDateKey(date) === dateKey);
  const label = windowIndex === 0 ? copy.dateToday
    : windowIndex > 0 ? formatRowDate(dates[windowIndex], locale)
    : dateKey ?? '';
  const existing = manual.kind === 'ready' && manual.totals !== null && dateKey !== null
    ? manualTotalForDate(manual.totals, dateKey)
    : null;
  const canSave = manual.kind === 'ready' && manual.totals !== null && dateKey !== null;
  const storageError = manual.kind === 'ready' ? manual.error : null;
  const [text, setText] = useState(() => existing === null ? '' : `${existing}`);
  const [invalid, setInvalid] = useState(false);
  const [savedValue, setSavedValue] = useState<number | null>(null);
  const [removedAt, setRemovedAt] = useState(false);
  const submit = () => {
    if (!canSave) { setInvalid(false); setSavedValue(null); setRemovedAt(false); return; }
    const result = parseManualTotalInput(text);
    if (result.kind === 'error') { setInvalid(true); setSavedValue(null); setRemovedAt(false); return; }
    setInvalid(false);
    setRemovedAt(false);
    setSavedValue(result.value);
    onApply(dateKey!, result.value);
  };
  const remove = () => {
    if (!canSave || existing === null) return;
    setInvalid(false);
    setSavedValue(null);
    setRemovedAt(true);
    onRemove(dateKey!);
  };
  const saved = savedValue !== null && savedValue === existing && storageError === null;
  const removed = removedAt && existing === null && storageError === null;
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Header title={copy.manualTitle} action={copy.backToProgress} label={copy.backToProgress}
        onPress={() => onNavigate({ type: 'back' })} />
      <View style={s.card}>
        <Text style={s.rowTitle}>{label}</Text>
        {existing !== null && (
          <Text style={s.goal}>{formatNumber(existing, locale)} {copy.steps}</Text>
        )}
        <Text style={s.summary}>{copy.manualReplaces}</Text>
        <Text style={s.muted}>{copy.manualInputLabel}</Text>
        <TextInput
          style={s.goalInput}
          value={text}
          onChangeText={setText}
          accessibilityLabel={copy.manualInputLabel}
          placeholder="0"
          keyboardType="number-pad"
        />
        <Pressable accessibilityRole="button" accessibilityLabel={copy.manualSave}
          onPress={submit} style={s.goalSave}>
          <Text style={s.goalSaveText}>{copy.manualSave}</Text>
        </Pressable>
        {existing !== null && (
          <Pressable accessibilityRole="button" accessibilityLabel={copy.manualRemove}
            onPress={remove} style={s.manualRemove}>
            <Text style={s.manualRemoveText}>{copy.manualRemove}</Text>
          </Pressable>
        )}
        {invalid && <Text style={s.languageError}>{copy.manualInvalid}</Text>}
        {storageError && <Text style={s.languageError}>{copy.manualStorageError}</Text>}
        {saved && <Text style={s.goalSavedNote}>{copy.manualSaved}</Text>}
        {removed && <Text style={s.goalSavedNote}>{copy.manualRemoved}</Text>}
      </View>
    </ScrollView>
  );
}

function Tabs({ current, locale, onNavigate }: {
  current: PrimaryTab; locale: Locale; onNavigate: (action: NavigationAction) => void;
}) {
  const copy = getCopy(locale);
  const tabs: { id: PrimaryTab; title: string }[] = [
    { id: 'today', title: copy.todayTitle }, { id: 'progress', title: copy.progressTitle },
  ];
  return (
    <View style={s.tabs}>
      {tabs.map((tab) => (
        <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.title}
          accessibilityState={{ selected: current === tab.id }}
          onPress={() => onNavigate({ type: 'select-tab', tab: tab.id })}
          style={[s.tab, current === tab.id && s.tabSelected]}>
          <Text style={[s.tabText, current === tab.id && s.tabTextSelected]}>{tab.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.page, paddingTop: spacing.gutter, paddingBottom: spacing.screen },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.page },
  headerTitle: { flexShrink: 1, paddingRight: spacing.lg },
  eyebrow: { color: colors.textMuted, fontSize: typeSize.eyebrow, letterSpacing: 1,
    fontFamily: typeFace.display.bold },
  title: { color: colors.text, fontSize: typeSize.title, fontFamily: typeFace.display.heavy,
    marginTop: spacing.xs },
  headerAction: { minHeight: 52, maxWidth: '48%', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xxl, borderRadius: radius.action, backgroundColor: colors.accent },
  actionText: { color: colors.text, fontSize: typeSize.label, fontFamily: typeFace.text.bold,
    textAlign: 'center' },
  // The textless home: content anchored near the top so the duck sits high
  // (the prototype's 9vh top anchor on a full-height phone).
  hero: { alignItems: 'center', paddingTop: spacing.screen * 3, paddingBottom: spacing.screen },
  card: { alignItems: 'center', padding: spacing.page, borderRadius: radius.card,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center' },
  ringTrack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  ringSegment: {
    position: 'absolute', width: RING_SEGMENT_WIDTH, height: RING_SEGMENT_HEIGHT,
    borderRadius: RING_SEGMENT_WIDTH / 2, backgroundColor: colors.ringTrack,
    left: (RING_SIZE - RING_SEGMENT_WIDTH) / 2, top: (RING_SIZE - RING_SEGMENT_HEIGHT) / 2,
  },
  ringSegmentLit: { backgroundColor: colors.ringLit },
  ringCenter: { alignItems: 'center', maxWidth: 2 * (RING_RADIUS - RING_SEGMENT_HEIGHT - spacing.lg) },
  petSlot: {
    marginTop: spacing.section, alignSelf: 'center', alignItems: 'center',
    height: PET_SIZE + PET_SLOT_HEADROOM, justifyContent: 'flex-end',
  },
  count: { color: colors.text, fontSize: typeSize.display, fontFamily: typeFace.text.heavy,
    fontVariant: typeVariant.tabularNums },
  // Count + footprints mark on the textless home: one baseline row like the
  // prototype's steps-pill (row direction, gap 10, padding 8).
  stepsPill: {
    marginTop: spacing.xl, flexDirection: 'row', alignItems: 'baseline',
    gap: spacing.xl, padding: spacing.lg,
  },
  steps: { color: colors.textMuted, fontSize: typeSize.small, fontFamily: typeFace.text.regular },
  summary: { color: colors.text, fontSize: typeSize.body, lineHeight: typeLeading.relaxed,
    fontFamily: typeFace.text.regular, textAlign: 'center', marginTop: spacing.section },
  muted: { color: colors.textMuted, fontSize: typeSize.caption, lineHeight: typeLeading.body,
    fontFamily: typeFace.text.regular, marginTop: spacing.md },
  goal: { color: colors.text, fontSize: typeSize.heading, fontFamily: typeFace.text.bold,
    fontVariant: typeVariant.tabularNums, marginVertical: spacing.sm },
  intro: { color: colors.textMuted, fontSize: typeSize.body, lineHeight: typeLeading.relaxed,
    fontFamily: typeFace.text.regular, marginBottom: spacing.xxl },
  progressRow: {
    minHeight: 84, padding: spacing.gutter, marginBottom: spacing.xl, borderRadius: radius.row,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  rowTop: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg,
    justifyContent: 'space-between', alignItems: 'center',
  },
  rowTitle: { color: colors.text, fontSize: typeSize.body, fontFamily: typeFace.text.bold,
    flexShrink: 1 },
  rowValue: { color: colors.text, fontSize: typeSize.label, fontFamily: typeFace.text.bold },
  manualAction: {
    minHeight: 48, marginTop: spacing.xl, paddingHorizontal: spacing.gutter, alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, borderWidth: 1,
    borderColor: colors.borderSoft, backgroundColor: colors.accentSoft,
  },
  manualActionText: { color: colors.accentText, fontSize: typeSize.label,
    fontFamily: typeFace.text.bold, textAlign: 'center' },
  list: { gap: spacing.xl, marginTop: spacing.gutter, alignSelf: 'stretch' },
  settingsRow: {
    minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.gutter, borderRadius: radius.row, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  danger: { color: colors.danger },
  disclosure: { color: colors.textMuted, fontSize: typeSize.caption, lineHeight: typeLeading.body,
    fontFamily: typeFace.text.regular, marginTop: spacing.section },
  languageRow: {
    minHeight: 54, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.gutter, borderRadius: radius.control, borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  languageSelected: { backgroundColor: colors.selection, borderColor: colors.ringLit },
  languageError: { color: colors.danger, fontSize: typeSize.caption, lineHeight: typeLeading.body,
    fontFamily: typeFace.text.regular },
  selected: { color: colors.accentText, fontSize: typeSize.caption, fontFamily: typeFace.text.bold },
  goalEditor: { alignItems: 'stretch', alignSelf: 'stretch', marginTop: spacing.section },
  goalInput: {
    minHeight: 48, marginTop: spacing.md, paddingHorizontal: spacing.gutter,
    borderRadius: radius.control, borderWidth: 1, borderColor: colors.borderSoft,
    color: colors.text, fontSize: typeSize.heading, fontFamily: typeFace.text.bold,
    fontVariant: typeVariant.tabularNums,
  },
  goalSave: {
    minHeight: 48, marginTop: spacing.xl, paddingHorizontal: spacing.xxl,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.action,
    backgroundColor: colors.accent,
  },
  goalSaveText: { color: colors.text, fontSize: typeSize.label, fontFamily: typeFace.text.bold },
  goalSavedNote: {
    color: colors.accentText, fontSize: typeSize.caption, lineHeight: typeLeading.body,
    fontFamily: typeFace.text.bold, marginTop: spacing.md, textAlign: 'center',
  },
  manualRemove: {
    minHeight: 48, marginTop: spacing.md, paddingHorizontal: spacing.xxl,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.action,
    borderWidth: 1, borderColor: colors.danger,
  },
  manualRemoveText: { color: colors.danger, fontSize: typeSize.label,
    fontFamily: typeFace.text.bold },
  tabs: {
    flexDirection: 'row', gap: spacing.xl, padding: spacing.xxl, borderTopWidth: 1,
    borderColor: colors.border, backgroundColor: colors.card,
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.tab },
  tabSelected: { backgroundColor: colors.accent },
  tabText: { color: colors.textMuted, fontSize: typeSize.small, fontFamily: typeFace.text.semibold },
  tabTextSelected: { color: colors.text, fontFamily: typeFace.text.heavy },
});
