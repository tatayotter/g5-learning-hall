'use client';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, ChartColumn, ChevronRight, Egg, FilePenLine, Grid3x3, KeyRound, LayoutDashboard, Library, Lock, Menu,
  Newspaper, Package, Settings, ShoppingBag, Swords, Ticket, Undo2, UserRound, Users, Wrench, X, Bug, CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { WeeklyData } from '@/hooks/useWeeklyData';
import { ADMIN_THEME, Button, cx, ToastProvider } from '@/components/admin/ui';
import OverviewSection from '@/components/admin/OverviewSection';
import WeeklyPackageBuilder from '@/components/admin/PackagesSection';
import QuestionBankImporter from '@/components/admin/QuestionBankSection';
import ToolsSection from '@/components/admin/ToolsSection';
import ContentMatrixSection from '@/components/admin/ContentMatrixSection';
import ChildrenSection from '@/components/admin/ChildrenSection';
import ParentsSection from '@/components/admin/ParentsSection';
import EventsSection from '@/components/admin/EventsSection';
import EggChainsSection from '@/components/admin/EggChainsSection';
import SecPacksSection from '@/components/admin/SecPacksSection';
import SecRefundsSection from '@/components/admin/SecRefundsSection';
import DraftQuestionsSection from '@/components/admin/DraftQuestionsSection';
import AnalyticsSection from '@/components/admin/AnalyticsSection';
import BossFightSection from '@/components/admin/BossFightSection';
import SiteSettingsSection from '@/components/admin/SiteSettingsSection';
import BugReportsSection from '@/components/admin/BugReportsSection';
import VouchersSection from '@/components/admin/VouchersSection';
import BlogSection from '@/components/admin/BlogSection';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface AdminDashboardProps {
  currentData: WeeklyData;
  currentSunday: string;
  onUpdateStats: (...args: any[]) => void;
  onBack: () => void;
}

type AdminSection = 'overview' | 'packages' | 'draft_questions' | 'questions' | 'children' | 'parents' | 'events' | 'boss_fights' | 'egg_chains' | 'vouchers' | 'sec_packs' | 'sec_refunds' | 'analytics' | 'tools' | 'content_matrix' | 'site_settings' | 'bug_reports' | 'blog';

const NAV_GROUPS: { heading: string; items: { id: AdminSection; label: string; icon: LucideIcon }[] }[] = [
  {
    heading: 'Insights',
    items: [
      { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
      { id: 'analytics', label: 'Analytics', icon: ChartColumn },
    ],
  },
  {
    heading: 'Content',
    items: [
      { id: 'packages',        label: 'Weekly Packages', icon: Package },
      { id: 'draft_questions', label: 'Draft Questions', icon: FilePenLine },
      { id: 'questions',       label: 'Question Bank',   icon: Library },
      { id: 'content_matrix',  label: 'Content Matrix',  icon: Grid3x3 },
      { id: 'blog',            label: 'Blog',            icon: Newspaper },
    ],
  },
  {
    heading: 'People',
    items: [
      { id: 'children', label: 'Children', icon: Users },
      { id: 'parents',  label: 'Parents',  icon: UserRound },
    ],
  },
  {
    heading: 'Live ops',
    items: [
      { id: 'events',      label: 'Custom Events',   icon: CalendarDays },
      { id: 'boss_fights', label: 'Term Boss Fight', icon: Swords },
      { id: 'egg_chains',  label: 'Egg Chains',      icon: Egg },
      { id: 'vouchers',    label: 'Vouchers',        icon: Ticket },
    ],
  },
  {
    heading: 'Store',
    items: [
      { id: 'sec_packs',   label: 'SEC Packs',   icon: ShoppingBag },
      { id: 'sec_refunds', label: 'SEC Refunds', icon: Undo2 },
    ],
  },
  {
    heading: 'System',
    items: [
      { id: 'bug_reports',   label: 'Bug Reports',   icon: Bug },
      { id: 'tools',         label: 'Tools',         icon: Wrench },
      { id: 'site_settings', label: 'Site Settings', icon: Settings },
    ],
  },
];

const SECTION_STORAGE_KEY = 'lh_admin_section';
const ALL_SECTIONS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));

function readStoredSection(): AdminSection {
  try {
    const v = sessionStorage.getItem(SECTION_STORAGE_KEY) as AdminSection | null;
    if (v && ALL_SECTIONS.includes(v)) return v;
  } catch {
    // storage blocked — fall back to the default
  }
  return 'overview';
}

