'use client';
// Admin tool for the curio egg mechanism's species -> predecessor mapping
// (see docs/curio-egg-mechanism-design.md). A species with no row here
// simply never becomes egg-ready — this is also how guild/event curios stay
// excluded, so their species are filtered out of both dropdowns below
// rather than relying on the admin to remember not to pick one.
import { useEffect, useState } from 'react';
import { ALL_MONSTERS, GUILD_MONSTERS, EVENT_MONSTERS, Element, getGraduatedMonsterDisplay } from '@/lib/monsterConfig';
import { fetchEggChainList, EggChainRow } from '@/lib/curioEggs';
import { callAdminApi } from '@/lib/adminApi';

const ELEMENTS: Element[] = ['fire', 'water', 'leaf', 'storm', 'shadow', 'light'];

// Species eligible as the "layer" — only ones that can ever graduate at
// all, since egg-readiness is gated on graduation_tier >= 1.
const LAYER_SPECIES = Object.values(ALL_MONSTERS).filter(m => m.graduation);

// A curio can't become egg-ready until it's already graduated (tier >= 1),
// so the admin is always picking a species by the identity it's actually
// wearing at that point — e.g. "Starlune", not "Solarch" — never the
// ungraduated base name. Tier 1's name covers it even for two-tier species,
// since tier 1 is already past the egg-ready threshold.
function layerDisplayName(m: typeof LAYER_SPECIES[number]): string {
  return getGraduatedMonsterDisplay(m, 1).name;
}
// Species eligible as the hatched predecessor — excludes guild companions
// and event-exclusive curios, which are meant to be granted only through
// their own special-acquisition paths.
const PREDECESSOR_SPECIES = Object.values(ALL_MONSTERS).filter(
  m => !GUILD_MONSTERS[m.id] && !EVENT_MONSTERS[m.id]
);

export default function EggChainsSection({ passcode }: { passcode: string }) {
  const [chains, setChains] = useState<EggChainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesId, setSpeciesId] = useState('');
  const [predecessorId, setPredecessorId] = useState('');
  const [element, setElement] = useState<Element>('fire');
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    setChains(await fetchEggChainList());
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // Predecessor's element defaults to match its species — the admin can
  // still override, but this saves a click for the common case.
  const handlePredecessorChange = (id: string) => {
    setPredecessorId(id);
    const def = ALL_MONSTERS[id];
    if (def) setElement(def.element);
  };

  const handleSave = async () => {
    if (!speciesId || !predecessorId) {
      alert('Pick both a species and a predecessor.');
      return;
    }
    setSaving(true);
    const result = await callAdminApi('/api/admin-egg-chains', {
      passcode, action: 'upsert_chain', speciesId, predecessorSpeciesId: predecessorId, element,
    });
    setSaving(false);
    if (!result.success) {
      alert(`❌ Save failed: ${result.error}`);
      return;
    }
    setSpeciesId('');
    setPredecessorId('');
    reload();
  };

  const handleDelete = async (species_id: string) => {
    const layerDef = ALL_MONSTERS[species_id];
    const layerName = layerDef ? layerDisplayName(layerDef) : species_id;
    if (!confirm(`Remove the egg chain for ${layerName}? Curios that already claimed an egg from it keep what they claimed.`)) return;
    const result = await callAdminApi('/api/admin-egg-chains', { passcode, action: 'delete_chain', speciesId: species_id });
    if (!result.success) {
      alert(`❌ Delete failed: ${result.error}`);
      return;
    }
    reload();
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">🥚 Egg Chains</h2>
      <p className="text-gray-500 text-sm mb-6">
        Which species hatches out of which graduated curio's egg. A species with no chain here never
        becomes egg-ready — guild companions and event curios are left out of both dropdowns on purpose.
      </p>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Graduated species (layer)</label>
            <select
              value={speciesId}
              onChange={e => setSpeciesId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white"
            >
              <option value="">Select...</option>
              {LAYER_SPECIES.map(m => <option key={m.id} value={m.id}>{layerDisplayName(m)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Hatches into (predecessor)</label>
            <select
              value={predecessorId}
              onChange={e => handlePredecessorChange(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white"
            >
              <option value="">Select...</option>
              {PREDECESSOR_SPECIES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Egg element</label>
            <select
              value={element}
              onChange={e => setElement(e.target.value as Element)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white capitalize"
            >
              {ELEMENTS.map(el => <option key={el} value={el} className="capitalize">{el}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-lg"
        >
          {saving ? 'Saving...' : 'Save Chain'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm">Loading...</p>
      ) : chains.length === 0 ? (
        <p className="text-gray-600 text-sm">No egg chains defined yet — no curio anywhere is egg-ready until at least one exists.</p>
      ) : (
        <div className="space-y-2">
          {chains.map(chain => (
            <div key={chain.species_id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-bold text-sm">
                  {(() => { const d = ALL_MONSTERS[chain.species_id]; return d ? layerDisplayName(d) : chain.species_id; })()}
                  <span className="text-gray-500 font-normal"> → </span>
                  {ALL_MONSTERS[chain.predecessor_species_id]?.name || chain.predecessor_species_id}
                </p>
                <p className="text-xs text-gray-500 capitalize">{chain.element} egg</p>
              </div>
              <button
                onClick={() => handleDelete(chain.species_id)}
                className="text-xs bg-neutral-800 hover:bg-red-900 text-gray-400 hover:text-red-300 px-3 py-1.5 rounded-lg flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
