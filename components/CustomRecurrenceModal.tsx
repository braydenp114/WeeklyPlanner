import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Timestamp } from 'firebase/firestore';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CustomRecurrenceRule } from '@/services/tasksService';
import { CalendarPicker } from './ui/CalendarPicker';
import { AnchorRect } from './ui/TimeDropdown';

interface CustomRecurrenceModalProps {
  visible: boolean;
  onClose: () => void;
  startDate: Date;
  onSave: (rule: CustomRecurrenceRule) => void;
  initialRule?: CustomRecurrenceRule;
}

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' });

const UNITS = [
  { label: 'day', value: 'day' },
  { label: 'week', value: 'week' },
  { label: 'month', value: 'month' },
  { label: 'year', value: 'year' },
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // 0-6 index, matching JS Date.getDay()

export function CustomRecurrenceModal({ visible, onClose, startDate, onSave, initialRule }: CustomRecurrenceModalProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [interval, setIntervalVal] = useState('1');
  const [unit, setUnit] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([startDate.getDay()]);
  const [endType, setEndType] = useState<'never' | 'on_date' | 'after_occurrences'>('never');
  const [endDate, setEndDate] = useState(new Date(startDate));
  const [endOccurrences, setEndOccurrences] = useState('13');

  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [unitAnchor, setUnitAnchor] = useState<AnchorRect | null>(null);
  const unitBtnRef = useRef<View>(null);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialRule) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIntervalVal(String(initialRule.interval));
        setUnit(initialRule.unit);
        if (initialRule.daysOfWeek) setDaysOfWeek(initialRule.daysOfWeek);
        setEndType(initialRule.endType);
        if (initialRule.endDate) setEndDate(initialRule.endDate.toDate());
        if (initialRule.endOccurrences) setEndOccurrences(String(initialRule.endOccurrences));
      } else {
        setIntervalVal('1');
        setUnit('week');
        setDaysOfWeek([startDate.getDay()]);
        setEndType('never');
        
        const defaultEnd = new Date(startDate);
        defaultEnd.setMonth(defaultEnd.getMonth() + 1);
        setEndDate(defaultEnd);
        
        setEndOccurrences('13');
      }
    }
  }, [visible, initialRule, startDate]);

  const toggleDay = (dayIndex: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(dayIndex)) {
        // Prevent deselecting all days
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayIndex);
      }
      return [...prev, dayIndex].sort();
    });
  };

  const handleSave = () => {
    const rule: CustomRecurrenceRule = {
      interval: parseInt(interval, 10) || 1,
      unit,
      endType,
    };

    if (unit === 'week') {
      rule.daysOfWeek = daysOfWeek;
    }

    if (endType === 'on_date') {
      rule.endDate = Timestamp.fromDate(endDate);
    } else if (endType === 'after_occurrences') {
      rule.endOccurrences = parseInt(endOccurrences, 10) || 1;
    }

    onSave(rule);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.scrim} />
          </TouchableWithoutFeedback>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
            <Text style={[styles.title, { color: theme.text }]}>Custom recurrence</Text>

            {/* Repeat Every */}
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.text }]}>Repeat every</Text>
              <View style={styles.intervalControls}>
                <TextInput
                  style={[styles.numberInput, { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.surfaceContainer }]}
                  value={interval}
                  onChangeText={setIntervalVal}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <View style={{ position: 'relative', zIndex: 100 }}>
                  <TouchableOpacity
                    ref={unitBtnRef}
                    style={[styles.dropdownBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
                    onPress={() => {
                      if (isUnitDropdownOpen) {
                        setIsUnitDropdownOpen(false);
                      } else {
                        unitBtnRef.current?.measure((x, y, w, h, pageX, pageY) => {
                          setUnitAnchor({ x: pageX, y: pageY, width: w, height: h });
                          setIsUnitDropdownOpen(true);
                        });
                      }
                    }}
                  >
                    <Text style={[styles.dropdownLabel, { color: theme.text }]}>
                      {parseInt(interval, 10) > 1 ? unit + 's' : unit}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={18} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Repeat On (Days of week) */}
            {unit === 'week' && (
              <View style={[styles.section, { zIndex: 10 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Repeat on</Text>
                <View style={styles.daysRow}>
                  {WEEKDAYS.map((dayLabel, index) => {
                    const isSelected = daysOfWeek.includes(index);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dayCircle,
                          { backgroundColor: isSelected ? theme.primaryAction : theme.surfaceContainer },
                        ]}
                        onPress={() => toggleDay(index)}
                      >
                        <Text style={[styles.dayCircleText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                          {dayLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Ends Section */}
            <View style={[styles.section, { zIndex: 5 }]}>
              <Text style={[styles.label, { color: theme.text, marginBottom: 12 }]}>Ends</Text>
              
              <TouchableOpacity style={styles.radioRow} onPress={() => setEndType('never')}>
                <View style={[styles.radioOuter, { borderColor: endType === 'never' ? theme.primaryAction : theme.outlineVariant }]}>
                  {endType === 'never' && <View style={[styles.radioInner, { backgroundColor: theme.primaryAction }]} />}
                </View>
                <Text style={[styles.radioText, { color: theme.text }]}>Never</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.radioRow} onPress={() => setEndType('on_date')}>
                <View style={[styles.radioOuter, { borderColor: endType === 'on_date' ? theme.primaryAction : theme.outlineVariant }]}>
                  {endType === 'on_date' && <View style={[styles.radioInner, { backgroundColor: theme.primaryAction }]} />}
                </View>
                <Text style={[styles.radioText, { color: theme.text }]}>On</Text>
                {endType === 'on_date' && (
                  <TouchableOpacity
                    style={[styles.dateBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
                    onPress={() => setIsCalendarOpen(true)}
                  >
                    <Text style={{ color: theme.text, fontFamily: Fonts.body, fontSize: 14 }}>
                      {dateFmt.format(endDate)}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.radioRow} onPress={() => setEndType('after_occurrences')}>
                <View style={[styles.radioOuter, { borderColor: endType === 'after_occurrences' ? theme.primaryAction : theme.outlineVariant }]}>
                  {endType === 'after_occurrences' && <View style={[styles.radioInner, { backgroundColor: theme.primaryAction }]} />}
                </View>
                <Text style={[styles.radioText, { color: theme.text }]}>After</Text>
                {endType === 'after_occurrences' && (
                  <View style={styles.occurrenceRow}>
                    <TextInput
                      style={[styles.numberInput, { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.surfaceContainer }]}
                      value={endOccurrences}
                      onChangeText={setEndOccurrences}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={{ color: theme.text, fontFamily: Fonts.body, fontSize: 14 }}>occurrences</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: theme.primaryAction }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Unit Dropdown Popover */}
      {isUnitDropdownOpen && unitAnchor && (
        <View style={[StyleSheet.absoluteFill, { elevation: 10, zIndex: 1000 }]}>
          <TouchableWithoutFeedback onPress={() => setIsUnitDropdownOpen(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.dropdownMenu,
              {
                position: 'absolute',
                top: (windowHeight - (unitAnchor.y + unitAnchor.height) >= 160 || windowHeight - (unitAnchor.y + unitAnchor.height) >= unitAnchor.y)
                  ? unitAnchor.y + unitAnchor.height + 4
                  : Math.max(8, unitAnchor.y - 160 - 4),
                left: unitAnchor.x + 100 > windowWidth - 12
                  ? Math.max(12, windowWidth - 100 - 12)
                  : unitAnchor.x,
                width: 100, // Match original button width
                backgroundColor: theme.surfaceContainerHighest,
                borderColor: theme.outlineVariant,
                right: undefined, // Override stylesheet 'right: 0'
                marginTop: 0, // Override stylesheet 'marginTop: 4'
              },
            ]}
          >
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u.value}
                style={styles.dropdownItem}
                onPress={() => { setUnit(u.value as any); setIsUnitDropdownOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, { color: theme.text }]}>
                  {parseInt(interval, 10) > 1 ? u.label + 's' : u.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Reused Calendar Picker for "On Date" */}
      <CalendarPicker
        visible={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        date={endDate}
        onChange={setEndDate}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrim: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: 340,
    padding: 24,
    borderRadius: RoundedGeometry.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  title: {
    fontFamily: Fonts.headline,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  section: {
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: Fonts.headline,
    fontSize: 16,
    fontWeight: '500',
  },
  intervalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberInput: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: RoundedGeometry.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 60,
    textAlign: 'center',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: RoundedGeometry.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 100,
    justifyContent: 'space-between',
  },
  dropdownLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: RoundedGeometry.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleText: {
    fontFamily: Fonts.headline,
    fontSize: 14,
    fontWeight: '600',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    width: 60,
  },
  dateBtn: {
    borderWidth: 1,
    borderRadius: RoundedGeometry.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  occurrenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 32,
    gap: 16,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    fontFamily: Fonts.headline,
    fontSize: 15,
    fontWeight: '600',
  },
});
