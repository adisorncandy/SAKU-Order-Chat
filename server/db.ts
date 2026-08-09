import fs from 'fs';
import path from 'path';
import { Settings, ChatThread, ChatMessage, KnowledgeItem, Product, Order } from '../src/types.js';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

interface DatabaseSchema {
  settings: Settings;
  threads: ChatThread[];
  knowledgeBase: KnowledgeItem[];
  products: Product[];
  orders: Order[];
}

const DEFAULT_SETTINGS: Settings = {
  pageId: '',
  pageAccessToken: 'EAAb...',
  verifyToken: 'my_fb_verify_token_123',
  aiEnabled: true,
  companyName: 'SAKULANGBAN',
  senderAddress: '99/9 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900',
  senderPhone: '0812345678',
};

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    code: 'CAP-001',
    name: 'หมวกแฟชั่นมินิมอลเกาหลี',
    price: 250,
    stock: 50,
    description: 'หมวกแก๊ปสไตล์เกาหลี เรียบหรู ใส่สบาย กันแดดได้ดี',
  },
  {
    id: 'p2',
    code: 'TSH-002',
    name: 'เสื้อยืด Cotton 100% เกรดพรีเมียม',
    price: 390,
    stock: 120,
    description: 'เสื้อยืดผ้านุ่มพิเศษ ระบายอากาศดีเยี่ยม มีสีขาว ดำ และเทา',
  },
  {
    id: 'p3',
    code: 'BOT-003',
    name: 'กระบอกน้ำเก็บอุณหภูมิอัจฉริยะ 500ml',
    price: 590,
    stock: 35,
    description: 'กระบอกน้ำสแตนเลส 316 เก็บความร้อน-เย็นได้ 24 ชม. พร้อมจอแสดงอุณหภูมิ',
  },
  {
    id: 'p4',
    code: 'BAG-004',
    name: 'กระเป๋าเป้เดินทางกันน้ำอเนกประสงค์',
    price: 890,
    stock: 15,
    description: 'กระเป๋าเป้ใบใหญ่ มีช่องใส่โน้ตบุ๊ก ซิปกันขโมย ผิวกันละอองน้ำ',
  },
];

const DEFAULT_KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'k1',
    question: 'ค่าจัดส่งราคาเท่าไหร่ และจัดส่งช่องทางไหนบ้าง?',
    answer: 'ร้านเราจัดส่งฟรีทั่วประเทศแบบด่วนพิเศษ (EMS / Flash Express) เมื่อซื้อสินค้าครบ 500 บาทขึ้นไป หากยอดสั่งซื้อไม่ถึง 500 บาท จะมีค่าบริการจัดส่งเหมาจ่าย 50 บาทครับ',
    keywords: ['ส่งฟรี', 'ค่าส่ง', 'ค่าจัดส่ง', 'ค่าบริการ', 'ส่งยังไง', 'ขนส่ง'],
  },
  {
    id: 'k2',
    question: 'ใช้เวลาจัดส่งกี่วัน ของจะถึงเมื่อไหร่?',
    answer: 'กรุงเทพฯ และปริมณฑล ได้รับสินค้าใน 1-2 วันทำการครับ ต่างจังหวัดได้รับใน 2-3 วันทำการครับ (ไม่รวมวันอาทิตย์และวันหยุดนักขัตฤกษ์) ทางเราจะจัดส่งสินค้าในวันถัดไปหลังจากได้รับยอดโอนครับ',
    keywords: ['กี่วัน', 'ถึงเมื่อไหร่', 'ระยะเวลา', 'ส่งวันไหน', 'ส่งยัง', 'วันไหนถึง'],
  },
  {
    id: 'k3',
    question: 'มีช่องทางการชำระเงินใดบ้าง และชำระเงินอย่างไร?',
    answer: 'คุณลูกค้าสามารถชำระเงินผ่านการโอนบัญชีธนาคารได้ครับ:\nธนาคารกสิกรไทย (KBank)\nเลขบัญชี: 123-4-56789-0\nชื่อบัญชี: บจก. แฮปปี้ช็อปปิ้ง (Happy Shop)\nเมื่อโอนแล้วรบกวนแจ้งสลิปในแชทนี้ได้เลยครับ',
    keywords: ['ชำระเงิน', 'โอน', 'เลขบัญชี', 'ธนาคาร', 'จ่ายเงิน', 'บัญชี', 'ราคาเท่าไหร่', 'ราคา'],
  },
  {
    id: 'k4',
    question: 'สินค้ารับประกันอย่างไร หรือเปลี่ยนคืนได้ไหม?',
    answer: 'สินค้ามีการรับประกันความพึงพอใจภายใน 7 วันหลังได้รับสินค้าครับ หากพบสินค้าชำรุด เสียหาย หรือได้ไซส์ไม่ถูกต้อง สามารถติดต่อขอเปลี่ยนสินค้าใหม่ได้ฟรีทันทีโดยไม่มีค่าใช้จ่ายครับ',
    keywords: ['รับประกัน', 'ประกัน', 'คืนเงิน', 'เปลี่ยนสินค้า', 'ชำรุด', 'เปลี่ยนไซส์', 'พัง'],
  },
];

