const SYSTEM_URL = '/plugin/onoff-builder-bridge/page.php?id=bacaraai-system';

export const PLATFORM_LINKS = {
  loginCheck: '/bbs/login_check.php',
  register: '/bbs/register.php',
  passwordLost: '/bbs/password_lost.php',
  system: SYSTEM_URL,
  login: '/#/login',
  dashboard: SYSTEM_URL,
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
