export type Locale = 'en' | 'vi';

const english = {
  todayTitle: 'Today', progressTitle: 'Progress', settingsTitle: 'Settings', steps: 'steps',
  goal: 'Daily goal',
  sourceUnavailable: 'No step data for this date yet.',
  todayLoading: 'Loading today’s steps…',
  todayEmpty: 'No steps recorded yet today.',
  todayError: 'Today’s steps could not be loaded.',
  ratioOfGoal: 'of goal', goalReached: 'Goal reached!',
  sourceLabel: 'Source', sourceHealth: 'Health', sourceManual: 'Manual',
  stepsUnavailable: 'Your step total will appear when step data is connected.',
  progressIntro: 'Today and your previous six local days.', dateToday: 'Today',
  addManualTotal: 'Add manual total', editManualTotal: 'Edit manual total',
  manualTitle: 'Manual total',
  manualInputLabel: 'Steps for this date',
  manualReplaces: 'This total is the step source for its date until you remove it.',
  manualSave: 'Save total', manualRemove: 'Remove total',
  manualSaved: 'Total saved for this date.', manualRemoved: 'Manual total removed.',
  manualInvalid: 'Enter a whole number from 0 to 100,000.',
  manualStorageError: 'Your manual total could not be read or saved on this device.',
  goalTitle: 'Daily step goal', languageTitle: 'Language', healthTitle: 'Health access',
  clearTitle: 'Clear app data', goalSubtitle: 'Current default: 8,000 steps',
  languageSubtitle: 'Choose a display language',
  healthSubtitle: 'Health access settings',
  clearSubtitle: 'Removes preferences, goal history, manual totals, and cached summaries.',
  dataDisclosure: 'Your data stays on this device and may be lost if you uninstall the app or replace your device.',
  goalInputLabel: 'Steps per day', goalPlaceholder: '8000',
  goalSave: 'Save goal',
  goalSaved: 'Goal saved from today; past days keep their goals.',
  goalInvalid: 'Enter a whole number from 1 to 100,000.',
  goalCurrent: 'Current goal',
  goalStorageError: 'Your goal could not be read or saved on this device.',
  languagePersisted: 'Your choice is saved on this device and applies until you change it.',
  languageDevice: 'Use device language',
  languageStorageError: 'Your language settings could not be read or saved on this device.',
  healthLater: 'Health controls arrive later; no permissions are requested or changed.',
  clearConfirmTitle: 'Clear app data?',
  clearConfirmMessage: 'This permanently removes your preferences, goal history, manual totals, and cached summaries, and restores the 8,000-step default goal and your device language. Health permissions remain unchanged.',
  clearConfirm: 'Clear data',
  clearStorageError: 'App data could not be cleared on this device.',
  cancel: 'Cancel', gotIt: 'Got it', english: 'English', vietnamese: 'Tiếng Việt',
  selected: 'Selected', openSettings: 'Open Settings', backToSettings: 'Back to Settings',
  backToToday: 'Back to Today', backToProgress: 'Back to Progress',
  petPoke: 'Poke the duck',
};

export type Copy = { [Key in keyof typeof english]: string };

