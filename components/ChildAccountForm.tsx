'use client';

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
}

export default function ChildAccountForm({ data, onChange, onRemove, label, theme = 'dark' }: ChildAccountFormProps) {
  const set = <K extends keyof ChildFormData>(key: K, value: ChildFormData[K]) =>
    onChange({ ...data, [key]: value });

  const setGender = (gender: 'boy' | 'girl') =>
    onChange({ ...data, gender, avatar: defaultAvatarForGender(gender) });

  if (theme === 'light') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">{label}</h3>
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 text-xs">
              ✕ Remove
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder="Full name"
          value={data.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          className="w-full rounded-xl bg-white border border-stone-300 px-4 py-3 text-sm text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={data.grade}
            onChange={(e) => set('grade', e.target.value)}
            className="rounded-xl bg-white border border-stone-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 transition-all"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={data.gender}
            onChange={(e) => setGender(e.target.value as 'boy' | 'girl')}
            className="rounded-xl bg-white border border-stone-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 transition-all"
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
          className="w-full rounded-xl bg-white border border-stone-300 px-4 py-3 text-sm text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Username"
            value={data.username}
            onChange={(e) => set('username', e.target.value)}
            className="rounded-xl bg-white border border-stone-300 px-4 py-3 text-sm text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            required
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="4-digit PIN"
            value={data.pin}
            onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="rounded-xl bg-white border border-stone-300 px-4 py-3 text-sm text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            required
          />
        </div>

        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <img src={data.avatar} alt="avatar preview" className="w-10 h-10 object-contain" />
          <p className="text-xs text-gray-500 leading-tight">
            Your starting avatar — change it anytime from your profile after signing up.
          </p>
        </div>
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
