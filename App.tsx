// Root Application Component for Cultus Outfit Planner
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, StatusBar, Modal, BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase, supabaseConfigError } from './src/lib/supabase';
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
  const { colors, isDark } = useTheme();

  const [session, setSession] = useState<any | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [wardrobeRefreshKey, setWardrobeRefreshKey] = useState(0);

  // Android hardware back button handler (Step 9)
  useEffect(() => {
    const onBackPress = () => {
      if (addModalVisible) {
        setAddModalVisible(false);
        return true; // handled
      }
      if (activeTab !== 'today') {
        setActiveTab('today');
        return true; // handled
      }
      return false; // let system exit
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [addModalVisible, activeTab]);

  useEffect(() => {
    if (supabaseConfigError) {
      setCheckingAuth(false);
      return;
    }

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

  // Configuration guard error screen (Step 4)
  if (supabaseConfigError) {
    return (
      <ThemedBackground>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.errorContainer}>
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.danger }]}>
            <Text style={[styles.errorTitle, { color: colors.danger }]}>Configuration Required</Text>
            <Text style={[styles.errorMessage, { color: colors.foreground }]}>{supabaseConfigError}</Text>
            <Text style={[styles.errorHint, { color: colors.foregroundMuted }]}>
              Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are correctly configured in your environment or EAS secrets.
            </Text>
          </View>
        </View>
      </ThemedBackground>
    );
  }

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    width: '100%',
    maxWidth: 420,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 12,
    lineHeight: 18,
  },
});
