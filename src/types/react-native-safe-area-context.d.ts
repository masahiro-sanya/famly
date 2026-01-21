declare module 'react-native-safe-area-context' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';
  export const SafeAreaView: React.ComponentType<ViewProps & { edges?: ('top'|'bottom'|'left'|'right')[] }>;
  export function useSafeAreaInsets(): { top: number; bottom: number; left: number; right: number };
  export const SafeAreaProvider: React.ComponentType<{ children?: React.ReactNode }>;
}

