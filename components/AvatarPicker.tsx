'use client';
import { useEffect, useState } from 'react';
import { saveAvatar } from '@/lib/userSession';

interface AvatarPickerProps {
  userId: string;
  currentAvatar: string;
  onClose: () => void;
  onSaved: (avatar: string) => void;
}

export default function AvatarPicker({ userId, currentAvatar, onClose, onSaved }: AvatarPickerProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/userpics')
      .then(res => res.json())
      .then(data => setFiles(data.files || []))
      .finally(() => setLoading(false));
  }, []);

  const handlePick = async (file: string) => {
    const avatar = `/userpics/${file}`;
    if (avatar === currentAvatar || saving) return;
    setSaving(avatar);
    const ok = await saveAvatar(userId, avatar);
    setSaving(null);
    if (ok) {
      onSaved(avatar);
      onClose();
    } else {
      alert('⚠️ Could not save your avatar. Try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Choose Your Avatar</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm">✕ Close</button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm animate-pulse">Loading avatars...</p>
        ) : files.length === 0 ? (
          <p className="text-gray-500 text-sm">No avatars available yet.</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 overflow-y-auto">
            {files.map(file => {
              const avatar = `/userpics/${file}`;
              const isCurrent = avatar === currentAvatar;
              const isSaving = saving === avatar;
              return (
                <button
                  key={file}
                  onClick={() => handlePick(file)}
                  disabled={!!saving}
                  className={`relative aspect-square rounded-xl border-2 overflow-hidden bg-neutral-950 transition-all disabled:opacity-50 ${
                    isCurrent ? 'border-amber-400' : 'border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <img src={avatar} alt={file} className="w-full h-full object-cover" />
                  {isCurrent && (
                    <span className="absolute bottom-0.5 right-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">✓</span>
                  )}
                  {isSaving && (
                    <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white">...</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
