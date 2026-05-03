import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';

export type SupportedLanguage = 'javascript' | 'typescript' | 'tsx' | 'python';

const parserCache: Partial<Record<SupportedLanguage, Parser>> = {};

/**
 * Detect the language of a file based on its extension.
 *
 * @param filename - The file name or path to inspect.
 * @returns The detected language, or `null` if the extension is not supported.
 */
export function detectLanguage(filename: string): SupportedLanguage | null {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = lower.slice(dot);

  switch (ext) {
    case '.js':
    case '.jsx':
      return 'javascript';
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'tsx';
    case '.py':
      return 'python';
    default:
      return null;
  }
}

function getParser(language: SupportedLanguage): Parser {
  const cached = parserCache[language];
  if (cached) return cached;

  const parser = new Parser();
  switch (language) {
    case 'javascript':
      parser.setLanguage(JavaScript);
      break;
    case 'typescript':
      parser.setLanguage(TypeScript.typescript);
      break;
    case 'tsx':
      parser.setLanguage(TypeScript.tsx);
      break;
    case 'python':
      parser.setLanguage(Python);
      break;
  }

  parserCache[language] = parser;
  return parser;
}

/**
 * Parse source code into a tree-sitter Tree using the appropriate grammar.
 * Parsers are loaded lazily and cached per language.
 *
 * @param content - The source code to parse.
 * @param language - The language grammar to use.
 * @returns The resulting tree-sitter Tree, or `null` if parsing fails.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseFile(content: string, language: SupportedLanguage): any {
  try {
    const parser = getParser(language);
    return parser.parse(content);
  } catch {
    return null;
  }
}