const DEFAULT_CHATS: ChatThread[] = [
  {
    id: 'sender_somchai',
    customerName: 'สมชาย ใจดี',
    customerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
    lastMessage: 'ขอเลขบัญชีโอนเงินหน่อยครับ',
    unread: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    messages: [
      {
        id: 'msg_1',
        sender: 'customer',
        text: 'สวัสดีครับ สนใจกระบอกน้ำเก็บอุณหภูมิ BOT-003 ครับ มีของไหมครับ',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: 'msg_2',
        sender: 'admin',
        text: 'สวัสดีค่ะคุณสมชาย กระบอกน้ำ BOT-003 มีสินค้าพร้อมส่งเลยค่ะ มีทั้งหมด 3 สีนะคะ ดำ ขาว และน้ำเงินค่ะ คุณลูกค้าสนใจรับสีไหนดีคะ?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.8).toISOString(),
      },
      {
        id: 'msg_3',
        sender: 'customer',
        text: 'รับสีดำ 1 ชิ้นครับ ขอเลขบัญชีโอนเงินหน่อยครับ',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      }
    ]
  },
  {
    id: 'sender_anong',
    customerName: 'อนงค์ รักเรียน',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    lastMessage: 'ส่งของให้พรุ่งนี้เลยไหมคะ?',
    unread: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    messages: [
      {
        id: 'msg_anong_1',
        sender: 'customer',
        text: 'สอบถามเรื่องการจัดส่งค่ะ ส่งฟรีไหมคะ?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      },
      {
        id: 'msg_anong_2',
        sender: 'ai',
        text: 'ร้านเราจัดส่งฟรีทั่วประเทศแบบด่วนพิเศษ เมื่อซื้อสินค้าครบ 500 บาทขึ้นไปค่ะ หากยอดสั่งซื้อไม่ถึง 500 บาท จะมีค่าบริการจัดส่งเหมาจ่าย 50 บาทนะคะ',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.9).toISOString(),
      },
      {
        id: 'msg_anong_3',
        sender: 'customer',
        text: 'งั้นรับหมวก CAP-001 ราคา 250 บาท 2 ใบค่ะ รวมเป็น 500 ได้ส่งฟรีพอดี',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.2).toISOString(),
      },
      {
        id: 'msg_anong_4',
        sender: 'admin',
        text: 'ได้รับยอดเรียบร้อยแล้วนะคะ ระบบทำการลงทะเบียนให้แล้วเรียบร้อยค่ะ',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.1).toISOString(),
      },
      {
        id: 'msg_anong_5',
        sender: 'customer',
        text: 'ส่งของให้พรุ่งนี้เลยไหมคะ?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      }
    ]
  }
];

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord_anong_1',
    customerId: 'sender_anong',
    customerName: 'อนงค์ รักเรียน',
    items: [
      {
        productId: 'p1',
        code: 'CAP-001',
        name: 'หมวกแฟชั่นมินิมอลเกาหลี',
        price: 250,
        qty: 2,
      }
    ],
    total: 500,
    status: 'processing',
    address: {
      name: 'อนงค์ รักเรียน',
      phone: '0898765432',
      fullAddress: '123/45 ซอยพหลโยธิน 24 ถ.พหลโยธิน',
      subdistrict: 'จอมพล',
      district: 'จตุจักร',
      province: 'กรุงเทพมหานคร',
      zipcode: '10900',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
  }
];

export class Database {
  private data!: DatabaseSchema;

  constructor() {
    this.ensureDirectoryExists();
    this.load();
  }

