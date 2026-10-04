'use client';
import { useEffect, useState } from 'react';
import { Baby, Bug, Crown, GraduationCap, Link2, RefreshCw, UserRound, Users } from 'lucide-react';
import { callAdminApi } from '@/lib/adminApi';
import { Button, Card, ErrorBanner, PageHeader, Segmented, Skeleton, StatTile, Switch } from '@/components/admin/ui';
import { BarChart, BarList, ChartFrame, LineChart, type Series } from '@/components/admin/charts';

type Range = '7' | '30' | '90';

interface Kpi { value: number; change: number | null }
type Overview = {
  range: { days: number; start: string; end: string };
  kpis: {
    newKids: Kpi; newParents: Kpi; learners: Kpi;
    activeKids: number; linkedPct: number; premium: number; openBugs: number;
  };
  daily: { labels: string[]; kids: number[]; kidsPrev: number[]; parents: number[]; parentsPrev: number[]; learners: number[] };
  grades: { label: string; value: number }[];
  schools: { label: string; value: number }[];
  otherSchools: { schools: number; kids: number };
};

const shortDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function OverviewSection({ passcode }: { passcode: string }) {
  const [range, setRange] = useState<Range>('30');
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [compare, setCompare] = useState(true);
  const [signupTable, setSignupTable] = useState(false);
  const [learnerTable, setLearnerTable] = useState(false);

  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    callAdminApi<Overview>('/api/admin-overview', { passcode, days: Number(range) }).then((res) => {
      if (cancelled) return;
      if (!res.success) setError(res.error || 'Could not load the overview.');
      else setData(res as Overview);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [passcode, range, reloadTick]);

  // Loading flags are set where the change is triggered, not inside the effect.
  const reload = () => { setLoading(true); setError(''); setReloadTick((t) => t + 1); };
  const changeRange = (next: Range) => { if (next === range) return; setLoading(true); setError(''); setRange(next); };

  const k = data?.kpis;
  const periodLabel = `vs prior ${range}d`;
  const signupSeries: Series[] = data
    ? [
        { id: 'kids', label: 'Kids', color: 'var(--a-series-1)', values: data.daily.kids },
        { id: 'parents', label: 'Parents', color: 'var(--a-series-2)', values: data.daily.parents },
        ...(compare
          ? [{ id: 'kidsPrev', label: `Kids, previous ${range} days`, color: 'var(--a-muted)', values: data.daily.kidsPrev, muted: true }]
          : []),
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Overview"
        description={data ? `${shortDate(data.range.start)} to ${shortDate(data.range.end)}, Manila time` : 'Signups, learning activity and accounts at a glance'}
        actions={
          <>
            <Segmented
              ariaLabel="Date range"
              value={range}
              onChange={changeRange}
              options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]}
            />
            <Button icon={RefreshCw} onClick={reload} disabled={loading}>Refresh</Button>
          </>
        }
      />

      {error && <div className="mb-6"><ErrorBanner message={error} onRetry={reload} /></div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="New kids" icon={Baby} value={k?.newKids.value.toLocaleString() ?? '-'} delta={k?.newKids.change} deltaLabel={periodLabel} loading={loading && !data} />
        <StatTile label="Kids who learned" icon={GraduationCap} value={k?.learners.value.toLocaleString() ?? '-'} delta={k?.learners.change} deltaLabel={periodLabel} loading={loading && !data} />
        <StatTile label="New parents" icon={UserRound} value={k?.newParents.value.toLocaleString() ?? '-'} delta={k?.newParents.change} deltaLabel={periodLabel} loading={loading && !data} />
        <StatTile label="Premium families" icon={Crown} value={k?.premium.toLocaleString() ?? '-'} hint="Active subscriptions" loading={loading && !data} />
        <StatTile label="Active kids" icon={Users} value={k?.activeKids.toLocaleString() ?? '-'} hint="All time" loading={loading && !data} />
        <StatTile label="Linked to a parent" icon={Link2} value={k ? `${Math.round(k.linkedPct * 100)}%` : '-'} hint="Of active kids" loading={loading && !data} />
        <StatTile label="Open bug reports" icon={Bug} value={k?.openBugs.toLocaleString() ?? '-'} hint="New, triage or in progress" loading={loading && !data} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Signups per day"
          description="New kid and parent accounts"
          actions={
            <>
              <Switch checked={compare} onChange={setCompare} label="Compare" />
              <Segmented
                ariaLabel="Signups view"
                value={signupTable ? 'table' : 'chart'}
                onChange={(v) => setSignupTable(v === 'table')}
                options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]}
              />
            </>
          }
        >
          {data ? (
            <ChartFrame showTable={signupTable} labels={data.daily.labels} series={signupSeries} formatLabel={shortDate}>
              <LineChart labels={data.daily.labels} series={signupSeries} formatLabel={shortDate} ariaLabel="New kids and parents per day" />
            </ChartFrame>
          ) : (
            <Skeleton className="h-[220px] w-full" />
          )}
        </Card>

        <Card title="Kids by grade" description="Active accounts">
          {data ? <BarList items={data.grades} color="var(--a-series-1)" valueLabel="kids" /> : <Skeleton className="h-[220px] w-full" />}
        </Card>

        <Card
          className="xl:col-span-2"
          title="Kids who learned, per day"
          description="Finished a main quest or a guild session"
          actions={
            <Segmented
              ariaLabel="Learners view"
              value={learnerTable ? 'table' : 'chart'}
              onChange={(v) => setLearnerTable(v === 'table')}
              options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]}
            />
          }
        >
          {data ? (
            <ChartFrame
              showTable={learnerTable}
              labels={data.daily.labels}
              series={[{ id: 'learners', label: 'Kids who learned', color: 'var(--a-series-1)', values: data.daily.learners }]}
              formatLabel={shortDate}
            >
              <BarChart
                labels={data.daily.labels}
                values={data.daily.learners}
                color="var(--a-series-1)"
                seriesLabel="Kids who learned"
                formatLabel={shortDate}
                ariaLabel="Kids who learned per day"
              />
            </ChartFrame>
          ) : (
            <Skeleton className="h-[200px] w-full" />
          )}
        </Card>

        <Card title="Top schools" description="Active kids by school">
          {data ? (
            <>
              <BarList items={data.schools} color="var(--a-series-1)" valueLabel="kids" />
              {(data.otherSchools?.kids ?? 0) > 0 && (
                <p className="mt-3 border-t border-[var(--a-border)] pt-3 text-xs text-[var(--a-muted)]">
                  Plus {data.otherSchools.kids.toLocaleString()} kids across {data.otherSchools.schools.toLocaleString()} other schools
                </p>
              )}
            </>
          ) : (
            <Skeleton className="h-[200px] w-full" />
          )}
        </Card>
      </div>
    </div>
  );
}
