import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Fonts, RoundedGeometry } from '@/constants/theme';
import { PRESET_LOCATIONS } from '@/constants/presetLocations';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationSuggestion {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  coordinates?: LocationCoordinates;
  isPreset?: boolean;
  icon?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectLocation: (address: string, coords?: LocationCoordinates) => void;
  placeholder?: string;
  theme: any;
}

export function LocationAutocomplete({
  value,
  onChangeText,
  onSelectLocation,
  placeholder = 'Add location',
  theme,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [presetSuggestions, setPresetSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const justSelectedRef = useRef(false);

  const fetchSuggestions = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);

    try {
      // 1. Query official OpenStreetMap Nominatim
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&addressdetails=1&limit=5`;
      const res = await fetch(nominatimUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'WeeklyPlanner/1.0',
          'Accept-Language': 'en',
        },
      });

      if (!res.ok) {
        throw new Error(`Nominatim error: ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const results: LocationSuggestion[] = data.map((item: any) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const addr = item.address || {};
          const title = item.name || addr.road || item.display_name.split(',')[0]?.trim() || trimmed;
          const subtitleParts = [
            addr.suburb,
            addr.city || addr.town || addr.village || addr.county,
            addr.state,
            addr.country,
          ].filter(Boolean);
          const subtitle = subtitleParts.length > 0 ? subtitleParts.join(', ') : item.display_name;

          return {
            id: String(item.place_id || Math.random()),
            title,
            subtitle,
            fullAddress: item.display_name || title,
            coordinates: !isNaN(lat) && !isNaN(lon) ? { latitude: lat, longitude: lon } : undefined,
          };
        });

        setSuggestions(results);
        setIsOpen(true);
        setLoading(false);
        return;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;

      // 2. Fallback to Photon (OSM-backed) if Nominatim rate-limits or fails
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=5`;
        const pRes = await fetch(photonUrl, { signal: controller.signal });
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.features && pData.features.length > 0) {
            const results: LocationSuggestion[] = pData.features.map((feat: any, idx: number) => {
              const props = feat.properties || {};
              const coords = feat.geometry?.coordinates;
              const title = props.name || [props.housenumber, props.street].filter(Boolean).join(' ') || trimmed;
              const subtitleParts = [props.street, props.city, props.state, props.country].filter(Boolean);
              const subtitle = subtitleParts.join(', ');
              const fullAddress = [title, subtitle].filter(Boolean).join(', ');

              return {
                id: `photon-${idx}-${props.osm_id || Math.random()}`,
                title,
                subtitle,
                fullAddress,
                coordinates: coords && coords.length >= 2 ? { latitude: coords[1], longitude: coords[0] } : undefined,
              };
            });

            setSuggestions(results);
            setIsOpen(true);
            setLoading(false);
            return;
          }
        }
      } catch (pErr: any) {
        if (pErr.name === 'AbortError') return;
      }
    }

    setSuggestions([]);
    setLoading(false);
  }, []);

  const filterPresets = (query: string) => {
    if (!query.trim()) {
      return PRESET_LOCATIONS.map(p => ({
        id: p.id,
        title: p.name,
        subtitle: p.address,
        fullAddress: `${p.name}, ${p.address}`,
        coordinates: { latitude: p.latitude, longitude: p.longitude },
        isPreset: true,
        icon: p.icon || 'star',
      }));
    }
    const lowerQ = query.toLowerCase();
    return PRESET_LOCATIONS.filter(p => 
      p.name.toLowerCase().includes(lowerQ) || p.address.toLowerCase().includes(lowerQ)
    ).map(p => ({
      id: p.id,
      title: p.name,
      subtitle: p.address,
      fullAddress: `${p.name}, ${p.address}`,
      coordinates: { latitude: p.latitude, longitude: p.longitude },
      isPreset: true,
      icon: p.icon || 'star',
    }));
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);
    justSelectedRef.current = false;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const filteredPresets = filterPresets(text);
    setPresetSuggestions(filteredPresets);

    if (!text.trim()) {
      setSuggestions([]);
      setIsOpen(true);
      setLoading(false);
      return;
    }

    setIsOpen(true);

    debounceTimerRef.current = setTimeout(() => {
      if (!justSelectedRef.current) {
        fetchSuggestions(text);
      }
    }, 400);
  };

  const handleSelect = (item: LocationSuggestion) => {
    justSelectedRef.current = true;
    setIsOpen(false);
    setSuggestions([]);
    setPresetSuggestions([]);
    onSelectLocation(item.fullAddress, item.coordinates);
  };

  const handleClear = () => {
    onChangeText('');
    setSuggestions([]);
    setIsOpen(false);
    onSelectLocation('', undefined);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderBottomColor: isFocused ? theme.primaryAction : theme.outlineVariant,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          value={value}
          onChangeText={handleTextChange}
          onFocus={() => {
            setIsFocused(true);
            if (!justSelectedRef.current) {
              setPresetSuggestions(filterPresets(value));
              setIsOpen(true);
            }
          }}
          onBlur={() => {
            setIsFocused(false);
            // Delay closing slightly so onPress on suggestion item fires before dropdown unmounts
            setTimeout(() => {
              setIsOpen(false);
            }, 250);
          }}
          autoCorrect={false}
          autoCapitalize="words"
        />

        <View style={styles.trailingActions}>
          {loading && (
            <ActivityIndicator size="small" color={theme.primaryAction} style={styles.spinner} />
          )}
          {value.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={16} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isOpen && (presetSuggestions.length > 0 || suggestions.length > 0) && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.surfaceContainerHighest,
              borderColor: theme.outlineVariant,
            },
          ]}
        >
          {presetSuggestions.length > 0 && (
            <View>
              <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
                Common locations
              </Text>
              {presetSuggestions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.suggestionItem,
                    { borderBottomColor: theme.outlineVariant },
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name={item.icon as any} size={18} color={theme.primaryAction} style={styles.pinIcon} />
                  <View style={styles.suggestionTexts}>
                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={[styles.itemSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {suggestions.length > 0 && (
            <View>
              {presetSuggestions.length > 0 && (
                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
                  Search results
                </Text>
              )}
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.suggestionItem,
                    { borderBottomColor: theme.outlineVariant },
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="location-on" size={18} color={theme.primaryAction} style={styles.pinIcon} />
                  <View style={styles.suggestionTexts}>
                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={[styles.itemSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 100,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingRight: 40,
  },
  trailingActions: {
    position: 'absolute',
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spinner: {
    marginRight: 4,
  },
  clearIcon: {
    fontSize: 14,
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: RoundedGeometry.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
    maxHeight: 280,
  },
  sectionHeader: {
    fontFamily: Fonts.headline,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  pinIcon: {
    fontSize: 16,
  },
  suggestionTexts: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: Fonts.headline,
    fontSize: 13,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
});
