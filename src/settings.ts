export interface GuardSettings {
  excludedFolders: string | string[];
}

export const DEFAULT_SETTINGS: Readonly<GuardSettings> = { excludedFolders: '' };

/** Read both the original helper's text and the folder picker's list. */
export function readSettings(data: unknown): GuardSettings {
  if (typeof data === 'object' && data !== null && 'excludedFolders' in data) {
    const value: unknown = data.excludedFolders;
    if (typeof value === 'string') return { excludedFolders: value };
    if (Array.isArray(value)) {
      const entries: unknown[] = value;
      if (entries.every((entry): entry is string => typeof entry === 'string')) {
        return { excludedFolders: [...entries] };
      }
    }
  }
  return { ...DEFAULT_SETTINGS };
}
