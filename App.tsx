import { useState, type ReactElement } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
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

const RING_SIZE = 190;
const RING_RADIUS = 86;
const RING_SEGMENT_WIDTH = 5;
const RING_SEGMENT_HEIGHT = 11;
const DUCK_SCALE = 8;
const isPrimary = (screen: NavigationState['screen']) => screen === 'today' || screen === 'progress';

export default function App() {
  const [nav, setNav] = useState(createNavigationState);
  const [locale, setLocale] = useState<Locale>('en');
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
          <View key={localDateKey(date)} accessible
            accessibilityLabel={progressRowA11yLabel(
              label, { kind: 'unavailable' }, DEFAULT_GOAL, locale, copy,
            )}
            style={s.progressRow}>
            <View style={s.rowTop}>
              <Text style={s.rowTitle}>{label}</Text>
              <Text style={s.rowValue} accessibilityElementsHidden>— {copy.steps}</Text>
            </View>
            <Text style={s.muted}>{copy.goal}: {goal}</Text>
            <Text style={s.muted}>{copy.sourceUnavailable}</Text>
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
  root: { flex: 1, backgroundColor: '#FAF3E6' },
  content: { padding: 20, paddingTop: 14, paddingBottom: 28 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { flexShrink: 1, paddingRight: 8 },
  eyebrow: { color: '#806A55', fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  title: { color: '#5B4634', fontSize: 27, fontWeight: '800', marginTop: 3 },
  headerAction: { minHeight: 52, maxWidth: '48%', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#C8EBDD' },
  actionText: { color: '#5B4634', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  date: { color: '#806A55', fontSize: 16, marginBottom: 12 },
  card: { alignItems: 'center', padding: 20, borderRadius: 24, backgroundColor: '#FFFDF8',
    borderWidth: 1, borderColor: '#E8DDCB' },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringTrack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  ringSegment: {
    position: 'absolute', width: RING_SEGMENT_WIDTH, height: RING_SEGMENT_HEIGHT,
    borderRadius: RING_SEGMENT_WIDTH / 2, backgroundColor: '#E8DDCB',
    left: (RING_SIZE - RING_SEGMENT_WIDTH) / 2, top: (RING_SIZE - RING_SEGMENT_HEIGHT) / 2,
  },
  ringSegmentLit: { backgroundColor: '#5E9B7F' },
  ringCenter: { alignItems: 'center', maxWidth: 2 * (RING_RADIUS - RING_SEGMENT_HEIGHT - 8) },
  duck: { marginTop: 18, alignSelf: 'center' },
  cheer: { color: '#326D52', fontSize: 15, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  count: { color: '#5B4634', fontSize: 40, fontWeight: '800' },
  steps: { color: '#806A55', fontSize: 15 },
  summary: { color: '#5B4634', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 18 },
  divider: { height: 1, alignSelf: 'stretch', backgroundColor: '#E8DDCB', marginVertical: 18 },
  muted: { color: '#806A55', fontSize: 13, lineHeight: 20, marginTop: 5 },
  goal: { color: '#5B4634', fontSize: 22, fontWeight: '700', marginVertical: 4 },
  intro: { color: '#806A55', fontSize: 16, lineHeight: 24, marginBottom: 12 },
  progressRow: {
    minHeight: 84, padding: 14, marginBottom: 10, borderRadius: 17,
    backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E8DDCB',
  },
  rowTop: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    justifyContent: 'space-between', alignItems: 'center',
  },
  rowTitle: { color: '#5B4634', fontSize: 16, fontWeight: '700', flexShrink: 1 },
  rowValue: { color: '#5B4634', fontSize: 14, fontWeight: '700' },
  manualAction: {
    minHeight: 48, marginTop: 10, paddingHorizontal: 14, alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1,
    borderColor: '#D8CCB9', backgroundColor: '#F4FBF7',
  },
  manualActionText: { color: '#326D52', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  list: { gap: 10, marginTop: 14, alignSelf: 'stretch' },
  settingsRow: {
    minHeight: 70, flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 17, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E8DDCB',
  },
  rowCopy: { flex: 1, paddingRight: 8 },
  rowSubtitle: { color: '#806A55', fontSize: 13, lineHeight: 19, marginTop: 3 },
  chevron: { color: '#806A55', fontSize: 27 },
  danger: { color: '#8D3E34' },
  disclosure: { color: '#806A55', fontSize: 13, lineHeight: 20, marginTop: 18 },
  languageRow: {
    minHeight: 54, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#D8CCB9',
  },
  languageSelected: { backgroundColor: '#E8F5EE', borderColor: '#5E9B7F' },
  selected: { color: '#326D52', fontSize: 13, fontWeight: '700' },
  tabs: {
    flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1,
    borderColor: '#E8DDCB', backgroundColor: '#FFFDF8',
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  tabSelected: { backgroundColor: '#C8EBDD' },
  tabText: { color: '#806A55', fontSize: 15, fontWeight: '600' },
  tabTextSelected: { color: '#5B4634', fontWeight: '800' },
});
