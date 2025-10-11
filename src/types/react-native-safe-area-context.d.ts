declare module 'react-native-safe-area-context' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';
  export const SafeAreaView: React.ComponentType<ViewProps & { edges?: ('top'|'bottom'|'left'|'right')[] }>;
}

