const SYSTEM_URL = '/plugin/onoff-builder-bridge/page.php?id=bacaraai-system';

export const PLATFORM_LINKS = {
  loginCheck: '/bbs/login_check.php',
  register: '#', // 공개 회원가입 비활성 — 관리자 발급만
  passwordLost: '/bbs/password_lost.php',
  system: SYSTEM_URL,
  /** 루트 = 플랫폼 로그인 */
  login: '/#/',
  /** 기존 마케팅 랜딩(자세히보기) */
  about: '/#/about',
  logout: '/bbs/logout.php?url=/',
  dashboard: SYSTEM_URL,
  walletBalance: '/plugin/bacara_wallet/api/balance.php',
  telegram: '#',
  youtube: '#',
  latestVideo: '#',
};

export const URLS = {
  PLATFORM_LOGIN: PLATFORM_LINKS.login,
  PLATFORM_DASHBOARD: PLATFORM_LINKS.dashboard,
  TELEGRAM: PLATFORM_LINKS.telegram,
  YOUTUBE_CHANNEL: PLATFORM_LINKS.youtube,
  LATEST_YOUTUBE_VIDEO: PLATFORM_LINKS.latestVideo,
};
