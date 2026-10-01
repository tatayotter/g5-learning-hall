'use client';
import { useEffect, useState } from 'react';
import { saveAvatar } from '@/lib/userSession';
import { fetchInventory, InventoryMap } from '@/lib/inventory';
import { USERPIC_CATALOG, userpicPath } from '@/lib/userpicShop';
import { playPageFlip } from '@/lib/sounds';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

// Default sprites — always selectable, never purchaseable.
const DEFAULT_USERPICS = [
  { file: 'ssb3.png', label: 'Default Boy' },
  { file: 'ssg3.png', label: 'Default Girl' },
];

interface AvatarPickerProps {
  userId: string;
  currentAvatar: string;
  onClose: () => void;
  onSaved: (avatar: string) => void;
}

export default function AvatarPicker({ userId, currentAvatar, onClose, onSaved }: AvatarPickerProps) {
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory(userId)
      .then(inv => setInventory(inv))
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
      alert('Could not save your avatar. Try again.');
    }
  };

  // Avatar tile: white card with dark-wood trim, gold ring on the current pick
  // (same white-on-wood inset as CompendiumPanel's WhiteNailBox).
  const tileClass = 'relative aspect-square rounded-xl border-2 border-[#4a2f18] overflow-hidden bg-white transition-all disabled:opacity-50';
  const tileRing = (isCurrent: boolean) => ({ boxShadow: isCurrent ? '0 0 0 3px #f5c542' : '0 0 0 2px #d4a017' });
  const currentBadge = (
    <span className="absolute bottom-0.5 right-0.5 bg-[#16a34a] border border-[#14532d] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">✓</span>
  );
  const savingVeil = (
    <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white">...</span>
  );
  const sectionLabel = 'text-xs font-bold text-[#f5d9a8] uppercase tracking-widest mb-2';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Same wood-plank + gold trim + corner-nail frame as the other game
          popups (DuplicateCatchModal, CompendiumPanel's detail modal). */}
      <div
        className="relative border-2 border-[#4a2f18] rounded-2xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col battle-panel-in"
        style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
        onClick={e => e.stopPropagation()}
      >
        <Nail className="top-2 left-2" />
        <Nail className="top-2 right-2" />
        <Nail className="bottom-2 left-2" />
        <Nail className="bottom-2 right-2" />
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-base sm:text-lg" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>Choose Your Avatar</span>
              <span style={{ ...questTextStyle, color: '#f5c542' }}>Choose Your Avatar</span>
            </span>
          </h2>
          <button
            onClick={() => { playPageFlip(); onClose(); }}
            className="text-gray-200 hover:text-white text-xl leading-none btn-tactile"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-[#f5d9a8] text-sm animate-pulse">Loading avatars...</p>
        ) : (
          <div className="overflow-y-auto flex-1 min-h-0 p-1">
            {/* Default avatars — always available, no purchase needed */}
            <p className={sectionLabel} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Default</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-4">
              {DEFAULT_USERPICS.map(({ file, label }) => {
                const avatar = userpicPath(file);
                const isCurrent = avatar === currentAvatar;
                const isSaving = saving === avatar;
                return (
                  <button
                    key={file}
                    onClick={() => { playPageFlip(); handlePick(avatar); }}
                    disabled={!!saving}
                    title={label}
                    className={`${tileClass} hover:-translate-y-0.5`}
                    style={tileRing(isCurrent)}
                  >
                    <img src={avatar} alt={label} className="w-full h-full object-contain" />
                    {isCurrent && currentBadge}
                    {isSaving && savingVeil}
                  </button>
                );
              })}
            </div>

            {USERPIC_CATALOG.length > 0 && (
              <>
                <p className={`${sectionLabel} mt-5`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
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
                        onClick={() => { playPageFlip(); owned ? handlePick(avatar) : alert(`Unlock "${item.name}" for ${item.cost} Gold in the Trainer Sprites tab of the Curio Arena Shop.`); }}
                        disabled={owned && !!saving}
                        title={owned ? item.name : `Locked — ${item.cost} Gold in the Shop`}
                        className={`${tileClass} ${owned ? 'hover:-translate-y-0.5' : 'bg-[#f5f0e8]'}`}
                        style={tileRing(isCurrent)}
                      >
                        <img src={avatar} alt={item.name} className={`w-full h-full object-contain ${owned ? '' : 'opacity-30 grayscale'}`} />
                        {isCurrent && currentBadge}
                        {!owned && (
                          <span className="absolute inset-x-0 bottom-0 bg-[#4a2f18]/85 text-[#f5c542] text-[9px] font-bold uppercase tracking-wider py-0.5 text-center">
                            {item.cost} Gold
                          </span>
                        )}
                        {isSaving && savingVeil}
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
