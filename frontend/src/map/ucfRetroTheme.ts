import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import pixelFontUrl from '../assets/fonts/PixelifySans.ttf?url';

/** Label size in pixels at the starting campus zoom (15). */
export const UCF_RETRO_LABEL_SIZE = 18;

/** Hide decorative park/grass icons while preserving their text labels. */
export const SHOW_NATURE_POI_ICONS = false;
const NATURE_POI_CLASSES = ['park', 'garden', 'grass', 'forest', 'wood', 'nature_reserve', 'recreation_ground'];

export const UCF_RETRO_COLORS = {
  background: '#111111',
  land: '#191919',
  campus: '#20201b',
  vegetation: '#22271e',
  water: '#15232b',
  building: '#292929',
  buildingOutline: '#655a36',
  road: '#454545',
  roadOutline: '#151515',
  path: '#3f3720',
  gold: '#ffc904',
  boundary: '#736445',
} as const;

function themeLayer(layer: LayerSpecification): LayerSpecification {
  const colors = UCF_RETRO_COLORS;
  const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : '';

  switch (layer.type) {
    case 'background':
      return { ...layer, paint: { ...layer.paint, 'background-color': colors.background } };
    case 'raster':
      // Keep the low-zoom world backdrop within the same dark palette.
      return {
        ...layer,
        paint: {
          ...layer.paint,
          'raster-saturation': -1,
          'raster-brightness-min': 0,
          'raster-brightness-max': 0.14,
        },
      };
    case 'fill': {
      let fillColor: string = colors.land;
      if (sourceLayer === 'building') fillColor = colors.building;
      else if (sourceLayer === 'water') fillColor = colors.water;
      else if (sourceLayer === 'park' || sourceLayer === 'landcover') fillColor = colors.vegetation;
      else if (layer.id === 'landuse_school') fillColor = colors.campus;
      else if (sourceLayer === 'transportation' || sourceLayer === 'aeroway') fillColor = colors.road;

      const paint = { ...layer.paint, 'fill-color': fillColor };
      // Flat fills complement pixel art better than the Liberty road texture.
      delete paint['fill-pattern'];
      if (sourceLayer === 'building') paint['fill-outline-color'] = colors.buildingOutline;
      return { ...layer, paint };
    }
    case 'fill-extrusion':
      return {
        ...layer,
        paint: {
          ...layer.paint,
          'fill-extrusion-color': colors.building,
          'fill-extrusion-height': 0,
          'fill-extrusion-base': 0,
        },
      };
    case 'line': {
      let lineColor: string = colors.boundary;
      if (sourceLayer === 'waterway') lineColor = colors.water;
      else if (sourceLayer === 'park') lineColor = colors.vegetation;
      else if (sourceLayer === 'transportation' || sourceLayer === 'aeroway') {
        lineColor = layer.id.includes('casing')
          ? colors.roadOutline
          : layer.id.includes('path_pedestrian')
            ? colors.path
            : colors.road;
      }
      return { ...layer, paint: { ...layer.paint, 'line-color': lineColor } };
    }
    case 'symbol': {
      const paint = { ...layer.paint };
      if (sourceLayer === 'poi' && !SHOW_NATURE_POI_ICONS) {
        paint['icon-opacity'] = [
          'case',
          ['any',
            ['in', ['get', 'class'], ['literal', NATURE_POI_CLASSES]],
            ['in', ['get', 'subclass'], ['literal', NATURE_POI_CLASSES]],
          ],
          0,
          typeof layer.paint?.['icon-opacity'] === 'number' ? layer.paint['icon-opacity'] : 1,
        ];
      }
      if (!layer.layout?.['text-field']) return { ...layer, paint };
      const originalFonts = layer.layout['text-font'];
      const fallbackFonts = Array.isArray(originalFonts) && originalFonts.every((font) => typeof font === 'string')
        ? originalFonts as string[]
        : ['Noto Sans Regular'];
      return {
        ...layer,
        layout: {
          ...layer.layout,
          'text-font': ['Pixelify Sans', ...fallbackFonts],
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            10, UCF_RETRO_LABEL_SIZE * 0.8,
            15, UCF_RETRO_LABEL_SIZE,
            18, UCF_RETRO_LABEL_SIZE * 1.25,
          ],
          'text-letter-spacing': 0.03,
        },
        paint: {
          ...paint,
          'text-color': colors.gold,
          'text-halo-color': colors.background,
          'text-halo-width': 1,
          'text-halo-blur': 0,
        },
      };
    }
    default:
      return layer;
  }
}

/** Transform Liberty before rendering; retain its sources, labels and attribution. */
export function createUcfRetroStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    name: 'UCF Retro',
    'font-faces': {
      ...style['font-faces'],
      'Pixelify Sans': [{ url: pixelFontUrl, 'unicode-range': ['U+0000-024F'] }],
    },
    layers: style.layers.map(themeLayer),
  };
}
