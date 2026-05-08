#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import PptxGenJS from 'pptxgenjs';

const slidesPath = path.join(process.cwd(), 'presentation', 'slides.md');
if (!fs.existsSync(slidesPath)) {
  console.error('presentation/slides.md not found. Run this from the project root.');
  process.exit(1);
}
const md = fs.readFileSync(slidesPath, 'utf8');
const parts = md.split(/\r?\n---\r?\n/);

const pptx = new PptxGenJS();
pptx.author = 'Habit-tracker';

parts.forEach((section) => {
  const lines = section.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return;
  const titleLine = lines[0].replace(/^#+\s*/, '').trim();
  const body = lines.slice(1).map(l => l.replace(/^-\s*/, '• ')).join('\n');

  const slide = pptx.addSlide();
  slide.addText(titleLine, { x: 0.5, y: 0.3, fontSize: 28, bold: true });
  if (body) slide.addText(body, { x: 0.5, y: 1.2, w: 9, h: 5, fontSize: 18 });
});

const outPath = path.join(process.cwd(), 'presentation', 'Habit-tracker-updated.pptx');
pptx.writeFile({ fileName: outPath }).then(() => console.log('Created', outPath)).catch((err) => {
  console.error(err);
  process.exit(1);
});
