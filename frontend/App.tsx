import "./global.css";
import React from 'react';
import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Screens
import DashboardScreen from './src/screens/DashboardScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import EnergyScreen from './src/screens/EnergyScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';

// Navigation
import CustomBottomNav from './src/navigation/CustomBottomNav';

const Tab = createBottomTabNavigator();

const customTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#8aebff',
    background: '#05080A',
    card: '#101416',
    text: '#e0e3e6',
    border: '#1c2022',
    notification: '#ffb4ab',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={customTheme}>
        <Tab.Navigator
          tabBar={props => <CustomBottomNav {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Insights" component={InsightsScreen} />
          <Tab.Screen name="Energy" component={EnergyScreen} />
          <Tab.Screen name="Schedule" component={ScheduleScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
