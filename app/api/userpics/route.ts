import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

export async function GET() {
  const dir = path.join(process.cwd(), 'public', 'userpics');
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
  } catch {
    files = [];
  }
  files.sort();
  return NextResponse.json({ files });
}
