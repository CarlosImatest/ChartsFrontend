import { ChartType } from './chart.model';

export interface ChartPreset {
  layerRowCounts: number[];   // one entry per non-final layer
  finalLayerRowCount: number;
}

export const CHART_PRESETS: Record<ChartType, ChartPreset> = {
  [ChartType.WDR]:    { layerRowCounts: [37, 15],     finalLayerRowCount: 39 },
  [ChartType.LDR]:    { layerRowCounts: [],           finalLayerRowCount: 39 },
  [ChartType.UHDR]:   { layerRowCounts: [37, 15, 15],  finalLayerRowCount: 39 },
  [ChartType.CRC]:    { layerRowCounts: [21, 13],     finalLayerRowCount: 23 },
  [ChartType.VISNIR]: { layerRowCounts: [37, 37],     finalLayerRowCount: 37 },
};