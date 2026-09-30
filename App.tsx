// Root Application Component for Cultus Outfit Planner
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from './src/lib/supabase';
import { ThemeProvider, useTheme } from './src/theme';
import { ThemedBackground } from './src/components/ThemedBackground';
import { Dock, TabKey } from './src/components/Dock';
import { LoginScreen } from './src/screens/LoginScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { AddScreen } from './src/screens/AddScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const MainNavigator: React.FC = () => {
  const { isDark } = useTheme();

  const [session, setSession] = useState<any | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [wardrobeRefreshKey, setWardrobeRefreshKey] = useState(0);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingAuth(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (checkingAuth) {
    return (
      <ThemedBackground>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      </ThemedBackground>
    );
  }

  if (!session) {
    return (
      <ThemedBackground>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <LoginScreen onLoginSuccess={() => setCheckingAuth(false)} />
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Views */}
      <View style={styles.screenWrapper}>
        {activeTab === 'today' && <TodayScreen key={`today_${wardrobeRefreshKey}`} />}
        {activeTab === 'wardrobe' && <WardrobeScreen key={`wardrobe_${wardrobeRefreshKey}`} />}
        {activeTab === 'history' && <HistoryScreen />}
        {activeTab === 'settings' && <SettingsScreen onSignOut={() => setSession(null)} />}
      </View>

      {/* Floating Pill Dock Navigation */}
      <Dock
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenAddModal={() => setAddModalVisible(true)}
      />

      {/* Add Garments Modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="fullScreen">
        <AddScreen
          onClose={() => setAddModalVisible(false)}
          onAddedSuccess={() => {
            setWardrobeRefreshKey((k) => k + 1);
          }}
        />
      </Modal>
    </ThemedBackground>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <MainNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
  },
});
