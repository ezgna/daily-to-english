import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

import { deckContent } from './deck-content.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PRESENTATION_DIR = path.resolve(SCRIPT_DIR, '..');
const ASSETS = path.join(PRESENTATION_DIR, 'assets');
const SVG_SOURCES = path.join(ASSETS, 'src');
const BUILD = path.join(SCRIPT_DIR, 'output');
const FINAL = path.join(PRESENTATION_DIR, 'Just-Speak-It-Final-Presentation.pptx');
const execFileAsync = promisify(execFile);

const W = 1280;
const H = 720;
const C = {
  ink: '#111111',
  paper: '#F8F6EF',
  white: '#FFFFFF',
  cream: '#FFF6E7',
  muted: '#666D78',
  cobalt: '#276EF1',
  mint: '#2FDD6C',
  coral: '#FF7661',
  amber: '#FFE2A6',
  orange: '#FF9F45',
  violet: '#9B7CFF',
  sky: '#9FD0F8',
};

const FONT = 'Avenir Next';
const JP_FONT = 'Hiragino Sans';
const imageCache = new Map();
const pt = (value) => value * (4 / 3);

async function rasterizeTrackedSvgAssets() {
  const sourceFiles = (await fs.readdir(SVG_SOURCES))
    .filter((fileName) => fileName.endsWith('.svg'))
    .sort();

  for (const sourceFile of sourceFiles) {
    const sourcePath = path.join(SVG_SOURCES, sourceFile);
    const outputPath = path.join(ASSETS, sourceFile.replace(/\.svg$/u, '.png'));
    await execFileAsync('rsvg-convert', [sourcePath, '-o', outputPath]);
  }
}

