import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';
import { Platform } from 'react-native';

const systemFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});

const fonts = { ...defaultConfig.fonts };
if (fonts.body) {
  fonts.body = { ...fonts.body, family: systemFont };
}
if (fonts.heading) {
  fonts.heading = { ...fonts.heading, family: systemFont };
}

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  fonts,
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false as const,
    styleCompat: 'react-native' as const,
  },
});

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig;
