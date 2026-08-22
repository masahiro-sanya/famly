import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, IconButton, TextInput, useTheme } from 'react-native-paper';
import type { FamlyTheme } from '../theme';

export function InputBar({
  onSubmit,
  placeholder = 'やったこと（例: 洗濯物たたむ）',
}: {
  onSubmit: (text: string) => void;
  placeholder?: string;
}) {
  const { colors } = useTheme<FamlyTheme>();
  const [text, setText] = useState('');
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onSubmit(v);
    setText('');
  };

  const styles = useMemo(() => ({
    wrapper: { position: 'absolute' as const, left: 16, right: 16, bottom: 16 },
    bar: { borderRadius: 16 },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingLeft: 12, paddingRight: 4, paddingVertical: 4 },
    input: { flex: 1, backgroundColor: colors.inputBackground },
  }), [colors]);

  return (
    <View style={styles.wrapper}>
      <Card style={styles.bar} mode="elevated">
        <View style={styles.row}>
          <TextInput
            placeholder={placeholder}
            value={text}
            onChangeText={setText}
            mode="outlined"
            style={styles.input}
            dense
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <IconButton
            icon="send"
            mode="contained"
            size={22}
            onPress={submit}
            disabled={!text.trim()}
          />
        </View>
      </Card>
    </View>
  );
}
