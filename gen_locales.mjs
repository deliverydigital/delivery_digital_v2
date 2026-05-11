// Script one-shot : traduit src/locales/fr.json vers 22 langues via Claude API.
// Sort un fichier JSON par langue dans src/locales/{lang}.json.
// Run: cd .../deliverydigital-web-app && node gen_locales.mjs
// @author Rabah Ziane - 2026-05-11
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TARGETS = [
  { code: 'es', name: 'Spanish (Spain)' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese (Portugal)' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian (Bokmål)' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'cs', name: 'Czech' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'el', name: 'Greek' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic (Modern Standard)' },
  { code: 'he', name: 'Hebrew' },
  { code: 'fa', name: 'Persian (Farsi)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const src = JSON.parse(await fs.readFile('./src/locales/fr.json', 'utf-8'));
const en = JSON.parse(await fs.readFile('./src/locales/en.json', 'utf-8'));

async function translateOne(target) {
  const outPath = `./src/locales/${target.code}.json`;
  try {
    const existing = await fs.stat(outPath).catch(() => null);
    if (existing) {
      console.log(`[skip] ${target.code} (already exists)`);
      return;
    }
  } catch {}

  const prompt = `You are translating UI strings for a B2B web agency website (DELIVERY Digital - web/mobile/SaaS development). Translate the French JSON below into ${target.name}. Rules:
- Keep the same JSON structure and keys exactly.
- Translate ONLY the string values, not the keys.
- Keep brand names as-is: "DELIVERY Digital", "CII", "Stripe", etc.
- Preserve placeholders like {{count}}, {{year}}.
- Adapt phrasing to native B2B style (professional, concise).
- For Arabic/Hebrew/Persian: write right-to-left appropriate text but in proper JSON string form.
- Output VALID JSON only, no markdown fence, no explanations.

For reference, here is the English version:
${JSON.stringify(en, null, 2)}

Now translate this French source into ${target.name}:
${JSON.stringify(src, null, 2)}`;

  console.log(`[claude] translating to ${target.code} (${target.name})...`);
  const res = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });
  let text = res.content[0].text.trim();
  // Strip markdown fence if present
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  try {
    const parsed = JSON.parse(text);
    await fs.writeFile(outPath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
    console.log(`  -> wrote ${outPath} (${text.length} chars)`);
  } catch (e) {
    console.error(`  !! ${target.code} invalid JSON, raw:`, text.slice(0, 200));
    await fs.writeFile(outPath + '.raw', text, 'utf-8');
  }
}

for (const t of TARGETS) {
  try { await translateOne(t); }
  catch (e) { console.error(`!! ${t.code}: ${e.message}`); }
}
console.log('Done.');