export default function AdminDashboard({ currentData, currentSunday, onUpdateStats, onBack }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [checking, setChecking] = useState(false);
  const [section, setSection] = useState<AdminSection>('overview');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem(SECTION_STORAGE_KEY, section); } catch { /* ignore */ }
  }, [section]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setChecking(true);
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setSection(readStoredSection());
        setIsAuthenticated(true);
      } else {
        setLoginError('Incorrect passcode.');
      }
    } catch {
      setLoginError('Could not reach the server.');
    } finally {
      setChecking(false);
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setPassword('');
    setNavOpen(false);
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={ADMIN_THEME} className="min-h-screen bg-[var(--a-page)] flex items-center justify-center px-4 font-sans">
        <div className="w-full max-w-sm">
          <button
            onClick={onBack}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--a-muted)] hover:text-[var(--a-ink)] transition-colors"
          >
            <ArrowLeft size={16} aria-hidden /> Back to Learning Hall
          </button>
          <div className="rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] p-7">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--a-accent-soft)] text-[var(--a-accent)]">
              <KeyRound size={20} aria-hidden />
            </div>
            <h1 className="text-lg font-semibold text-[var(--a-ink)]">Admin access</h1>
            <p className="mt-1 mb-6 text-sm text-[var(--a-muted)]">Enter the master passcode to continue.</p>
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                placeholder="Passcode"
                aria-label="Passcode"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(''); }}
                className={cx(
                  'h-10 w-full rounded-lg border bg-[var(--a-page)] px-3 text-sm text-[var(--a-ink)] placeholder:text-[var(--a-muted)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--a-accent)]',
                  loginError ? 'border-[var(--a-critical)]' : 'border-[var(--a-border-strong)]',
                )}
                autoFocus
              />
              {loginError && <p role="alert" className="text-xs text-[var(--a-critical)]">{loginError}</p>}
              <button
                type="submit"
                disabled={checking || !password}
                className="h-10 w-full rounded-lg bg-[var(--a-accent)] text-sm font-semibold text-[#ffffff] hover:brightness-110 disabled:opacity-50 transition"
              >
                {checking ? 'Checking...' : 'Unlock'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const activeGroup = NAV_GROUPS.find((g) => g.items.some((i) => i.id === section));
  const activeItem = activeGroup?.items.find((i) => i.id === section);
  const goTo = (id: AdminSection) => { setSection(id); setNavOpen(false); };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-[var(--a-border)] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--a-accent)] text-[13px] font-bold text-[#ffffff]">LH</div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-[var(--a-ink)]">Learning Hall</p>
          <p className="text-[11px] text-[var(--a-muted)]">Admin console</p>
        </div>
        <button
          className="ml-auto rounded-md p-1.5 text-[var(--a-muted)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-ink)] lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin sections">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
            <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--a-muted)]">{group.heading}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = section === item.id;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => goTo(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a-accent)]',
                        active
                          ? 'bg-[var(--a-surface-2)] font-medium text-[var(--a-ink)]'
                          : 'text-[var(--a-ink-2)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-ink)]',
                      )}
                    >
                      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[var(--a-accent)]" aria-hidden />}
                      <Icon size={16} className={active ? 'text-[var(--a-accent)]' : 'text-[var(--a-muted)]'} aria-hidden />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-[var(--a-border)] p-3">
        <button
          onClick={onBack}
          className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-[var(--a-ink-2)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-ink)]"
        >
          <ArrowLeft size={16} className="text-[var(--a-muted)]" aria-hidden /> Back to Learning Hall
        </button>
        <button
          onClick={handleLock}
          className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-[var(--a-ink-2)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-ink)]"
        >
          <Lock size={16} className="text-[var(--a-muted)]" aria-hidden /> Lock admin
        </button>
      </div>
    </div>
  );

  return (
    // Fixed-height frame with its own scroll column: page-level overflow
    // rules in globals.css would otherwise defeat a sticky sidebar.
    <div style={ADMIN_THEME} className="flex h-dvh overflow-hidden bg-[var(--a-page)] font-sans text-[var(--a-ink)]">
      <ToastProvider>
        {/* Desktop sidebar */}
        <aside className="hidden h-full w-60 shrink-0 border-r border-[var(--a-border)] bg-[var(--a-surface)] lg:block">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {navOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-[#000000]/60" onClick={() => setNavOpen(false)} aria-hidden />
            <aside className="absolute inset-y-0 left-0 w-64 border-r border-[var(--a-border)] bg-[var(--a-surface)] shadow-2xl">
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--a-border)] bg-[var(--a-page)]/85 px-4 backdrop-blur lg:px-8">
            <button
              className="rounded-md p-1.5 text-[var(--a-ink-2)] hover:bg-[var(--a-surface-2)] lg:hidden"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="text-[var(--a-muted)]">Admin</span>
              <ChevronRight size={14} className="text-[var(--a-muted)]" aria-hidden />
              <span className="hidden text-[var(--a-muted)] sm:inline">{activeGroup?.heading}</span>
              <ChevronRight size={14} className="hidden text-[var(--a-muted)] sm:inline" aria-hidden />
              <span className="truncate font-medium text-[var(--a-ink)]">{activeItem?.label}</span>
            </nav>
            <div className="ml-auto">
              <Button size="sm" variant="ghost" icon={Lock} onClick={handleLock}>Lock</Button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8 lg:py-8">
            {section === 'overview' && <OverviewSection passcode={password} />}
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
            {section === 'children' && <ChildrenSection passcode={password} />}
            {section === 'parents' && <ParentsSection />}
            {section === 'events' && <EventsSection passcode={password} />}
            {section === 'boss_fights' && <BossFightSection passcode={password} />}
            {section === 'egg_chains' && <EggChainsSection passcode={password} />}
            {section === 'vouchers' && <VouchersSection passcode={password} />}
            {section === 'sec_packs' && <SecPacksSection passcode={password} />}
            {section === 'sec_refunds' && <SecRefundsSection passcode={password} />}
            {section === 'draft_questions' && <DraftQuestionsSection passcode={password} />}
            {section === 'analytics' && <AnalyticsSection passcode={password} />}
            {section === 'bug_reports' && <BugReportsSection passcode={password} />}
            {section === 'tools' && (
              <ToolsSection
                currentData={currentData}
                currentSunday={currentSunday}
                onUpdateStats={onUpdateStats}
                passcode={password}
              />
            )}
            {section === 'content_matrix' && <ContentMatrixSection passcode={password} />}
            {section === 'site_settings' && <SiteSettingsSection passcode={password} />}
            {section === 'blog' && <BlogSection passcode={password} />}
          </main>
        </div>
      </ToastProvider>
    </div>
  );
}
