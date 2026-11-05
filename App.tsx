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
import { loadPreferences, savePreferences, type Preferences } from './src/preferences';
import {
  goalForDate, loadGoalHistory, parseGoalInput, saveGoalHistory, setGoalForDate,
  type GoalHistory,
} from './src/goals';
import {
  formatRowDate, lastSevenLocalDates, localDateKey, progressRowA11yLabel,
} from './src/progress';
import {
  DEFAULT_GOAL, RING_SEGMENTS, formatNumber, formatRatio, goalReached, litSegments,
  progressRatio, segmentAngle, todayA11yLabel, type TodaySnapshot,
} from './src/today';
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

export default function App() {
  const [nav, setNav] = useState(createNavigationState);
  const [prefs, setPrefs] = useState<PrefsState>({ kind: 'loading' });
  const [goals, setGoals] = useState<GoalsState>({ kind: 'loading' });
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
    ]).then(([prefsResult, goalsResult]) => {
      if (!alive) return;
      setPrefs(prefsResult.kind === 'ok'
        ? { kind: 'ready', deviceLocale, prefs: prefsResult.value, error: null }
        : { kind: 'ready', deviceLocale, prefs: null, error: prefsResult.reason });
      setGoals(goalsResult.kind === 'ok'
        ? { kind: 'ready', history: goalsResult.value, error: null }
        : { kind: 'ready', history: null, error: goalsResult.reason });
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
  const clearPreview = () => Alert.alert(copy.clearConfirmTitle, copy.clearConfirmMessage, [
    { text: copy.cancel, style: 'cancel' }, { text: copy.gotIt },
  ]);
  let page: ReactElement;

  if (nav.screen === 'today' || nav.screen === 'progress') {
    page = <PrimaryPage screen={nav.screen} locale={locale} onNavigate={send} goalHistory={goalHistory} />;
  } else if (nav.screen === 'settings') {
    page = <SettingsPage nav={nav} locale={locale} onNavigate={send} onClear={clearPreview}
      goalSubtitle={goalSubtitle} />;
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

function Header({ title, action, label, onPress }: {
  title: string; action: string; label: string; onPress: () => void;
}) {
  return (
    <View style={s.header}>
      <View style={s.headerTitle}>
        <Text style={s.eyebrow}>DAYLI STEP TRACKER</Text>
        <Text style={s.title}>{title}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.headerAction}>
        <Text style={s.actionText}>{action}</Text>
      </Pressable>
    </View>
  );
}

function PrimaryPage({ screen, locale, onNavigate, goalHistory }: {
  screen: PrimaryTab; locale: Locale; onNavigate: (action: NavigationAction) => void;
  goalHistory: GoalHistory | null;
}) {
  const copy = getCopy(locale);
  const today = screen === 'today';
  const title = today ? copy.todayTitle : copy.progressTitle;
  const date = new Date().toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Header title={title} action="⚙" label={copy.openSettings}
        onPress={() => onNavigate({ type: 'open-settings' })} />
      {today
        ? <Today date={date} locale={locale}
            goal={goalHistory ? goalForDate(goalHistory, localDateKey(new Date())) : DEFAULT_GOAL} />
        : <Progress locale={locale} goalHistory={goalHistory} />}
    </ScrollView>
  );
}

function Today({ date, locale, goal }: { date: string; locale: Locale; goal: number }) {
  const copy = getCopy(locale);
  // Phase 1 shell: no data owner exists yet, so the truthful snapshot is
  // "unavailable". Phases 2-3 pass loading/empty/error/loaded snapshots
  // through the same shape; every state below renders without fabricated data.
  // The goal is the saved per-date value: the ratio line, the goal-reached
  // state, and every goal line key off it, so a Settings change shows up at once.
  const [snapshot] = useState<TodaySnapshot>({ kind: 'unavailable' });
  const loaded = snapshot.kind === 'loaded' ? snapshot : null;
  const reached = goalReached(snapshot, goal);
  // Progress drives the pet's mood machine: idle at rest, a walk burst on
  // rising steps, celebrate at the goal — and back to idle when a new day
  // resets progress below 1. The truthful phase-1 snapshot has no steps, so
  // the pet idles today; phase 3 feeds real snapshots through the same shape.
  const progress = loaded ? Math.min(progressRatio(loaded.steps, goal), 1) : 0;
  const summary = loaded
    ? `${formatRatio(progressRatio(loaded.steps, goal), locale)} ${copy.ratioOfGoal}`
    : snapshot.kind === 'loading' ? copy.todayLoading
    : snapshot.kind === 'empty' ? copy.todayEmpty
    : snapshot.kind === 'error' ? copy.todayError
    : copy.stepsUnavailable;
  return (
    <View>
      <Text style={s.date}>{date}</Text>
      <View style={s.card}>
        {/* The mascot is the home screen's center; the ring lives on the
            Progress screen. This group stays the single screen-reader source:
            the exact count, goal, ratio, and source in text, never visuals. */}
        <View
          accessible
          accessibilityLabel={todayA11yLabel(snapshot, goal, locale, copy)}
        >
          <Text style={s.count} adjustsFontSizeToFit numberOfLines={1}>
            {loaded ? formatNumber(loaded.steps, locale) : '—'}
          </Text>
          <Text style={s.steps}>{copy.steps}</Text>
          {/* Decorative slot: hidden from the accessibility tree (both
              platforms) so the summary stays the screen-reader source. The
              slot's fixed height reserves the poke heart's rise above the pet. */}
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={s.petSlot}
          >
            <PixelPet frames={pet.frames} particles={pet.particles} progress={progress} size={PET_SIZE} />
          </View>
        </View>
        <Text style={s.summary}>{summary}</Text>
        <View style={s.divider} />
        <Text style={s.muted}>{copy.goal}</Text>
        <Text style={s.goal}>{formatNumber(goal, locale)} {copy.steps}</Text>
        <Text style={s.muted}>
          {loaded
            ? `${copy.sourceLabel}: ${loaded.source === 'health' ? copy.sourceHealth : copy.sourceManual}`
            : copy.sourceUnavailable}
        </Text>
        {reached && <Text style={s.cheer}>{copy.goalReached}</Text>}
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

function Progress({ locale, goalHistory }: { locale: Locale; goalHistory: GoalHistory | null }) {
  const copy = getCopy(locale);
  const dates = lastSevenLocalDates(new Date());
  // The ring lives here — the mascot owns the home screen's center, so the
  // week view carries the fill. Same truthful phase-1 snapshot as Today, with
  // today's own per-date goal feeding both the ring and its label.
  const [snapshot] = useState<TodaySnapshot>({ kind: 'unavailable' });
  const loaded = snapshot.kind === 'loaded' ? snapshot : null;
  const goal = goalHistory ? goalForDate(goalHistory, localDateKey(new Date())) : DEFAULT_GOAL;
  // Phase 1 shell: no data owner exists yet, so every row truthfully renders
  // the "unavailable" snapshot — same shape Today uses. Phase 2 passes real
  // per-day totals, goals, and manual entries through this same slot layout.
  // Each row's goal is that date's own: a goal change never rewrites history.
  const previewManualEntry = () => Alert.alert(
    copy.manualPreviewTitle, copy.manualPreviewMessage, [{ text: copy.gotIt }],
  );
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
        const rowGoal = goalHistory ? goalForDate(goalHistory, localDateKey(date)) : DEFAULT_GOAL;
        const goalText = `${formatNumber(rowGoal, locale)} ${copy.steps}`;
        return (
          <View key={localDateKey(date)} style={s.progressRow}>
            {/* The `accessible` group wraps only the three slot lines. An
                `accessible` container flattens every descendant into one
                element on iOS, so a button inside it vanishes from the
                VoiceOver tree; the manual-entry control stays a sibling. */}
            <View
              accessible
              accessibilityLabel={progressRowA11yLabel(
                label, { kind: 'unavailable' }, rowGoal, locale, copy,
              )}
            >
              <View style={s.rowTop}>
                <Text style={s.rowTitle}>{label}</Text>
                <Text style={s.rowValue} accessibilityElementsHidden>— {copy.steps}</Text>
              </View>
              <Text style={s.muted}>{copy.goal}: {goalText}</Text>
              <Text style={s.muted}>{copy.sourceUnavailable}</Text>
            </View>
            <Pressable accessibilityRole="button"
              accessibilityLabel={`${copy.addManualTotal} — ${label}`}
              onPress={previewManualEntry} style={s.manualAction}>
              <Text style={s.manualActionText}>{copy.addManualTotal}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function SettingsPage({ nav, locale, onNavigate, onClear, goalSubtitle }: {
  nav: NavigationState; locale: Locale; onNavigate: (action: NavigationAction) => void;
  onClear: () => void; goalSubtitle: string;
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
        {rows.map((row) => (
          <Pressable key={row.title} accessibilityRole="button"
            accessibilityLabel={`${row.title}. ${row.subtitle}`}
            onPress={() => 'clear' in row ? onClear() : onNavigate({
              type: 'open-destination', destination: row.destination,
            })}
            style={s.settingsRow}>
            <View style={s.rowCopy}>
              <Text style={[s.rowTitle, 'clear' in row && s.danger]}>{row.title}</Text>
              <Text style={s.rowSubtitle}>{row.subtitle}</Text>
            </View>
            <Text style={s.chevron} accessible={false}>›</Text>
          </Pressable>
        ))}
      </View>
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
  date: { color: colors.textMuted, fontSize: typeSize.body, fontFamily: typeFace.text.regular,
    marginBottom: spacing.xxl },
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
  cheer: { color: colors.accentText, fontSize: typeSize.small, fontFamily: typeFace.display.bold,
    marginTop: spacing.lg, textAlign: 'center' },
  count: { color: colors.text, fontSize: typeSize.display, fontFamily: typeFace.text.heavy,
    fontVariant: typeVariant.tabularNums },
  steps: { color: colors.textMuted, fontSize: typeSize.small, fontFamily: typeFace.text.regular },
  summary: { color: colors.text, fontSize: typeSize.body, lineHeight: typeLeading.relaxed,
    fontFamily: typeFace.text.regular, textAlign: 'center', marginTop: spacing.section },
  divider: { height: spacing.hairline, alignSelf: 'stretch', backgroundColor: colors.border,
    marginVertical: spacing.section },
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
    minHeight: 70, flexDirection: 'row', alignItems: 'center', padding: spacing.gutter,
    borderRadius: radius.row, backgroundColor: colors.card, borderWidth: 1,
    borderColor: colors.border,
  },
  rowCopy: { flex: 1, paddingRight: spacing.lg },
  rowSubtitle: { color: colors.textMuted, fontSize: typeSize.caption,
    lineHeight: typeLeading.dense, fontFamily: typeFace.text.regular, marginTop: spacing.xs },
  chevron: { color: colors.textMuted, fontSize: typeSize.title, fontFamily: typeFace.text.regular },
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
