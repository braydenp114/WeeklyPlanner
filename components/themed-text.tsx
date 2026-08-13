import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'defaultSemiBold'
    | 'title'
    | 'subtitle'
    | 'link'
    | 'mono'
    | 'displayLg'
    | 'headlineLg'
    | 'headlineMobile'
    | 'bodyMd'
    | 'bodySm'
    | 'labelMd'
    | 'labelSm';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'mono' ? styles.mono : undefined,
        type === 'displayLg' ? styles.displayLg : undefined,
        type === 'headlineLg' ? styles.headlineLg : undefined,
        type === 'headlineMobile' ? styles.headlineMobile : undefined,
        type === 'bodyMd' ? styles.bodyMd : undefined,
        type === 'bodySm' ? styles.bodySm : undefined,
        type === 'labelMd' ? styles.labelMd : undefined,
        type === 'labelSm' ? styles.labelSm : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodySm.fontSize,
    lineHeight: Typography.bodySm.lineHeight,
  },
  defaultSemiBold: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodySm.fontSize,
    lineHeight: Typography.bodySm.lineHeight,
    fontWeight: '600',
  },
  title: {
    fontFamily: Fonts.headline,
    fontSize: Typography.headlineLg.fontSize,
    lineHeight: Typography.headlineLg.lineHeight,
    fontWeight: Typography.headlineLg.fontWeight,
  },
  subtitle: {
    fontFamily: Fonts.headline,
    fontSize: Typography.headlineMobile.fontSize,
    lineHeight: Typography.headlineMobile.lineHeight,
    fontWeight: Typography.headlineMobile.fontWeight,
  },
  link: {
    fontFamily: Fonts.mono,
    fontSize: Typography.bodySm.fontSize,
    color: '#6366f1',
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: Typography.labelMd.fontSize,
    lineHeight: Typography.labelMd.lineHeight,
  },
  displayLg: {
    fontFamily: Fonts.headline,
    fontSize: Typography.displayLg.fontSize,
    lineHeight: Typography.displayLg.lineHeight,
    fontWeight: Typography.displayLg.fontWeight,
  },
  headlineLg: {
    fontFamily: Fonts.headline,
    fontSize: Typography.headlineLg.fontSize,
    lineHeight: Typography.headlineLg.lineHeight,
    fontWeight: Typography.headlineLg.fontWeight,
  },
  headlineMobile: {
    fontFamily: Fonts.headline,
    fontSize: Typography.headlineMobile.fontSize,
    lineHeight: Typography.headlineMobile.lineHeight,
    fontWeight: Typography.headlineMobile.fontWeight,
  },
  bodyMd: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodyMd.fontSize,
    lineHeight: Typography.bodyMd.lineHeight,
    fontWeight: Typography.bodyMd.fontWeight,
  },
  bodySm: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodySm.fontSize,
    lineHeight: Typography.bodySm.lineHeight,
    fontWeight: Typography.bodySm.fontWeight,
  },
  labelMd: {
    fontFamily: Fonts.mono,
    fontSize: Typography.labelMd.fontSize,
    lineHeight: Typography.labelMd.lineHeight,
    fontWeight: Typography.labelMd.fontWeight,
  },
  labelSm: {
    fontFamily: Fonts.mono,
    fontSize: Typography.labelSm.fontSize,
    lineHeight: Typography.labelSm.lineHeight,
    fontWeight: Typography.labelSm.fontWeight,
  },
});
