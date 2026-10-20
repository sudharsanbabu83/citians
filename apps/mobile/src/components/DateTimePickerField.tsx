import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import { useTheme } from '@/src/hooks/useTheme';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, spacing } from '@/src/theme';

function parseDateString(dateStr: string): Date {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date();
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function parseTimeString(timeStr: string): Date {
  const date = new Date();
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
    date.setHours(9, 0, 0, 0);
    return date;
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return 'Select date';
  return parseDateString(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return 'Select time';
  return parseTimeString(timeStr).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

type PickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

type ControlledPickerFieldProps<TFieldValues extends FieldValues> = Omit<
  PickerFieldProps,
  'value' | 'onChange' | 'onBlur'
> & {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
};

export function DatePickerField({
  value,
  onChange,
  onBlur,
  hasError,
  disabled,
  minimumDate,
  maximumDate,
}: PickerFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') {
      onBlur?.();
      return;
    }
    if (selected) {
      onChange(formatDateValue(selected));
      onBlur?.();
    }
  };

  const openPicker = () => {
    if (disabled) return;
    setShowPicker(true);
  };

  const closePicker = () => {
    setShowPicker(false);
    onBlur?.();
  };

  return (
    <View>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[
          styles.field,
          hasError && styles.fieldError,
          disabled && styles.fieldDisabled,
          !value && styles.fieldPlaceholder,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Select date"
      >
        <Text style={[styles.fieldText, !value && styles.placeholderText]} numberOfLines={1}>
          {formatDisplayDate(value)}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
      </Pressable>

      {showPicker && Platform.OS === 'ios' ? (
         <View style={styles.iosPickerSheet}>
          <View style={styles.iosPickerHeader}>
            <Pressable onPress={closePicker} hitSlop={8}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={parseDateString(value)}
            mode="date"
            display="spinner"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        </View>
      ) : null}

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parseDateString(value)}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
}

export function TimePickerField({
  value,
  onChange,
  onBlur,
  hasError,
  disabled,
}: PickerFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') {
      onBlur?.();
      return;
    }
    if (selected) {
      onChange(formatTimeValue(selected));
      onBlur?.();
    }
  };

  const openPicker = () => {
    if (disabled) return;
    setShowPicker(true);
  };

  const closePicker = () => {
    setShowPicker(false);
    onBlur?.();
  };

  return (
    <View>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[
          styles.field,
          hasError && styles.fieldError,
          disabled && styles.fieldDisabled,
          !value && styles.fieldPlaceholder,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Select time"
      >
        <Text style={[styles.fieldText, !value && styles.placeholderText]} numberOfLines={1}>
          {formatDisplayTime(value)}
        </Text>
        <Ionicons name="time-outline" size={20} color={colors.textMuted} />
      </Pressable>

      {showPicker && Platform.OS === 'ios' ? (
        <View style={styles.iosPickerSheet}>
          <View style={styles.iosPickerHeader}>
            <Pressable onPress={closePicker} hitSlop={8}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={parseTimeString(value)}
            mode="time"
            display="spinner"
            onChange={handleChange}
          />
        </View>
      ) : null}

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parseTimeString(value)}
          mode="time"
          display="default"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

export function ControlledDatePickerField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  ...pickerProps
}: ControlledPickerFieldProps<TFieldValues>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.controlledField}>
      <Text style={styles.controlledLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <DatePickerField
            {...pickerProps}
            value={String(field.value ?? '')}
            onChange={field.onChange}
            onBlur={field.onBlur}
            hasError={Boolean(fieldState.error)}
          />
        )}
      />
    </View>
  );
}

export function ControlledTimePickerField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  ...pickerProps
}: ControlledPickerFieldProps<TFieldValues>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.controlledField}>
      <Text style={styles.controlledLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <TimePickerField
            {...pickerProps}
            value={String(field.value ?? '')}
            onChange={field.onChange}
            onBlur={field.onBlur}
            hasError={Boolean(fieldState.error)}
          />
        )}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  controlledField: { marginBottom: spacing.md },
  controlledLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  fieldError: {
    borderColor: theme.colors.error,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  fieldPlaceholder: {},
  fieldText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.textMuted,
  },
  iosPickerSheet: {
    marginTop: spacing.xs,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  doneText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
