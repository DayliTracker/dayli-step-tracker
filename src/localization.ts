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
  detailsUnavailable: 'Step details are not available in this shell.',
  goalTitle: 'Daily step goal', languageTitle: 'Language', healthTitle: 'Health access',
  clearTitle: 'Clear app data', goalSubtitle: 'Current default: 8,000 steps',
  languageSubtitle: 'Choose a display language for this session',
  healthSubtitle: 'Health access settings',
  clearSubtitle: 'Confirmation preview only. Nothing will be deleted.',
  dataDisclosure: 'Your data stays on this device and may be lost if you uninstall the app or replace your device.',
  goalLater: 'Goal editing will be added later. 8,000 is the product default, not a saved setting.',
  languageTemporary: 'This choice is temporary and resets when the app is closed.',
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
    detailsUnavailable: 'Chi tiết bước chân chưa có trong phiên bản này.',
    goalTitle: 'Mục tiêu bước chân', languageTitle: 'Ngôn ngữ',
    healthTitle: 'Quyền truy cập Sức khỏe', clearTitle: 'Xóa dữ liệu ứng dụng',
    goalSubtitle: 'Mặc định hiện tại: 8.000 bước',
    languageSubtitle: 'Chọn ngôn ngữ hiển thị cho phiên này',
    healthSubtitle: 'Cài đặt quyền truy cập Sức khỏe',
    clearSubtitle: 'Chỉ xem trước xác nhận. Không có dữ liệu nào bị xóa.',
    dataDisclosure: 'Dữ liệu chỉ lưu trên thiết bị này và có thể mất khi gỡ ứng dụng hoặc đổi thiết bị.',
    goalLater: 'Chỉnh sửa mục tiêu sẽ có sau. 8.000 là mặc định của sản phẩm, chưa được lưu.',
    languageTemporary: 'Lựa chọn này chỉ tạm thời và sẽ đặt lại khi đóng ứng dụng.',
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
