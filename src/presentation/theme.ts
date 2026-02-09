// Famly テーマ定義（MD3 ライト/ダーク + カスタムセマンティックトークン）
// コーラルピンク + やわらかブルー。子育て系アプリ（みてね・トツキトオカ等）を参考。
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

type FamlyCustomColors = {
  textSecondary: string;
  textMuted: string;
  textHint: string;
  textDark: string;
  textOnDone: string;
  inputBackground: string;
  divider: string;
  doneBackground: string;
  dangerText: string;
  dangerBorder: string;
  dangerBackground: string;
  brandTitle: string;
  modalBackground: string;
  emojiButtonBackground: string;
};

export type FamlyTheme = MD3Theme & {
  colors: MD3Theme['colors'] & FamlyCustomColors;
};

export const lightTheme: FamlyTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Primary: やさしいコーラルピンク
    primary: '#E08D7B',
    onPrimary: '#FFFFFF',
    primaryContainer: '#FFDAD3',
    onPrimaryContainer: '#3A0A02',
    // Secondary: くすんだスカイブルー
    secondary: '#7EAAB8',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#D1E7EF',
    onSecondaryContainer: '#0E2A33',
    // Tertiary: ウォームベージュ
    tertiary: '#B5A28E',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#F0E0D0',
    onTertiaryContainer: '#2E2114',
    // Error
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
    // Surfaces
    background: '#FFFBF9',
    onBackground: '#291816',
    surface: '#FFFBF9',
    onSurface: '#291816',
    surfaceVariant: '#F5E0DB',
    onSurfaceVariant: '#5D4037',
    surfaceDisabled: 'rgba(41, 24, 22, 0.12)',
    onSurfaceDisabled: 'rgba(41, 24, 22, 0.38)',
    // Utility
    outline: '#8D7B76',
    outlineVariant: '#E0CEC8',
    inverseSurface: '#3E2723',
    inverseOnSurface: '#FFEDE9',
    inversePrimary: '#FFB4A5',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(75, 48, 43, 0.4)',
    // Elevation
    elevation: {
      level0: 'transparent',
      level1: '#FEF0EC',
      level2: '#FCE8E2',
      level3: '#FAE0D9',
      level4: '#F9DDD5',
      level5: '#F7D8CF',
    },
    // Custom: セマンティックトークン
    textSecondary: '#5D4037',
    textMuted: '#8D7B76',
    textHint: '#A8968F',
    textDark: '#3E2723',
    textOnDone: '#8D7B76',
    inputBackground: '#FFFFFF',
    divider: '#E0CEC8',
    doneBackground: '#F5E0DB',
    dangerText: '#BA1A1A',
    dangerBorder: '#BA1A1A',
    dangerBackground: '#BA1A1A',
    brandTitle: '#E08D7B',
    modalBackground: '#FFFFFF',
    emojiButtonBackground: '#F5E0DB',
  },
};

export const darkTheme: FamlyTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // Primary: ライトコーラル
    primary: '#FFB4A5',
    onPrimary: '#5C1A0C',
    primaryContainer: '#7A3224',
    onPrimaryContainer: '#FFDAD3',
    // Secondary: ライトスカイブルー
    secondary: '#A4D4E4',
    onSecondary: '#1B3C47',
    secondaryContainer: '#33535F',
    onSecondaryContainer: '#D1E7EF',
    // Tertiary: ライトベージュ
    tertiary: '#D5C3AD',
    onTertiary: '#3D3022',
    tertiaryContainer: '#554638',
    onTertiaryContainer: '#F0E0D0',
    // Error
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    // Surfaces
    background: '#1A1110',
    onBackground: '#F0DFDA',
    surface: '#1A1110',
    onSurface: '#F0DFDA',
    surfaceVariant: '#53433F',
    onSurfaceVariant: '#D8C2BB',
    surfaceDisabled: 'rgba(240, 223, 218, 0.12)',
    onSurfaceDisabled: 'rgba(240, 223, 218, 0.38)',
    // Utility
    outline: '#A08D87',
    outlineVariant: '#53433F',
    inverseSurface: '#F0DFDA',
    inverseOnSurface: '#3E2723',
    inversePrimary: '#E08D7B',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(75, 48, 43, 0.4)',
    // Elevation
    elevation: {
      level0: 'transparent',
      level1: '#271917',
      level2: '#2E1F1C',
      level3: '#362522',
      level4: '#382723',
      level5: '#3D2B27',
    },
    // Custom: セマンティックトークン
    textSecondary: '#D8C2BB',
    textMuted: '#A08D87',
    textHint: '#8D7B76',
    textDark: '#F0DFDA',
    textOnDone: '#A08D87',
    inputBackground: '#2E1F1C',
    divider: '#53433F',
    doneBackground: '#53433F',
    dangerText: '#FFB4AB',
    dangerBorder: '#FFB4AB',
    dangerBackground: '#93000A',
    brandTitle: '#FFB4A5',
    modalBackground: '#2E1F1C',
    emojiButtonBackground: '#53433F',
  },
};

// 後方互換: 既存の `theme` インポートをそのまま使えるように
export const theme = lightTheme;
