// Migration unique : audio.js (MP3 en base64) → public/audio/<voix>/<id>.mp3 + src/data/clips.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const src = process.argv[2] || 'audio.js';
const raw = readFileSync(src, 'utf8').trim();
const prefix = 'window.AUDIO=';
if (!raw.startsWith(prefix)) throw new Error(`${src} ne commence pas par ${prefix}`);
const audio = JSON.parse(raw.slice(prefix.length).replace(/;$/, ''));

const clips = {};
let total = 0;
for (const [bank, entries] of Object.entries(audio)) {
  const dir = join('public', 'audio', bank);
  mkdirSync(dir, { recursive: true });
  clips[bank] = [];
  for (const [id, uri] of Object.entries(entries)) {
    const m = /^data:audio\/mpeg;base64,(.+)$/.exec(uri);
    if (!m) throw new Error(`${bank}/${id} : data-URI inattendue`);
    const buf = Buffer.from(m[1], 'base64');
    writeFileSync(join(dir, id + '.mp3'), buf);
    clips[bank].push(id);
    total += buf.length;
  }
  clips[bank].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  console.log(`${bank} : ${clips[bank].length} clips`);
}
writeFileSync(join('src', 'data', 'clips.json'), JSON.stringify(clips, null, 1) + '\n');
console.log(`Total : ${(total / 1e6).toFixed(2)} Mo de MP3`);
