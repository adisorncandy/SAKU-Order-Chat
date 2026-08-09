export interface Settings {
  pageId: string;
  pageAccessToken: string;
  verifyToken: string;
  aiEnabled: boolean;
  companyName: string;
  senderAddress: string;
  senderPhone: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'admin' | 'ai';
  text: string;
  timestamp: string; // ISO string
}

export interface ChatThread {
  id: string; // Facebook sender ID or mock ID
  customerName: string;
  customerAvatar: string;
  lastMessage: string;
  unread: boolean;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  description: string;
}

export interface OrderItem {
  productId: string;
  code: string;
  name: string;
  price: number;
  qty: number;
}

export interface AddressDetails {
  name: string;
  phone: string;
  fullAddress: string;
  subdistrict: string;
  district: string;
  province: string;
  zipcode: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  address: AddressDetails;
  createdAt: string;
}
