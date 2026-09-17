export interface GuardSettings {
  excludedFolders: string;
}

export const DEFAULT_SETTINGS: Readonly<GuardSettings> = { excludedFolders: '' };

/** Keep the original helper's data.json shape; an intentionally empty list stays empty. */
export function readSettings(data: unknown): GuardSettings {
  if (typeof data === 'object' && data !== null && 'excludedFolders' in data && typeof data.excludedFolders === 'string') {
    return { excludedFolders: data.excludedFolders };
  }
  return { ...DEFAULT_SETTINGS };
}
