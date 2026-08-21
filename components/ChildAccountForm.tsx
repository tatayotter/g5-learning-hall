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
}

export default function ChildAccountForm({ data, onChange, onRemove, label }: ChildAccountFormProps) {
  const set = <K extends keyof ChildFormData>(key: K, value: ChildFormData[K]) =>
    onChange({ ...data, [key]: value });

  const setGender = (gender: 'boy' | 'girl') =>
    onChange({ ...data, gender, avatar: defaultAvatarForGender(gender) });

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
