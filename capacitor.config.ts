import type { CapacitorConfig } from '@capacitor/cli';

// TwitterSL v2 — Capacitor shell. Web build output (dist/) is the single
// artifact reused on web, Android, and iOS. Native plugins always sit behind
// src/native/* adapters with a web fallback (see agents/rules/02).
const config: CapacitorConfig = {
  appId: 'com.twittersl.island',
  appName: 'TwitterSL',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
    },
  },
};

export default config;
