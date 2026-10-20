import { Ionicons } from '@expo/vector-icons';
import { Href, router, Tabs } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedTabIcon } from '@/src/components/AnimatedTabIcon';
import { StudentScreenHeader } from '@/src/components/StudentScreenHeader';
import { useTheme } from '@/src/hooks/useTheme';
import { borderRadius, spacing } from '@/src/theme';
import { useNavigationTheme } from '@/src/hooks/useNavigationTheme';

const QUICK_LINKS = [
  { id: 'code', label: 'Code Together', shortLabel: 'Code', icon: 'code-slash' as const, route: '/(student)/leetcode' as Href, color: '#6C4CF6', soft: '#EEE9FF' },
  { id: 'network', label: 'Campus Network', shortLabel: 'Network', icon: 'people' as const, route: '/(student)/network' as Href, color: '#087F73', soft: '#DDF8F1' },
  { id: 'feed', label: 'Network Feed', shortLabel: 'Feed', icon: 'newspaper' as const, route: '/(student)/network-feed' as Href, color: '#D65F17', soft: '#FFF0D8' },
];

function StudentQuickLinks() {
  const { colors, preference } = useTheme();
  const batmanMode = preference === 'batman';
  return <View style={[styles.quickShell, { backgroundColor: colors.navBackground, borderBottomColor: colors.accentBorder }]}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickContent}>
      <Text style={[styles.quickEyebrow, { color: colors.textMuted }]}>JUMP TO</Text>
      {QUICK_LINKS.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.label}`} onPress={() => router.push(item.route)} style={[styles.quickLink, { backgroundColor: batmanMode ? colors.accentBg : item.soft, borderColor: batmanMode ? colors.accentBorder : item.soft }]}>
        <View style={[styles.quickIcon, { backgroundColor: batmanMode ? colors.primary : item.color }]}><Ionicons name={item.icon} size={14} color={batmanMode ? colors.inverseText : '#FFF'} /></View>
        <Text style={[styles.quickLabel, { color: batmanMode ? colors.primary : item.color }]}>{item.shortLabel}</Text>
        <Ionicons name="arrow-forward" size={12} color={batmanMode ? colors.primary : item.color} />
      </Pressable>)}
    </ScrollView>
  </View>;
}

export default function StudentTabLayout() {
  const nav = useNavigationTheme();
  const { colors, preference } = useTheme();
  const pageBackground = (normal: string) => preference === 'batman' ? colors.background : normal;

  return (
    <View style={{ flex: 1 }}>
      <StudentScreenHeader />
      <StudentQuickLinks />
      <Tabs screenOptions={{ ...nav, headerShown: false, animation: 'shift', transitionSpec: { animation: 'timing', config: { duration: 230 } } }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            sceneStyle: { backgroundColor: pageBackground('#F6F2FF') },
            tabBarActiveTintColor: '#6C4CF6',
            tabBarActiveBackgroundColor: '#EEE9FF',
            tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="home" size={size} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            sceneStyle: { backgroundColor: pageBackground('#FFF7EC') },
            tabBarActiveTintColor: '#D66B13',
            tabBarActiveBackgroundColor: '#FFF0D8',
            tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="calendar" size={size} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="competitions"
          options={{
            title: 'Compete',
            sceneStyle: { backgroundColor: pageBackground('#FFF0F5') },
            tabBarActiveTintColor: '#D73A72',
            tabBarActiveBackgroundColor: '#FFE5EF',
            tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="trophy" size={size} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="tools"
          options={{
            title: 'Tools',
            sceneStyle: { backgroundColor: pageBackground('#FFF9F5') },
            tabBarActiveTintColor: '#7B51E8',
            tabBarActiveBackgroundColor: '#E9E2FF',
            tabBarIcon: ({ color, size, focused }) => <AnimatedTabIcon name="briefcase" size={size} color={color} focused={focused} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  quickShell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quickContent: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  quickEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 2,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingRight: 10,
    paddingLeft: 4,
    paddingVertical: 4,
  },
  quickIcon: {
    width: 25,
    height: 25,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '900',
  },
});
