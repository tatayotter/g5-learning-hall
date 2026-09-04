// components/dashboard/ProfileTab.tsx
// Extracted from Dashboard.tsx's `activeTab === 'profile'` block — part of
// splitting that god component apart, same approach as VaultTab/GuildsTab.
// No behavior change.
'use client';

import { UserId } from '@/lib/userSession';
import { WeeklyData } from '@/hooks/useWeeklyData';
import HeroProfile from '@/components/HeroProfile';
import PushNotificationSettings from '@/components/PushNotificationSettings';

interface ProfileTabProps {
  activeUserId: UserId;
  data: WeeklyData;
  currentDayName: string;
  onNavigateToProfile: () => void;
}

export default function ProfileTab({ activeUserId, data, currentDayName, onNavigateToProfile }: ProfileTabProps) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 font-display text-gray-900">Hero Profile</h1>
      <p className="text-gray-500 mb-8">Your rank, stats, and everything you've earned on the journey so far.</p>
      <HeroProfile
        userId={activeUserId}
        data={data}
        currentDay={currentDayName}
        onViewAchievements={onNavigateToProfile}
      />
      <div className="mt-6 max-w-md">
        <PushNotificationSettings owner={{ kind: 'app_user', id: activeUserId }} variant="card" />
      </div>
    </div>
  );
}
