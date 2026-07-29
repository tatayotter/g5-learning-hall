'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { callAdminApi } from '@/lib/adminApi';
import { GRADES } from '@/components/ChildAccountForm';

interface Classmate {
  id: string;
  username: string;
  full_name: string;
  grade: string;
  gender: 'boy' | 'girl';
  is_active: boolean;
}

export default function ClassmatesSection({ passcode }: { passcode: string }) {
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [grade, setGrade] = useState('Grade 5');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const loadClassmates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('classmates')
      .select('id, username, full_name, grade, gender, is_active')
      .order('full_name');
    setClassmates(data || []);
    setLoading(false);
  };

  useEffect(() => { loadClassmates(); }, []);

  const suggestUsername = (name: string) =>
    name.replace(/[^a-zA-Z ]/g, '').split(' ').filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1)).join('');

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    if (!usernameTouched) setUsername(suggestUsername(value));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !newPassword.trim()) {
      setError('Full name, username, and password are all required.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await callAdminApi('/api/classmate-admin', { passcode, username, fullName, grade, gender, password: newPassword });
    if (!result.success) {
      setError(result.error || 'Failed to add classmate.');
    } else {
      setFullName('');
      setUsername('');
      setNewPassword('');
      setGender('boy');
      setUsernameTouched(false);
      loadClassmates();
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (c: Classmate) => {
    const result = await callAdminApi('/api/classmate-admin', { passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender, isActive: !c.is_active });
    if (result.success) loadClassmates();
    else alert(result.error || 'Failed to update.');
  };

  const handleToggleGender = async (c: Classmate) => {
    const result = await callAdminApi('/api/classmate-admin', { passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender === 'girl' ? 'boy' : 'girl' });
    if (result.success) loadClassmates();
    else alert(result.error || 'Failed to update.');
  };

  const handleResetPassword = async (c: Classmate) => {
    if (!resetPassword.trim()) return;
    const result = await callAdminApi('/api/classmate-admin', { passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender, password: resetPassword });
    if (result.success) {
      alert(`✅ Password updated for ${c.full_name}.`);
      setResetTargetId(null);
      setResetPassword('');
    } else {
      alert(result.error || 'Failed to reset password.');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Classmates</h2>
      <p className="text-gray-500 text-sm mb-6">
        Add classmate accounts. They share their grade's Main Quest content and guild question pools but keep
        their own independent progress, and log in from the classmates group on the splash screen.
      </p>

      {/* Add classmate */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Add Classmate</p>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Full Name</label>
            <input type="text" placeholder="e.g. Juan Dela Cruz" value={fullName} onChange={e => handleFullNameChange(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Username (login)</label>
            <input type="text" placeholder="FirstNameLastname" value={username} onChange={e => { setUsername(e.target.value); setUsernameTouched(true); }}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Password</label>
            <input type="text" placeholder="Set their password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neutral-500">
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Gender (sprite)</label>
            <select value={gender} onChange={e => setGender(e.target.value as 'boy' | 'girl')}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neutral-500">
              <option value="boy">Boy</option>
              <option value="girl">Girl</option>
            </select>
          </div>
          <div className="col-span-2">
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button type="submit" disabled={submitting} className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors">
              {submitting ? 'Adding...' : '➕ Add Classmate'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">All Classmates</p>
        {loading ? (
          <p className="text-gray-500 text-sm animate-pulse">Loading...</p>
        ) : classmates.length === 0 ? (
          <p className="text-gray-600 text-sm">No classmates yet.</p>
        ) : (
          <div className="space-y-2">
            {classmates.map(c => (
              <div key={c.id} className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{c.full_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{c.username} · {c.grade}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleGender(c)}
                      className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      title="Toggle sprite gender"
                    >
                      {c.gender === 'girl' ? '👧 Girl' : '👦 Boy'}
                    </button>
                    <button
                      onClick={() => { setResetTargetId(resetTargetId === c.id ? null : c.id); setResetPassword(''); }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      🔑 Reset Password
                    </button>
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${c.is_active ? 'bg-green-900/50 text-green-400 border border-green-800 hover:bg-red-900/50 hover:text-red-400 hover:border-red-800' : 'bg-neutral-800 text-gray-500 border border-neutral-700 hover:bg-green-900/50 hover:text-green-400'}`}
                    >
                      {c.is_active ? '✅ Active' : '⛔ Inactive'}
                    </button>
                  </div>
                </div>
                {resetTargetId === c.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="New password"
                      value={resetPassword}
                      onChange={e => setResetPassword(e.target.value)}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-neutral-500"
                    />
                    <button
                      onClick={() => handleResetPassword(c)}
                      className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
