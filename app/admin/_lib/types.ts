// ─── Pagination ───────────────────────────────────────────────────────────────

export type PaginationMeta = {
  currentPage: number;
  pageSize:    number;
  totalCount:  number;
  totalPages:  number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

// ─── Server Action responses ──────────────────────────────────────────────────

export type ActionResult =
  | { success: true;  message: string }
  | { success: false; error: string   };

// ─── Table query params ───────────────────────────────────────────────────────

export type TableQueryParams = {
  page?:      number;
  pageSize?:  number;           // default 20, max 100
  search?:    string;
  sortBy?:    string;
  sortOrder?: "asc" | "desc";
};

// ─── Row types (serialised — all Dates converted to ISO strings) ──────────────

export type UserRow = {
  id:         string;
  name:       string | null;
  email:      string;
  role:       "ADMIN" | "STUDENT";
  isBanned:   boolean;
  trustScore: number;
  itemCount:  number;
  orderCount: number;
  createdAt:  string;
};

export type ItemRow = {
  id:           string;
  title:        string;
  thumbnailUrl: string | null;
  seller:       { id: string; name: string | null; email: string };
  price:        number;
  category:     string | null;
  status:       string;
  listingType:  string;
  createdAt:    string;
  rejectReason: string | null;
  isTrending:          boolean;
  featuredTrendingId:   string | null;
};

// ─── Admin user detail types ──────────────────────────────────────────────────

export type EscrowOrderDetail = {
  id:          string;
  amount:      number;
  totalAmount: number | null;
  sellerPayout: number | null;
  status:      string;
  buyerId:     string;
  sellerId:    string;
  itemTitle:   string;
  createdAt:   string;
};

export type UserDetail = {
  id:                 string;
  name:               string | null;
  email:              string;
  image:              string | null;
  phone:              string | null;
  bio:                string | null;
  role:               "ADMIN" | "STUDENT";
  isBanned:           boolean;
  trustScore:         number;
  walletBalance:      number;
  escrowBalance:      number;
  createdAt:          string;
  verificationStatus: string;
  psuIdNumber:        string | null;
  psuIdType:          string | null;
  verifiedAt:         string | null;
  // Financial
  buyerEscrowTotal:   number;
  buyerEscrowCount:   number;
  sellerPayoutTotal:  number;
  sellerPayoutCount:  number;
  totalSalesAmount:   number;
  totalSalesCount:    number;
  totalPurchaseAmount: number;
  totalPurchaseCount: number;
  // Activity
  itemCount:          number;
  activeItemCount:    number;
  soldItemCount:      number;
  buyOrderCount:      number;
  sellOrderCount:     number;
  disputeCount:       number;
  cancelledCount:     number;
  // Escrow orders
  escrowOrders:       EscrowOrderDetail[];
};

export type OrderRow = {
  id:              string;
  shortRef:        string;              // last-8 chars of id, uppercase
  buyer:           { id: string; name: string | null; email: string };
  seller:          { id: string; name: string | null; email: string };
  item:            { id: string; title: string; thumbnailUrl: string | null };
  amount:          number;
  totalAmount:     number | null;
  status:          string;
  deliveryMethod:  string | null;
  paymentMethod:   string | null;
  shippingAddress: Record<string, string> | null;  // JSON from DB
  meetupLocation:  string | null;
  meetupDateTime:  string | null;
  shippedAt:       string | null;
  trackingNumber:  string | null;
  createdAt:       string;
  hasDispute:      boolean;
};
