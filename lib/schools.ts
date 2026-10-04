// lib/schools.ts
// Schools directory for the registration autocomplete (SchoolPicker). The
// table is small (a few hundred rows at most), so it's loaded once per page
// and filtered in the browser. See
// supabase/migrations/20261002200000_schools_directory.sql — a DB trigger
// links saved accounts to these rows by name/alias, so forms only need to
// submit the picked name as before.
import { supabase } from './supabase';

export interface School {
  id: string;
  name: string;
  aliases: string[];
  city: string | null;
  province: string | null;
  source: 'deped_nid' | 'user_entered' | 'admin';
}

let cache: Promise<School[]> | null = null;

export function fetchSchools(): Promise<School[]> {
  if (!cache) {
    cache = Promise.resolve(
      supabase.from('schools').select('id, name, aliases, city, province, source').order('name'),
    ).then(({ data, error }) => {
      if (error) {
        console.error('fetchSchools failed', error);
        cache = null; // allow a retry on the next mount
        return [];
      }
      return (data ?? []) as School[];
    });
  }
  return cache;
}

/** Same rules as the DB's normalize_school_name(): lowercase, letters/digits/spaces only. */
export function normalizeSchoolName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').toLowerCase();
}

/** True when `name` will be linked to a directory school on save. */
export function findSchool(schools: School[], name: string): School | undefined {
  const norm = normalizeSchoolName(name);
  if (!norm) return undefined;
  return schools.find((s) => normalizeSchoolName(s.name) === norm || s.aliases.includes(norm));
}

/**
 * Best matches for what's been typed: an exact alias first ("scsses"), then
 * names starting with the query, then names containing every typed word
 * ("special science" -> Surigao City Special Science ES). DepEd-listed
 * schools sort ahead of user-entered ones within each group.
 */
export function searchSchools(schools: School[], query: string, limit = 6): School[] {
  const q = normalizeSchoolName(query);
  if (q.length < 2) return [];
  const words = q.split(' ');
  const scored: { school: School; score: number }[] = [];
  for (const school of schools) {
    const name = normalizeSchoolName(school.name);
    let score = 0;
    if (school.aliases.includes(q)) score = 4;
    else if (name.startsWith(q)) score = 3;
    else if (school.aliases.some((a) => a.startsWith(q))) score = 2;
    else if (words.every((w) => name.split(' ').some((t) => t.startsWith(w)))) score = 1;
    if (score > 0) scored.push({ school, score: score * 2 + (school.source === 'deped_nid' ? 1 : 0) });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name))
    .slice(0, limit)
    .map((s) => s.school);
}

const SHORT_WORDS = new Set(['es', 'elem', 'hs', 'nhs', 'shs', 'sch', 'schl', 'natl', "nat'l", 'mem', 'univ', 'acad', 'inst', 'intl', 'ctr']);
const SCHOOL_TYPE_WORD = /^(schools?|academy|college|university|institute|cent(er|re)|montessori|homeschool(ing)?|seminary|kindergarten|preschool|daycare)$/;

/**
 * A school typed outside the directory has to be a full name: 2+ words,
 * one of them a school word (School, Academy, Center, ...), and no initials
 * ("CES", "XU Ateneo") or shortened words ("ES", "Elem"). Mirrors the DB's
 * is_full_school_name() (migration 20261004210000), which is the real check.
 */
export function looksLikeFullSchoolName(name: string): boolean {
  const words = name.split(/[^A-Za-z0-9']+/).filter(Boolean);
  if (words.length < 2) return false;
  // All caps is shouting, not initials, so skip the initials check then.
  const shouting = !/[a-z]/.test(name);
  let hasType = false;
  for (const w of words) {
    if (SHORT_WORDS.has(w.toLowerCase())) return false;
    if (!shouting && /^[A-Z]{2,}$/.test(w) && !/^[IVX]+$/.test(w)) return false;
    if (SCHOOL_TYPE_WORD.test(w.toLowerCase())) hasType = true;
  }
  return hasType;
}

export function schoolPlace(school: School): string | null {
  return [school.city, school.province].filter(Boolean).join(', ') || null;
}
