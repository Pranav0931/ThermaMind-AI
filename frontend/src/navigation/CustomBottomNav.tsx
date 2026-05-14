import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const getIconName = (routeName: string, isFocused: boolean): keyof typeof MaterialIcons.glyphMap => {
    switch (routeName) {
      case 'Dashboard': return isFocused ? 'grid-view' : 'grid-view';
      case 'Insights': return isFocused ? 'psychology' : 'psychology';
      case 'Energy': return isFocused ? 'bolt' : 'bolt';
      case 'Schedule': return isFocused ? 'calendar-today' : 'calendar-today';
      default: return 'circle';
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const activeColor = route.name === 'Insights' && isFocused ? '#4edea3' : 
                            route.name === 'Schedule' && isFocused ? '#4edea3' :
                            isFocused ? '#8aebff' : '#bbc9cd';
        
        const opacity = isFocused ? 1 : 0.6;
        
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
          >
            <View style={[styles.iconContainer, isFocused && styles.glow]}>
              <MaterialIcons name={getIconName(route.name, isFocused)} size={24} color={activeColor} style={{ opacity }} />
            </View>
            <Text style={[styles.label, { color: activeColor, opacity }]}>
              {label as string}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(24, 28, 30, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 4,
  },
  glow: {
    shadowColor: '#8aebff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontFamily: 'sans-serif', // replace with Hanken Grotesk if loaded
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
