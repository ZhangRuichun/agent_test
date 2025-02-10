// Product Types
export interface Product {
  id: number;
  brandName: string;
  productName: string;
  description: string;
  listPrice: number;
  benefits?: string;
  cost?: number;
  lowPrice?: number;
  highPrice?: number;
  status?: 'ACTIVE' | 'DELETED';
  createdAt?: string;
  images?: ProductImage[];
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  ordinal: number;
  createdAt?: string;
}

export interface ProductAnalysis {
  productId: number;
  brandName: string;
  productName: string;
  description: string | null;
  imageUrl: string | null;
  listPrice: number;
  lowPrice?: number;
  highPrice?: number;
  responses: Record<string, number>;
  priceElasticity?: number;
  revenueOptimal?: number;
  conclusion?: string;
}

// Survey Types
export interface SimulationResult {
  products: SimulationProduct[];
  surveyUrl: string;
  variantId: number;
}

export interface SimulationProduct {
  id: number;
  brand: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  optimalPrice: number;
  preferenceShare: number;
  lowPrice?: number;
  highPrice?: number;
  listPrice?: number;
}