async function readImage(filePath) {
  if (!imageCache.has(filePath)) {
    imageCache.set(filePath, await fs.readFile(filePath));
  }
  return imageCache.get(filePath);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function addImage(slide, filePath, position, options = {}) {
  const bytes = await readImage(filePath);
  return slide.images.add({
    blob: bytes,
    contentType: 'image/png',
    alt: options.alt ?? path.basename(filePath),
    fit: options.fit ?? 'contain',
    position,
    ...(options.crop ? { crop: options.crop } : {}),
    ...(options.geometry ? { geometry: options.geometry } : {}),
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
  });
}

async function addBackground(slide, name = 'bg-paper.png') {
  await addImage(slide, path.join(ASSETS, name), { left: 0, top: 0, width: W, height: H }, { fit: 'cover', alt: 'Presentation background' });
}

function addText(slide, text, position, options = {}) {
  const shape = slide.shapes.add({
    geometry: 'textbox',
    name: options.name,
    position,
    fill: options.fill ?? 'none',
    line: options.line ?? { style: 'solid', fill: 'none', width: 0 },
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
  });
  shape.text = text;
  shape.text.style = {
    fontSize: options.fontSize ?? 24,
    bold: options.bold ?? false,
    color: options.color ?? C.ink,
    typeface: options.typeface ?? FONT,
    alignment: options.alignment ?? 'left',
    verticalAlignment: options.verticalAlignment ?? 'top',
    autoFit: options.autoFit ?? 'shrinkText',
    lineSpacing: options.lineSpacing ?? 1,
    insets: options.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return shape;
}

function addShadowPanel(slide, position, options = {}) {
  const offset = options.shadowOffset ?? 8;
  slide.shapes.add({
    geometry: 'roundRect',
    position: { left: position.left + offset, top: position.top + offset, width: position.width, height: position.height },
    fill: options.shadowColor ?? C.ink,
    line: { style: 'solid', fill: options.shadowColor ?? C.ink, width: 0 },
    borderRadius: options.borderRadius ?? 18,
  });
  return slide.shapes.add({
    geometry: 'roundRect',
    position,
    fill: options.fill ?? C.white,
    line: { style: 'solid', fill: options.lineColor ?? C.ink, width: options.lineWidth ?? 3 },
    borderRadius: options.borderRadius ?? 18,
  });
}

function addOutline(slide, position, options = {}) {
  return slide.shapes.add({
    geometry: 'roundRect',
    position,
    fill: 'none',
    line: { style: 'solid', fill: options.color ?? C.ink, width: options.width ?? 3 },
    borderRadius: options.borderRadius ?? 18,
  });
}

async function addScreenshot(slide, fileName, position, options = {}) {
  const filePath = path.join(ASSETS, fileName);
  if (!(await exists(filePath))) {
    addShadowPanel(slide, position, { fill: C.cream, borderRadius: 22 });
    addText(slide, options.placeholder ?? 'SCREENSHOT\nPENDING', {
      left: position.left + 18,
      top: position.top + position.height / 2 - 38,
      width: position.width - 36,
      height: 76,
    }, { fontSize: 18, bold: true, alignment: 'center', verticalAlignment: 'middle', color: C.muted });
    return null;
  }

  const offset = options.shadowOffset ?? 8;
  slide.shapes.add({
    geometry: 'roundRect',
    position: { left: position.left + offset, top: position.top + offset, width: position.width, height: position.height },
    fill: C.ink,
    line: { style: 'solid', fill: C.ink, width: 0 },
    borderRadius: options.borderRadius ?? 22,
  });
  const image = await addImage(slide, filePath, position, {
    fit: options.fit ?? 'cover',
    crop: options.crop,
    geometry: 'roundRect',
    borderRadius: options.borderRadius ?? 22,
    alt: options.alt ?? `Just Speak It screen: ${fileName}`,
  });
  addOutline(slide, position, { width: 3, borderRadius: options.borderRadius ?? 22 });
  return image;
}

function addHeader(slide, number, title, options = {}) {
  addText(slide, String(number).padStart(2, '0'), { left: 56, top: 42, width: 56, height: 30 }, {
    fontSize: 17,
    bold: true,
    color: options.color ?? C.cobalt,
    name: `slide-${number}-number`,
  });
  addText(slide, title, { left: 120, top: 32, width: 1104, height: options.height ?? 66 }, {
    fontSize: options.fontSize ?? 42,
    bold: true,
    color: options.titleColor ?? C.ink,
    name: `slide-${number}-title`,
    verticalAlignment: 'middle',
  });
}

function setNotes(slide, notes) {
  slide.speakerNotes.textFrame.setText(notes);
  slide.speakerNotes.setVisible(true);
}

function addPill(slide, text, position, options = {}) {
  const pill = slide.shapes.add({
    geometry: 'roundRect',
    position,
    fill: options.fill ?? C.white,
    line: { style: 'solid', fill: options.lineColor ?? C.ink, width: options.lineWidth ?? pt(1.75) },
    borderRadius: 'rounded-full',
  });
  addText(slide, text, position, {
    fontSize: options.fontSize ?? pt(11),
    bold: true,
    color: options.color ?? C.ink,
    alignment: 'center',
    verticalAlignment: 'middle',
    typeface: options.typeface ?? FONT,
    insets: { left: pt(5), right: pt(5), top: 0, bottom: 0 },
  });
  return pill;
}

function addContentHeader(slide, kicker, number, title, lead = null, options = {}) {
  const kickerWidth = pt(options.kickerWidth ?? Math.max(104, Math.min(260, kicker.length * 7 + 28)));
  const kickerX = pt(60);
  const headerY = pt(options.headerY ?? 40);
  const headerH = pt(26);
  addPill(slide, kicker, { left: kickerX, top: headerY, width: kickerWidth, height: headerH }, {
    fill: C.ink,
    color: C.white,
    lineColor: C.ink,
    fontSize: pt(11),
  });
  slide.shapes.add({
    geometry: 'rect',
    position: {
      left: kickerX + kickerWidth + pt(12),
      top: headerY + headerH / 2 - pt(1.25),
      width: pt(856) - (kickerX + kickerWidth + pt(12)),
      height: pt(2.5),
    },
    fill: C.ink,
    line: { style: 'solid', fill: C.ink, width: 0 },
  });
  addPill(slide, String(number), { left: pt(856), top: headerY, width: pt(44), height: headerH }, {
    fill: C.white,
    color: C.ink,
    lineColor: C.ink,
    fontSize: pt(11),
  });

  const titleHeight = options.titleHeight ?? pt(66);
  if (title && titleHeight > 0) {
    addText(slide, title, { left: pt(60), top: pt(78), width: pt(840), height: titleHeight }, {
      fontSize: options.titleSize ?? pt(26),
      bold: true,
      lineSpacing: 1.06,
      verticalAlignment: 'top',
      name: `slide-${number}-title`,
    });
  }
  if (lead) {
    addText(slide, lead, { left: pt(60), top: pt(78) + titleHeight + pt(6), width: pt(options.leadWidth ?? 700), height: pt(options.leadHeight ?? 54) }, {
      fontSize: pt(14),
      bold: false,
      color: C.muted,
      lineSpacing: 1.15,
    });
  }
}

function addSpecChip(slide, position, options = {}) {
  return addShadowPanel(slide, position, {
    fill: options.fill ?? C.white,
    borderRadius: pt(8),
    shadowOffset: pt(3),
    lineWidth: pt(1.75),
  });
}

async function buildSlide1(presentation) {
  const d = deckContent[0];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-title.png');
  await addImage(slide, path.join(ASSETS, 'logo-lockup.png'), {
    left: pt(405), top: pt(130), width: pt(150), height: pt(150),
  }, { alt: 'Just Speak It speech bubble waveform logo' });
  addText(slide, d.title, { left: pt(130), top: pt(298), width: pt(700), height: pt(66) }, {
    fontSize: pt(54),
    bold: true,
    color: C.white,
    name: 'deck-title',
    alignment: 'center',
    verticalAlignment: 'middle',
  });
  addText(slide, d.subtitle, { left: pt(160), top: pt(372), width: pt(640), height: pt(36) }, {
    fontSize: pt(16),
    bold: false,
    color: C.white,
    name: 'deck-subtitle',
    alignment: 'center',
    verticalAlignment: 'middle',
  });
  setNotes(slide, d.notes);
}

async function buildSlide2(presentation) {
  const d = deckContent[1];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'PROBLEM', '02', 'Textbook English is not always what you want to say', d.statement, {
    titleSize: pt(26),
    titleHeight: pt(62),
    leadWidth: 700,
    leadHeight: 54,
  });

  const cards = [
    { x: 60, fill: C.white, tagFill: C.cream, tag: 'WHAT I STUDY', title: 'Prepared examples', copy: 'Useful, but not always personal' },
    { x: 348, fill: C.mint, tagFill: C.white, tag: 'WHAT I WANT TO SAY', title: 'My real thoughts', copy: 'My day, opinions, and experiences' },
    { x: 636, fill: C.white, tagFill: C.cream, tag: 'HOW I KEEP PRACTICING', title: 'A repeatable habit', copy: 'Bring each phrase back when it is due' },
  ];
  for (const card of cards) {
    const position = { left: pt(card.x), top: pt(250), width: pt(264), height: pt(190) };
    addShadowPanel(slide, position, { fill: card.fill, borderRadius: pt(12), shadowOffset: pt(5), lineWidth: pt(2.5) });
    addPill(slide, card.tag, { left: position.left + pt(24), top: position.top + pt(20), width: pt(210), height: pt(24) }, {
      fill: card.tagFill,
      fontSize: pt(11),
      lineWidth: pt(1.75),
    });
    addText(slide, card.title, { left: position.left + pt(24), top: position.top + pt(72), width: pt(216), height: pt(54) }, {
      fontSize: pt(18), bold: true, verticalAlignment: 'middle',
    });
    addText(slide, card.copy, { left: position.left + pt(24), top: position.top + pt(138), width: pt(216), height: pt(32) }, {
      fontSize: pt(12.5), color: card.fill === C.mint ? C.ink : C.muted, verticalAlignment: 'middle',
    });
  }
  setNotes(slide, d.notes);
}

async function buildSlide3(presentation) {
  const d = deckContent[2];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'PROMISE', '03', 'Speak first. Practice what matters to you.', null, {
    titleSize: pt(28),
    titleHeight: pt(48),
  });

  const storyCard = { left: pt(60), top: pt(170), width: pt(520), height: pt(310) };
  addShadowPanel(slide, storyCard, { fill: C.white, borderRadius: pt(16), shadowOffset: pt(6), lineWidth: pt(3) });
  await addImage(slide, path.join(ASSETS, 'waveform-motif.png'), {
    left: storyCard.left + pt(28), top: storyCard.top + pt(26), width: pt(64), height: pt(41),
  }, { alt: 'Speech waveform' });
  addPill(slide, 'USER STORY', {
    left: storyCard.left + pt(112), top: storyCard.top + pt(30), width: pt(120), height: pt(26),
  }, { fill: C.mint, fontSize: pt(11) });
  addText(slide, d.userStory, {
    left: storyCard.left + pt(28), top: storyCard.top + pt(84), width: pt(464), height: pt(190),
  }, { fontSize: pt(18), bold: true, lineSpacing: 1.16, verticalAlignment: 'middle', name: 'user-story' });

  d.needs.forEach((need, index) => {
    const chip = { left: pt(620), top: pt(190 + index * 98), width: pt(280), height: pt(80) };
    addSpecChip(slide, chip, { fill: C.white });
    slide.shapes.add({
      geometry: 'roundRect',
      position: { left: chip.left + pt(20), top: chip.top + pt(34), width: pt(10), height: pt(10) },
      fill: C.ink,
      line: { style: 'solid', fill: C.ink, width: 0 },
      borderRadius: pt(2),
    });
    addText(slide, need, { left: chip.left + pt(48), top: chip.top + pt(18), width: pt(208), height: pt(44) }, {
      fontSize: pt(13), bold: true, lineSpacing: 1.1, verticalAlignment: 'middle',
    });
  });
  setNotes(slide, d.notes);
}

