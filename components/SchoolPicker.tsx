// components/SchoolPicker.tsx
// School field with autocomplete from the schools directory (lib/schools.ts).
// Picking a suggestion fills the official name; anything else typed is kept
// as-is ("My school isn't listed") so a missing school never blocks sign-up,
// as long as it's a full name: initials only work when they match a directory
// school (see looksLikeFullSchoolName and migration 20261004210000).
// The DB trigger links the saved account to a school row when the name or an
// alias matches, so callers just keep submitting a plain school name string.
'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { fetchSchools, findSchool, looksLikeFullSchoolName, schoolPlace, searchSchools, type School } from '@/lib/schools';

type Tone = 'parchment' | 'dark' | 'ios';

const LIST_CLASS: Record<Tone, string> = {
  parchment: 'bg-white border border-[#c9a87a] rounded-[14px] shadow-lg',
  dark: 'bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg',
  ios: 'bg-white border border-black/10 rounded-2xl shadow-xl',
};
const ITEM_CLASS: Record<Tone, string> = {
  parchment: 'text-[#2a1505] hover:bg-[#f0ddb8] aria-selected:bg-[#f0ddb8]',
  dark: 'text-white hover:bg-neutral-800 aria-selected:bg-neutral-800',
  ios: 'text-black hover:bg-black/5 aria-selected:bg-black/5',
};
const HINT_CLASS: Record<Tone, string> = {
  parchment: 'text-red-700',
  dark: 'text-red-400',
  ios: 'text-[#FF3B30]',
};
const SUB_CLASS: Record<Tone, string> = {
  parchment: 'text-[#6b4820]',
  dark: 'text-neutral-400',
  ios: 'text-[#8E8E93]',
};

interface SchoolPickerProps {
  value: string;
  onChange: (name: string) => void;
  inputClassName: string;
  tone?: Tone;
  placeholder?: string;
  required?: boolean;
  /** /dev/ui-gallery only: use this list instead of fetching the directory. */
  presetSchools?: School[];
}

export default function SchoolPicker({ value, onChange, inputClassName, tone = 'parchment', placeholder = 'School name', required, presetSchools }: SchoolPickerProps) {
  const [fetched, setFetched] = useState<School[]>([]);
  const schools = presetSchools ?? fetched;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // The "type the full name" hint waits until the field is left, so it
  // doesn't nag mid-word.
  const [touched, setTouched] = useState(false);
  const listId = useId();

  useEffect(() => {
    if (presetSchools) return;
    let live = true;
    fetchSchools().then((list) => { if (live) setFetched(list); });
    return () => { live = false; };
  }, [presetSchools]);

  const matches = useMemo(() => searchSchools(schools, value), [schools, value]);
  const exact = useMemo(() => findSchool(schools, value), [schools, value]);
  // Suggestions plus a final "keep what I typed" row, unless what's typed
  // already is a directory school.
  const showUnlisted = value.trim().length >= 2 && !exact;
  const unlistedOk = looksLikeFullSchoolName(value);
  const showHint = touched && !open && showUnlisted && !unlistedOk;
  const rowCount = matches.length + (showUnlisted ? 1 : 0);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || rowCount === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % rowCount); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => (h - 1 + rowCount) % rowCount); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight < matches.length) pick(matches[highlight].name);
      else setOpen(false);
    } else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open && rowCount > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => setOpen(true)}
        // Delay so a tap on a suggestion lands before the list unmounts.
        onBlur={() => setTimeout(() => { setOpen(false); setTouched(true); }, 150)}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />
      {open && rowCount > 0 && (
        // Inline (pushes content down) for the parent dashboard's iOS groups,
        // which clip overflow; a floating dropdown everywhere else.
        <ul id={listId} role="listbox" className={`${tone === 'ios' ? 'mb-3' : 'absolute left-0 right-0 top-full z-50'} mt-1 max-h-72 overflow-y-auto py-1 ${LIST_CLASS[tone]}`}>
          {matches.map((s, i) => {
            const place = schoolPlace(s);
            return (
              <li
                key={s.id}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s.name)}
                className={`cursor-pointer px-4 py-2 text-left ${ITEM_CLASS[tone]}`}
              >
                <span className="block text-sm font-semibold leading-snug">{s.name}</span>
                {place && <span className={`block text-xs ${SUB_CLASS[tone]}`}>{place}</span>}
              </li>
            );
          })}
          {showUnlisted && (
            <li
              role="option"
              aria-selected={highlight === matches.length}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpen(false)}
              className={`cursor-pointer px-4 py-2 text-left border-t border-black/5 ${ITEM_CLASS[tone]}`}
            >
              {unlistedOk ? (
                <span className="block text-sm leading-snug">
                  My school isn&apos;t listed &mdash; use &ldquo;{value.trim()}&rdquo;
                </span>
              ) : (
                <span className="block text-sm leading-snug">Not listed? Keep typing your school&apos;s full name.</span>
              )}
              <span className={`block text-xs ${SUB_CLASS[tone]}`}>Like &ldquo;San Jose Elementary School&rdquo;, not initials.</span>
            </li>
          )}
        </ul>
      )}
      {showHint && (
        <p className={`mt-1 text-left text-xs ${HINT_CLASS[tone]}`}>
          Please type your school&apos;s full name, like &ldquo;San Jose Elementary School&rdquo;, not initials.
        </p>
      )}
    </div>
  );
}
