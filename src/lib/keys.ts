// Musical keys shared by the library filter and the per-piece key tags.
export const MUSICAL_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'bB', 'bA', '#F', '#C', 'bE'] as const;

export type MusicalKey = (typeof MUSICAL_KEYS)[number];
