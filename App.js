import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setAuthToken } from './src/api/client';
import HomeScreen from './src/screens/home/HomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

export default function App() {
  const [authScreen, setAuthScreen] = useState('home');
  const [session, setSession] = useState({ token: null, user: null });

  function handleAuthenticated(auth) {
    const nextSession = {
      token: auth?.token || null,
      user: auth?.user || null,
    };

    setAuthToken(nextSession.token);
    setSession(nextSession);
    setAuthScreen('home');
  }

  function handleLogout() {
    setAuthToken(null);
    setSession({ token: null, user: null });
    setAuthScreen('home');
  }

  return (
    <SafeAreaProvider>
      {authScreen === 'register' && (
        <RegisterScreen onNavigateLogin={() => setAuthScreen('login')} />
      )}

      {authScreen === 'home' && (
        <HomeScreen
          user={session.user}
          onLogout={handleLogout}
          onNavigateLogin={() => setAuthScreen('login')}
          onNavigateRegister={() => setAuthScreen('register')}
        />
      )}

      {authScreen === 'login' && (
        <LoginScreen
          onLogin={handleAuthenticated}
          onNavigateRegister={() => setAuthScreen('register')}
        />
      )}
    </SafeAreaProvider>
  );
}
