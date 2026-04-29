import crypto from 'crypto';
   
   /**
    * Verifies a GitHub webhook signature using the shared secret.
    * Returns true if the signature is valid, false otherwise.
    */
   export function verifyGithubSignature(
     rawBody: string,
     signatureHeader: string | null,
     secret: string
   ): boolean {
     if (!signatureHeader) return false;
     const expected =
       'sha256=' +
       crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
     try {
       return crypto.timingSafeEqual(
         Buffer.from(signatureHeader),
         Buffer.from(expected)
       );
     } catch {
       return false;
     }
   }