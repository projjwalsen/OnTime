export interface PurchaseHistoryItem {
  orderId: string;
  orderNumber: string;
  date: Date | string;
  totalAmount: number;
  itemCount: number;
  status: string;
}

export interface ProductPurchaseHistoryItem {
  productId: string;
  productName: string;
  productSku: string;
  categoryName?: string | null;
  totalQuantity: number;
  totalSpent: number;
  lastOrderedDate: Date | string;
  orderCount: number;
}

export interface CustomerOverallPurchaseHistory {
  organisationId: string;
  organisationName: string;
  totalSpend: number;
  totalOrders: number;
  averageOrderValue: number;
  firstOrderDate?: Date | string | null;
  lastOrderDate?: Date | string | null;
  orders: PurchaseHistoryItem[];
}

export interface CustomerProductPurchaseHistory {
  organisationId: string;
  organisationName: string;
  totalProductsCount: number;
  products: ProductPurchaseHistoryItem[];
}