async function buildSlide4(presentation) {
  const d = deckContent[3];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'HOW IT WORKS', '04', 'One Japanese thought becomes a reusable speaking exercise', null, {
    kickerWidth: 150,
    titleSize: pt(26),
    titleHeight: pt(52),
  });
  await addImage(slide, path.join(ASSETS, 'flow-loop.png'), {
    left: pt(80), top: pt(142), width: pt(800), height: pt(291),
  }, { alt: 'Six-step product learning loop' });

  const jpCard = { left: pt(60), top: pt(452), width: pt(400), height: pt(64) };
  addShadowPanel(slide, jpCard, { fill: C.cream, borderRadius: pt(12), shadowOffset: pt(4), lineWidth: pt(2.5) });
  addText(slide, d.japaneseExample, {
    left: jpCard.left + pt(16), top: jpCard.top + pt(9), width: pt(368), height: pt(46),
  }, { fontSize: pt(12), bold: true, typeface: JP_FONT, lineSpacing: 1.12, verticalAlignment: 'middle' });

  slide.shapes.add({ geometry: 'rightArrow', position: { left: pt(470), top: pt(468), width: pt(34), height: pt(24) }, fill: C.ink, line: { style: 'solid', fill: C.ink, width: 0 } });
  d.englishExamples.forEach((example, index) => {
    const chip = { left: pt(514), top: pt(452 + index * 36), width: pt(386), height: pt(28) };
    addSpecChip(slide, chip, { fill: C.white });
    addText(slide, example, { left: chip.left + pt(12), top: chip.top + pt(4), width: pt(362), height: pt(20) }, {
      fontSize: pt(11.5), bold: true, verticalAlignment: 'middle',
    });
  });
  setNotes(slide, d.notes);
}

