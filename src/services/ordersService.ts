import { ref, push, onValue, update, remove, type Unsubscribe, get } from "firebase/database";
import { db } from "../firebaseConfig";
import logger from "./logging";
import type { CartItem } from "../entities/entities";

export type OrderStatus = "CREATED" | "PAID" | "CANCELLED";

export interface Order {
    id: string;        // Firebase key
    createdAt: number; // Date.now()
    status: OrderStatus;
    items: CartItem[];
    total: number;
    notes?: string;
}

const ORDERS_PATH = "orders";

type OrderDbModel = Omit<Order, "id">;

function computeTotal(items: CartItem[]): number {
    return items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

function normalizeOrder(id: string, value: Partial<OrderDbModel> | undefined): Order {
    const items = Array.isArray(value?.items) ? (value!.items as CartItem[]) : [];
    const createdAt = typeof value?.createdAt === "number" ? value.createdAt : Date.now();
    const status = (value?.status ?? "CREATED") as OrderStatus;

    const total =
        typeof value?.total === "number" && Number.isFinite(value.total)
            ? value.total
            : computeTotal(items);

    return {
        id,
        createdAt,
        status,
        items,
        total,
        notes: value?.notes ?? "",
    };
}

export type CreateOrderInput = {
    createdAt?: number;
    status?: OrderStatus;
    items: CartItem[];
    notes?: string;
};

async function create(order: CreateOrderInput): Promise<string> {
    const ordersRef = ref(db, ORDERS_PATH);

    const payload: OrderDbModel = {
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

function subscribe(
    onOrders: (orders: Order[]) => void,
    onError?: (e: unknown) => void
): Unsubscribe {
    const ordersRef = ref(db, ORDERS_PATH);

    return onValue(
        ordersRef,
        (snapshot) => {
            const data = snapshot.val() as Record<string, Partial<OrderDbModel>> | null;

            const orders = data
                ? Object.entries(data).map(([id, value]) => normalizeOrder(id, value))
                : [];

            onOrders(orders);
        },
        (error) => {
            logger.error(`Order subscribe error: ${String(error)}`);
            onError?.(error);
        }
    );
}

async function listOnce(): Promise<Order[]> {
    const ordersRef = ref(db, ORDERS_PATH);
    const snap = await get(ordersRef);
    const data = snap.val() as Record<string, Partial<OrderDbModel>> | null;

    return data ? Object.entries(data).map(([id, value]) => normalizeOrder(id, value)) : [];
}

async function patch(id: string, partial: Partial<OrderDbModel>): Promise<void> {
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
    listOnce,   // опционально
    patch,
    deleteById,
};

export default orderService;
