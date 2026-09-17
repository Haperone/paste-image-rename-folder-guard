import { normalizePath } from 'obsidian';

export interface FolderRules {
  folders: string[];
  invalid: string[];
}

/** Paths are vault-relative and case-sensitive. Never treat a blank rule as root. */
export function parseFolders(input: string): FolderRules {
  const folders = new Set<string>();
  const invalid: string[] = [];
  for (const entry of input.split(/[\r\n,;]+/)) {
    const value = entry.trim().replace(/\\/g, '/');
    if (!value) continue;
    if (/^[a-z]:/i.test(value) || value.includes('://') || value.split('/').some(part => part === '.' || part === '..')) {
      invalid.push(entry.trim());
      continue;
    }
    const path = normalizePath(value).replace(/^\/+|\/+$/g, '');
    if (path) folders.add(path);
    else invalid.push(entry.trim());
  }
  return { folders: [...folders], invalid };
}

export function isExcluded(filePath: string, folders: readonly string[]): boolean {
  const path = normalizePath(filePath.replace(/\\/g, '/')).replace(/^\/+/, '');
  return folders.some(folder => path.startsWith(`${folder}/`));
}
