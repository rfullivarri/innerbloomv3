import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Circle, Path } from 'react-native-svg';

export type IconProps = ComponentProps<typeof Svg> & { size?: number };

export const NATIVE_TAB_BAR_BASE_HEIGHT = 112;

export function getNativeTabBarHeight(bottomInset: number) {
  return NATIVE_TAB_BAR_BASE_HEIGHT + bottomInset;
}

type NativeTabBarProps = BottomTabBarProps & {
  visible?: boolean;
  safeAreaBottom?: number;
};

export function NativeTabBar({
  state,
  navigation,
  descriptors,
  insets,
  visible = true,
  safeAreaBottom,
}: NativeTabBarProps) {
  const bottomInset = safeAreaBottom ?? insets?.bottom ?? 0;
  const containerPaddingBottom = styles.navContainer.paddingBottom + bottomInset;
  const devProps = __DEV__ ? { testID: 'native-tabbar' } : {};

  useEffect(() => {
    if (__DEV__ && Platform.OS !== 'web') {
      console.log('[NativeTabBar] mounted');
    }
  }, []);

  if (Platform.OS === 'web') return null;

  return (
    <View
      {...devProps}
      style={[
        styles.navContainer,
        {
          paddingBottom: containerPaddingBottom,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
        },
      ]}
    >
      <View style={styles.navBlurFallback}>
        {state.routes.map((route) => {
          const isActive = state.routes[state.index]?.key === route.key;
          const descriptor = descriptors[route.key];
          const options = descriptor?.options ?? {};
          const label =
            options.tabBarLabel?.toString?.() ?? options.title ?? route.name ?? route.key;
          const IconRenderer = options.tabBarIcon;
          const isDashboard = route.name === 'dashboard';

          const icon = IconRenderer
            ? IconRenderer({
                focused: isActive,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.58)',
                size: isDashboard ? 26 : 22,
              })
            : null;

          return (
            <View key={route.key} style={styles.navItemWrapper}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => navigation.navigate(route.name)}
                style={styles.navButton}
                activeOpacity={0.85}
              >
                <View style={styles.navContent}>
                  <View style={styles.iconOuter}>
                    {isActive ? (
                      <View style={[styles.iconHalo, isDashboard && styles.dashboardHalo]} />
                    ) : null}
                    <View
                      style={[
                        styles.iconWrapper,
                        isDashboard && styles.dashboardIconWrapper,
                        isActive ? styles.iconWrapperActive : styles.iconWrapperInactive,
                      ]}
                    >
                      {icon}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.tabLabel,
                      isDashboard && styles.dashboardLabel,
                      isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {label}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BaseIcon({
  children,
  size = 24,
  strokeWidth = 1.75,
  color,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </Svg>
  );
}

export function RouteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Path d="M4 18c4 0 4-12 8-12s4 12 8 12" />
      <Circle cx="4" cy="18" r="2" />
      <Circle cx="20" cy="18" r="2" />
      <Circle cx="12" cy="6" r="2" />
    </BaseIcon>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 0c0-3-3-4-4-7Z" />
      <Path d="M8 14a4 4 0 1 0 8 0 6 6 0 0 0-2-4" />
    </BaseIcon>
  );
}

export function CircleDotIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Circle cx="12" cy="12" r="2" />
    </BaseIcon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Path d="M12 4 13.5 7.5 17 9l-3.5 1.5L12 14l-1.5-3.5L7 9l3.5-1.5Z" />
      <Path d="m6 16 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
      <Path d="m18 14 .75 1.5L20 16l-1.25.5L18 18l-.75-1.5L16 16l1.25-.5Z" />
    </BaseIcon>
  );
}

export function SproutIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Path d="M12 22v-6" />
      <Path d="M16 10c0 2-1.79 4-4 4s-4-2-4-4a4 4 0 0 1 4-4c2.21 0 4 2 4 4Z" />
      <Path d="M9 9C9 6 7 4 4 4c0 3 2 5 5 5Z" />
      <Path d="M15 9c0-3 2-5 5-5 0 3-2 5-5 5Z" />
    </BaseIcon>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  navBlurFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(18, 26, 44, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#0c1635',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    overflow: 'hidden',
  },
  navItemWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    width: '100%',
  },
  navContent: {
    alignItems: 'center',
    gap: 4,
  },
  iconOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHalo: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.12)',
    shadowColor: 'rgba(198,214,255,0.65)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  dashboardHalo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(10,16,35,0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  dashboardIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 18,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  iconWrapperInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    includeFontPadding: false,
    minWidth: 64,
  },
  dashboardLabel: {
    fontSize: 10,
  },
  tabLabelActive: {
    color: '#ffffff',
    textShadowColor: 'rgba(255,255,255,0.22)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tabLabelInactive: {
    color: 'rgba(255,255,255,0.7)',
  },
});

