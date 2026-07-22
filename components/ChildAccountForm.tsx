'use client';
import { STARTER_AVATARS } from '@/lib/starterAvatars';

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

export const emptyChildForm = (): ChildFormData => ({
  fullName: '',
  grade: 'Grade 5',
  gender: 'boy',
  schoolName: '',
  username: '',
  pin: '',
  avatar: STARTER_AVATARS[0],
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
          onChange={(e) => set('gender', e.target.value as 'boy' | 'girl')}
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

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Choose an avatar</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {STARTER_AVATARS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              onClick={() => set('avatar', avatar)}
              className={`relative aspect-square rounded-lg border-2 overflow-hidden bg-neutral-950 transition-all ${
                data.avatar === avatar ? 'border-amber-400' : 'border-neutral-700 hover:border-neutral-500'
              }`}
            >
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