async function buildSlide5(presentation) {
  const d = deckContent[4];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'IN THE APP', '05', 'The main flow stays focused from capture to cards', null, {
    kickerWidth: 128,
    titleSize: pt(26),
    titleHeight: pt(50),
  });

  const shots = [
    ['01-home-idle.png', 100, 'Home before recording'],
    ['02-home-recording.png', 300, 'Active voice recording'],
    ['03-making-cards.png', 500, 'AI card generation in progress'],
    ['05-phrases.png', 700, 'Completed Japanese–English cards'],
  ];
  for (const [file, x, alt] of shots) {
    await addScreenshot(slide, file, { left: pt(x), top: pt(148), width: pt(140), height: pt(303) }, {
      alt,
      placeholder: file.includes('idle') ? 'HOME' : file.includes('recording') ? 'RECORDING' : file.includes('making') ? 'GENERATING' : 'CARDS',
      borderRadius: pt(20),
      shadowOffset: pt(5),
    });
  }
  addPill(slide, 'CAPTURE', { left: pt(195), top: pt(470), width: pt(150), height: pt(24) }, { fill: C.mint, fontSize: pt(11) });
  addPill(slide, 'GENERATE', { left: pt(515), top: pt(470), width: pt(110), height: pt(24) }, { fill: C.mint, fontSize: pt(11) });
  addPill(slide, 'PRACTICE', { left: pt(715), top: pt(470), width: pt(110), height: pt(24) }, { fill: C.mint, fontSize: pt(11) });
  setNotes(slide, d.notes);
}

