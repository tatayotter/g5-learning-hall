'use client';
import { useEffect, useState } from 'react';
import { saveAvatar } from '@/lib/userSession';
import { fetchInventory, InventoryMap } from '@/lib/inventory';
import { USERPIC_CATALOG, userpicPath } from '@/lib/userpicShop';

interface AvatarPickerProps {
  userId: string;
  currentAvatar: string;
  onClose: () => void;
  onSaved: (avatar: string) => void;
}

export default function AvatarPicker({ userId, currentAvatar, onClose, onSaved }: AvatarPickerProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/userpics').then(res => res.json()),
      fetchInventory(userId),
    ])
      .then(([data, inv]) => {
        setFiles(data.files || []);
        setInventory(inv);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handlePick = async (avatar: string) => {
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
          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {files.map(file => {
                const avatar = `/userpics/${file}`;
                const isCurrent = avatar === currentAvatar;
                const isSaving = saving === avatar;
                return (
                  <button
                    key={file}
                    onClick={() => handlePick(avatar)}
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

            {USERPIC_CATALOG.length > 0 && (
              <>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-5 mb-2">
                  Trainer Sprites (unlock in the Curio Arena Shop)
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {USERPIC_CATALOG.map(item => {
                    const avatar = userpicPath(item.file);
                    const owned = (inventory[item.key] || 0) > 0;
                    const isCurrent = avatar === currentAvatar;
                    const isSaving = saving === avatar;
                    return (
                      <button
                        key={item.key}
                        onClick={() => owned ? handlePick(avatar) : alert(`🔒 Unlock "${item.name}" for ${item.cost} Gold in the Trainer Sprites tab of the Curio Arena Shop.`)}
                        disabled={owned && !!saving}
                        title={owned ? item.name : `Locked — ${item.cost} Gold in the Shop`}
                        className={`relative aspect-square rounded-xl border-2 overflow-hidden bg-neutral-950 transition-all disabled:opacity-50 ${
                          isCurrent ? 'border-amber-400' : owned ? 'border-neutral-700 hover:border-neutral-500' : 'border-neutral-800'
                        }`}
                      >
                        <img src={avatar} alt={item.name} className={`w-full h-full object-cover ${owned ? '' : 'opacity-30 grayscale'}`} />
                        {isCurrent && (
                          <span className="absolute bottom-0.5 right-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">✓</span>
                        )}
                        {!owned && (
                          <span className="absolute inset-0 flex items-center justify-center text-lg">🔒</span>
                        )}
                        {isSaving && (
                          <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white">...</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
