import { ref, push, onValue, update, remove, type Unsubscribe } from "firebase/database";
import { db } from "../firebaseConfig";
import logger from "./logging";
import type { CartItem } from "../entities/entities";

export type OrderStatus = "CREATED" | "PAID" | "CANCELLED";

export interface Order {
    id: string;          // Firebase key
    createdAt: number;   // Date.now()
    status: OrderStatus;
    items: CartItem[];
    total: number;
    notes?: string;
}

const ORDERS_PATH = "orders";

function computeTotal(items: CartItem[]): number {
    return items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

export type CreateOrderInput = {
    createdAt?: number;
    status?: OrderStatus;
    items: CartItem[];
    notes?: string;
};

async function create(order: CreateOrderInput): Promise<string> {
    const ordersRef = ref(db, ORDERS_PATH);

    const payload = {
        createdAt: order.createdAt ?? Date.now(),
        status: order.status ?? "CREATED",
        items: order.items ?? [],
        total: computeTotal(order.items ?? []),
        notes: order.notes ?? "",
    };

    const newRef = await push(ordersRef, payload);
    const id = newRef.key;
    if (!id) throw new Error("Firebase did not return a key for the new order");

    logger.info(`Order created: ${id}`);
    return id;
}

function subscribe(onOrders: (orders: Order[]) => void, onError?: (e: unknown) => void): Unsubscribe {
    const ordersRef = ref(db, ORDERS_PATH);

    return onValue(
        ordersRef,
        (snapshot) => {
            const data = snapshot.val() as Record<string, Omit<Order, "id">> | null;

            const orders: Order[] = data
                ? Object.entries(data).map(([id, value]) => ({
                    id,
                    createdAt: value.createdAt ?? Date.now(),
                    status: value.status ?? "CREATED",
                    items: Array.isArray(value.items) ? (value.items as CartItem[]) : [],
                    total: Number.isFinite(value.total)
                        ? value.total
                        : computeTotal(Array.isArray(value.items) ? (value.items as CartItem[]) : []),
                    notes: value.notes,
                }))
                : [];

            onOrders(orders);
        },
        (error) => {
            logger.error(`Order subscribe error: ${String(error)}`);
            onError?.(error);
        }
    );
}

async function patch(id: string, partial: Partial<Omit<Order, "id">>): Promise<void> {
    const orderRef = ref(db, `${ORDERS_PATH}/${id}`);
    await update(orderRef, partial);
    logger.info(`Order updated: ${id}`);
}

async function deleteById(id: string): Promise<void> {
    const orderRef = ref(db, `${ORDERS_PATH}/${id}`);
    await remove(orderRef);
    logger.warn(`Order deleted: ${id}`);
}

async function createFromCart(cartItems: CartItem[], notes?: string): Promise<string> {
    return create({ items: cartItems, notes, status: "CREATED" });
}

const orderService = {
    create,
    createFromCart,
    subscribe,
    patch,
    deleteById,
};

export default orderService;
