export type Locale = 'en' | 'vi';

const english = {
  todayTitle: 'Today', progressTitle: 'Progress', settingsTitle: 'Settings', steps: 'steps',
  goal: 'Daily goal',
  sourceUnavailable: 'Step source is not available in this shell.',
  todayLoading: 'Loading today’s steps…',
  todayEmpty: 'No steps recorded yet today.',
  todayError: 'Today’s steps could not be loaded.',
  ratioOfGoal: 'of goal', goalReached: 'Goal reached!',
  sourceLabel: 'Source', sourceHealth: 'Health', sourceManual: 'Manual',
  stepsUnavailable: 'Your step total will appear when step data is connected.',
  progressIntro: 'Today and your previous six local days.', dateToday: 'Today',
  addManualTotal: 'Add manual total',
  manualPreviewTitle: 'Manual total',
  manualPreviewMessage: 'Manual entry for a date arrives in a later phase. Nothing was saved.',
  goalTitle: 'Daily step goal', languageTitle: 'Language', healthTitle: 'Health access',
  clearTitle: 'Clear app data', goalSubtitle: 'Current default: 8,000 steps',
  languageSubtitle: 'Choose a display language',
  healthSubtitle: 'Health access settings',
  clearSubtitle: 'Confirmation preview only. Nothing will be deleted.',
  dataDisclosure: 'Your data stays on this device and may be lost if you uninstall the app or replace your device.',
  goalLater: 'Goal editing will be added later. 8,000 is the product default, not a saved setting.',
  languagePersisted: 'Your choice is saved on this device and applies until you change it.',
  languageDevice: 'Use device language',
  languageStorageError: 'Your language settings could not be read or saved on this device.',
  healthLater: 'Health controls will be added later. This shell does not request or change permissions.',
  clearConfirmTitle: 'Clear app data?',
  clearConfirmMessage: 'This is a preview only. No app data will be cleared in this phase.',
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
    sourceUnavailable: 'Nguồn dữ liệu bước chân chưa có trong phiên bản này.',
    todayLoading: 'Đang tải số bước hôm nay…',
    todayEmpty: 'Hôm nay chưa ghi nhận bước chân nào.',
    todayError: 'Không thể tải số bước hôm nay.',
    ratioOfGoal: 'của mục tiêu', goalReached: 'Hoàn thành mục tiêu!',
    sourceLabel: 'Nguồn', sourceHealth: 'Sức khỏe', sourceManual: 'Thủ công',
    stepsUnavailable: 'Tổng số bước sẽ hiển thị khi dữ liệu được kết nối.',
    progressIntro: 'Hôm nay và sáu ngày gần nhất theo giờ địa phương.', dateToday: 'Hôm nay',
    addManualTotal: 'Thêm tổng thủ công',
    manualPreviewTitle: 'Tổng thủ công',
    manualPreviewMessage: 'Nhập thủ công cho một ngày sẽ có trong giai đoạn sau. Chưa có gì được lưu.',
    goalTitle: 'Mục tiêu bước chân', languageTitle: 'Ngôn ngữ',
    healthTitle: 'Quyền truy cập Sức khỏe', clearTitle: 'Xóa dữ liệu ứng dụng',
    goalSubtitle: 'Mặc định hiện tại: 8.000 bước',
    languageSubtitle: 'Chọn ngôn ngữ hiển thị',
    healthSubtitle: 'Cài đặt quyền truy cập Sức khỏe',
    clearSubtitle: 'Chỉ xem trước xác nhận. Không có dữ liệu nào bị xóa.',
    dataDisclosure: 'Dữ liệu chỉ lưu trên thiết bị này và có thể mất khi gỡ ứng dụng hoặc đổi thiết bị.',
    goalLater: 'Chỉnh sửa mục tiêu sẽ có sau. 8.000 là mặc định của sản phẩm, chưa được lưu.',
    languagePersisted: 'Lựa chọn được lưu trên thiết bị này và có hiệu lực đến khi bạn thay đổi.',
    languageDevice: 'Dùng ngôn ngữ của thiết bị',
    languageStorageError: 'Không thể đọc hoặc lưu cài đặt ngôn ngữ trên thiết bị này.',
    healthLater: 'Cài đặt quyền Sức khỏe sẽ có sau. Phiên bản này không yêu cầu hoặc thay đổi quyền.',
    clearConfirmTitle: 'Xóa dữ liệu ứng dụng?',
    clearConfirmMessage: 'Đây chỉ là màn hình xem trước. Dữ liệu sẽ không bị xóa trong giai đoạn này.',
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
