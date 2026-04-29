import { createAppAuth } from '@octokit/auth-app';
   import { Octokit } from '@octokit/rest';
   
   /**
    * Returns an Octokit client authenticated as a specific installation.
    * Use this for any API call that acts on behalf of a user/org that installed the app.
    */
   export function getInstallationOctokit(installationId: number): Octokit {
     const appId = process.env.GITHUB_APP_ID!;
     const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!;
   
     if (!appId || !privateKey) {
       throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set');
     }
   
     return new Octokit({
       authStrategy: createAppAuth,
       auth: {
         appId,
         privateKey,
         installationId,
       },
     });
   }
   
   /**
    * Returns an Octokit client authenticated as the App itself (no installation).
    * Use this for App-level operations like listing installations.
    */
   export function getAppOctokit(): Octokit {
     const appId = process.env.GITHUB_APP_ID!;
     const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!;
   
     return new Octokit({
       authStrategy: createAppAuth,
       auth: { appId, privateKey },
     });
   }