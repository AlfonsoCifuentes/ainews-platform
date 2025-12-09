export const VISUAL_STYLES = ['photorealistic', 'anime'] as const;
export type VisualStyle = (typeof VISUAL_STYLES)[number];

export const VISUAL_DENSITIES = ['minimal', 'balanced', 'immersive'] as const;
export type VisualDensity = (typeof VISUAL_DENSITIES)[number];

export function normalizeVisualStyle(style?: string | null): VisualStyle {
	return VISUAL_STYLES.includes(style as VisualStyle) ? (style as VisualStyle) : 'photorealistic';
}
