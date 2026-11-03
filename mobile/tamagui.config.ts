import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';

const tamaguiConfig = createTamagui({
  ...defaultConfig,
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
