import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { dateIdleLine, eventLine, idleLine, type Locale } from '../src/localization';
import { colors, radius, spacing, typeFace, typeLeading, typeSize } from '../src/tokens';

/** How long a line holds before it fades (prototype v4 showBubble: ~4s). */
const HOLD_MS = 4000;
/** The prototype's .35s opacity/transform talk-box transition. */
const FADE_MS = 350;
/** The first line waits for the home hero to settle, then speaks at once. */
const FIRST_LINE_DELAY_MS = 2000;
/** Idle chatter cadence: 18s + 0–7s → a line every ~18–25s (v4 chat()). */
const CHATTER_MIN_MS = 18000;
const CHATTER_VARIANCE_MS = 7000;
/** Component sizing stays beside the component that owns it (src/tokens.ts). */
const BUBBLE_MAX_WIDTH = 230;
const TAIL_SIZE = 12;
/** The bubble's vertical padding: the prototype's 7px optical step (the
 *  spacing scale has no 7 — component-owned sizing stays beside its owner). */
const BUBBLE_PAD_Y = 7;

/** Mascot events the bubble speaks; `dizzy`/`stroll` wait for #43, `lead`/`homecome` for #42. */
export type BubbleEventCategory =
  | 'poke' | 'walk' | 'cheer' | 'dizzy' | 'stroll' | 'lead' | 'homecome';

export type BubbleEvent = { category: BubbleEventCategory; nonce: number };

type ChatBubbleProps = {
  locale: Locale;
  /** Today's local date key — seeds the deterministic first idle line. */
  dateKey: string;
  /** Newest event to speak; a bumped nonce replays even a repeated category. */
  event: BubbleEvent | null;
};

/**
 * The duck's talk box (prototype/textless-shell v4): floats above the mascot,
 * speaks the mascot's voice — an idle cute/nudge line every ~18–25s (the
 * day's first picked deterministically from the date, never persisted), and
 * an event line whenever the mascot pokes, walks, or celebrates. Each line
 * holds ~4s and fades.
 *
 * The bubble is decoration: `pointerEvents="none"` so a tap on it lands on
 * whatever sits beneath, and both platform flags keep it out of the
 * accessibility order — the Today group's label stays the screen-reader
 * source, and the duck's tap target keeps its own label.
 */
export default function ChatBubble({ locale, dateKey, event }: ChatBubbleProps) {
  const [line, setLine] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => {
      timers.push(setTimeout(() => { if (alive) fn(); }, ms));
    };
    const speak = (text: string) => {
      opacity.stopAnimation();
      rise.stopAnimation();
      opacity.setValue(0);
      rise.setValue(6);
      setLine(text);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
      ]).start();
      later(HOLD_MS, () => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
          Animated.timing(rise, { toValue: 6, duration: FADE_MS, useNativeDriver: true }),
        ]).start();
      });
    };
    const chatter = () => {
      speak(idleLine(locale));
      later(CHATTER_MIN_MS + Math.random() * CHATTER_VARIANCE_MS, chatter);
    };
    if (event) {
      speak(eventLine(event.category, locale));
      later(CHATTER_MIN_MS + Math.random() * CHATTER_VARIANCE_MS, chatter);
    } else {
      later(FIRST_LINE_DELAY_MS, () => {
        speak(dateIdleLine(dateKey, locale));
        later(CHATTER_MIN_MS + Math.random() * CHATTER_VARIANCE_MS, chatter);
      });
    }
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      opacity.stopAnimation();
      rise.stopAnimation();
    };
  }, [locale, dateKey, event, opacity, rise]);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={s.dock}
    >
      {line !== null && (
        <Animated.View style={[s.bubble, { opacity, transform: [{ translateY: rise }] }]}>
          <Text style={s.line}>{line}</Text>
          <View style={s.tail} />
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // The dock sits in the pet slot's reserved headroom above the duck, so the
  // bubble grows upward into empty space and the step pill below never moves.
  dock: { alignItems: 'center', marginBottom: spacing.lg },
  // The prototype's talk box: card surface, 2px border, 14pt corners, 230pt
  // cap, 7/12 padding, centered 13pt Lexend semibold.
  bubble: {
    maxWidth: BUBBLE_MAX_WIDTH,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.xxl,
    paddingVertical: BUBBLE_PAD_Y,
    alignItems: 'center',
  },
  line: {
    color: colors.text,
    fontSize: typeSize.caption,
    lineHeight: typeLeading.dense,
    fontFamily: typeFace.text.semibold,
    textAlign: 'center',
  },
  // The rotated-square tail pokes 7pt out of the bubble's bottom edge
  // (prototype .bubble::after bottom: -7px); its card fill covers the
  // bubble's border run behind it, leaving the open notch.
  tail: {
    position: 'absolute',
    bottom: -TAIL_SIZE / 2 - 1,
    left: '50%',
    marginLeft: -TAIL_SIZE / 2,
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
});
