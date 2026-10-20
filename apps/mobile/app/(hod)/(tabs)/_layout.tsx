import { Tabs } from 'expo-router';

import { AppHeaderLogo } from '@/src/components/AppHeaderLogo';
import { AnimatedTabIcon } from '@/src/components/AnimatedTabIcon';
import { useNavigationTheme } from '@/src/hooks/useNavigationTheme';

export default function HodTabLayout() {
  const nav = useNavigationTheme();

  return (
    <Tabs screenOptions={{ ...nav, headerShown: true, headerLeft: () => <AppHeaderLogo size={28} />, animation: 'shift', transitionSpec: { animation: 'timing', config: { duration: 230 } } }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'HOD Dashboard',
          tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="clipboard" size={size} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="person-circle" size={size} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
