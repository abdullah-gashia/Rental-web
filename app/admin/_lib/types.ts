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