async function buildSlide6(presentation) {
  const d = deckContent[5];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'SURFACES', '06', 'Capture, remember, practice, and customize', null, {
    titleSize: pt(27),
    titleHeight: pt(50),
  });

  const screenshots = [
    { file: '08-notes.png', label: 'NOTES', x: 70 },
    { file: '05-phrases.png', label: 'PHRASES', x: 250 },
    { file: '09-custom.png', label: 'CUSTOM', x: 430 },
  ];
  for (const item of screenshots) {
    await addScreenshot(slide, item.file, { left: pt(item.x), top: pt(150), width: pt(150), height: pt(325) }, {
      alt: item.label,
      borderRadius: pt(20),
      shadowOffset: pt(5),
    });
    addPill(slide, item.label, { left: pt(item.x + 26), top: pt(488), width: pt(98), height: pt(24) }, {
      fill: C.white,
      fontSize: pt(11),
    });
  }

  const rows = [
    { label: 'HOME', fill: C.mint, copy: 'Speak, write, and review due cards' },
    { label: 'NOTES', fill: '#D9E7E1', copy: 'Revisit the original entry and audio' },
    { label: 'PHRASES', fill: C.sky, copy: 'Browse saved Japanese–English cards' },
    { label: 'CUSTOM', fill: '#F4E75E', copy: 'Choose how cards are made and stored' },
  ];
  rows.forEach((row, index) => {
    const chip = { left: pt(640), top: pt(158 + index * 86), width: pt(260), height: pt(72) };
    addSpecChip(slide, chip, { fill: C.white });
    addPill(slide, row.label, { left: chip.left + pt(14), top: chip.top + pt(22), width: pt(72), height: pt(28) }, {
      fill: row.fill,
      fontSize: pt(11),
    });
    addText(slide, row.copy, { left: chip.left + pt(100), top: chip.top + pt(13), width: pt(142), height: pt(46) }, {
      fontSize: pt(12.5), bold: true, lineSpacing: 1.08, verticalAlignment: 'middle',
    });
  });
  setNotes(slide, d.notes);
}

async function buildSlide7(presentation) {
  const d = deckContent[6];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'LEARNING LOOP', '07', 'Two decisions keep practice fast and repeatable', null, {
    kickerWidth: 150,
    titleSize: pt(26),
    titleHeight: pt(52),
  });

  await addScreenshot(slide, '07-review-got-it.png', { left: pt(60), top: pt(150), width: pt(150), height: pt(325) }, {
    alt: 'Got it review result',
    borderRadius: pt(20),
    shadowOffset: pt(5),
  });
  await addScreenshot(slide, '07-review-again.png', { left: pt(240), top: pt(150), width: pt(150), height: pt(325) }, {
    alt: 'Again review result',
    borderRadius: pt(20),
    shadowOffset: pt(5),
  });
  addPill(slide, 'GOT IT', { left: pt(82), top: pt(490), width: pt(106), height: pt(24) }, {
    fill: C.mint,
    fontSize: pt(11),
  });
  addPill(slide, 'AGAIN', { left: pt(262), top: pt(490), width: pt(106), height: pt(24) }, {
    fill: C.coral,
    fontSize: pt(11),
  });

  const chips = [
    { label: 'AGAIN', fill: C.coral, text: 'Returns the phrase sooner' },
    { label: 'GOT IT', fill: C.mint, text: 'Increases the review interval' },
    { label: 'UNDO', fill: C.white, text: 'Protects against accidental taps' },
    { label: 'OFFLINE', fill: C.white, text: 'Queued locally, synced reliably' },
  ];
  chips.forEach((item, index) => {
    const chip = { left: pt(520), top: pt(150 + index * 64), width: pt(380), height: pt(52) };
    addSpecChip(slide, chip, { fill: C.white });
    addPill(slide, item.label, { left: chip.left + pt(14), top: chip.top + pt(13), width: pt(92), height: pt(26) }, {
      fill: item.fill,
      fontSize: pt(11),
    });
    addText(slide, item.text, { left: chip.left + pt(122), top: chip.top + pt(10), width: pt(238), height: pt(32) }, {
      fontSize: pt(13), bold: true, verticalAlignment: 'middle',
    });
  });

  await addImage(slide, path.join(ASSETS, 'srs-intervals.png'), { left: pt(520), top: pt(403), width: pt(360), height: pt(119) }, { alt: 'Spaced repetition interval sequence' });
  setNotes(slide, d.notes);
}

