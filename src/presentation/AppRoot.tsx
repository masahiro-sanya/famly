import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthState, signOut, updateHouseholdId, updateProfileName } from '../application/auth';
import { addTask, useTasks, updateTaskTitle, deleteTask, updateTaskStatus, addThanksStamp, addReaction } from '../application/tasks';
import { AuthForm } from './components/AuthForm';
import { TasksView } from './components/TasksView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { TabButton } from './components/TabButton';
import { InputBar } from './components/InputBar';
import { useUIStore } from '../application/store';
import { Provider as PaperProvider } from 'react-native-paper';

export default function AppRoot() {
  const { user, profile } = useAuthState();
  const tasks = useTasks(profile?.householdId);
  const tab = useUIStore((s: any) => s.tab);
  const setTab = useUIStore((s: any) => s.setTab);
  const isEditingTask = useUIStore((s: any) => s.isEditingTask);
  const setIsEditingTask = useUIStore((s: any) => s.setEditingTask);

  if (!user) {
    return (
      <PaperProvider>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={24}
        >
          <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Famly</Text>
            <AuthForm />
            <StatusBar style="auto" />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
      >
        <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Famly</Text>
      <View style={styles.tabs}>
        <TabButton label="タスク" active={tab === 'tasks'} onPress={() => setTab('tasks')} />
        <TabButton label="プロフィール" active={tab === 'profile'} onPress={() => setTab('profile')} />
        <TabButton label="設定" active={tab === 'settings'} onPress={() => setTab('settings')} />
      </View>

      {tab === 'tasks' && (
        <TasksView
          currentUserId={user.uid}
          tasks={tasks}
          onUpdate={(id, newTitle) => updateTaskTitle(id, newTitle)}
          onDelete={(id) => deleteTask(id)}
          onEditingChange={setIsEditingTask}
          onToggleStatus={(id, next) =>
            updateTaskStatus(id, next, {
              id: user.uid,
              name: profile?.name ?? (user.email?.split('@')[0] ?? 'Unknown'),
            })}
          onThanks={(id) => addThanksStamp(id, user.uid)}
          onReact={(id, type) => addReaction(id, user.uid, type)}
        />
      )}
      {tab === 'tasks' && !isEditingTask && (
        <InputBar
          onSubmit={async (title) => {
            await addTask({
              title,
              userId: user.uid,
              householdId: profile?.householdId ?? user.uid,
            });
          }}
        />
      )}

      {tab === 'profile' && profile && (
        <ProfileView profile={profile} onSave={(name) => updateProfileName(user.uid, name.trim())} />
      )}

      {tab === 'settings' && profile && (
        <SettingsView
          householdId={profile.householdId}
          onSaveHouseholdId={(hid) => updateHouseholdId(user.uid, hid.trim() || user.uid)}
          onSignOut={() => signOut()}
        />
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
    </KeyboardAvoidingView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
});
