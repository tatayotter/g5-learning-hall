import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  if (passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ success: false, error: 'Invalid passcode' }, { status: 401 });
  }

  if (action === 'update_draft') {
    const { id, question, options, correct_answer, topic, tier } = body;
    if (!id || !question || !Array.isArray(options) || !correct_answer || !topic || !tier) {
      return NextResponse.json({ success: false, error: 'id, question, options, correct_answer, topic, and tier are required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_update_draft_question', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_id: id,
      p_question: question,
      p_options: options,
      p_correct_answer: correct_answer,
      p_topic: topic,
      p_tier: tier,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'set_status') {
    const { id, status } = body;
    if (!id || !['pending_review', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'A valid id and status (pending_review, approved, or rejected) are required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_set_draft_question_status', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_id: id,
      p_status: status,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'publish') {
    const { ids, grade, day, subject, week_starting_date } = body;
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (!Array.isArray(ids) || ids.length === 0 || !grade || !validDays.includes(day) || !subject || !week_starting_date) {
      return NextResponse.json({ success: false, error: 'ids, grade, day (weekday name), subject, and week_starting_date are required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_publish_draft_questions', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_ids: ids,
      p_grade: grade,
      p_day: day,
      p_subject: subject,
      p_week_starting_date: week_starting_date,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'update_summary') {
    const { id, summary_markdown } = body;
    if (!id || !summary_markdown) {
      return NextResponse.json({ success: false, error: 'id and summary_markdown are required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_update_draft_summary', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_id: id,
      p_summary_markdown: summary_markdown,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'set_summary_status') {
    const { id, status } = body;
    if (!id || !['pending_review', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'A valid id and status (pending_review, approved, or rejected) are required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_set_draft_summary_status', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_id: id,
      p_status: status,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'publish_summary') {
    const { id, grade, day, subject, week_starting_date } = body;
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (!id || !grade || !validDays.includes(day) || !subject || !week_starting_date) {
      return NextResponse.json({ success: false, error: 'id, grade, day (weekday name), subject, and week_starting_date are required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_publish_draft_summary', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_id: id,
      p_grade: grade,
      p_day: day,
      p_subject: subject,
      p_week_starting_date: week_starting_date,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
