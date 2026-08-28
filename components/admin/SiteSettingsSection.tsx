'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { callAdminApi } from '@/lib/adminApi';

// Site-wide settings that apply across the whole app, not just one grade/week/user — currently
// just the Facebook Pixel ID. Read is a plain public-table select (public.app_settings has an
// open SELECT policy — see the migration); write goes through admin-app-settings, which is
// passcode-gated the same way as every other admin action.
export default function SiteSettingsSection({ passcode }: { passcode: string }) {
  const [pixelId, setPixelId] = useState('');
  const [savedPixelId, setSavedPixelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('facebook_pixel_id').eq('id', 1).maybeSingle();
      const id = data?.facebook_pixel_id || '';
      setPixelId(id);
      setSavedPixelId(id || null);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const result = await callAdminApi('/api/admin-app-settings', {
      passcode,
      action: 'set_facebook_pixel_id',
      pixelId: pixelId.trim(),
    });
    setSaving(false);
    if (!result.success) {
      alert(`❌ ${result.error || 'Failed to save Facebook Pixel ID.'}`);
      return;
    }
    setSavedPixelId(pixelId.trim() || null);
    alert(pixelId.trim() ? '✅ Facebook Pixel saved — it will load on every page.' : '✅ Facebook Pixel cleared.');
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#ede4d3] mb-1">Site Settings</h2>
      <p className="text-[#8a7c66] text-sm mb-6">App-wide settings that apply across every page.</p>

      <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5 max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-[#8a7c66] uppercase tracking-widest">📘 Facebook Pixel</p>
          {savedPixelId ? (
            <span className="text-xs font-bold text-[#7fae52] bg-[#223616]/40 border border-[#33501f] px-2 py-0.5 rounded-full">Active</span>
          ) : (
            <span className="text-xs font-bold text-[#8a7c66] bg-[#2a2119] border border-[#3d3225] px-2 py-0.5 rounded-full">Not Set</span>
          )}
        </div>
        <p className="text-[#8a7c66] text-xs mb-3">
          Paste your Pixel ID (the numeric ID from Meta Events Manager — not the full script). Once saved,
          it loads automatically on every page of the app and site, and tracks a PageView on every navigation.
        </p>
        {loading ? (
          <p className="text-gray-600 text-sm animate-pulse">Loading...</p>
        ) : (
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Insert Facebook Pixel ID here (e.g. 1234567890123456)"
              value={pixelId}
              onChange={e => setPixelId(e.target.value)}
              className="flex-1 bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] font-mono focus:outline-none focus:border-neutral-500"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#a8620f] hover:bg-[#c9781a] disabled:opacity-40 text-[#ede4d3] font-bold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