async function buildSlide8(presentation) {
  const d = deckContent[7];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'SYSTEM', '08', 'AI transforms the content without becoming the product', null, {
    titleSize: pt(26),
    titleHeight: pt(52),
  });
  await addImage(slide, path.join(ASSETS, 'architecture-simple.png'), { left: pt(110), top: pt(130), width: pt(740), height: pt(396) }, { alt: 'Simplified Just Speak It architecture diagram' });
  setNotes(slide, d.notes);
}

async function buildSlide9(presentation) {
  const d = deckContent[8];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'ENGINEERING', '09', 'Designed to recover, stay consistent, and protect data', null, {
    kickerWidth: 138,
    titleSize: pt(26),
    titleHeight: pt(52),
  });

  const cards = [
    { label: 'STATE MACHINE', fill: C.mint, benefit: 'Keeps capture and generation states predictable' },
    { label: 'ZOD CONTRACTS', fill: C.cobalt, textColor: C.white, benefit: 'Keeps the app and API in agreement' },
    { label: 'TANSTACK QUERY', fill: C.sky, benefit: 'Keeps server state consistent across screens' },
    { label: 'IDEMPOTENCY', fill: C.violet, benefit: 'Prevents duplicate AI work after retries' },
    { label: 'LOCAL OUTBOX', fill: C.amber, benefit: 'Makes review and undo survive temporary failures' },
    { label: 'RLS', fill: C.coral, benefit: 'Restricts every user to their own data' },
  ];
  cards.forEach((card, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const panel = { left: pt(60 + col * 288), top: pt(180 + row * 172), width: pt(264), height: pt(150) };
    addShadowPanel(slide, panel, { fill: C.white, borderRadius: pt(12), shadowOffset: pt(5), lineWidth: pt(2.5) });
    addPill(slide, card.label, { left: panel.left + pt(20), top: panel.top + pt(18), width: pt(170), height: pt(26) }, {
      fill: card.fill,
      color: card.textColor ?? C.ink,
      fontSize: pt(11),
    });
    addText(slide, card.benefit, { left: panel.left + pt(22), top: panel.top + pt(68), width: pt(220), height: pt(58) }, {
      fontSize: pt(12.5), bold: true, lineSpacing: 1.1, verticalAlignment: 'middle',
    });
  });
  setNotes(slide, d.notes);
}

async function buildSlide10(presentation) {
  const d = deckContent[9];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-mint.png');
  addPill(slide, 'LIVE DEMO', { left: pt(400), top: pt(56), width: pt(160), height: pt(30) }, {
    fill: C.ink,
    color: C.white,
    lineColor: C.ink,
    fontSize: pt(11),
  });
  await addImage(slide, path.join(ASSETS, 'logo-lockup.png'), { left: pt(425), top: pt(100), width: pt(110), height: pt(110) }, { alt: 'Just Speak It logo' });
  addText(slide, 'Now, one thought becomes something I can practice', { left: pt(145), top: pt(228), width: pt(670), height: pt(42) }, {
    fontSize: pt(22), bold: true, color: C.ink, alignment: 'center', verticalAlignment: 'middle',
  });

  d.demoSteps.forEach((step, index) => {
    const panel = { left: pt(75 + index * 280), top: pt(280), width: pt(250), height: pt(84) };
    addSpecChip(slide, panel, { fill: C.white });
    slide.shapes.add({ geometry: 'ellipse', position: { left: panel.left + pt(16), top: panel.top + pt(16), width: pt(26), height: pt(26) }, fill: C.white, line: { style: 'solid', fill: C.ink, width: pt(1.75) } });
    addText(slide, String(index + 1), { left: panel.left + pt(16), top: panel.top + pt(19), width: pt(26), height: pt(20) }, { fontSize: pt(11), bold: true, alignment: 'center', verticalAlignment: 'middle' });
    addText(slide, step, { left: panel.left + pt(56), top: panel.top + pt(14), width: pt(174), height: pt(52) }, {
      fontSize: pt(13), bold: true, lineSpacing: 1.12, verticalAlignment: 'middle',
    });
  });
  addText(slide, d.closing, { left: pt(120), top: pt(430), width: pt(720), height: pt(44) }, {
    fontSize: pt(26), bold: true, color: C.ink, alignment: 'center', verticalAlignment: 'middle',
  });
  setNotes(slide, d.notes);
}

