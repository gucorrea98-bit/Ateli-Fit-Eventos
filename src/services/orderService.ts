import { supabase } from '../lib/supabase';

export interface OrderData {
  id: string;
  customerName: string;
  items: any[];
  subtotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  total: number;
  status: string;
  createdAt: Date;
}

export const saveOrderToSupabase = async (order: OrderData) => {
  if (!supabase) {
    console.warn('Supabase is not configured. Order saved locally only.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          id: order.id,
          customer_name: order.customerName,
          items: order.items,
          subtotal: order.subtotal,
          discount_percent: order.discountPercent,
          discount_amount: order.discountAmount,
          total: order.total,
          status: order.status,
          created_at: order.createdAt.toISOString(),
        }
      ]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving order to Supabase:', error);
    return null;
  }
};

export const fetchOrdersFromSupabase = async () => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map((row: any) => ({
      id: row.id,
      customerName: row.customer_name,
      items: row.items,
      subtotal: row.subtotal || row.total,
      discountPercent: row.discount_percent || 0,
      discountAmount: row.discount_amount || 0,
      total: row.total,
      status: row.status,
      createdAt: new Date(row.created_at),
    }));
  } catch (error) {
    console.error('Error fetching orders from Supabase:', error);
    return [];
  }
};

export const updateOrderStatusInSupabase = async (id: string, status: string) => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating order status in Supabase:', error);
    return null;
  }
};
