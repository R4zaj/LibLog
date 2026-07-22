import { defaultConfig as config } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';

const tamaguiConfig = createTamagui(config);

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig;
