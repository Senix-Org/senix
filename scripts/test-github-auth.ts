import 'dotenv/config';
   import { getAppOctokit } from '../src/lib/github-app';
   
   async function main() {
     const app = getAppOctokit();
   
     // List all installations of this App. Should show your test install.
     const { data: installations } = await app.request('GET /app/installations');
   
     console.log('✅ Authenticated as app. Installations found:');
     for (const i of installations) {
       console.log(`  - id=${i.id}  account=${i.account?.login}  type=${i.account?.type}`);
     }
   }
   
   main().catch((err) => {
     console.error('❌ Auth test failed:', err.message);
     process.exit(1);
   });