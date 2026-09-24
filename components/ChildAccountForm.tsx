'use client';
import type { RefObject } from 'react';
import { CURIO_CARD_STYLES } from '@/components/GameButton';

export interface ChildFormData {
  fullName: string;
  grade: string;
  gender: 'boy' | 'girl';
  schoolName: string;
  username: string;
  pin: string;
  avatar: string;
}

export const GRADES = ['Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

/** Default avatar for a given gender — assigned automatically at account
 *  creation; the child can change it later via the Avatar Picker. */
export function defaultAvatarForGender(gender: 'boy' | 'girl'): string {
  return gender === 'girl'
    ? '/userpics/userpics_premium/ssg3.png'
    : '/userpics/userpics_premium/ssb3.png';
}

// Shared parchment input look — same formula as SplashScreen.tsx's login
// fields, so the signup form's fields read as the same "game" surface
// instead of a generic stock-Tailwind form.
const INPUT_CLASS =
  'w-full rounded-[14px] bg-white border border-[#c9a87a] px-4 py-3 text-base text-[#2a1505] ' +
  'placeholder:text-[#8b5e2a]/60 outline-none focus:border-[#c9781a] transition-colors';

export const emptyChildForm = (): ChildFormData => ({
  fullName: '',
  grade: 'Grade 5',
  gender: 'boy',
  schoolName: '',
  username: '',
  pin: '',
  avatar: defaultAvatarForGender('boy'),
});

interface ChildAccountFormProps {
  data: ChildFormData;
  onChange: (data: ChildFormData) => void;
  onRemove?: () => void;
  label: string;
  theme?: 'dark' | 'light';
  /** Optional ref for the full-name input — lets a page autofocus it on mount. */
  firstFieldRef?: RefObject<HTMLInputElement | null>;
}

export default function ChildAccountForm({ data, onChange, onRemove, label, theme = 'dark', firstFieldRef }: ChildAccountFormProps) {
  const set = <K extends keyof ChildFormData>(key: K, value: ChildFormData[K]) =>
    onChange({ ...data, [key]: value });

  const setGender = (gender: 'boy' | 'girl') =>
    onChange({ ...data, gender, avatar: defaultAvatarForGender(gender) });

  if (theme === 'light') {
    return (
      <div className="space-y-3.5">
        <style>{CURIO_CARD_STYLES}</style>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-[#7a4a0f] uppercase tracking-wider">{label}</h3>
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 text-sm">
              ✕ Remove
            </button>
          )}
        </div>

        {/* Pick your hero — boy/girl doubles as the avatar picker, so there's
            no separate "here's your avatar" afterthought box below. */}
        <div className="grid grid-cols-2 gap-3">
          {(['boy', 'girl'] as const).map((g) => {
            const isSelected = data.gender === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`ccard ${isSelected ? 'ccard-selected' : ''}`}
              >
                <img src={defaultAvatarForGender(g)} alt="" className="w-20 h-20 object-contain" />
                <span className="text-sm font-extrabold text-[#2a1505]">{g === 'boy' ? 'Boy' : 'Girl'}</span>
                {isSelected && <span className="ccard-check">✔</span>}
              </button>
            );
          })}
        </div>

        <input
          ref={firstFieldRef}
          type="text"
          placeholder="Full name"
          value={data.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          className={INPUT_CLASS}
          required
        />

        {/* Grade — a chip row instead of a native <select>, so it reads as a
            pick, not a form field. */}
        <div className="flex flex-wrap gap-2">
          {GRADES.map((g) => {
            const isSelected = data.grade === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => set('grade', g)}
                className={`px-3.5 py-2 rounded-full text-sm font-bold border transition-colors ${
                  isSelected
                    ? 'bg-[#c9781a]/20 border-[#c9781a] text-[#7a4a0f]'
                    : 'bg-white border-[#c9a87a] text-[#6b4820] hover:border-[#c9781a] hover:bg-[#f0ddb8]'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="School name"
          value={data.schoolName}
          onChange={(e) => set('schoolName', e.target.value)}
          className={INPUT_CLASS}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Username"
            value={data.username}
            onChange={(e) => set('username', e.target.value)}
            className={INPUT_CLASS}
            required
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="4-digit PIN"
            value={data.pin}
            onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={INPUT_CLASS}
            required
          />
        </div>

        <p className="text-center text-[11px] text-[#8b5e2a]">
          You can change your look anytime from your profile after signing up.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-indigo-300">{label}</h3>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-gray-500 hover:text-red-400 text-xs">
            ✕ Remove
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Child's full name"
        value={data.fullName}
        onChange={(e) => set('fullName', e.target.value)}
        className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          value={data.grade}
          onChange={(e) => set('grade', e.target.value)}
          className="rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          value={data.gender}
          onChange={(e) => setGender(e.target.value as 'boy' | 'girl')}
          className="rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
        >
          <option value="boy">Boy</option>
          <option value="girl">Girl</option>
        </select>
      </div>

      <input
        type="text"
        placeholder="School name"
        value={data.schoolName}
        onChange={(e) => set('schoolName', e.target.value)}
        className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Username"
          value={data.username}
          onChange={(e) => set('username', e.target.value)}
          className="rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
          required
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="4-digit PIN"
          value={data.pin}
          onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
          required
        />
      </div>

      {/* Avatar is auto-assigned from gender — no picker needed here.
          The child can customise it later via the Hero Profile → Avatar Picker. */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <img
          src={data.avatar}
          alt="default avatar"
          className="w-8 h-8 object-contain rounded"
        />
        <span>Default avatar assigned by gender — can be changed after account creation.</span>
      </div>
    </div>
  );
}
