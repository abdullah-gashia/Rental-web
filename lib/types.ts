// Shared types for client-side usage (mirrors Prisma models)

export interface SellerInfo {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface CategoryInfo {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  emoji: string | null;
}

export interface ItemImage {
  id: string;
  url: string;
  isMain: boolean;
}

export interface ItemWithDetails {
  id: string;
  title: string;
  description: string;
  price: number;
  emoji: string | null;
  color: string | null;
  listingType: "SELL" | "RENT";
  condition: "LIKE_NEW" | "GOOD" | "FAIR" | "NEEDS_REPAIR";
  status: "ACTIVE" | "SOLD" | "RENTED" | "EXPIRED" | "REMOVED";
  negotiable: boolean;
  shippable: boolean;
  location: string | null;
  contact: string | null;
  rating: number;
  createdAt: string;
  seller: SellerInfo;
  category: CategoryInfo;
  images: ItemImage[];
}

export interface TrendCard {
  bg?: string;
  grad?: string;
  border?: string;
  dark: boolean;
  icon: string;
  subTh: string;
  subEn: string;
  labelTh: string;
  labelEn: string;
}

export type ListingType = "SELL" | "RENT";
export type ItemCondition = "LIKE_NEW" | "GOOD" | "FAIR" | "NEEDS_REPAIR";
export type CategorySlug = "all" | "secondhand" | "rental" | "electronics" | "vehicles" | "boardgames" | "books";
