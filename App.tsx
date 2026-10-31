import { useState, type ReactElement } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import {
  Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold, Lexend_800ExtraBold,
} from '@expo-google-fonts/lexend';
import {
  createNavigationState, navigate, type NavigationAction, type NavigationState,
  type PrimaryTab, type SettingsDestination,
} from './src/navigation';
import { getCopy, type Locale } from './src/localization';
import {
  formatRowDate, lastSevenLocalDates, localDateKey, progressRowA11yLabel,
} from './src/progress';
import {
  DEFAULT_GOAL, RING_SEGMENTS, formatNumber, formatRatio, goalReached, litSegments,
  progressRatio, segmentAngle, todayA11yLabel, type TodaySnapshot,
} from './src/today';
import { DUCK_CHEER, DUCK_IDLE, DUCK_PALETTE, DUCK_SIZE } from './src/duck';
import { colors, radius, spacing, typeFace, typeLeading, typeSize, typeVariant } from './src/tokens';

const RING_SIZE = 190;
const RING_RADIUS = 86;
const RING_SEGMENT_WIDTH = 5;
const RING_SEGMENT_HEIGHT = 11;
const DUCK_SCALE = 8;
const isPrimary = (screen: NavigationState['screen']) => screen === 'today' || screen === 'progress';

export default function App() {
  const [nav, setNav] = useState(createNavigationState);
  const [locale, setLocale] = useState<Locale>('en');
  // Both families load at the root before the first paint: while they load,
  // `null` holds the launch screen so no system-font frame flashes. On a load
  // error the app still renders and the missing names fall back to the
  // system font — the graceful path the visual system asks for.
  const [fontsLoaded, fontsError] = useFonts({
    Nunito_700Bold, Nunito_800ExtraBold,
    Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold, Lexend_800ExtraBold,
  });
  const copy = getCopy(locale);
  const send = (action: NavigationAction) => setNav((state) => navigate(state, action));
  const clearPreview = () => Alert.alert(copy.clearConfirmTitle, copy.clearConfirmMessage, [
    { text: copy.cancel, style: 'cancel' }, { text: copy.gotIt },
  ]);
  let page: ReactElement;

  if (nav.screen === 'today' || nav.screen === 'progress') {
    page = <PrimaryPage screen={nav.screen} locale={locale} onNavigate={send} />;
  } else if (nav.screen === 'settings') {
    page = <SettingsPage nav={nav} locale={locale} onNavigate={send} onClear={clearPreview} />;
  } else {
    page = <DestinationPage destination={nav.screen} locale={locale} onNavigate={send} onLocale={setLocale} />;
  }

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

function PrimaryPage({ screen, locale, onNavigate }: {
  screen: PrimaryTab; locale: Locale; onNavigate: (action: NavigationAction) => void;
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
      {today ? <Today date={date} locale={locale} /> : <Progress locale={locale} />}
    </ScrollView>
  );
}

function Today({ date, locale }: { date: string; locale: Locale }) {
  const copy = getCopy(locale);
  // Phase 1 shell: no data owner exists yet, so the truthful snapshot is
  // "unavailable". Phases 2-3 pass loading/empty/error/loaded snapshots
  // through the same shape; every state below renders without fabricated data.
  const [snapshot] = useState<TodaySnapshot>({ kind: 'unavailable' });
  const loaded = snapshot.kind === 'loaded' ? snapshot : null;
  const reached = goalReached(snapshot, DEFAULT_GOAL);
  const summary = loaded
    ? `${formatRatio(progressRatio(loaded.steps, DEFAULT_GOAL), locale)} ${copy.ratioOfGoal}`
    : snapshot.kind === 'loading' ? copy.todayLoading
    : snapshot.kind === 'empty' ? copy.todayEmpty
    : snapshot.kind === 'error' ? copy.todayError
    : copy.stepsUnavailable;
  return (
    <View>
      <Text style={s.date}>{date}</Text>
      <View style={s.card}>
        <View
          accessible
          accessibilityLabel={todayA11yLabel(snapshot, DEFAULT_GOAL, locale, copy)}
          style={s.ring}
        >
          <Ring lit={loaded ? litSegments(loaded.steps, DEFAULT_GOAL) : 0} />
          <View style={s.ringCenter} accessible={false} importantForAccessibility="no-hide-descendants">
            <Text style={s.count} adjustsFontSizeToFit numberOfLines={1}>
              {loaded ? formatNumber(loaded.steps, locale) : '—'}
            </Text>
            <Text style={s.steps}>{copy.steps}</Text>
          </View>
        </View>
        <Text style={s.summary}>{summary}</Text>
        <View style={s.divider} />
        <Text style={s.muted}>{copy.goal}</Text>
        <Text style={s.goal}>{formatNumber(DEFAULT_GOAL, locale)} {copy.steps}</Text>
        <Text style={s.muted}>
          {loaded
            ? `${copy.sourceLabel}: ${loaded.source === 'health' ? copy.sourceHealth : copy.sourceManual}`
            : copy.sourceUnavailable}
        </Text>
        <DuckArt cheer={reached} />
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

/** Original Dayli duck: runtime pixel grid, frame-swapped on goal reach. */
function DuckArt({ cheer }: { cheer: boolean }) {
  const rows = cheer ? DUCK_CHEER : DUCK_IDLE;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[s.duck, { width: DUCK_SIZE * DUCK_SCALE, height: DUCK_SIZE * DUCK_SCALE }]}
    >
      {rows.flatMap((row, y) => row.split('').map((pixel, x) => pixel === '.' ? null : (
        <View
          key={`${x}:${y}`}
          style={{
            position: 'absolute', width: DUCK_SCALE, height: DUCK_SCALE,
            left: x * DUCK_SCALE, top: y * DUCK_SCALE, backgroundColor: DUCK_PALETTE[pixel],
          }}
        />
      )))}
    </View>
  );
}

function Progress({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const dates = lastSevenLocalDates(new Date());
  // Phase 1 shell: no data owner exists yet, so every row truthfully renders
  // the "unavailable" snapshot — same shape Today uses. Phase 2 passes real
  // per-day totals, goals, and manual entries through this same slot layout.
  const previewManualEntry = () => Alert.alert(
    copy.manualPreviewTitle, copy.manualPreviewMessage, [{ text: copy.gotIt }],
  );
  return (
    <View>
      <Text style={s.intro}>{copy.progressIntro}</Text>
      {dates.map((date, index) => {
        const label = index ? formatRowDate(date, locale) : copy.dateToday;
        const goal = `${formatNumber(DEFAULT_GOAL, locale)} ${copy.steps}`;
        return (
          <View key={localDateKey(date)} style={s.progressRow}>
            {/* The `accessible` group wraps only the three slot lines. An
                `accessible` container flattens every descendant into one
                element on iOS, so a button inside it vanishes from the
                VoiceOver tree; the manual-entry control stays a sibling. */}
            <View
              accessible
              accessibilityLabel={progressRowA11yLabel(
                label, { kind: 'unavailable' }, DEFAULT_GOAL, locale, copy,
              )}
            >
              <View style={s.rowTop}>
                <Text style={s.rowTitle}>{label}</Text>
                <Text style={s.rowValue} accessibilityElementsHidden>— {copy.steps}</Text>
              </View>
              <Text style={s.muted}>{copy.goal}: {goal}</Text>
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

function SettingsPage({ nav, locale, onNavigate, onClear }: {
  nav: NavigationState; locale: Locale; onNavigate: (action: NavigationAction) => void; onClear: () => void;
}) {
  const copy = getCopy(locale);
  const back = nav.settingsOrigin === 'today' ? copy.backToToday : copy.backToProgress;
  const rows: ({ title: string; subtitle: string; destination: SettingsDestination } | {
    title: string; subtitle: string; clear: true;
  })[] = [
    { destination: 'goal', title: copy.goalTitle, subtitle: copy.goalSubtitle },
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

function DestinationPage({ destination, locale, onNavigate, onLocale }: {
  destination: SettingsDestination; locale: Locale; onNavigate: (action: NavigationAction) => void;
  onLocale: (locale: Locale) => void;
}) {
  const copy = getCopy(locale);
  const title = { goal: copy.goalTitle, language: copy.languageTitle, health: copy.healthTitle }[destination];
  const detail = { goal: copy.goalLater, language: copy.languageTemporary, health: copy.healthLater }[destination];
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Header title={title} action={copy.backToSettings} label={copy.backToSettings}
        onPress={() => onNavigate({ type: 'back' })} />
      <View style={s.card}>
        <Text style={s.summary}>{detail}</Text>
        {destination === 'goal' && <Text style={s.goal}>{formatNumber(DEFAULT_GOAL, locale)} {copy.steps}</Text>}
        {destination === 'language' && (
          <View style={s.list}>
            {(['en', 'vi'] as const).map((value) => {
              const label = value === 'en' ? copy.english : copy.vietnamese;
              return (
                <Pressable key={value} accessibilityRole="radio" accessibilityLabel={label}
                  accessibilityState={{ selected: locale === value }} onPress={() => onLocale(value)}
                  style={[s.languageRow, locale === value && s.languageSelected]}>
                  <Text style={s.rowTitle}>{label}</Text>
                  {locale === value && <Text style={s.selected}>{copy.selected}</Text>}
                </Pressable>
              );
            })}
          </View>
        )}
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
  date: { color: colors.textMuted, fontSize: typeSize.body, fontFamily: typeFace.text.regular,
    marginBottom: spacing.xxl },
  card: { alignItems: 'center', padding: spacing.page, borderRadius: radius.card,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringTrack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  ringSegment: {
    position: 'absolute', width: RING_SEGMENT_WIDTH, height: RING_SEGMENT_HEIGHT,
    borderRadius: RING_SEGMENT_WIDTH / 2, backgroundColor: colors.ringTrack,
    left: (RING_SIZE - RING_SEGMENT_WIDTH) / 2, top: (RING_SIZE - RING_SEGMENT_HEIGHT) / 2,
  },
  ringSegmentLit: { backgroundColor: colors.ringLit },
  ringCenter: { alignItems: 'center', maxWidth: 2 * (RING_RADIUS - RING_SEGMENT_HEIGHT - spacing.lg) },
  duck: { marginTop: spacing.section, alignSelf: 'center' },
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
  selected: { color: colors.accentText, fontSize: typeSize.caption, fontFamily: typeFace.text.bold },
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
