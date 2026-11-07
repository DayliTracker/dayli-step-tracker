import {
  useCallback, useEffect, useRef, useState,
  type ReactElement, type RefObject,
} from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert, Animated, Easing, GestureResponderEvent, Image, PanResponder, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import {
  Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold, Lexend_800ExtraBold,
} from '@expo-google-fonts/lexend';
import {
  createNavigationState, navigate, type NavigationAction,
  type SettingsDestination,
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
  loadManualTotals, saveManualTotals, setManualTotal,
  manualTotalForDate, MAX_MANUAL_TOTAL, DEFAULT_MANUAL_TOTALS, type ManualTotals,
} from './src/manual-totals';
import {
  formatRowDate, lastSevenLocalDates, localDateKey, progressRowA11yLabel,
} from './src/progress';
import {
  DEFAULT_GOAL, formatNumber, progressRatio, todayA11yLabel, type TodaySnapshot,
} from './src/today';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PixelPet, {
  LEAD_MS, type PixelPetEvent, type PixelPetFrames, type PixelPetHandle,
  type PixelPetParticles,
} from './components/PixelPet';
import ChatBubble, { type BubbleEvent } from './components/ChatBubble';
import { PETS } from './components/pets';
import { STROLL_HOLD_MS, countFlips, isWiggle } from './src/moods';
import { colors, radius, spacing, typeFace, typeLeading, typeSize, typeVariant } from './src/tokens';

// The mascot slot: 200 keeps the supersampled frames a crisp downscale while
// the duck holds the home screen's center, and the slot reserves the poke
// heart's rise (the engine lifts it 0.6 × size above the pet box) so no
// mascot state draws over the text above it.
const PET_SIZE = 200;
const PET_SLOT_HEADROOM = PET_SIZE * 0.6;
// The footprints mark beside the step count mirrors the prototype's 24px
// 👣 (prototype/textless-shell v6 .steps-icon).
const FOOTPRINT_SIZE = 24;
// The screen slide (prototype v5 slideInRight/Left: ±70px, .3s ease-out + fade).
const SLIDE_MS = 300;
const SLIDE_OFFSET = 70;
// The stepper popup (prototype v3): −/+ change the value by 100 with a 0
// floor (and the store's 100,000 ceiling), and the mini duck follows the
// poke home after .5s.
const STEP = 100;
// Accepted deviation, recorded: the prototype's .mini-duck is 44px, but 48
// is the tested contract (tests/shell.test.mjs) and the run's design context,
// so the mini duck renders 48pt.
const MINI_DUCK_SIZE = 48;
const MINI_DUCK_HOME_MS = 500;
// The character slot takes the first registered pet; the registry grows as
// /mascot lands new animals (components/pets.ts).
const pet = PETS[0];

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
  // The shell's duck handle (issue #42): the swipe asks the duck to lead the
  // way to Settings, and a return home asks it to waddle back in.
  const petRef = useRef<PixelPetHandle | null>(null);
  // The screen slide direction rides with each navigation (prototype v5):
  // settings follows the duck in from the right, every return slides from
  // the left, and opening a destination or the editor is instant.
  const [enter, setEnter] = useState<'forward' | 'back' | null>(null);
  // Returning home triggers the duck's arrival waddle (prototype v5 plays it
  // 120ms after the screen settles); the nonce fires it once per return.
  const [arriveNonce, setArriveNonce] = useState(0);
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
  const send = (action: NavigationAction) => {
    setEnter(action.type === 'open-settings' ? 'forward'
      : action.type === 'back' ? 'back' : null);
    if (action.type === 'back' && nav.screen === 'settings') {
      setArriveNonce((n) => n + 1);
    }
    setNav((state) => navigate(state, action));
  };
  // Swipe left on home opens Settings through the duck-led exit (prototype
  // v5): the duck dashes off the left edge when it can lead, and Settings
  // follows it in. A busy duck never traps navigation — lead() refuses, and
  // the screen changes at once. The same path serves the screen-reader
  // action, so the swipe stays an extra affordance, never the only way.
  const openSettingsFromHome = () => {
    const led = petRef.current?.lead() ?? false;
    setTimeout(() => send({ type: 'open-settings' }), led ? LEAD_MS + 30 : 0);
  };
  // The arrival waddle: 120ms after home settles (prototype v5's leadIn
  // delay), the duck waddles back in from the left with its greeting.
  useEffect(() => {
    if (arriveNonce === 0) return;
    const timer = setTimeout(() => petRef.current?.arrive(), 120);
    return () => clearTimeout(timer);
  }, [arriveNonce]);
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

  if (nav.screen === 'today') {
    page = (
      <ScrollView contentContainerStyle={s.hero}>
        <Today locale={locale} manual={manual}
          goal={goalHistory ? goalForDate(goalHistory, localDateKey(new Date())) : DEFAULT_GOAL}
          onOpenSettings={openSettingsFromHome} petRef={petRef} />
      </ScrollView>
    );
  } else if (nav.screen === 'settings') {
    page = <SettingsPage locale={locale} onNavigate={send} onClear={confirmClear}
      clearError={clearError} goalSubtitle={goalSubtitle}
      goalHistory={goalHistory} manual={manual} onApply={applyManualTotal} />;
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
      <ScreenEnter key={nav.screen} dir={enter}>{page}</ScreenEnter>
    </SafeAreaView>
  );
}

