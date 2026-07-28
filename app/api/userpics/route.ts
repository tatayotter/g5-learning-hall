import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

export async function GET() {
  const dir = path.join(process.cwd(), 'public', 'userpics');
  const premiumDir = path.join(dir, 'userpics_premium');
  let files: string[] = [];
  let premiumFiles: string[] = [];
  // ENOENT (directory doesn't exist — e.g. userpics_premium not created yet)
  // is expected and means "no pics here yet". Anything else (permissions,
  // I/O errors) is a real misconfiguration and worth logging, rather than
  // silently collapsing to the same empty-array result as ENOENT.
  try {
    files = fs.readdirSync(dir).filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
  } catch (err: any) {
    if (err?.code !== 'ENOENT') console.error('Failed to read userpics directory:', err);
    files = [];
  }
  try {
    premiumFiles = fs.readdirSync(premiumDir).filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
  } catch (err: any) {
    if (err?.code !== 'ENOENT') console.error('Failed to read userpics_premium directory:', err);
    premiumFiles = [];
  }
  files.sort();
  premiumFiles.sort();
  return NextResponse.json({ files, premiumFiles });
}
