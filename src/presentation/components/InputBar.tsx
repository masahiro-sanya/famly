import React, { useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';

export function InputBar({
  onSubmit,
  placeholder = 'やったこと（例: 洗濯物たたむ）',
}: {
  onSubmit: (text: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <TextInput
          placeholder={placeholder}
          value={text}
          onChangeText={setText}
          style={[styles.input, { flex: 1 }]}
          returnKeyType="done"
          onSubmitEditing={() => {
            const v = text.trim();
            if (!v) return;
            onSubmit(v);
            setText('');
          }}
        />
        <View style={{ width: 12 }} />
        <Button
          title="記録"
          onPress={() => {
            const v = text.trim();
            if (!v) return;
            onSubmit(v);
            setText('');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
