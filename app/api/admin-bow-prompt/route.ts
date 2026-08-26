import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdminPasscode } from '@/lib/adminAuth';
import {
  schoolWeekFromDate,
  weekStartDate,
  weekToTermInfo,
  extractBowSummary,
  buildTopicsBlock,
  buildLeanPrompt,
  estimateTokens,
  DEFAULT_SCHEDULES,
  type DaySchedule,
} from '@/lib/promptBuilder';

function promptFilename(grade: number): string {
  return grade === 2 ? 'tala-weekly-prompt.md' : `grade${grade}-weekly-prompt.md`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, grade, weekNumber, daySchedule } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  const gradeNum = Number(grade);
  if (![2, 3, 4, 5, 6].includes(gradeNum)) {
    return NextResponse.json({ error: 'Invalid grade' }, { status: 400 });
  }

  // Load the .md prompt file (our BOW summary source of truth)
  const mdPath = path.join(process.cwd(), 'public', 'prompts', promptFilename(gradeNum));
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, 'utf-8');
  } catch {
    return NextResponse.json({ error: `Prompt file not found: ${promptFilename(gradeNum)}` }, { status: 404 });
  }

  const week = Number(weekNumber) || schoolWeekFromDate(new Date());
  const termInfo = weekToTermInfo(week);
  const weekStart = weekStartDate(week);
  const dateStr = weekStart.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Extract condensed BOW bullets for the current term from the .md file
  const bowBySubject = extractBowSummary(mdContent, termInfo.term);

  // Use provided schedule or fall back to grade default
  const schedule: DaySchedule = daySchedule ?? DEFAULT_SCHEDULES[gradeNum] ?? {};

  // Assemble topics block (max 2 bullets per subject → ~150 tokens)
  const topicsBlock = buildTopicsBlock(schedule, bowBySubject);

  // Build the lean prompt (~350 base + ~150 topics = ~500 tokens total)
  const prompt = buildLeanPrompt(gradeNum, week, dateStr, topicsBlock);
  const tokenCount = estimateTokens(prompt);

  return NextResponse.json({
    success: true,
    prompt,
    tokenCount,
    termLabel: termInfo.label,
    term: termInfo.term,
    termWeek: termInfo.termWeek,
    isBreak: termInfo.isBreak,
    weekDate: dateStr,
    schoolWeek: week,
    bowBySubject,
  });
}
