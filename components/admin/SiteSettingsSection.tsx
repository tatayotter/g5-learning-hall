'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { callAdminApi } from '@/lib/adminApi';
import { Badge, Button, Card, Field, Input, PageHeader, Skeleton, Switch, useToast } from '@/components/admin/ui';

// Site-wide settings that apply across the whole app, not just one grade/week/user — currently
// just the Facebook Pixel ID. Read is a plain public-table select (public.app_settings has an
// open SELECT policy — see the migration); write goes through admin-app-settings, which is
// passcode-gated the same way as every other admin action.
//
// The pixel switch is "loaded on every page or not": off saves an empty ID (the pixel stops
// loading), on saves whatever ID is in the field. The field keeps the last ID while this page
// is open so switching back on doesn't need it retyped.
export default function SiteSettingsSection({ passcode }: { passcode: string }) {
  const toast = useToast();
  const [pixelId, setPixelId] = useState('');
  const [savedPixelId, setSavedPixelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.from('app_settings').select('facebook_pixel_id').eq('id', 1).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const id = data?.facebook_pixel_id || '';
      setPixelId(id);
      setSavedPixelId(id || null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const save = async (value: string) => {
    setSaving(true);
    const result = await callAdminApi('/api/admin-app-settings', { passcode, action: 'set_facebook_pixel_id', pixelId: value });
    setSaving(false);
    if (!result.success) {
      toast(result.error || 'Failed to save the Facebook Pixel ID.', 'error');
      return;
    }
    setSavedPixelId(value || null);
    toast(value ? 'Facebook Pixel is on. It loads on every page.' : 'Facebook Pixel is off.');
  };

  const trimmed = pixelId.trim();
  const enabled = !!savedPixelId;
  const dirty = enabled && trimmed !== savedPixelId;
  const validId = /^\d{6,20}$/.test(trimmed);

  return (
    <div>
      <PageHeader title="Site settings" description="App-wide settings that apply across every page." />

      <Card
        className="max-w-2xl"
        title="Facebook Pixel"
        description="Meta's tracking pixel for ad reporting. Loads on every page and records a page view on each navigation."
        actions={loading ? undefined : <Badge tone={enabled ? 'good' : 'neutral'}>{enabled ? 'On' : 'Off'}</Badge>}
      >
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-5">
            <Switch
              checked={enabled}
              disabled={saving || (!enabled && !validId)}
              onChange={(on) => save(on ? trimmed : '')}
              label="Load the pixel on every page"
              description={!enabled && !validId ? 'Enter a Pixel ID below to turn this on.' : 'Turning it off stops the pixel loading straight away.'}
            />
            <Field label="Pixel ID" hint="The numeric ID from Meta Events Manager, not the full script.">
              <div className="flex gap-2">
                <Input
                  mono
                  inputMode="numeric"
                  placeholder="e.g. 1234567890123456"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                />
                {enabled && (
                  <Button variant="primary" disabled={saving || !dirty || !validId} onClick={() => save(trimmed)}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
            </Field>
            {trimmed && !validId && <p className="text-xs text-[var(--a-serious)]">A Pixel ID is digits only.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
