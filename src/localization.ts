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
  goalSaved: 'Goal saved. It applies from today; past days keep their goals.',
  goalInvalid: 'Enter a whole number from 1 to 100,000.',
  goalCurrent: 'Current goal',
  goalStorageError: 'Your goal could not be read or saved on this device.',
  languagePersisted: 'Your choice is saved on this device and applies until you change it.',
  languageDevice: 'Use device language',
  languageStorageError: 'Your language settings could not be read or saved on this device.',
  healthLater: 'Health controls will be added later. This shell does not request or change permissions.',
  clearConfirmTitle: 'Clear app data?',
  clearConfirmMessage: 'This permanently removes your preferences, goal history, manual totals, and cached summaries, and restores the 8,000-step default goal and your device language. Health permissions remain unchanged.',
  clearConfirm: 'Clear data',
  clearStorageError: 'App data could not be cleared on this device.',
  cancel: 'Cancel', gotIt: 'Got it', english: 'English', vietnamese: 'Tiếng Việt',
  selected: 'Selected', openSettings: 'Open Settings', backToSettings: 'Back to Settings',
  backToToday: 'Back to Today', backToProgress: 'Back to Progress',
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
    goalSaved: 'Đã lưu mục tiêu. Áp dụng từ hôm nay; các ngày trước giữ nguyên mục tiêu của chúng.',
    goalInvalid: 'Nhập số nguyên từ 1 đến 100.000.',
    goalCurrent: 'Mục tiêu hiện tại',
    goalStorageError: 'Không thể đọc hoặc lưu mục tiêu trên thiết bị này.',
    languagePersisted: 'Lựa chọn được lưu trên thiết bị này và có hiệu lực đến khi bạn thay đổi.',
    languageDevice: 'Dùng ngôn ngữ của thiết bị',
    languageStorageError: 'Không thể đọc hoặc lưu cài đặt ngôn ngữ trên thiết bị này.',
    healthLater: 'Cài đặt quyền Sức khỏe sẽ có sau. Phiên bản này không yêu cầu hoặc thay đổi quyền.',
    clearConfirmTitle: 'Xóa dữ liệu ứng dụng?',
    clearConfirmMessage: 'Thao tác này xóa vĩnh viễn tùy chọn, lịch sử mục tiêu, tổng thủ công và bản tóm tắt đã lưu, đồng thời khôi phục mục tiêu mặc định 8.000 bước và ngôn ngữ theo thiết bị. Quyền truy cập Sức khỏe vẫn giữ nguyên.',
    clearConfirm: 'Xóa dữ liệu',
    clearStorageError: 'Không thể xóa dữ liệu ứng dụng trên thiết bị này.',
    cancel: 'Hủy', gotIt: 'Đã hiểu', english: 'English', vietnamese: 'Tiếng Việt',
    selected: 'Đã chọn', openSettings: 'Mở Cài đặt', backToSettings: 'Quay lại Cài đặt',
    backToToday: 'Quay lại Hôm nay', backToProgress: 'Quay lại Tiến độ',
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
