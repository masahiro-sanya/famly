// 描画中の例外を受け止める最上位のエラーバウンダリ。
// これがないと例外がそのまま伝播し、本番ビルドでは白画面のまま操作不能になる。
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 外部のクラッシュレポート(Sentry / Crashlytics 等)を導入したらここで送信する
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>予期しないエラーが発生しました</Text>
        <Text style={styles.message}>{error.message}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => this.setState({ error: null })}
        >
          <Text style={styles.buttonLabel}>再読み込み</Text>
        </Pressable>
      </View>
    );
  }
}

// PaperProvider の外側で使うため、テーマに依存しない最小限のスタイルにしている
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#FFFBF9',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#291816', textAlign: 'center' },
  message: { fontSize: 14, color: '#5D4037', textAlign: 'center' },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#E08D7B',
  },
  buttonLabel: { color: '#FFFFFF', fontWeight: '600' },
});