  private ensureDirectoryExists() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Ensure schemas match newly added items
        if (!this.data.settings) this.data.settings = DEFAULT_SETTINGS;
        if (!this.data.threads) this.data.threads = DEFAULT_CHATS;
        if (!this.data.knowledgeBase) this.data.knowledgeBase = DEFAULT_KNOWLEDGE_BASE;
        if (!this.data.products) this.data.products = DEFAULT_PRODUCTS;
        if (!this.data.orders) this.data.orders = DEFAULT_ORDERS;
      } else {
        this.data = {
          settings: DEFAULT_SETTINGS,
          threads: DEFAULT_CHATS,
          knowledgeBase: DEFAULT_KNOWLEDGE_BASE,
          products: DEFAULT_PRODUCTS,
          orders: DEFAULT_ORDERS,
        };
        this.save();
      }
    } catch (error) {
      console.error('Error loading DB, creating default.', error);
      this.data = {
        settings: DEFAULT_SETTINGS,
        threads: DEFAULT_CHATS,
        knowledgeBase: DEFAULT_KNOWLEDGE_BASE,
        products: DEFAULT_PRODUCTS,
        orders: DEFAULT_ORDERS,
      };
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing to DB file', error);
    }
  }

  // Settings
  getSettings(): Settings {
    return this.data.settings;
  }

  updateSettings(settings: Partial<Settings>): Settings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }

  // Chats
  getThreads(): ChatThread[] {
    return this.data.threads;
  }

  getThread(id: string): ChatThread | undefined {
    return this.data.threads.find(t => t.id === id);
  }

  createThread(customerName: string, customerId?: string, customerAvatar?: string): ChatThread {
    const id = customerId || `sender_${Math.random().toString(36).substr(2, 9)}`;
    const avatar = customerAvatar || `https://images.unsplash.com/photo-${['1535713875002-d1d0cf377fde', '1494790108377-be9c29b29330', '1570295999919-56ceb5ecca61', '1438761681033-6461ffad8d80'][Math.floor(Math.random() * 4)]}?auto=format&fit=crop&w=150&h=150&q=80`;
    
    const existingThread = this.getThread(id);
    if (existingThread) return existingThread;

    const newThread: ChatThread = {
      id,
      customerName,
      customerAvatar: avatar,
      lastMessage: '',
      unread: false,
      messages: [],
      updatedAt: new Date().toISOString()
    };
    this.data.threads.push(newThread);
    this.save();
    return newThread;
  }

  addMessage(threadId: string, sender: 'customer' | 'admin' | 'ai', text: string): ChatMessage {
    let thread = this.getThread(threadId);
    if (!thread) {
      // Auto create thread if not exist
      thread = this.createThread(threadId.startsWith('sender_') ? threadId.replace('sender_', 'ลูกค้าใหม่ ') : threadId, threadId);
    }

    const newMessage: ChatMessage = {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
    };

    thread.messages.push(newMessage);
    thread.lastMessage = text;
    thread.updatedAt = newMessage.timestamp;
    
    if (sender === 'customer') {
      thread.unread = true;
    } else {
      thread.unread = false;
    }

    // Sort threads so most recently updated is first
    this.data.threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    this.save();
    return newMessage;
  }

  markAsRead(threadId: string) {
    const thread = this.getThread(threadId);
    if (thread?.unread) {
      thread.unread = false;
      this.save();
    }
  }

  clearChat(threadId: string) {
    const thread = this.getThread(threadId);
    if (thread) {
      thread.messages = [];
      thread.lastMessage = 'ประวัติการแชทถูกล้างแล้ว';
      this.save();
    }
  }

  // KnowledgeBase
  getKnowledgeBase(): KnowledgeItem[] {
    return this.data.knowledgeBase;
  }

  addKnowledgeItem(item: Omit<KnowledgeItem, 'id'>): KnowledgeItem {
    const newItem: KnowledgeItem = {
      id: `k_${Math.random().toString(36).substr(2, 9)}`,
      ...item,
    };
    this.data.knowledgeBase.push(newItem);
    this.save();
    return newItem;
  }

  updateKnowledgeItem(id: string, updated: Partial<KnowledgeItem>): KnowledgeItem | undefined {
    const index = this.data.knowledgeBase.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data.knowledgeBase[index] = { ...this.data.knowledgeBase[index], ...updated };
      this.save();
      return this.data.knowledgeBase[index];
    }
    return undefined;
  }

  deleteKnowledgeItem(id: string): boolean {
    const originalLength = this.data.knowledgeBase.length;
    this.data.knowledgeBase = this.data.knowledgeBase.filter(item => item.id !== id);
    if (this.data.knowledgeBase.length < originalLength) {
      this.save();
      return true;
    }
    return false;
  }

  // Products
  getProducts(): Product[] {
    return this.data.products;
  }

  addProduct(product: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      id: `p_${Math.random().toString(36).substr(2, 9)}`,
      ...product,
    };
    this.data.products.push(newProduct);
    this.save();
    return newProduct;
  }

  updateProduct(id: string, updated: Partial<Product>): Product | undefined {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.products[index] = { ...this.data.products[index], ...updated };
      this.save();
      return this.data.products[index];
    }
    return undefined;
  }

  deleteProduct(id: string): boolean {
    const originalLength = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.id !== id);
    if (this.data.products.length < originalLength) {
      this.save();
      return true;
    }
    return false;
  }

  // Orders
  getOrders(): Order[] {
    return this.data.orders;
  }

  addOrder(order: Omit<Order, 'id' | 'createdAt'>): Order {
    const newOrder: Order = {
      id: `ord_${Math.random().toString(36).substr(2, 9)}`,
      ...order,
      createdAt: new Date().toISOString(),
    };
    this.data.orders.push(newOrder);
    this.save();
    return newOrder;
  }

  updateOrder(id: string, updated: Partial<Order>): Order | undefined {
    const index = this.data.orders.findIndex(o => o.id === id);
    if (index !== -1) {
      this.data.orders[index] = { ...this.data.orders[index], ...updated };
      this.save();
      return this.data.orders[index];
    }
    return undefined;
  }

  deleteOrder(id: string): boolean {
    const originalLength = this.data.orders.length;
    this.data.orders = this.data.orders.filter(o => o.id !== id);
    if (this.data.orders.length < originalLength) {
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new Database();
