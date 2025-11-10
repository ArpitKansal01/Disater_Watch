export interface Report {
  _id: string;
  prediction: string;
  note: string;
  location: string;
  imageUrl?: string; // ✅ optional (matches LeafletMap)
  createdAt: string;
  confidence?: number;
}
