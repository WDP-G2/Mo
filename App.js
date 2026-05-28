import { useState } from 'react';

import HomeScreen from './src/screens/home/HomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

export default function App() {
  const [authScreen, setAuthScreen] = useState('login');

  if (authScreen === 'register') {
    return <RegisterScreen onNavigateLogin={() => setAuthScreen('login')} />;
  }

  if (authScreen === 'home') {
    return <HomeScreen />;
  }

  return (
    <LoginScreen
      onLogin={() => setAuthScreen('home')}
      onNavigateRegister={() => setAuthScreen('register')}
    />
  );
}
