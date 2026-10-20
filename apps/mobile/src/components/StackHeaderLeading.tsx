import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeaderLogo } from '@/src/components/AppHeaderLogo';
import { useTheme } from '@/src/hooks/useTheme';

type StackHeaderLeadingProps = {
  tintColor: string;
  showLogo?: boolean;
};

export function StackHeaderLeading({ tintColor, showLogo = true }: StackHeaderLeadingProps) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const canGoBack = navigation.canGoBack();

  return (
    <View style={styles.wrap}>
      {canGoBack ? (
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={tintColor || colors.text} />
        </Pressable>
      ) : null}
      {showLogo ? <AppHeaderLogo size={28} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 2,
  },
});
