'use client';
import { useRouter } from 'next/navigation';
import { useWeeklyData } from '@/hooks/useWeeklyData';
import AdminDashboard from '@/components/AdminDashboard';

export default function TatayAdminPage() {
  const router = useRouter();
  const { data, loading, updateStatsAndJournal, currentSunday } = useWeeklyData('damien');

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-[#8a7c66]">
        Loading…
      </div>
    );
  }

  return (
    <AdminDashboard
      currentData={data}
      currentSunday={currentSunday}
      onUpdateStats={updateStatsAndJournal}
      onBack={() => router.push('/')}
    />
  );
}
