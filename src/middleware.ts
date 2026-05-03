import { NextRequest, NextResponse } from 'next/server';
   
   export function middleware(req: NextRequest) {
     // Only protect /internal/*
     if (!req.nextUrl.pathname.startsWith('/internal')) {
       return NextResponse.next();
     }
   
     const password = process.env.INTERNAL_PASSWORD;
     if (!password) return NextResponse.next(); // fail-open in dev if unset
   
     const auth = req.headers.get('authorization');
     if (auth) {
       const [scheme, encoded] = auth.split(' ');
       if (scheme === 'Basic' && encoded) {
         const decoded = Buffer.from(encoded, 'base64').toString();
         const [, providedPassword] = decoded.split(':');
         if (providedPassword === password) {
           return NextResponse.next();
         }
       }
     }
   
     return new NextResponse('Authentication required', {
       status: 401,
       headers: { 'WWW-Authenticate': 'Basic realm="Internal"' },
     });
   }
   
   export const config = {
     matcher: ['/internal/:path*'],
   };