import { Tabs } from 'expo-router'

import { TabBar } from '@/components/TabBar'

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Record' }} />
      <Tabs.Screen name="folders" options={{ title: 'Folders' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  )
}
