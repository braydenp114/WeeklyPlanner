import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Timestamp } from 'firebase/firestore';
import { Colors, Fonts, RoundedGeometry, TaskCardColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { createTask, updateTask, updateSeries, CreateTaskData, TaskRecurrence, BusyStatus, Visibility, CustomRecurrenceRule, ChecklistItem } from '@/services/tasksService';
import { CalendarPicker } from './ui/CalendarPicker';
import { TimeDropdown, AnchorRect } from './ui/TimeDropdown';
import { CustomRecurrenceModal } from './CustomRecurrenceModal';
import { LocationAutocomplete, LocationCoordinates } from './ui/LocationAutocomplete';

// ─── Notification Presets ────────────────────────────────────────────────────
const NOTIFICATION_OPTIONS = [
  { label: '10 minutes before', minutes: 10 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '2 hours before', minutes: 120 },
  { label: '1 day before', minutes: 1440 },
];

// ─── Color palette from existing TaskCardColors ─────────────────────────────
const COLOR_OPTIONS = Object.entries(TaskCardColors).map(([key, val]) => ({
  key,
  hex: val.bg,
  name: val.name,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long' });
const monthDayFmt = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' });

function getOrdinalWeek(date: Date): string {
  const d = date.getDate();
  const weekNum = Math.ceil(d / 7);
  const labels = ['first', 'second', 'third', 'fourth', 'fifth'];
  return labels[weekNum - 1] || `${weekNum}th`;
}

// ─── Sub-components for pickers (simple dropdowns rather than native pickers for consistency) ──

interface DropdownPickerProps {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onSelect: (v: string) => void;
  theme: any;
}

function InlineDropdown({ label, options, value, onSelect, theme }: DropdownPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || label;

  return (
    <View style={{ position: 'relative', zIndex: open ? 100 : 1 }}>
      <TouchableOpacity
        style={[inlineStyles.dropBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={[inlineStyles.dropLabel, { color: theme.text }]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={18} color={theme.onSurfaceVariant} />
      </TouchableOpacity>
      {open && (
        <View style={[inlineStyles.dropMenu, { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant }]}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[inlineStyles.dropItem, opt.value === value && { backgroundColor: theme.surfaceContainer }]}
              onPress={() => { onSelect(opt.value); setOpen(false); }}
            >
              <Text style={[inlineStyles.dropItemText, { color: theme.text }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Modal Component ───────────────────────────────────────────────────
export interface NewTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** Pre-fill date/time when opened from a grid slot click */
  prefillDate?: Date;
  prefillHour?: number;
}

export default function NewTaskModal({ visible, onClose, onSaved, prefillDate, prefillHour }: NewTaskModalProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { user } = useAuth();
  const { editTaskData, editTaskScope } = useNav();

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [customRecurrenceRule, setCustomRecurrenceRule] = useState<CustomRecurrenceRule | null>(null);
  const [customRuleLabel, setCustomRuleLabel] = useState('');
  const [location, setLocation] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState<LocationCoordinates | null>(null);
  const [notifications, setNotifications] = useState<{ type: string; minutesBefore: number }[]>([]);
  const [colorHex, setColorHex] = useState(COLOR_OPTIONS[0].hex);
  const [category, setCategory] = useState<string>('study');
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['study', 'workout', 'work', 'personal']);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [busyStatus, setBusyStatus] = useState<BusyStatus>('busy');
  const [visibility, setVisibility] = useState<Visibility>('default');
  const [description, setDescription] = useState('');
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddChecklistItem = useCallback(() => {
    const text = newChecklistItemText.trim();
    if (!text) return;
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setChecklistItems((prev) => [...prev, { id, text, completed: false }]);
    setNewChecklistItemText('');
  }, [newChecklistItemText]);

  const handleRemoveChecklistItem = useCallback((id: string) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleChecklistItemTextChange = useCallback((id: string, text: string) => {
    setChecklistItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  }, []);

  // ── Trigger element refs for anchored popovers ──
  const startDateBtnRef = useRef<View>(null);
  const endDateBtnRef = useRef<View>(null);
  const startTimeBtnRef = useRef<View>(null);
  const endTimeBtnRef = useRef<View>(null);

  // ── Anchor positions ──
  const [startDateAnchor, setStartDateAnchor] = useState<AnchorRect | null>(null);
  const [endDateAnchor, setEndDateAnchor] = useState<AnchorRect | null>(null);
  const [startTimeAnchor, setStartTimeAnchor] = useState<AnchorRect | null>(null);
  const [endTimeAnchor, setEndTimeAnchor] = useState<AnchorRect | null>(null);

  // ── Picker open states ──
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false);

  // ── Color picker open state ──
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // ── Notification picker ──
  const [notifPickerOpen, setNotifPickerOpen] = useState(false);

  // ── Description formatting state ──
  const [descBold, setDescBold] = useState(false);
  const [descItalic, setDescItalic] = useState(false);
  const [descUnderline, setDescUnderline] = useState(false);

  // ── Cross-platform trigger anchor measurement ──
  const measureAnchor = useCallback(
    (ref: React.RefObject<any>, callback: (rect: AnchorRect) => void) => {
      const el = ref.current;
      if (!el) return;

      if (Platform.OS === 'web' && typeof el.getBoundingClientRect === 'function') {
        const rect = el.getBoundingClientRect();
        callback({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
        return;
      }

      if (typeof el.measureInWindow === 'function') {
        el.measureInWindow((x: number, y: number, width: number, height: number) => {
          callback({ x, y, width, height });
        });
        return;
      }

      if (typeof el.measure === 'function') {
        el.measure((_fx: number, _fy: number, width: number, height: number, px: number, py: number) => {
          callback({ x: px, y: py, width, height });
        });
      }
    },
    []
  );

  const handleOpenStartDatePicker = useCallback(() => {
    if (startDateBtnRef.current) {
      measureAnchor(startDateBtnRef, (rect) => {
        setStartDateAnchor(rect);
        setIsStartDatePickerOpen(true);
      });
    } else {
      setIsStartDatePickerOpen(true);
    }
  }, [measureAnchor]);

  const handleOpenEndDatePicker = useCallback(() => {
    if (endDateBtnRef.current) {
      measureAnchor(endDateBtnRef, (rect) => {
        setEndDateAnchor(rect);
        setIsEndDatePickerOpen(true);
      });
    } else {
      setIsEndDatePickerOpen(true);
    }
  }, [measureAnchor]);

  const handleOpenStartTimePicker = useCallback(() => {
    if (startTimeBtnRef.current) {
      measureAnchor(startTimeBtnRef, (rect) => {
        setStartTimeAnchor(rect);
        setIsStartTimePickerOpen(true);
      });
    } else {
      setIsStartTimePickerOpen(true);
    }
  }, [measureAnchor]);

  const handleOpenEndTimePicker = useCallback(() => {
    if (endTimeBtnRef.current) {
      measureAnchor(endTimeBtnRef, (rect) => {
        setEndTimeAnchor(rect);
        setIsEndTimePickerOpen(true);
      });
    } else {
      setIsEndTimePickerOpen(true);
    }
  }, [measureAnchor]);

  // ── Reset or populate form on open ──
  useEffect(() => {
    if (visible) {
      if (editTaskData) {
        // Pre-fill with existing task data
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle(editTaskData.title);
        setStartDate(editTaskData.startDate.toDate());
        setEndDate(editTaskData.endDate.toDate());
        setAllDay(editTaskData.allDay);
        setRecurrence(editTaskData.recurrence);
        setCustomRecurrenceRule(editTaskData.customRecurrenceRule);
        
        let customLbl = '';
        if (editTaskData.recurrence === 'custom' && editTaskData.customRecurrenceRule) {
          const rule = editTaskData.customRecurrenceRule;
          customLbl = `${rule.interval > 1 ? `Every ${rule.interval} ${rule.unit}s` : `Every ${rule.unit}`}`;
          if (rule.unit === 'week' && rule.daysOfWeek) {
            const dayNames = rule.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]);
            customLbl += ` on ${dayNames.join(', ')}`;
          }
          if (rule.endType === 'after_occurrences') {
            customLbl += `, ${rule.endOccurrences} times`;
          } else if (rule.endType === 'on_date' && rule.endDate) {
            customLbl += `, until ${dateFmt.format(rule.endDate.toDate())}`;
          }
        }
        setCustomRuleLabel(customLbl);

        setLocation(editTaskData.location || '');
        if (editTaskData.latitude && editTaskData.longitude) {
          setLocationCoordinates({ latitude: editTaskData.latitude, longitude: editTaskData.longitude });
        } else {
          setLocationCoordinates(null);
        }

        setNotifications(editTaskData.notification ? [editTaskData.notification] : []);
        setColorHex(editTaskData.colorHex);
        if (editTaskData.category) {
          setCategory(editTaskData.category);
          setCategoryOptions(prev => prev.includes(editTaskData.category!) ? prev : [...prev, editTaskData.category!]);
        } else {
          setCategory('study');
        }
        setBusyStatus(editTaskData.busyStatus);
        setVisibility(editTaskData.visibility);
        setDescription(editTaskData.description || '');
        setHasChecklist(!!editTaskData.hasChecklist);
        setChecklistItems(editTaskData.checklistItems || []);

      } else {
        // Default new task
        const now = prefillDate ? new Date(prefillDate) : new Date();
        if (prefillHour !== undefined) {
          now.setHours(prefillHour, 0, 0, 0);
        } else {
          now.setMinutes(0, 0, 0);
        }
        const endDefault = new Date(now);
        endDefault.setHours(endDefault.getHours() + 1);
        
        setTitle('');
        setStartDate(now);
        setEndDate(endDefault);
        setAllDay(false);
        setRecurrence('none');
        setCustomRecurrenceRule(null);
        setCustomRuleLabel('');
        setLocation('');
        setLocationCoordinates(null);
        setNotifications([]);
        setColorHex(COLOR_OPTIONS[0].hex);
        setCategory('study');
        setShowCustomCategoryInput(false);
        setCustomCategoryText('');
        setBusyStatus('busy');
        setVisibility('default');
        setDescription('');
        setHasChecklist(false);
        setChecklistItems([]);
      }

      setStartDateAnchor(null);
      setEndDateAnchor(null);
      setStartTimeAnchor(null);
      setEndTimeAnchor(null);
      setError('');
      setSaving(false);
      setColorPickerOpen(false);
      setNotifPickerOpen(false);
      setNewChecklistItemText('');
    }
  }, [visible, prefillDate, prefillHour, editTaskData]);

  // ── Dynamic recurrence labels ──
  const recurrenceOptions = useMemo(() => {
    const weekday = weekdayFmt.format(startDate);
    const ordinal = getOrdinalWeek(startDate);
    const monthDay = monthDayFmt.format(startDate);
    return [
      { label: 'Does not repeat', value: 'none' },
      { label: 'Daily', value: 'daily' },
      { label: `Weekly on ${weekday}`, value: 'weekly' },
      { label: `Monthly on the ${ordinal} ${weekday}`, value: 'monthly' },
      { label: `Annually on ${monthDay}`, value: 'yearly' },
      { label: 'Every weekday (Mon–Fri)', value: 'weekday' },
      { label: recurrence === 'custom' && customRuleLabel ? customRuleLabel : 'Custom…', value: 'custom' },
    ];
  }, [startDate, recurrence, customRuleLabel]);

  // ── Custom category handler ──
  const confirmCustomCategory = useCallback(() => {
    const trimmed = customCategoryText.trim();
    if (!trimmed) return;
    setCategoryOptions(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setCategory(trimmed);
    setCustomCategoryText('');
    setShowCustomCategoryInput(false);
    setCategoryPickerOpen(false);
  }, [customCategoryText]);

  // ── Save handler ──
  const handleSave = useCallback(async () => {
    setError('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!allDay && endDate <= startDate) {
      setError('End time must be after start time');
      return;
    }
    setSaving(true);
    try {
      const trimmedChecklistItems = checklistItems.filter((item) => item.text.trim().length > 0);
      const taskData: CreateTaskData = {
        title: title.trim(),
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        allDay,
        recurrence,
        recurrenceEndDate: null,
        customRecurrenceRule: recurrence === 'custom' ? customRecurrenceRule : null,
        location: location.trim() || null,
        latitude: locationCoordinates?.latitude ?? null,
        longitude: locationCoordinates?.longitude ?? null,
        notification: notifications.length > 0 ? notifications[0] : null,
        busyStatus,
        visibility,
        description: description.trim() || null,
        colorHex,
        category: category || null,
        completed: editTaskData?.completed ?? false,
        hasChecklist,
        checklistItems: hasChecklist ? trimmedChecklistItems : [],
      };

      if (editTaskData && editTaskData.id) {
        if (editTaskScope === 'all' && editTaskData.seriesId) {
          const origStartMs = editTaskData.startDate.toDate().getTime();
          
          const newStartMs = startDate.getTime();
          const newEndMs = endDate.getTime();
          
          const timeDeltaMs = newStartMs - origStartMs;
          const durationMs = newEndMs - newStartMs;
          
          await updateSeries(editTaskData.seriesId, taskData, timeDeltaMs, durationMs);
        } else {
          await updateTask(editTaskData.id, taskData);
        }
      } else {
        await createTask(taskData);
      }

      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  }, [title, startDate, endDate, allDay, recurrence, customRecurrenceRule, location, locationCoordinates, notifications, busyStatus, visibility, description, colorHex, category, hasChecklist, checklistItems, onSaved, onClose, editTaskData, editTaskScope]);

  // ── Slide animation ──
  const slideAnim = useMemo(() => new Animated.Value(300), []);
  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Scrim */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        {/* Modal Card */}
        <Animated.View style={[styles.cardContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={20} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primaryAction, opacity: saving ? 0.6 : 1 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <TextInput
                style={[styles.titleInput, { color: theme.text, borderBottomColor: theme.outlineVariant }]}
                placeholder="Add title"
                placeholderTextColor={theme.textMuted}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              {error ? <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text> : null}

              {/* Date/Time Row */}
              <View style={styles.fieldSection}>
                <View style={styles.fieldIcon}>
                  <MaterialIcons name="schedule" size={20} color={theme.onSurfaceVariant} />
                </View>
                <View style={styles.dateTimeGrid}>
                  <View style={styles.dateTimeRow}>
                    <TouchableOpacity
                      ref={startDateBtnRef}
                      onPress={handleOpenStartDatePicker}
                      style={[inlineStyles.dropBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
                    >
                      <Text style={[inlineStyles.dropLabel, { color: theme.text }]}>{dateFmt.format(startDate)}</Text>
                    </TouchableOpacity>
                    {!allDay && (
                      <>
                        <TouchableOpacity
                          ref={startTimeBtnRef}
                          onPress={handleOpenStartTimePicker}
                          style={[inlineStyles.dropBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
                        >
                          <Text style={[inlineStyles.dropLabel, { color: theme.text }]}>{timeFmt.format(startDate)}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.toLabel, { color: theme.textMuted }]}>to</Text>
                        <TouchableOpacity
                          ref={endTimeBtnRef}
                          onPress={handleOpenEndTimePicker}
                          style={[inlineStyles.dropBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
                        >
                          <Text style={[inlineStyles.dropLabel, { color: theme.text }]}>{timeFmt.format(endDate)}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                  {!allDay && (
                    <View style={[styles.dateTimeRow, { marginTop: 6 }]}>
                      <TouchableOpacity
                        ref={endDateBtnRef}
                        onPress={handleOpenEndDatePicker}
                        style={[inlineStyles.dropBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
                      >
                        <Text style={[inlineStyles.dropLabel, { color: theme.text }]}>{dateFmt.format(endDate)}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* All day toggle */}
                  <View style={[styles.dateTimeRow, { marginTop: 10 }]}>
                    <Text style={[styles.fieldLabel, { color: theme.text }]}>All day</Text>
                    <Switch
                      value={allDay}
                      onValueChange={setAllDay}
                      trackColor={{ false: theme.outlineVariant, true: theme.primaryAction }}
                      thumbColor={'#FFFFFF'}
                    />
                  </View>
                </View>
              </View>

              {/* Recurrence */}
              <View style={[styles.fieldSection, { zIndex: 20 }]}>
                <View style={styles.fieldIcon}>
                  <MaterialIcons name="repeat" size={20} color={theme.onSurfaceVariant} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>Repeat</Text>
                  <InlineDropdown
                    label="Does not repeat"
                    options={recurrenceOptions}
                    value={recurrence}
                    onSelect={(v) => {
                      setRecurrence(v as TaskRecurrence);
                      if (v === 'custom') {
                        setIsCustomRecurrenceOpen(true);
                      }
                    }}
                    theme={theme}
                  />
                </View>
              </View>

              {/* Location */}
              <View style={[styles.fieldSection, { zIndex: 30 }]}>
                <View style={styles.fieldIcon}>
                  <MaterialIcons name="location-on" size={20} color={theme.onSurfaceVariant} />
                </View>
                <LocationAutocomplete
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
                    if (!text.trim()) {
                      setLocationCoordinates(null);
                    }
                  }}
                  onSelectLocation={(address, coords) => {
                    setLocation(address);
                    setLocationCoordinates(coords || null);
                  }}
                  theme={theme}
                />
              </View>

              {/* Notifications */}
              <View style={[styles.fieldSection, { zIndex: 15 }]}>
                <View style={styles.fieldIcon}>
                  <MaterialIcons name="notifications" size={20} color={theme.onSurfaceVariant} />
                </View>
                <View style={{ flex: 1 }}>
                  {notifications.map((n, idx) => (
                    <View key={idx} style={styles.notifRow}>
                      <Text style={[styles.notifLabel, { color: theme.text }]}>{n.type}</Text>
                      <TouchableOpacity onPress={() => setNotifications(prev => prev.filter((_, i) => i !== idx))}>
                        <MaterialIcons name="close" size={16} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={{ position: 'relative' }}>
                    <TouchableOpacity
                      style={[inlineStyles.dropBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
                      onPress={() => setNotifPickerOpen(!notifPickerOpen)}
                    >
                      <Text style={[inlineStyles.dropLabel, { color: theme.primaryAction }]}>+ Add notification</Text>
                    </TouchableOpacity>
                    {notifPickerOpen && (
                      <View style={[inlineStyles.dropMenu, { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant }]}>
                        {NOTIFICATION_OPTIONS.map(opt => (
                          <TouchableOpacity
                            key={opt.minutes}
                            style={inlineStyles.dropItem}
                            onPress={() => {
                              setNotifications(prev => [...prev, { type: opt.label, minutesBefore: opt.minutes }]);
                              setNotifPickerOpen(false);
                            }}
                          >
                            <Text style={[inlineStyles.dropItemText, { color: theme.text }]}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Owner (read-only) */}
              <View style={styles.fieldSection}>
                <View style={styles.fieldIcon}>
                  <MaterialIcons name="calendar-today" size={20} color={theme.onSurfaceVariant} />
                </View>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  {user?.displayName || user?.email || 'Signed-in User'}
                </Text>
              </View>

              {/* Color picker */}
              <View style={[styles.fieldSection, { zIndex: 10 }]}>
                <View style={styles.fieldIcon}>
                  <MaterialIcons name="palette" size={20} color={theme.onSurfaceVariant} />
                </View>
                <View style={{ position: 'relative', flex: 1 }}>
                  <TouchableOpacity
                    style={[inlineStyles.dropBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                    onPress={() => setColorPickerOpen(!colorPickerOpen)}
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colorHex }} />
                    <Text style={[inlineStyles.dropLabel, { color: theme.text, flex: 1 }]}>
                      {COLOR_OPTIONS.find(c => c.hex === colorHex)?.name || 'Color'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={18} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                  {colorPickerOpen && (
                    <View style={[inlineStyles.dropMenu, { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant }]}>
                      {COLOR_OPTIONS.map(c => (
                        <TouchableOpacity
                          key={c.key}
                          style={[inlineStyles.dropItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                          onPress={() => { setColorHex(c.hex); setColorPickerOpen(false); }}
                        >
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.hex }} />
                          <Text style={[inlineStyles.dropItemText, { color: theme.text }]}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Category picker */}
              <View style={[styles.fieldSection, { zIndex: 9 }]}>
                <View style={styles.fieldIcon}>
                  <MaterialIcons name="label" size={20} color={theme.onSurfaceVariant} />
                </View>
                <View style={{ position: 'relative', flex: 1 }}>
                  <TouchableOpacity
                    style={[inlineStyles.dropBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                    onPress={() => setCategoryPickerOpen(!categoryPickerOpen)}
                  >
                    <Text style={[inlineStyles.dropLabel, { color: theme.text, flex: 1 }]}>{category}</Text>
                    <MaterialIcons name="arrow-drop-down" size={18} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                  {categoryPickerOpen && (
                    <View style={[inlineStyles.dropMenu, { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant }]}>
                      {categoryOptions.map(opt => (
                        <TouchableOpacity
                          key={opt}
                          style={inlineStyles.dropItem}
                          onPress={() => { setCategory(opt); setCategoryPickerOpen(false); }}
                        >
                          <Text style={[inlineStyles.dropItemText, { color: theme.text }]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={inlineStyles.dropItem}
                        onPress={() => setShowCustomCategoryInput(true)}
                      >
                        <Text style={[inlineStyles.dropItemText, { color: theme.primaryAction }]}>+ New category</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {showCustomCategoryInput && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TextInput
                        style={[inlineStyles.dropBtn, { flex: 1, color: theme.text, borderColor: theme.outlineVariant }]}
                        placeholder="New category name"
                        placeholderTextColor={theme.textMuted}
                        value={customCategoryText}
                        onChangeText={setCustomCategoryText}
                      />
                      <TouchableOpacity onPress={confirmCustomCategory} style={[inlineStyles.dropBtn, { backgroundColor: theme.primaryAction }]}>
                        <Text style={{ color: '#FFFFFF' }}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Busy/Free + Visibility side by side */}
              <View style={[styles.fieldSection, { zIndex: 5, gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Status</Text>
                  <InlineDropdown
                    label="Status"
                    options={[
                      { label: 'Busy', value: 'busy' },
                      { label: 'Free', value: 'free' },
                    ]}
                    value={busyStatus}
                    onSelect={v => setBusyStatus(v as BusyStatus)}
                    theme={theme}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Visibility</Text>
                  <InlineDropdown
                    label="Visibility"
                    options={[
                      { label: 'Default', value: 'default' },
                      { label: 'Public', value: 'public' },
                      { label: 'Private', value: 'private' },
                    ]}
                    value={visibility}
                    onSelect={v => setVisibility(v as Visibility)}
                    theme={theme}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={[styles.fieldSection, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={styles.descToolbar}>
                  <TouchableOpacity
                    style={[styles.descToolBtn, descBold && { backgroundColor: theme.surfaceContainer }]}
                    onPress={() => setDescBold(!descBold)}
                  >
                    <Text style={[styles.descToolText, { color: theme.text, fontWeight: '800' }]}>B</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.descToolBtn, descItalic && { backgroundColor: theme.surfaceContainer }]}
                    onPress={() => setDescItalic(!descItalic)}
                  >
                    <Text style={[styles.descToolText, { color: theme.text, fontStyle: 'italic' }]}>I</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.descToolBtn, descUnderline && { backgroundColor: theme.surfaceContainer }]}
                    onPress={() => setDescUnderline(!descUnderline)}
                  >
                    <Text style={[styles.descToolText, { color: theme.text, textDecorationLine: 'underline' }]}>U</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.descToolBtn}>
                    <MaterialIcons name="format-list-bulleted" size={18} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.descToolBtn}>
                    <MaterialIcons name="link" size={18} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[
                    styles.descInput,
                    {
                      color: theme.text,
                      borderColor: theme.outlineVariant,
                      backgroundColor: theme.surfaceContainerLow,
                      fontWeight: descBold ? '700' : '400',
                      fontStyle: descItalic ? 'italic' : 'normal',
                      textDecorationLine: descUnderline ? 'underline' : 'none',
                    },
                  ]}
                  placeholder="Add description"
                  placeholderTextColor={theme.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Checklist */}
              <View style={[styles.fieldSection, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={styles.checklistToggleRow}>
                  <View style={styles.fieldIcon}>
                    <MaterialIcons name="checklist" size={20} color={theme.onSurfaceVariant} />
                  </View>
                  <Text style={[styles.fieldLabel, { color: theme.text, flex: 1 }]}>Checklist</Text>
                  <Switch
                    value={hasChecklist}
                    onValueChange={setHasChecklist}
                    trackColor={{ false: theme.outlineVariant, true: theme.primaryAction }}
                    thumbColor={'#FFFFFF'}
                  />
                </View>

                {hasChecklist && (
                  <View style={styles.checklistItemsWrap}>
                    {checklistItems.map((item) => (
                      <View key={item.id} style={styles.checklistItemRow}>
                        <MaterialIcons name="radio-button-unchecked" size={16} color={theme.onSurfaceVariant} />
                        <TextInput
                          style={[styles.checklistItemInput, { color: theme.text, borderBottomColor: theme.outlineVariant }]}
                          value={item.text}
                          onChangeText={(text) => handleChecklistItemTextChange(item.id, text)}
                          placeholder="Checklist item"
                          placeholderTextColor={theme.textMuted}
                        />
                        <TouchableOpacity
                          onPress={() => handleRemoveChecklistItem(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons name="close" size={16} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.checklistAddRow}>
                      <TextInput
                        style={[styles.checklistItemInput, { color: theme.text, borderBottomColor: theme.outlineVariant }]}
                        value={newChecklistItemText}
                        onChangeText={setNewChecklistItemText}
                        placeholder="Add item"
                        placeholderTextColor={theme.textMuted}
                        onSubmitEditing={handleAddChecklistItem}
                        returnKeyType="done"
                      />
                      <TouchableOpacity onPress={handleAddChecklistItem} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialIcons name="add" size={20} color={theme.primaryAction} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Bottom spacer for scroll comfort */}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      <CalendarPicker
        visible={isStartDatePickerOpen}
        onClose={() => {
          setIsStartDatePickerOpen(false);
          setStartDateAnchor(null);
        }}
        date={startDate}
        onChange={setStartDate}
        anchor={startDateAnchor}
      />
      <CalendarPicker
        visible={isEndDatePickerOpen}
        onClose={() => {
          setIsEndDatePickerOpen(false);
          setEndDateAnchor(null);
        }}
        date={endDate}
        onChange={setEndDate}
        anchor={endDateAnchor}
      />
      <TimeDropdown
        visible={isStartTimePickerOpen}
        onClose={() => {
          setIsStartTimePickerOpen(false);
          setStartTimeAnchor(null);
        }}
        date={startDate}
        onChange={setStartDate}
        anchor={startTimeAnchor}
      />
      <TimeDropdown
        visible={isEndTimePickerOpen}
        onClose={() => {
          setIsEndTimePickerOpen(false);
          setEndTimeAnchor(null);
        }}
        date={endDate}
        onChange={setEndDate}
        anchor={endTimeAnchor}
      />
      <CustomRecurrenceModal
        visible={isCustomRecurrenceOpen}
        onClose={() => {
          setIsCustomRecurrenceOpen(false);
          // Revert to 'none' if they closed it without saving a rule (e.g. they hit cancel and didn't have one before)
          if (!customRecurrenceRule && recurrence === 'custom') {
            setRecurrence('none');
          }
        }}
        startDate={startDate}
        initialRule={customRecurrenceRule || undefined}
        onSave={(rule) => {
          setCustomRecurrenceRule(rule);
          setRecurrence('custom');
          // Format label
          let lbl = `${rule.interval > 1 ? `Every ${rule.interval} ${rule.unit}s` : `Every ${rule.unit}`}`;
          if (rule.unit === 'week' && rule.daysOfWeek) {
            const dayNames = rule.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]);
            lbl += ` on ${dayNames.join(', ')}`;
          }
          if (rule.endType === 'after_occurrences') {
            lbl += `, ${rule.endOccurrences} times`;
          } else if (rule.endType === 'on_date' && rule.endDate) {
            lbl += `, until ${dateFmt.format(rule.endDate.toDate())}`;
          }
          setCustomRuleLabel(lbl);
        }}
      />
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cardContainer: {
    position: 'absolute',
    top: '8%',
    bottom: '5%',
    left: '5%',
    right: '5%',
    maxWidth: 560,
    alignSelf: 'center',
    width: '90%',
  },
  card: {
    flex: 1,
    borderRadius: RoundedGeometry.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '300',
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: RoundedGeometry.full,
  },
  saveText: {
    color: '#FFFFFF',
    fontFamily: Fonts.headline,
    fontSize: 14,
    fontWeight: '600',
  },
  formScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleInput: {
    fontFamily: Fonts.headline,
    fontSize: 22,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginBottom: 10,
  },
  fieldSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  fieldIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  fieldInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  fieldLabel: {
    fontFamily: Fonts.body,
    fontSize: 15,
    paddingVertical: 8,
  },
  dateTimeGrid: {
    flex: 1,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  toLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  miniLabel: {
    fontFamily: Fonts.headline,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 8,
  },
  notifLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    flex: 1,
  },
  descToolbar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  descToolBtn: {
    width: 32,
    height: 32,
    borderRadius: RoundedGeometry.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descToolText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  descInput: {
    fontFamily: Fonts.body,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: RoundedGeometry.default,
    padding: 12,
    minHeight: 100,
  },
  checklistToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checklistItemsWrap: {
    marginTop: 10,
    marginLeft: 36,
    gap: 8,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checklistAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checklistItemInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
});

const inlineStyles = StyleSheet.create({
  dropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RoundedGeometry.sm,
    borderWidth: 1,
  },
  dropLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  dropMenu: {
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
    zIndex: 999,
  },
  dropItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropItemText: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  dateInput: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    borderWidth: 1,
    borderRadius: RoundedGeometry.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 120,
  },
});
