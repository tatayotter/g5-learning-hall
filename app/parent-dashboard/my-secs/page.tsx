'use client';
// "My SECs" — a parent's owned Student Enrichment Content packs, with
// anytime reviewer access (confirmed decision in docs/sec-shop-design.md:
// "for parent, they can view the reviewer anytime... they will have a tab
// 'my SECs'"). Sibling to /parent-dashboard/shop. Liquid Glass styling:
// owned packs list → pushed strand list per pack → worked-example reviewer
// in a sheet (the reviewer itself is the same MtapReviewerPanel the child's
// Bonus Quests tab uses).
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useParentPage } from '@/hooks/useScreenTime';
import { MTAP_STRANDS_BY_GRADE } from '@/lib/mtapContent';
import MtapReviewerPanel from '@/components/bonusquests/MtapReviewerPanel';
import {
  IOS, IosBarButton, IosCapsule, IosContent, IosGroup, IosNavBar, IosPushedPage, IosRow, IosScreen, IosSheet,
} from '@/components/parent/ios';

interface ChildRow {
  id: string;
  full_name: string;
  grade: string;
}

interface SecPack {
  id: string;
  grade: number;
  title: string;
}

interface EntitlementRow {
  child_id: string;
  pack_id: string;
  status: 'pending' | 'active';
  purchased_at: string | null;
}

export default function MySecsPage() {
  const router = useRouter();
  useParentPage('parent_my_secs');
  const [loading, setLoading] = useState(true);
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [packs, setPacks] = useState<SecPack[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  // Pushed "study" page for one pack, mirrored into history so the back
  // gesture pops it (same pattern as the parent dashboard's child page).
  const [openPack, setOpenPack] = useState<SecPack | null>(null);
  const [openStrand, setOpenStrand] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/parent-login');
        return;
      }
      const [{ data: children }, { data: packRows }, { data: entRows }] = await Promise.all([
        supabase.from('children').select('id, full_name, grade').eq('parent_id', user.id),
        supabase.from('sec_packs').select('id, grade, title'),
        supabase.from('sec_entitlements').select('child_id, pack_id, status, purchased_at').eq('parent_id', user.id).eq('status', 'active'),
      ]);
      setKids((children as ChildRow[]) || []);
      setPacks((packRows as SecPack[]) || []);
      setEntitlements((entRows as EntitlementRow[]) || []);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    const onPop = () => {
      if (!(window.history.state as { secPack?: string } | null)?.secPack) setOpenPack(null);
      setOpenStrand(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const pushPack = (pack: SecPack) => {
    window.history.pushState({ secPack: pack.id }, '');
    setOpenPack(pack);
  };
  const popPack = () => {
    if ((window.history.state as { secPack?: string } | null)?.secPack) window.history.back();
    else setOpenPack(null);
  };
  const closeStrand = useCallback(() => setOpenStrand(null), []);

  const back = <IosBarButton back onClick={() => router.push('/parent-dashboard')}>Family</IosBarButton>;

  if (loading) {
    return (
      <IosScreen>
        <IosNavBar large={false} title="My SECs" left={back} />
        <p className="text-center text-[15px] py-16" style={{ color: IOS.secondary }}>Loading…</p>
      </IosScreen>
    );
  }

  const packById = new Map(packs.map((p) => [p.id, p]));
  const kidById = new Map(kids.map((k) => [k.id, k]));
  const owned = entitlements
    .map((e) => ({ ent: e, pack: packById.get(e.pack_id), kid: kidById.get(e.child_id) }))
    .filter((row) => row.pack && row.kid);

  const strands = openPack ? MTAP_STRANDS_BY_GRADE[openPack.grade] || [] : [];

  return (
    <IosScreen>
      <IosNavBar title="My SECs" left={back} />
      <IosContent>
        <p className="px-1 -mt-3 text-[15px] leading-[20px]" style={{ color: IOS.secondary }}>
          Packs you&apos;ve bought for your kids. They play in their own Bonus Quests tab — this is
          where you can study the material anytime, no timer.
        </p>

        {owned.length === 0 ? (
          <IosGroup footer="Quest packs are extra competition-level practice your child plays at their own pace.">
            <IosRow icon="ticket" iconColor={IOS.indigo} title="No packs yet" />
            <IosRow href="/parent-dashboard/shop" title="Visit the Shop" tint="blue" />
          </IosGroup>
        ) : (
          <IosGroup header="Owned packs">
            {owned.map(({ ent, pack, kid }) => (
              <IosRow
                key={`${ent.child_id}-${ent.pack_id}`}
                icon="chart"
                iconColor={IOS.purple}
                title={pack!.title}
                subtitle={`For ${kid!.full_name}${ent.purchased_at ? ` · Bought ${new Date(ent.purchased_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`}
                accessory={<IosCapsule onClick={() => pushPack(pack!)}>Study</IosCapsule>}
                wrap
              />
            ))}
          </IosGroup>
        )}
      </IosContent>

      {openPack && (
        <IosPushedPage>
          <IosNavBar
            large={false}
            title={`Grade ${openPack.grade} Reviewer`}
            left={<IosBarButton back onClick={popPack}>My SECs</IosBarButton>}
          />
          <IosContent>
            <p className="px-1 text-[15px] leading-[20px]" style={{ color: IOS.secondary }}>
              Pick a topic group to study the worked examples — no timer, answers shown.
            </p>
            <IosGroup header={openPack.title}>
              {strands.map((strand, idx) => (
                <IosRow
                  key={strand.strand}
                  title={strand.name}
                  subtitle={`${strand.archetypes.length} topics`}
                  onClick={() => setOpenStrand(idx)}
                  wrap
                />
              ))}
            </IosGroup>
          </IosContent>

          <IosSheet
            open={openStrand !== null}
            onClose={closeStrand}
            title={openStrand !== null ? strands[openStrand]?.name ?? 'Reviewer' : 'Reviewer'}
            closeLabel="Done"
          >
            {openStrand !== null && strands[openStrand] && (
              // The reviewer is game content, so it keeps its own look on a
              // plain white panel inside the glass sheet.
              <div className="rounded-[22px] bg-[#ffffff] p-4">
                <MtapReviewerPanel grade={openPack.grade} strand={strands[openStrand]} onClose={closeStrand} />
              </div>
            )}
          </IosSheet>
        </IosPushedPage>
      )}
    </IosScreen>
  );
}