const translations: Record<Locale, Copy> = {
  en: english,
  vi: {
    todayTitle: 'Hôm nay', progressTitle: 'Tiến độ', settingsTitle: 'Cài đặt', steps: 'bước',
    goal: 'Mục tiêu hằng ngày',
    sourceUnavailable: 'Chưa có dữ liệu bước chân cho ngày này.',
    todayLoading: 'Đang tải số bước hôm nay…',
    todayEmpty: 'Hôm nay chưa ghi nhận bước chân nào.',
    todayError: 'Không thể tải số bước hôm nay.',
    ratioOfGoal: 'của mục tiêu', goalReached: 'Hoàn thành mục tiêu!',
    sourceLabel: 'Nguồn', sourceHealth: 'Sức khỏe', sourceManual: 'Thủ công',
    stepsUnavailable: 'Tổng số bước sẽ hiển thị khi dữ liệu được kết nối.',
    progressIntro: 'Hôm nay và sáu ngày gần nhất theo giờ địa phương.', dateToday: 'Hôm nay',
    addManualTotal: 'Thêm tổng thủ công', editManualTotal: 'Sửa tổng thủ công',
    manualTitle: 'Tổng thủ công',
    manualInputLabel: 'Số bước cho ngày này',
    manualReplaces: 'Tổng này là nguồn số bước của ngày đó cho đến khi bạn xóa nó.',
    manualSave: 'Lưu tổng', manualRemove: 'Xóa tổng',
    manualSaved: 'Đã lưu tổng cho ngày này.', manualRemoved: 'Đã xóa tổng thủ công.',
    manualInvalid: 'Nhập số nguyên từ 0 đến 100.000.',
    manualStorageError: 'Không thể đọc hoặc lưu tổng thủ công trên thiết bị này.',
    goalTitle: 'Mục tiêu bước chân', languageTitle: 'Ngôn ngữ',
    healthTitle: 'Quyền truy cập Sức khỏe', clearTitle: 'Xóa dữ liệu ứng dụng',
    goalSubtitle: 'Mặc định hiện tại: 8.000 bước',
    languageSubtitle: 'Chọn ngôn ngữ hiển thị',
    healthSubtitle: 'Cài đặt quyền truy cập Sức khỏe',
    clearSubtitle: 'Xóa tùy chọn, lịch sử mục tiêu, tổng thủ công và bản tóm tắt đã lưu.',
    dataDisclosure: 'Dữ liệu chỉ lưu trên thiết bị này và có thể mất khi gỡ ứng dụng hoặc đổi thiết bị.',
    goalInputLabel: 'Số bước mỗi ngày', goalPlaceholder: '8000',
    goalSave: 'Lưu mục tiêu',
    goalSaved: 'Đã lưu mục tiêu từ hôm nay; các ngày trước giữ nguyên mục tiêu của chúng.',
    goalInvalid: 'Nhập số nguyên từ 1 đến 100.000.',
    goalCurrent: 'Mục tiêu hiện tại',
    goalStorageError: 'Không thể đọc hoặc lưu mục tiêu trên thiết bị này.',
    languagePersisted: 'Lựa chọn được lưu trên thiết bị này và có hiệu lực đến khi bạn thay đổi.',
    languageDevice: 'Dùng ngôn ngữ của thiết bị',
    languageStorageError: 'Không thể đọc hoặc lưu cài đặt ngôn ngữ trên thiết bị này.',
    healthLater: 'Cài đặt quyền Sức khỏe sẽ có sau; không yêu cầu hay thay đổi quyền.',
    clearConfirmTitle: 'Xóa dữ liệu ứng dụng?',
    clearConfirmMessage: 'Thao tác này xóa vĩnh viễn tùy chọn, lịch sử mục tiêu, tổng thủ công và bản tóm tắt đã lưu, đồng thời khôi phục mục tiêu mặc định 8.000 bước và ngôn ngữ theo thiết bị. Quyền truy cập Sức khỏe vẫn giữ nguyên.',
    clearConfirm: 'Xóa dữ liệu',
    clearStorageError: 'Không thể xóa dữ liệu ứng dụng trên thiết bị này.',
    cancel: 'Hủy', gotIt: 'Đã hiểu', english: 'English', vietnamese: 'Tiếng Việt',
    selected: 'Đã chọn', openSettings: 'Mở Cài đặt', backToSettings: 'Quay lại Cài đặt',
    backToToday: 'Quay lại Hôm nay', backToProgress: 'Quay lại Tiến độ',
    petPoke: 'Chạm vào vịt',
  },
};

export function getCopy(locale: Locale): Copy {
  return translations[locale];
}

/**
 * Vietnamese device locale → Vietnamese, otherwise English (phase-02 spec).
 * Tags are BCP 47 (`vi-VN`); any preferred locale starting with `vi` counts —
 * a device that lists Vietnamese among its preferred languages reads
 * Vietnamese. An empty or unrecognized list falls back to English.
 */
export function resolveDeviceLocale(languageTags: readonly string[]): Locale {
  return languageTags.some((tag) => tag.toLowerCase().startsWith('vi')) ? 'vi' : 'en';
}

/** The saved override wins; without one the device decides. */
export function resolveInitialLocale(device: Locale, override: Locale | null): Locale {
  return override ?? device;
}

