import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeaderLogo } from '@/src/components/AppHeaderLogo';
import { SearchBar } from '@/src/components/SearchBar';
import { useStudentSearch } from '@/src/hooks/useStudentSearch';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import { useUnreadNotificationCount } from '@/src/hooks/useNotifications';
import { useAuthStore } from '@/src/lib/authStore';
import {
  getStudentSearchSectionLabel,
  STUDENT_SEARCH_MIN_LENGTH,
  type StudentSearchResult,
  type StudentSearchResultType,
} from '@/src/lib/studentSearch';
import { useStudentSearchStore } from '@/src/lib/studentSearchStore';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

const HEADER_ROW_HEIGHT = 52;

function getResultIcon(type: StudentSearchResultType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'event':
      return 'calendar-outline';
    case 'competition':
      return 'trophy-outline';
    default:
      return 'search-outline';
  }
}

function StudentSearchResults({ topOffset }: { topOffset: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createResultsStyles);
  const { results, isSearching, isDebouncing, isLoading, query } = useStudentSearch();
  const clear = useStudentSearchStore((s) => s.clear);

  const sectionedResults = useMemo(() => {
    const sections: Array<{ title: string; items: StudentSearchResult[] }> = [];
    const types: StudentSearchResultType[] = ['event', 'competition'];

    for (const type of types) {
      const items = results.filter((item) => item.type === type);
      if (items.length > 0) {
        sections.push({ title: getStudentSearchSectionLabel(type), items });
      }
    }

    return sections;
  }, [results]);

  if (!isSearching && !isDebouncing) return null;

  const handleSelect = (item: StudentSearchResult) => {
    Keyboard.dismiss();
    clear();
    router.push(item.route as Href);
  };

  const handleDismiss = () => {
    clear();
    Keyboard.dismiss();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable style={[styles.panel, { marginTop: topOffset }]} onPress={(e) => e.stopPropagation()}>
          {isDebouncing || isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.textMuted} />
              {isDebouncing ? (
                <Text style={styles.emptyCaption}>Searching…</Text>
              ) : null}
            </View>
          ) : sectionedResults.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No results for “{query.trim()}”</Text>
              <Text style={styles.emptyCaption}>Try an event or hackathon.</Text>
            </View>
          ) : (
            <FlatList
              data={sectionedResults}
              keyExtractor={(section) => section.title}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: section }) => (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.items.map((result) => (
                    <Pressable
                      key={result.id}
                      style={styles.resultRow}
                      onPress={() => handleSelect(result)}
                    >
                      <View style={styles.resultIconWrap}>
                        <Ionicons name={getResultIcon(result.type)} size={18} color={colors.text} />
                      </View>
                      <View style={styles.resultText}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {result.title}
                        </Text>
                        <Text style={styles.resultSubtitle} numberOfLines={1}>
                          {result.subtitle}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function StudentScreenHeader() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createHeaderStyles);
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const query = useStudentSearchStore((s) => s.query);
  const setQuery = useStudentSearchStore((s) => s.setQuery);
  const { isSearching, isDebouncing } = useStudentSearch();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.uid);
  const topOffset = insets.top + HEADER_ROW_HEIGHT + spacing.sm;
  const showResults =
    Boolean(user) &&
    query.trim().length >= STUDENT_SEARCH_MIN_LENGTH &&
    isSearching &&
    !isDebouncing;

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.navBackground }]}>
        <View style={styles.row}>
          <AppHeaderLogo size={32} href={user ? '/(student)/profile' : '/login'} />
          <View style={styles.searchWrap}>
            <SearchBar
              compact
              editable={Boolean(user)}
              value={query}
              onChangeText={setQuery}
              placeholder="Search events, hackathons…"
            />
          </View>
          <Pressable
            style={styles.notifButton}
            onPress={() => router.push(user ? '/(student)/notifications' as Href : '/login')}
            accessibilityRole="button"
            accessibilityLabel={user ? 'Open notifications' : 'Sign in'}
          >
            <Ionicons name={user ? 'notifications-outline' : 'log-in-outline'} size={21} color={colors.primary} />
            {unreadCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {showResults ? (
        <StudentSearchResults topOffset={topOffset} />
      ) : null}
    </>
  );
}

const createHeaderStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.accentBorder,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: theme.isDark ? 0.18 : 0.08,
      shadowRadius: 10,
      elevation: 5,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      paddingTop: spacing.xs,
      minHeight: HEADER_ROW_HEIGHT,
    },
    searchWrap: {
      flex: 1,
    },
    notifButton: {
      position: 'relative',
      width: 36,
      height: 36,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accentBg,
      borderWidth: 1,
      borderColor: theme.colors.accentBorder,
    },
    notifBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    notifBadgeText: {
      color: theme.colors.white,
      fontSize: 10,
      fontWeight: '800',
    },
  });

const createResultsStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    panel: {
      maxHeight: '70%',
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: borderRadius.lg,
      borderBottomRightRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    section: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.label,
      fontFamily: fontFamilies.mono,
      marginBottom: spacing.xs,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    resultIconWrap: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultText: {
      flex: 1,
    },
    resultTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    resultSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.xs,
    },
    emptyText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
    },
    emptyCaption: {
      ...theme.typography.caption,
      textAlign: 'center',
    },
  });
