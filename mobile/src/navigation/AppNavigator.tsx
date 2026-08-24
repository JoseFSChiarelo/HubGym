import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AdminNoticeScreen } from '../screens/AdminNoticeScreen';
import { AthleteChatScreen } from '../screens/AthleteChatScreen';
import { AthleteEvolutionScreen } from '../screens/AthleteEvolutionScreen';
import { AthleteHomeScreen } from '../screens/AthleteHomeScreen';
import { AthleteProfileScreen } from '../screens/AthleteProfileScreen';
import { AthleteTrainingEditorScreen } from '../screens/AthleteTrainingEditorScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { PersonalChatScreen } from '../screens/PersonalChatScreen';
import { PersonalClientsScreen } from '../screens/PersonalClientsScreen';
import { PersonalDashboardScreen } from '../screens/PersonalDashboardScreen';
import { PersonalLibraryScreen } from '../screens/PersonalLibraryScreen';
import { PersonalProfileScreen } from '../screens/PersonalProfileScreen';
import { PersonalTrainingsScreen } from '../screens/PersonalTrainingsScreen';
import { TrainingDetailScreen } from '../screens/TrainingDetailScreen';
import { TrainingsScreen } from '../screens/TrainingsScreen';
import { theme } from '../theme';
import {
  AthleteTabParamList,
  AthleteTrainingStackParamList,
  AuthStackParamList,
  PersonalTabParamList
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AthleteTabs = createBottomTabNavigator<AthleteTabParamList>();
const PersonalTabs = createBottomTabNavigator<PersonalTabParamList>();
const AthleteTrainingStack = createNativeStackNavigator<AthleteTrainingStackParamList>();
const AdminStack = createNativeStackNavigator();

const LoadingView = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="large" color={theme.colors.accent} />
  </View>
);

const AthleteTrainingNavigator = () => (
  <AthleteTrainingStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: theme.colors.surfaceAlt },
      headerTintColor: theme.colors.text,
      headerTitleStyle: { fontFamily: theme.fonts.semibold },
      contentStyle: { backgroundColor: theme.colors.bg }
    }}
  >
    <AthleteTrainingStack.Screen
      name="TrainingList"
      component={TrainingsScreen}
      options={{ title: 'Treinos' }}
    />
    <AthleteTrainingStack.Screen
      name="TrainingEditor"
      component={AthleteTrainingEditorScreen}
      options={{ title: 'Criar treino' }}
    />
    <AthleteTrainingStack.Screen
      name="TrainingSession"
      component={TrainingDetailScreen}
      options={{ title: 'Treino' }}
    />
  </AthleteTrainingStack.Navigator>
);

const AthleteTabsNavigator = () => (
  <AthleteTabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.accent,
      tabBarInactiveTintColor: theme.colors.textDim,
      tabBarStyle: {
        backgroundColor: theme.colors.surfaceAlt,
        borderTopColor: theme.colors.border
      },
      tabBarIcon: ({ color, size }) => {
        const icons: Record<string, keyof typeof Feather.glyphMap> = {
          Home: 'home',
          Trainings: 'activity',
          Evolution: 'trending-up',
          Chat: 'message-square',
          Profile: 'user'
        };
        const name = icons[route.name] || 'circle';
        return <Feather name={name} size={size} color={color} />;
      }
    })}
  >
    <AthleteTabs.Screen name="Home" component={AthleteHomeScreen} options={{ title: 'Inicio' }} />
    <AthleteTabs.Screen name="Trainings" component={AthleteTrainingNavigator} options={{ title: 'Treinos' }} />
    <AthleteTabs.Screen name="Evolution" component={AthleteEvolutionScreen} options={{ title: 'Evolucao' }} />
    <AthleteTabs.Screen name="Chat" component={AthleteChatScreen} options={{ title: 'Chat' }} />
    <AthleteTabs.Screen name="Profile" component={AthleteProfileScreen} options={{ title: 'Perfil' }} />
  </AthleteTabs.Navigator>
);

const PersonalTabsNavigator = () => (
  <PersonalTabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.accentAlt,
      tabBarInactiveTintColor: theme.colors.textDim,
      tabBarStyle: {
        backgroundColor: theme.colors.surfaceAlt,
        borderTopColor: theme.colors.border
      },
      tabBarIcon: ({ color, size }) => {
        const icons: Record<string, keyof typeof Feather.glyphMap> = {
          Home: 'briefcase',
          Clients: 'users',
          Trainings: 'list',
          Library: 'book-open',
          Chat: 'message-square',
          Profile: 'user'
        };
        const name = icons[route.name] || 'circle';
        return <Feather name={name} size={size} color={color} />;
      }
    })}
  >
    <PersonalTabs.Screen name="Home" component={PersonalDashboardScreen} options={{ title: 'Inicio' }} />
    <PersonalTabs.Screen name="Clients" component={PersonalClientsScreen} options={{ title: 'Alunos' }} />
    <PersonalTabs.Screen name="Trainings" component={PersonalTrainingsScreen} options={{ title: 'Treinos' }} />
    <PersonalTabs.Screen name="Library" component={PersonalLibraryScreen} options={{ title: 'Biblioteca' }} />
    <PersonalTabs.Screen name="Chat" component={PersonalChatScreen} options={{ title: 'Chat' }} />
    <PersonalTabs.Screen name="Profile" component={PersonalProfileScreen} options={{ title: 'Perfil' }} />
  </PersonalTabs.Navigator>
);

export const AppNavigator = () => {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return <LoadingView />;
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <AuthStack.Navigator
        screenOptions={{
          headerShown: false
        }}
      >
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

  if (user.role === 'ATHLETE') {
    return <AthleteTabsNavigator />;
  }

  if (user.role === 'PERSONAL') {
    return <PersonalTabsNavigator />;
  }

  return (
    <AdminStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surfaceAlt },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontFamily: theme.fonts.semibold },
        contentStyle: { backgroundColor: theme.colors.bg }
      }}
    >
      <AdminStack.Screen name="AdminNotice" component={AdminNoticeScreen} options={{ title: 'Admin' }} />
    </AdminStack.Navigator>
  );
};
