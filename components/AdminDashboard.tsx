'use client';
import { useState } from 'react';
import { WeeklyData } from '@/hooks/useWeeklyData';
import WeeklyPackageBuilder from '@/components/admin/PackagesSection';
import QuestionBankImporter from '@/components/admin/QuestionBankSection';
import ToolsSection from '@/components/admin/ToolsSection';
import PromptsSection from '@/components/admin/PromptsSection';
import ClassmatesSection from '@/components/admin/ClassmatesSection';
import EventsSection from '@/components/admin/EventsSection';
import DraftQuestionsSection from '@/components/admin/DraftQuestionsSection';
import AnalyticsSection from '@/components/admin/AnalyticsSection';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface AdminDashboardProps {
  currentData: WeeklyData;
  currentSunday: string;
  onUpdateStats: (...args: any[]) => void;
  onBack: () => void;
}

type AdminSection = 'packages' | 'questions' | 'tools' | 'prompts' | 'classmates' | 'events' | 'draft_questions' | 'analytics';

export default function AdminDashboard({ currentData, currentSunday, onUpdateStats, onBack }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [section, setSection] = useState<AdminSection>('packages');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        alert('❌ Incorrect passcode!');
      }
    } catch {
      alert('⚠️ Could not reach server.');
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <button onClick={onBack} className="text-gray-600 hover:text-gray-400 text-sm mb-8 flex items-center gap-2 transition-colors">
            ← Back to Dashboard
          </button>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <div className="text-3xl mb-4">🔑</div>
            <h1 className="text-xl font-bold text-white mb-1">Admin Access</h1>
            <p className="text-gray-500 text-sm mb-6">Enter the master passcode to continue.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="Passcode"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neutral-500"
                autoFocus
              />
              <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-100 transition-colors">
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const NAV: { id: AdminSection; label: string }[] = [
    { id: 'packages',   label: 'Weekly Packages' },
    { id: 'questions',  label: 'Question Bank' },
    { id: 'classmates', label: 'Classmates' },
    { id: 'events',     label: 'Custom Events' },
    { id: 'draft_questions', label: 'Draft Questions' },
    { id: 'analytics',  label: 'Analytics' },
    { id: 'tools',      label: 'Tools' },
    { id: 'prompts',    label: 'Prompts' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Left sidebar */}
      <aside className="w-56 flex-shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="px-5 py-6 border-b border-neutral-800">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">G5 Admin</p>
          <p className="text-white font-bold">Control Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                section === item.id
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Back button */}
        <div className="p-3 border-t border-neutral-800">
          <button
            onClick={onBack}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-10">
        {section === 'packages' && (
          <WeeklyPackageBuilder
            currentData={currentData}
            currentSunday={currentSunday}
            onUpdateStats={onUpdateStats}
            passcode={password}
            onNavigateToDrafts={() => setSection('draft_questions')}
          />
        )}
        {section === 'questions' && <QuestionBankImporter />}
        {section === 'classmates' && <ClassmatesSection passcode={password} />}
        {section === 'events' && <EventsSection passcode={password} />}
        {section === 'draft_questions' && <DraftQuestionsSection passcode={password} />}
        {section === 'analytics' && <AnalyticsSection />}
        {section === 'tools' && (
          <ToolsSection
            currentData={currentData}
            currentSunday={currentSunday}
            onUpdateStats={onUpdateStats}
            passcode={password}
          />
        )}
        {section === 'prompts' && <PromptsSection />}
      </main>
    </div>
  );
}
