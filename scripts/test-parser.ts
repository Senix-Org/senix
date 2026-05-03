import 'dotenv/config';
   import { detectLanguage, parseFile } from '../src/lib/parser';
   
   const samples: Array<{ name: string; content: string }> = [
     {
       name: 'sample.js',
       content: `
   function hello(name) {
     return 'Hello, ' + name;
   }
   const x = 42;
   class Greeter { greet() { return hello('world'); } }
       `,
     },
     {
       name: 'sample.ts',
       content: `
   interface User { id: number; name: string; }
   function getUser(id: number): User {
     return { id, name: 'test' };
   }
       `,
     },
     {
       name: 'sample.tsx',
       content: `
   import React from 'react';
   export function Button({ label }: { label: string }) {
     return <button>{label}</button>;
   }
       `,
     },
     {
       name: 'sample.py',
       content: `
   def hello(name):
       return f"Hello, {name}"
   
   class Greeter:
       def greet(self):
           return hello("world")
       `,
     },
     {
       name: 'sample.css',
       content: 'body { color: red; }',
     },
   ];
   
   for (const s of samples) {
     const lang = detectLanguage(s.name);
     console.log(`\n[${s.name}] language=${lang ?? 'unsupported'}`);
     if (!lang) continue;
   
     const tree = parseFile(s.content, lang);
     if (!tree) {
       console.log('  → parse failed');
       continue;
     }
     console.log('  → root node:', tree.rootNode.type);
     console.log('  → children:', tree.rootNode.children.length);
     console.log('  → has errors:', tree.rootNode.hasError);
   }