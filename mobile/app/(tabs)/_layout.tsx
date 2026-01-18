import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, shadows } from '../../constants/theme';

// Minimal line icons - clean and subtle
function InventoryIcon({ focused }: { focused: boolean }) {
  const color = focused ? colors.purple : colors.tabBarInactive;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8V21H3V8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M23 3H1V8H23V3Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 12H14"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AddIcon({ focused }: { focused: boolean }) {
  const color = focused ? colors.purple : colors.tabBarInactive;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V19M5 12H19"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function TabIcon({ icon, label, focused }: { icon: React.ReactNode; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      <View style={[styles.iconWrapper, focused && styles.iconWrapperFocused]}>
        {icon}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inventory',
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitleText}>All Products</Text>
            </View>
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              icon={<InventoryIcon focused={focused} />} 
              label="Inventory" 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Product',
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitleText}>New Product</Text>
            </View>
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              icon={<AddIcon focused={focused} />} 
              label="Add New" 
              focused={focused} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: colors.tabBarBg,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
    ...shadows.tabBar,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapperFocused: {
    backgroundColor: colors.purpleLight,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.tabBarInactive,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabLabelFocused: {
    color: colors.purple,
    fontWeight: '600',
  },
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerRight: {
    paddingRight: 16,
  },
  addProductButton: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addProductText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '600',
  },
});