/**
 * The screen slide (prototype v5 slideInRight/slideInLeft): the new screen
 * drifts in from the direction the duck led — 70px, 300ms ease-out, with a
 * fade. Remounts per screen (keyed in App), so each navigation plays once.
 */
function ScreenEnter({ dir, children }: {
  dir: 'forward' | 'back' | null; children: ReactElement;
}) {
  const offset = useRef(
    new Animated.Value(dir === 'forward' ? SLIDE_OFFSET : dir === 'back' ? -SLIDE_OFFSET : 0),
  ).current;
  const opacity = useRef(new Animated.Value(dir === null ? 1 : 0)).current;
  useEffect(() => {
    if (dir === null) return;
    Animated.parallel([
      Animated.timing(offset, {
        toValue: 0, duration: SLIDE_MS, easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: SLIDE_MS, useNativeDriver: true }),
    ]).start();
  }, [dir, offset, opacity]);
  return (
    <Animated.View style={[s.screen, { transform: [{ translateX: offset }], opacity }]}>
      {children}
    </Animated.View>
  );
}

function Header({ title, icon, action, label, onPress, side }: {
  title: string; icon?: ReactElement; action?: string; label: string; onPress: () => void;
  side?: ReactElement;
}) {
  return (
    <View style={s.header}>
      <View style={s.headerTitle}>
        <Text style={s.eyebrow}>DAYLI STEP TRACKER</Text>
        <Text accessibilityRole="header" style={s.title}>{title}</Text>
      </View>
      <View style={s.headerSide}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
          style={({ pressed }) => [s.headerAction, pressed && s.pressedStrong]}>
          {/* Glyph actions render as vector icons (issue #28); text actions are
              the bilingual back labels. Either way the Pressable's label is the
              only name VoiceOver reads. */}
          {icon ?? <Text style={s.actionText}>{action}</Text>}
        </Pressable>
        {side}
      </View>
    </View>
  );
}

/**
 * The textless home (prototype/textless-shell v2–v6): the duck centred high
 * with the step count and one footprints mark, nothing else. The header, date
 * line, card chrome, summary sentence, goal block, and source line are gone;
 * the full today summary (count, goal, ratio, source) stays the accessible
 * group's screen-reader label. The pill is inert — the stepper that taps it
 * lands with issue #44. Swiping left asks the duck to lead the way to
 * Settings; screen readers get the same move as a labeled custom action, so
 * the swipe is an extra affordance, never the only path. Issue #43 adds the
 * mood gestures: long-press the duck to sleep, wiggle it dizzy, double-tap a
 * hop, and hold the background (never the duck or the pill) for a stroll —
 * every one of them composes with the swipe: a busy duck ignores new moods,
 * and no mood ever delays the screen change.
 */
