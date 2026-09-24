// components/dashboard/ProfileTab.tsx
// Extracted from Dashboard.tsx's `activeTab === 'profile'` block — part of
// splitting that god component apart, same approach as VaultTab/GuildsTab.
// No behavior change.
'use client';

import { UserId } from '@/lib/userSession';
import { WeeklyData } from '@/hooks/useWeeklyData';
import HeroProfile from '@/components/HeroProfile';
import PushNotificationSettings from '@/components/PushNotificationSettings';
import { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

interface ProfileTabProps {
  activeUserId: UserId;
  data: WeeklyData;
  currentDayName: string;
  onNavigateToProfile: () => void;
}

export default function ProfileTab({ activeUserId, data, currentDayName, onNavigateToProfile }: ProfileTabProps) {
  return (
    <div>
      {/* Same Bungee/stroke/shadow quest-text treatment as the Active
          Campaign Map title (components/dashboard/board/BoardMapView.tsx). */}
      <h1 className="text-2xl lg:text-3xl mt-4 mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>Hero Profile</span>
          <span style={{ ...questTextStyle, color: '#f5c542' }}>Hero Profile</span>
        </span>
      </h1>
      <p className="text-[#6b4820] mb-8 text-sm">Your rank, stats, and everything you&apos;ve earned on the journey so far.</p>
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
