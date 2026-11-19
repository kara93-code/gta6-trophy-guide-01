// Leonida Platinum — a GTA VI trophy guide and tracker (Node 22, stdlib only).
//
// The guide itself is plain static files under app/: app/index.html opens in
// desktop Chrome with the network off, loads nothing from outside app/, and
// keeps its trophy list in app/data/trophies.json. This program is only the
// hand-in step: it gathers app/ and screenshots/ from beside this file into
// the output directory and writes output/dossier.json, the summary the judge
// reads (screenshots, first-load files and bytes, and the source), built with
// the kit's vendored library. vendor/makefun-frontend.ts stays untouched:
// the scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and serve the app locally for a look with any static server rooted at app/.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(rootDir, 'app'), join(outputDir, 'app'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(rootDir, 'screenshots'))) {
  cpSync(join(rootDir, 'screenshots'), shotsDir, { recursive: true });
}

// Caps from the scorer's reference gate: the dossier text is capped, at most
// 4 screenshots of 256 KiB each, app/ at most 993 files and directories and
// 48 MiB in all (the whole /output shares the platform's 1000-entry cap, so
// app/, screenshots/ and dossier.json together must leave room).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
