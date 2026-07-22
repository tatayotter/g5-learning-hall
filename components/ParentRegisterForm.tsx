'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';

export default function ParentRegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [children, setChildren] = useState<ChildFormData[]>([emptyChildForm()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateChild = (index: number, data: ChildFormData) => {
    setChildren((prev) => prev.map((c, i) => (i === index ? data : c)));
  };

  const addChild = () => setChildren((prev) => [...prev, emptyChildForm()]);
  const removeChild = (index: number) => setChildren((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    for (const child of children) {
      if (!child.fullName.trim() || !child.schoolName.trim() || !child.username.trim() || child.pin.length !== 4) {
        setError('Please fill in every field for each child, including a 4-digit PIN.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone } },
      });
      if (signUpError || !signUpData.user) {
        setError(signUpError?.message || 'Could not create your account.');
        return;
      }

      let childFailed = false;
      for (const child of children) {
        const { error: childError } = await supabase.rpc('create_child_account', {
          p_username: child.username,
          p_pin: child.pin,
          p_full_name: child.fullName,
          p_grade: child.grade,
          p_gender: child.gender,
          p_school_name: child.schoolName,
          p_avatar: child.avatar,
        });
        if (childError) {
          setError(`Account created, but adding ${child.fullName || 'a child'} failed: ${childError.message}. You can add them again from your dashboard once approved.`);
          childFailed = true;
          break;
        }
      }

      if (!childFailed) router.push('/parent-dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-indigo-300">Your details</h3>
        <input
          type="text"
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
          minLength={6}
          required
        />
        <input
          type="tel"
          placeholder="Phone number (optional, for future notifications)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="space-y-3">
        {children.map((child, i) => (
          <ChildAccountForm
            key={i}
            label={`Child ${i + 1}`}
            data={child}
            onChange={(data) => updateChild(i, data)}
            onRemove={children.length > 1 ? () => removeChild(i) : undefined}
          />
        ))}
        <button
          type="button"
          onClick={addChild}
          className="w-full rounded-lg border border-dashed border-neutral-700 py-2 text-sm text-gray-400 hover:text-indigo-300 hover:border-indigo-400"
        >
          + Add another child
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3"
      >
        {submitting ? 'Registering…' : 'Register'}
      </button>
    </form>
  );
}
