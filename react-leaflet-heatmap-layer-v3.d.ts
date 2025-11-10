// src/types/react-leaflet-heatmap-layer-v3.d.ts
declare module "react-leaflet-heatmap-layer-v3" {
  import { Layer } from "leaflet";
  import { ReactNode } from "react";
  import { LayerProps } from "react-leaflet";

  export interface HeatmapLayerProps extends LayerProps {
    points: { lat: number; lng: number; intensity?: number }[];
    longitudeExtractor: (p: any) => number;
    latitudeExtractor: (p: any) => number;
    intensityExtractor: (p: any) => number;
    max?: number;
    radius?: number;
    blur?: number;
    minOpacity?: number;
  }

  export class HeatmapLayer extends React.Component<HeatmapLayerProps> {}
  export default HeatmapLayer;
}
