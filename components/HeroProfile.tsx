// components/HeroProfile.tsx
import { CharacterStats } from '@/hooks/useWeeklyData';
import { useState } from 'react';
import { startAmbience, stopAmbience } from '@/lib/sounds';
import { getTitleForLevel } from '@/lib/titles';
import { USERS } from '@/lib/userSession';
import AvatarPicker from '@/components/AvatarPicker';

interface HeroProfileProps {
  userId: string;
  stats: CharacterStats;
  currentDay: string;
}

export default function HeroProfile({ userId, stats, currentDay }: HeroProfileProps) {
  const [ambienceOn, setAmbienceOn] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarTick, setAvatarTick] = useState(0);
  const activeUser = USERS[userId as keyof typeof USERS] ?? USERS['damien'];

  const toggleAmbience = () => {
    if (ambienceOn) {
      stopAmbience();
    } else {
      startAmbience();
    }
    setAmbienceOn(!ambienceOn);
  };

  const level = stats?.level || 1;
  const xp = stats?.xp || 0;
  const gold = stats?.gold || 0;
  
  const xpNeeded = 500 + (level * 100);
  const progressPercentage = Math.min((xp / xpNeeded) * 100, 100);
  const currentTitle = getTitleForLevel(level);

  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6 text-white">
      {/* --- Profile Header with Avatar --- */}
      <div className="flex items-center gap-4 mb-4 relative">
        <button
          onClick={toggleAmbience}
          title={ambienceOn ? 'Mute torch ambience' : 'Play torch ambience'}
          className="absolute top-0 right-0 text-lg opacity-60 hover:opacity-100 transition-opacity"
        >
          {ambienceOn ? '🔥' : '🕯️'}
        </button>
        <button
          onClick={() => setPickerOpen(true)}
          title="Change avatar"
          className="relative w-20 h-20 flex-shrink-0 group"
        >
          <img
            key={avatarTick}
            src={activeUser.avatar}
            alt="Character Portrait"
            className="w-20 h-20 object-contain"
          />
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white bg-black/40 rounded">
            ✏️
          </span>
        </button>
        <div>
          {/* Shield removed from here */}
          <h2 className="text-xl font-bold font-display">{activeUser?.fullName || 'Hero'}</h2>
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">{currentTitle.icon} {currentTitle.title}</p>
          <p className="text-xs text-gray-400">Mode: <span className="text-green-400">{currentDay}</span></p>
        </div>
      </div>
      
      {/* --- Stats Grid --- */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-neutral-900 p-2 rounded">
          <p className="text-xs text-gray-500">Level</p>
          <p className="font-bold font-mono">Lvl {level}</p>
        </div>
        <div className="bg-neutral-900 p-2 rounded">
          <p className="text-xs text-gray-500">XP</p>
          <p className="font-bold font-mono">{xp}/{xpNeeded}</p>
        </div>
        <div className="bg-neutral-900 p-2 rounded">
          <p className="text-xs text-gray-500">Wallet</p>
          <p className="font-bold font-mono text-yellow-400"><img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {gold}</p>
        </div>
      </div>

      {/* --- Progress Bar --- */}
      <div className="w-full bg-neutral-800 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      {pickerOpen && (
        <AvatarPicker
          userId={userId}
          currentAvatar={activeUser.avatar}
          onClose={() => setPickerOpen(false)}
          onSaved={() => setAvatarTick(t => t + 1)}
        />
      )}
    </div>
  );
}