/**
 * The mascot's voice (prototype/textless-shell v4): short lines the speech
 * bubble speaks. The bubble is the duck talking, never UI copy — home stays
 * textless otherwise. Pools are verbatim from the prototype's LINES so the
 * approved wording ships unchanged; `lead` and `homecome` sit ready for
 * issue #42's duck-led navigation to speak.
 */
export type BubbleCategory =
  | 'cute' | 'nudge' | 'poke' | 'walk' | 'cheer' | 'dizzy' | 'stroll'
  | 'lead' | 'homecome';

const mascotVoice: Record<Locale, Record<BubbleCategory, readonly string[]>> = {
  en: {
    cute: ['quack. just quack.', 'nice to see you', 'you smell like steps',
      'i napped so hard', 'daydreaming of bread'],
    nudge: ['let’s walk a bit!', 'a tiny stroll?', 'my legs are ready',
      'steps won’t count themselves', 'waddle with me?'],
    poke: ['hey! that tickles', 'oi!', 'again! again!'],
    walk: ['look at me gooo', 'waddle waddle', 'so speedy'],
    cheer: ['WE DID IT!', 'goal smashed!', 'best human ever'],
    dizzy: ['woaaah the room spins'],
    stroll: ['walk walk walk'],
    lead: ['this way!', 'follow me!', 'settings time!'],
    homecome: ['home again!', 'missed this spot', 'back to business'],
  },
  vi: {
    cute: ['quack. chỉ quack thôi.', 'thấy bạn vui quá', 'bạn thơm mùi bước chân',
      'giấc ngủ ngon quá', 'mơ về bánh mì'],
    nudge: ['đi bộ chút nhé!', 'đi dạo nhỏ thôi?', 'chân tui sẵn sàng',
      'bước chân tự đi được đâu', 'đi với tui nào?'],
    poke: ['nhi! ngứa đó', 'ơi!', 'làm nữa đi!'],
    walk: ['nhìn tui đi nào', 'cộc cộc cộc', 'nhanh dữ thần'],
    cheer: ['LÀM ĐƯỢC RỒI!', 'phá đảo mục tiêu!', 'bạn number one'],
    dizzy: ['woaaah đầu quay quá'],
    stroll: ['đi bộ đi bộ bộ'],
    lead: ['đi hướng này!', 'theo tui!', 'đến cài đặt nào!'],
    homecome: ['về nhà rồi!', 'thường chỗ này quá', 'làm việc thôi'],
  },
};

/** Idle chatter draws from the cute and nudge pools, 50/50 like the prototype. */
const IDLE_CATEGORIES = ['cute', 'nudge'] as const;
export type IdleCategory = (typeof IDLE_CATEGORIES)[number];
export type BubbleEventCategory = Exclude<BubbleCategory, IdleCategory>;

/** FNV-1a over a string — seeds the day's deterministic first line. */
function hashText(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function pickFrom(pool: readonly string[], random: () => number): string {
  return pool[Math.floor(random() * pool.length)];
}

/**
 * The day's first idle line: the same local date always speaks the same line,
 * with no persisted state — the date key alone picks it. Later lines are
 * random (idleLine), so the duck never repeats a script.
 */
export function dateIdleLine(dateKey: string, locale: Locale): string {
  const pool = [...mascotVoice[locale].cute, ...mascotVoice[locale].nudge];
  return pool[hashText(dateKey) % pool.length];
}

/** A random idle line — cute or nudge, 50/50 like the prototype's chat(). */
export function idleLine(locale: Locale, random: () => number = Math.random): string {
  const category = IDLE_CATEGORIES[Math.floor(random() * IDLE_CATEGORIES.length)];
  return pickFrom(mascotVoice[locale][category], random);
}

/** A random line for an event category (poke, walk, cheer, dizzy, stroll, …). */
export function eventLine(
  category: BubbleEventCategory, locale: Locale, random: () => number = Math.random,
): string {
  return pickFrom(mascotVoice[locale][category], random);
}

/** Every line in a category — the surface #42's lead/homecome greetings reuse. */
export function bubbleLines(category: BubbleCategory, locale: Locale): readonly string[] {
  return mascotVoice[locale][category];
}