async function buildSlide11(presentation) {
  const d = deckContent[10];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'APPENDIX · IF THE DEMO FIGHTS BACK', 'A1', '', null, {
    kickerWidth: 298,
    titleHeight: 0,
  });
  const items = [
    ['01-home-idle.png', 'Speak'],
    ['02-home-recording.png', 'Transcribe'],
    ['03-making-cards.png', 'Generate'],
    ['05-phrases.png', 'Cards'],
    ['07-review-answer.png', 'Review'],
  ];
  for (let index = 0; index < items.length; index += 1) {
    const [file, label] = items[index];
    const x = 60 + index * 176;
    await addScreenshot(slide, file, { left: pt(x), top: pt(120), width: pt(132), height: pt(286) }, {
      alt: label,
      placeholder: label.toUpperCase(),
      borderRadius: pt(20),
      shadowOffset: pt(5),
    });
    addPill(slide, `${index + 1}  ${label}`, { left: pt(x + 10), top: pt(424), width: pt(112), height: pt(24) }, {
      fill: C.white,
      fontSize: pt(11),
    });
  }
  setNotes(slide, d.notes);
}

async function buildSlide12(presentation) {
  const d = deckContent[11];
  const slide = presentation.slides.add();
  await addBackground(slide, 'bg-paper.png');
  addContentHeader(slide, 'APPENDIX · SYSTEM DETAIL', 'A2', '', null, {
    kickerWidth: 230,
    headerY: 22,
    titleHeight: 0,
  });
  await addImage(slide, path.join(ASSETS, 'architecture-detailed.png'), { left: pt(55), top: pt(60), width: pt(850), height: pt(473) }, { alt: 'Detailed Just Speak It low-level architecture diagram' });
  setNotes(slide, d.notes);
}

async function main() {
  await fs.mkdir(BUILD, { recursive: true });
  await rasterizeTrackedSvgAssets();
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });
  presentation.theme.colorScheme = {
    name: 'Just Speak It',
    themeColors: {
      accent1: C.cobalt,
      accent2: C.mint,
      accent3: C.orange,
      accent4: C.coral,
      accent5: C.violet,
      accent6: C.sky,
      bg1: C.paper,
      bg2: C.white,
      tx1: C.ink,
      tx2: C.muted,
      dk1: '#000000',
      dk2: C.ink,
      lt1: C.white,
      lt2: C.paper,
      hlink: C.cobalt,
      folHlink: C.violet,
    },
  };

  await buildSlide1(presentation);
  await buildSlide2(presentation);
  await buildSlide3(presentation);
  await buildSlide4(presentation);
  await buildSlide5(presentation);
  await buildSlide6(presentation);
  await buildSlide7(presentation);
  await buildSlide8(presentation);
  await buildSlide9(presentation);
  await buildSlide10(presentation);
  await buildSlide11(presentation);
  await buildSlide12(presentation);

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, '0')}`;
    const png = await presentation.export({ slide, format: 'png', scale: 1 });
    await fs.writeFile(path.join(BUILD, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: 'layout' });
    await fs.writeFile(path.join(BUILD, `${stem}.layout.json`), await layout.text());
  }

  const montage = await presentation.export({ format: 'webp', montage: true, scale: 1 });
  await fs.writeFile(path.join(BUILD, 'deck-montage.webp'), new Uint8Array(await montage.arrayBuffer()));
  const inspect = await presentation.inspect({ kind: 'slide,textbox,shape,image,notes', maxChars: 100000 });
  await fs.writeFile(path.join(BUILD, 'deck.inspect.ndjson'), inspect.ndjson);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL);
  console.log(FINAL);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
