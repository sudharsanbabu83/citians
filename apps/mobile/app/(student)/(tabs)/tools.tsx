import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBottomContentPadding } from '@/src/hooks/useBottomContentPadding';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';

export default function ToolsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomPadding = useBottomContentPadding({ extra: spacing.lg, includeTabBar: true });

  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
    <View style={styles.hero}>
      <View style={styles.heroIcon}><Ionicons name="briefcase" size={25} color="#FFFFFF" /></View>
      <Text style={styles.eyebrow}>CITIANS TOOLKIT</Text>
      <Text style={styles.heroTitle}>Build something useful.</Text>
      <Text style={styles.heroText}>Practical tools to help you study, focus, and get ready for what comes next.</Text>
    </View>
    <Text style={styles.sectionTitle}>Career tools</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Resume Builder" onPress={() => router.push('/(student)/resume-builder' as Href)} style={styles.toolCard}>
      <View style={styles.toolIcon}><Ionicons name="document-text" size={25} color="#D45772" /></View>
      <View style={styles.toolCopy}><Text style={styles.toolTitle}>Resume Builder</Text><Text style={styles.toolText}>Fill in your details and export a clean, A4-ready resume using the Citians template.</Text><View style={styles.toolAction}><Text style={styles.toolActionText}>Start building</Text><Ionicons name="arrow-forward" size={16} color="#7B51E8" /></View></View>
    </Pressable>
    <View style={styles.comingSoon}><Ionicons name="sparkles-outline" size={18} color="#7B51E8" /><Text style={styles.comingSoonText}>More student tools are on the way.</Text></View>
  </ScrollView>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  hero: { backgroundColor: '#E9E2FF', borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: '#D7C9FF' },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#7B51E8', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  eyebrow: { color: '#7B51E8', fontFamily: fontFamilies.mono, fontSize: 10, letterSpacing: 1.2 },
  heroTitle: { color: '#29233D', fontFamily: 'serif', fontSize: 31, lineHeight: 36, fontWeight: '700', marginTop: spacing.sm },
  heroText: { color: '#6D6880', fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  sectionTitle: { color: theme.colors.text, fontFamily: fontFamilies.display, fontSize: 21, marginTop: spacing.sm },
  toolCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: '#FFF0C2', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#F6D982', padding: spacing.md },
  toolIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFE0E8', alignItems: 'center', justifyContent: 'center' },
  toolCopy: { flex: 1 },
  toolTitle: { color: '#29233D', fontFamily: fontFamilies.display, fontSize: 19 },
  toolText: { color: '#706477', fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 18, marginTop: 4 },
  toolAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  toolActionText: { color: '#7B51E8', fontFamily: fontFamilies.bold, fontSize: 12 },
  comingSoon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  comingSoonText: { color: theme.colors.textMuted, fontFamily: fontFamilies.body, fontSize: 12 },
});
