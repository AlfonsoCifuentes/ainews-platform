export const VISUAL_STYLES = ['photorealistic', 'anime', 'comic', 'pixel-art'] as const;
export type VisualStyle = (typeof VISUAL_STYLES)[number];

export const VISUAL_DENSITIES = ['minimal', 'balanced', 'immersive'] as const;
export type VisualDensity = (typeof VISUAL_DENSITIES)[number];
