export enum ChartType {
  CRC = 'CRC',
  WDR = 'WDR',
  VISNIR = 'VISNIR',
  LDR = 'LDR',
  UHDR = 'UHDR'
}

export interface Layer {
  name: string;
  values: number[];
}

export interface ChartCreate {
  chart_type: ChartType;
  name: string;
  film_type: string;
  layers: Layer[];
  final_layer: Layer;
}

export interface ChartResponse {
  id: string;
  name: string;
  film_type: string;
  layers: Layer[];
  final_layer: Layer;
}

export enum FilmType {
  KODAK = 'Kodak',
  FUJIFILM = 'Fujifilm'
}