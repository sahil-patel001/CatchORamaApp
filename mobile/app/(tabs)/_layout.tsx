import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// Custom SVG Icons - Clean line style
function ProductsIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#4F46E5' : '#9CA3AF';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AddIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#4F46E5' : '#9CA3AF';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={9}
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M12 8V16M8 12H16"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
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
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Products',
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              icon={<ProductsIcon focused={focused} />} 
              label="Products" 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Product',
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    height: 80,
    paddingBottom: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapperFocused: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabLabelFocused: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 17,
  },
});