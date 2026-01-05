import { useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export const NATIVE_TAB_BAR_BASE_HEIGHT = 94;

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
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  useEffect(() => {
    if (__DEV__ && isNative) {
      console.log('[NativeTabBar] mounted');
    }
  }, [isNative]);

  if (!isNative) return null;

  const bottomInset = safeAreaBottom ?? insets?.bottom ?? 0;
  const containerPaddingBottom = styles.navContainer.paddingBottom + bottomInset;
  const devProps = __DEV__ ? { testID: 'native-tabbar' } : {};

  return (
    <View
      {...devProps}
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.wrapper,
        {
          paddingBottom: bottomInset,
          opacity: visible ? 1 : 0,
        },
      ]}
    >
      {__DEV__ ? <Text style={styles.watermark}>NATIVE_TABBAR</Text> : null}
      <View style={[styles.navContainer, { paddingBottom: containerPaddingBottom }]}>
        <BlurView tint="dark" intensity={50} style={styles.navBlur}>
          <View style={styles.navBackground} />
        </BlurView>
        <View style={styles.navContent}>
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
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
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
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  watermark: {
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  navContainer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  navBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: 'hidden',
  },
  navBackground: {
    flex: 1,
    backgroundColor: 'rgba(10, 16, 30, 0.82)',
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(10, 16, 30, 0.24)',
    shadowColor: '#0c1635',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  navItemWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: 'rgba(198,214,255,0.55)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  dashboardHalo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(10,16,35,0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  dashboardIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 18,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  iconWrapperInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    includeFontPadding: false,
    minWidth: 64,
  },
  dashboardLabel: {
    fontSize: 11,
  },
  tabLabelActive: {
    color: '#ffffff',
    textShadowColor: 'rgba(255,255,255,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tabLabelInactive: {
    color: 'rgba(255,255,255,0.7)',
  },
});
