export interface OrderData {
  id: string;
  customerName: string;
  items: any[];
  subtotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  total: number;
  status: string;
  createdAt: Date | string;
}

const STORAGE_KEY = 'atelie_fit_orders';

const getLocalOrders = (): OrderData[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

const saveLocalOrders = (orders: OrderData[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const saveOrderToSupabase = async (order: OrderData) => {
  const orders = getLocalOrders();
  // Ensure date is stringified properly for storage
  const newOrder = {
    ...order,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt
  };
  orders.unshift(newOrder);
  saveLocalOrders(orders);
  return newOrder;
};

export const fetchOrdersFromSupabase = async () => {
  const orders = getLocalOrders();
  return orders.map(o => ({
    ...o,
    createdAt: new Date(o.createdAt)
  }));
};

export const updateOrderStatusInSupabase = async (id: string, status: string) => {
  const orders = getLocalOrders();
  const orderIndex = orders.findIndex(o => o.id === id);
  if (orderIndex > -1) {
    orders[orderIndex].status = status;
    saveLocalOrders(orders);
    return orders[orderIndex];
  }
  return null;
};
