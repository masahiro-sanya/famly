import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import AppRoot from './src/presentation/AppRoot';

// SafeAreaProvider は useSafeAreaInsets() の前提。
// 未設置だと insets を参照するコンポーネントが実行時に例外を投げる。
// initialWindowMetrics を渡すと初回描画時のレイアウトのちらつきを防げる。
export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppRoot />
    </SafeAreaProvider>
  );
}