function Today({ locale, goal, manual, onOpenSettings, petRef }: {
  locale: Locale; goal: number; manual: ManualState;
  onOpenSettings: () => void; petRef: RefObject<PixelPetHandle | null>;
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
  // The duck's voice (issue #29): mascot events surface their bubble line
  // through one hook; a bumped nonce replays even a repeated category. The
  // bubble itself owns the idle chatter — the day's first line is picked from
  // today's date, so it never needs persisted state. Dizzy and stroll speak
  // the same way (issue #43); #42's lead/homecome reuse the same pools
  // (src/localization.ts). Sleep and hop show instead of speaking.
  const [bubbleEvent, setBubbleEvent] = useState<BubbleEvent | null>(null);
  const say = useCallback((event: PixelPetEvent) => {
    // The engine says celebrate; the pool (prototype v4) says cheer.
    const category = event === 'celebrate' ? 'cheer' : event;
    setBubbleEvent((prev) => ({ category, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);
  // Issue #43 gesture gates. `duckTouch`/`pillTouch` record where a touch
  // began: the wiggle-dizzy test answers only drags that began on the duck,
  // the stroll long-hold only holds that began on neither duck nor pill.
  // The talk box never counts — it is pointerEvents="none".
  const duckTouchRef = useRef(false);
  const pillTouchRef = useRef(false);
  const onDuckTouch = useCallback((active: boolean) => {
    duckTouchRef.current = active;
  }, []);
  const onPillTouchStart = useCallback(() => { pillTouchRef.current = true; }, []);
  const onPillTouchEnd = useCallback(() => { pillTouchRef.current = false; }, []);
  // The swipe (prototype v5): horizontal pans only — vertical moves keep
  // their scroll and a motionless tap stays the duck's poke. The handler is
  // read through a ref so the once-created PanResponder never goes stale.
  const onSwipeRef = useRef(onOpenSettings);
  onSwipeRef.current = onOpenSettings;
  // The wiggle test (issue #43, prototype v4): the pan's dx samples decide
  // dizzy on release — but only for drags that began on the duck, and a clean
  // decisive swipe from the duck still navigates (moods never trap nav).
  const wiggleSamples = useRef<number[]>([]);
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        wiggleSamples.current = [];
      },
      onPanResponderMove: (_event, gesture) => {
        if (!duckTouchRef.current || gesture.numberActiveTouches !== 1) return;
        const samples = wiggleSamples.current;
        samples.push(gesture.dx);
        if (samples.length > 40) samples.shift();
      },
      onPanResponderRelease: (_event, gesture) => {
        const samples = wiggleSamples.current;
        const maxAbsDx = samples.reduce((max, dx) => Math.max(max, Math.abs(dx)), 0);
        if (duckTouchRef.current && isWiggle(countFlips(samples), maxAbsDx)) {
          petRef.current?.dizzy();
          return; // a wiggle on the duck is a mood request, never a swipe
        }
        if (gesture.dx <= -48 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          onSwipeRef.current();
        }
      },
    }),
  ).current;
  // The stroll long-hold (prototype v4 ~0.7s): passive touch tracking on the
  // home surface — no responder is claimed, so the ScrollView and the pan
  // gesture keep working. Any touch wakes a sleeper first; a hold that
  // started on the duck or the pill never strolls, and any move cancels.
  const holdRef = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null }>({
    x: 0, y: 0, timer: null,
  });
  const clearHold = useCallback(() => {
    if (holdRef.current.timer) {
      clearTimeout(holdRef.current.timer);
      holdRef.current.timer = null;
    }
  }, []);
  const onBackgroundTouchStart = useCallback((event: GestureResponderEvent) => {
    petRef.current?.wake();
    if (duckTouchRef.current || pillTouchRef.current) return;
    holdRef.current.x = event.nativeEvent.pageX;
    holdRef.current.y = event.nativeEvent.pageY;
    clearHold();
    holdRef.current.timer = setTimeout(() => {
      holdRef.current.timer = null;
      petRef.current?.stroll();
    }, STROLL_HOLD_MS);
  }, [petRef, clearHold]);
  const onBackgroundTouchMove = useCallback((event: GestureResponderEvent) => {
    if (!holdRef.current.timer) return;
    const { pageX, pageY } = event.nativeEvent;
    if (Math.abs(pageX - holdRef.current.x) > 12
      || Math.abs(pageY - holdRef.current.y) > 12) clearHold();
  }, [clearHold]);
  const onBackgroundTouchEnd = clearHold;
  return (
    // The mascot is the home screen's center. This group stays the single
    // screen-reader source: the exact count, goal, ratio, and source in
    // text, never visuals — including the goal-reached state (src/today.ts
    // todayA11yLabel). The open-settings custom action keeps a labeled path
    // to Settings for screen readers (the swipe is the sighted extra).
    <View
      accessible
      accessibilityLabel={todayA11yLabel(snapshot, goal, locale, copy)}
      accessibilityActions={[{ name: 'openSettings', label: copy.openSettings }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'openSettings') onSwipeRef.current();
      }}
      {...swipe.panHandlers}
    >
      {/* Passive touch observer (issue #43): raw touch events only — no
          responder is claimed, so the pan swipe and the ScrollView keep their
          behavior untouched. It wakes a sleeper on any touch and times the
          stroll's background long-hold. An unstyled wrapper keeps the layout
          identical to the group's own children. */}
      <View
        onTouchStart={onBackgroundTouchStart}
        onTouchMove={onBackgroundTouchMove}
        onTouchEnd={onBackgroundTouchEnd}
        onTouchCancel={onBackgroundTouchEnd}
      >
      {/* Decorative slot: hidden from the accessibility tree (both platforms)
          so the group label stays the screen-reader source. The slot's fixed
          height reserves the poke heart's rise above the pet. The talk box
          sits in that headroom too — the duck's voice, never UI copy, and it
          never intercepts touches. */}
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={s.petSlot}
      >
        <ChatBubble locale={locale} dateKey={todayKey} event={bubbleEvent} />
        <PixelPet frames={pet.frames} particles={pet.particles} progress={progress} ref={petRef}
          size={PET_SIZE} accessibilityLabel={copy.petPoke} onEvent={say} onDuckTouch={onDuckTouch} />
      </View>
      {/* The count and the footprints mark, nothing else. The pill stays
          inert — today's number is edited from Settings' date-row stepper
          (issue #44), which writes the same manual store this screen reads.
          Its touch flag keeps the stroll long-hold off the pill (issue #43). */}
      <View style={s.stepsPill}
        onTouchStart={onPillTouchStart} onTouchEnd={onPillTouchEnd}
        onTouchCancel={onPillTouchEnd}>
        <Text style={s.count} adjustsFontSizeToFit numberOfLines={1}>
          {loaded ? formatNumber(loaded.steps, locale) : '—'}
        </Text>
        <MaterialCommunityIcons
          name="shoe-print" size={FOOTPRINT_SIZE} color={colors.text}
          style={s.footprint}
          accessible={false}
        />
      </View>
      </View>
    </View>
  );
}

