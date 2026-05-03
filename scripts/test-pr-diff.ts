import 'dotenv/config';
   import { fetchPRFiles, fetchFileContent } from '../src/server/github-diff';
   import { diffFile } from '../src/lib/structural-diff';
   import { detectLanguage } from '../src/lib/parser';
   
   async function main() {
     // Edit these for your test case
     const INSTALLATION_ID = 128051601;     // from your installations table
     const OWNER = 'Senix-Org';              // your org
     const REPO = 'webhook-test';
     const PR_NUMBER = 1;
     const BASE_SHA = '';                    // get from PR's base.sha — see below
     const HEAD_SHA = '';                    // get from PR's head.sha
   
     const files = await fetchPRFiles(INSTALLATION_ID, OWNER, REPO, PR_NUMBER);
     console.log(`PR has ${files.length} files`);
   
     for (const file of files) {
       const lang = detectLanguage(file.filename);
       if (!lang) {
         console.log(`  [skip] ${file.filename} (unsupported)`);
         continue;
       }
   
       const before = file.status === 'added'
         ? null
         : await fetchFileContent(INSTALLATION_ID, OWNER, REPO, file.previous_filename ?? file.filename, BASE_SHA);
       const after = file.status === 'removed'
         ? null
         : await fetchFileContent(INSTALLATION_ID, OWNER, REPO, file.filename, HEAD_SHA);
   
       const diff = diffFile(file.filename, before, after);
       console.log(`\n  ${file.filename} (${lang})`);
       console.log(`    +${diff.summary.added} -${diff.summary.removed} ~${diff.summary.modified}`);
       for (const c of diff.changes.filter((c) => c.change !== 'unchanged')) {
         console.log(`    ${c.change.padEnd(10)} ${c.kind.padEnd(8)} ${c.id}`);
       }
     }
   }
   
   main().catch((e) => {
     console.error(e);
     process.exit(1);
   });