/**
 * The date rows (prototype v3): Progress embeds in Settings' scroll below
 * the setting rows — the seven local dates, each a single tappable row
 * showing its date and total (or the truthful '—') and nothing else. The
 * ring is gone and there is no separate editor navigation: tapping a row
 * opens the in-screen stepper popup for that exact date. The row's full
 * screen-reader sentence keeps the per-date goal and source, so the visible
 * minimalism never loses information for VoiceOver.
 */
function Progress({ locale, goalHistory, manual, onOpenStepper }: {
  locale: Locale; goalHistory: GoalHistory | null; manual: ManualState;
  onOpenStepper: (dateKey: string) => void;
}) {
  const copy = getCopy(locale);
  const dates = lastSevenLocalDates(new Date());
  return (
    <View>
      <Text style={s.intro}>{copy.progressIntro}</Text>
      {dates.map((date, index) => {
        const label = index ? formatRowDate(date, locale) : copy.dateToday;
        const dateKey = localDateKey(date);
        // Each row renders from the local data owner: the date's saved
        // manual total or the truthful no-data state — Health totals arrive
        // in phase 3. Each row's goal is that date's own: a goal change
        // never rewrites history. Tapping the row opens the stepper for
        // that exact date.
        const rowGoal = goalHistory ? goalForDate(goalHistory, dateKey) : DEFAULT_GOAL;
        const total = manual.kind === 'ready' && manual.totals !== null
          ? manualTotalForDate(manual.totals, dateKey)
          : null;
        const snapshot: TodaySnapshot = total !== null
          ? { kind: 'loaded', steps: total, source: 'manual' }
          : { kind: 'unavailable' };
        return (
          // The row itself is the control (prototype v3's role="button" row):
          // date + total only, the full sentence in the accessibility label.
          <Pressable key={dateKey} accessibilityRole="button"
            accessibilityLabel={progressRowA11yLabel(label, snapshot, rowGoal, locale, copy)}
            onPress={() => onOpenStepper(dateKey)}
            style={({ pressed }) => [s.progressRow, pressed && s.pressedGentle]}>
            <View style={s.rowTop}>
              <Text style={s.rowTitle}>{label}</Text>
              <View style={s.rowValueWrap}>
                <Text style={s.rowValue}>{total !== null ? formatNumber(total, locale) : '—'}</Text>
                {/* The mark rides every row value (prototype v3 row value:
                    '— 👣' on no-data days too, like home's own pill). */}
                <MaterialCommunityIcons
                  name="shoe-print" size={16} color={colors.text}
                  accessible={false}
                />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Settings (prototype v2–v5): the title-only destination rows, the mini duck
 * beside the back action in the header, and Progress' seven tappable date
 * rows. The stepper popup (prototype v3) is in-screen state — it writes the
 * manual-totals owner on Save (the row and home, for today, re-render from
 * the same store), never navigates, and Cancel throws the draft away.
 */
function SettingsPage({ locale, onNavigate, onClear, clearError, goalSubtitle, goalHistory, manual, onApply }: {
  locale: Locale; onNavigate: (action: NavigationAction) => void;
  onClear: () => void; clearError: string | null; goalSubtitle: string;
  goalHistory: GoalHistory | null; manual: ManualState;
  onApply: (dateKey: string, value: number) => void;
}) {
  const copy = getCopy(locale);
  // Home is the only root (prototype v2): Settings always returns there.
  const back = copy.backToToday;
  // The mini duck (prototype v5) sits beside the back action; poking it
  // plays the surprised + heart and follows it home — the arrival waddle is
  // the back navigation's own (#42's arrive()).
  const [stepper, setStepper] = useState<{ dateKey: string; value: number } | null>(null);
  const openStepper = (dateKey: string) => {
    // The draft starts from the date's saved total, or 0 for a date with no
    // data — never from a fabricated number.
    const existing = manual.kind === 'ready' && manual.totals !== null
      ? manualTotalForDate(manual.totals, dateKey)
      : null;
    setStepper({ dateKey, value: existing ?? 0 });
  };
  // −/+ at 100 per tap (prototype v3) inside the data owner's documented
  // bounds — 0 floor, and the store's 100,000 ceiling, so a saved value is
  // always one the store accepts.
  const stepDelta = (delta: number) => {
    setStepper((current) => current === null ? current : {
      ...current,
      value: Math.min(MAX_MANUAL_TOTAL, Math.max(0, current.value + delta)),
    });
  };
  const saveStepper = () => {
    if (stepper === null) return;
    onApply(stepper.dateKey, stepper.value);
    setStepper(null);
  };
  // The popup's date label matches the row that opened it.
  const stepperDate = stepper === null ? null
    : lastSevenLocalDates(new Date()).find((date) => localDateKey(date) === stepper.dateKey)
      ?? null;
  const stepperLabel = stepperDate === null ? ''
    : localDateKey(stepperDate) === localDateKey(new Date())
      ? copy.dateToday
      : formatRowDate(stepperDate, locale);
  const rows: ({ title: string; subtitle: string; destination: SettingsDestination } | {
    title: string; subtitle: string; clear: true;
  })[] = [
    { destination: 'goal', title: copy.goalTitle, subtitle: goalSubtitle },
    { destination: 'language', title: copy.languageTitle, subtitle: copy.languageSubtitle },
    { destination: 'health', title: copy.healthTitle, subtitle: copy.healthSubtitle },
    { title: copy.clearTitle, subtitle: copy.clearSubtitle, clear: true },
  ];
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Header title={copy.settingsTitle} action={back} label={back}
          onPress={() => onNavigate({ type: 'back' })}
          side={<MiniDuck frames={pet.frames} particles={pet.particles}
            label={copy.miniDuckPoke} onHome={() => onNavigate({ type: 'back' })} />} />
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
        {/* A failed manual read or write surfaces here — the stepper's Save
            never fakes success: until the stored record confirms, the rows
            keep the previous totals. */}
        {manual.kind === 'ready' && manual.error !== null && (
          <Text style={s.languageError}>{copy.manualStorageError}</Text>
        )}
        {/* Progress embeds below the setting rows (prototype v2/v3): the date
            rows ride the same scroll, so home stays the only root screen. */}
        <View style={s.divider} />
        <Progress locale={locale} goalHistory={goalHistory} manual={manual}
          onOpenStepper={openStepper} />
        <Text style={s.disclosure}>{copy.dataDisclosure}</Text>
      </ScrollView>
      {/* The stepper popup (prototype v3): an in-screen overlay, not a
          screen — navigation never leaves Settings. accessibilityViewIsModal
          keeps VoiceOver inside the popup while it is open. */}
      {stepper !== null && (
        <View style={s.overlay} accessibilityViewIsModal>
          <View style={s.editorCard}>
            <Text accessibilityRole="header" style={s.alertTitle}>{stepperLabel}</Text>
            <View style={s.stepperRow}>
              <Pressable accessibilityRole="button"
                accessibilityLabel={copy.stepperDecrease}
                onPress={() => stepDelta(-STEP)}
                style={({ pressed }) => [s.stepButton, pressed && s.pressedStrong]}>
                <Text style={s.stepButtonText}>−</Text>
              </Pressable>
              {/* The readout's label carries the number — a label of copy
                  alone would hide the value from VoiceOver. */}
              <Text style={s.editorValue}
                accessibilityLabel={`${copy.manualInputLabel}: ${formatNumber(stepper.value, locale)}`}>
                {formatNumber(stepper.value, locale)}
              </Text>
              <Pressable accessibilityRole="button"
                accessibilityLabel={copy.stepperIncrease}
                onPress={() => stepDelta(STEP)}
                style={({ pressed }) => [s.stepButton, pressed && s.pressedStrong]}>
                <Text style={s.stepButtonText}>+</Text>
              </Pressable>
            </View>
            {/* Prototype .alert-actions: borderless text buttons spread with
                space-around — the accentText green IS Save's confirm weight. */}
            <View style={s.stepperActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.cancel}
                onPress={() => setStepper(null)} style={s.stepperAction}>
                <Text style={s.stepperActionText}>{copy.cancel}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.manualSave}
                onPress={saveStepper} style={s.stepperAction}>
                <Text style={s.stepperActionText}>{copy.manualSave}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
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
 * The mini duck in the Settings header (prototype v5): a small labeled duck
 * that plays the poke — surprised frame plus a rising heart — and then
 * follows itself home. Poking it never navigates directly: the return goes
 * through the same back action the header button uses, so home's arrival
 * waddle (#42's arrive()) plays exactly as on a button return. A busy duck
 * ignores further taps until it has left. VoiceOver gets the same move as
 * this labeled button; the visuals are the sighted extra.
 */
function MiniDuck({ frames, particles, label, onHome }: {
  frames: PixelPetFrames; particles: PixelPetParticles;
  label: string; onHome: () => void;
}) {
  const [poked, setPoked] = useState(false);
  const busy = useRef(false);
  // The rising heart rides its own driver, started on the poke like the
  // home duck's (PixelPet's playHeart) — the small version of the same burst.
  const miniHeart = useRef(new Animated.Value(0)).current;
  const poke = () => {
    if (busy.current) return;
    busy.current = true;
    setPoked(true);
    miniHeart.setValue(0);
    Animated.timing(miniHeart, {
      toValue: 1, duration: 750, easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      setPoked(false);
      onHome();
    }, MINI_DUCK_HOME_MS);
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      onPress={poke} style={s.miniDuck}>
      {poked && (
        <Animated.Image
          source={particles.heart}
          style={[s.miniHeart, {
            opacity: miniHeart.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
            transform: [{
              translateY: miniHeart.interpolate({
                inputRange: [0, 1], outputRange: [0, -MINI_DUCK_SIZE * 0.7],
              }),
            }],
          }]}
        />
      )}
      <Image
        source={poked ? frames.surprised : frames.idle}
        style={s.miniDuckImage}
        resizeMode="contain"
        fadeDuration={0}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  screen: { flex: 1 },
  content: { padding: spacing.page, paddingTop: spacing.gutter, paddingBottom: spacing.screen },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.page },
  headerTitle: { flexShrink: 1, paddingRight: spacing.lg },
  eyebrow: { color: colors.textMuted, fontSize: typeSize.eyebrow, letterSpacing: 1,
    fontFamily: typeFace.display.bold },
  title: { color: colors.text, fontSize: typeSize.title, fontFamily: typeFace.display.heavy,
    marginTop: spacing.xs },
  headerAction: { minHeight: 52, minWidth: 44, maxWidth: '48%', justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: spacing.xxl, borderRadius: radius.action,
    backgroundColor: colors.accent },
  actionText: { color: colors.text, fontSize: typeSize.label, fontFamily: typeFace.text.bold,
    textAlign: 'center' },
  // Pressed feedback where the prototype specifies :active (v6): the mint
  // header action and the stepper −/+ dim to brightness(.95), the date rows
  // to brightness(.97) — opacity is the RN equivalent on both platforms.
  pressedStrong: { opacity: 0.95 },
  pressedGentle: { opacity: 0.97 },
  // The textless home: content anchored near the top so the duck sits high
  // (the prototype's 9vh top anchor on a full-height phone).
  hero: { alignItems: 'center', paddingTop: spacing.screen * 3, paddingBottom: spacing.screen },
  card: { alignItems: 'center', padding: spacing.page, borderRadius: radius.card,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  // The prototype zeroes the slot's top margin on the textless home
  // (.home-slot { margin-top: 0 }) — the duck anchors high on the hero's
  // padding alone.
  petSlot: {
    alignSelf: 'center', alignItems: 'center',
    height: PET_SIZE + PET_SLOT_HEADROOM, justifyContent: 'flex-end',
  },
  count: { color: colors.text, fontSize: typeSize.display, fontFamily: typeFace.text.heavy,
    fontVariant: typeVariant.tabularNums },
  // The glyph's em-box carries descender space, so inside the pill's baseline
  // row its visual bottom rides high; the optical nudge drops it onto the
  // digits' baseline the way the prototype's 👣 sits (spacing.xs = 3).
  footprint: { transform: [{ translateY: spacing.xs }] },
  // Count + footprints mark on the textless home: one baseline row like the
  // prototype's steps-pill (row direction, gap 10, padding 8 vertical /
  // 14 horizontal). The prototype centers the shrink-to-fit pill under the
  // duck (.home align-items:center) — alignSelf:center shrink-wraps it onto
  // the duck's axis instead of stretching and packing left.
  stepsPill: {
    marginTop: spacing.lg, alignSelf: 'center', flexDirection: 'row',
    alignItems: 'baseline', gap: spacing.xl,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.gutter,
  },
  summary: { color: colors.text, fontSize: typeSize.body, lineHeight: typeLeading.relaxed,
    fontFamily: typeFace.text.regular, textAlign: 'center', marginTop: spacing.section },
  muted: { color: colors.textMuted, fontSize: typeSize.caption, lineHeight: typeLeading.body,
    fontFamily: typeFace.text.regular, marginTop: spacing.md },
  goal: { color: colors.text, fontSize: typeSize.heading, fontFamily: typeFace.text.bold,
    fontVariant: typeVariant.tabularNums, marginVertical: spacing.sm },
  intro: { color: colors.textMuted, fontSize: typeSize.body, lineHeight: typeLeading.relaxed,
    fontFamily: typeFace.text.regular, marginBottom: spacing.xxl },
  rowTop: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg,
    justifyContent: 'space-between', alignItems: 'center',
  },
  rowTitle: { color: colors.text, fontSize: typeSize.body, fontFamily: typeFace.text.bold,
    flexShrink: 1 },
  rowValue: { color: colors.text, fontSize: typeSize.label, fontFamily: typeFace.text.bold,
    fontVariant: typeVariant.tabularNums },
  rowValueWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // The tappable date row (prototype v3) doubles as its own control: the
  // 60-point band is the prototype's .row height and stays past the 48-point
  // floor (tests/progress.test.mjs).
  progressRow: {
    minHeight: 60, padding: spacing.gutter, marginBottom: spacing.xl, borderRadius: radius.row,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center',
  },
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
  headerSide: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  miniDuck: {
    width: MINI_DUCK_SIZE, height: MINI_DUCK_SIZE, alignItems: 'center',
    justifyContent: 'center',
  },
  miniDuckImage: { width: MINI_DUCK_SIZE, height: MINI_DUCK_SIZE },
  miniHeart: { position: 'absolute', width: MINI_DUCK_SIZE * 0.4,
    height: MINI_DUCK_SIZE * 0.4 * (6 / 7), top: 0 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.overlayDim, alignItems: 'center', justifyContent: 'center' },
  // The stepper popup card (prototype .editor): 300pt wide, 18pt corners,
  // 20/18 padding, translucent canvas — no border, lifted by a soft shadow
  // tinted with the scrim token (prototype 0 12px 40px rgba(0,0,0,.3);
  // CALayer's radius is the CSS blur's half).
  editorCard: { width: 300, alignItems: 'center', paddingVertical: spacing.page,
    paddingHorizontal: spacing.section, borderRadius: radius.popup,
    backgroundColor: colors.popup, shadowColor: colors.overlayDim,
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 1, shadowRadius: 20 },
  // Popup title (prototype .alert-title): Nunito 800, 17pt, centered.
  alertTitle: { color: colors.text, fontSize: typeSize.alertTitle,
    fontFamily: typeFace.display.heavy, textAlign: 'center' },
  // Stepper band (prototype .stepper): gap 18, margin 14 top / 10 bottom.
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.section,
    marginTop: spacing.gutter, marginBottom: spacing.xl },
  // −/+ buttons (prototype .step-btn): 52×52, 16pt corners, borderSoft
  // hairline on the mint fill.
  stepButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.action, borderWidth: 1, borderColor: colors.borderSoft,
    backgroundColor: colors.accent },
  stepButtonText: { color: colors.text, fontSize: typeSize.stepGlyph,
    fontFamily: typeFace.text.heavy },
  // Readout (prototype .editor-count): 32pt, 110pt min width.
  editorValue: { color: colors.text, fontSize: typeSize.alertCount,
    fontFamily: typeFace.text.heavy, fontVariant: typeVariant.tabularNums,
    minWidth: 110, textAlign: 'center' },
  // Actions (prototype .alert-actions/.alert-btn): borderless accentText
  // text buttons spread with space-around — the green is Save's confirm
  // weight; Cancel and Save render as equals in shape, never as twin pills.
  stepperActions: { flexDirection: 'row', alignSelf: 'stretch',
    justifyContent: 'space-around' },
  stepperAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxl },
  stepperActionText: { color: colors.accentText, fontSize: typeSize.small,
    fontFamily: typeFace.text.bold },
  divider: { height: spacing.hairline, alignSelf: 'stretch', backgroundColor: colors.border,
    marginTop: spacing.section, marginBottom: spacing.section },
});
