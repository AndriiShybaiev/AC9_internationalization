import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { Unsubscribe } from "firebase/database";

import type { MenuItem, CartItem } from "../entities/entities";
import ordersService, { type Order } from "../services/ordersService";
import logger from "../services/logging";

export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

export interface FoodState {
    // UI
    isChooseFoodPage: boolean;
    selectedFood?: MenuItem;

    // Data
    menuItems: MenuItem[];
    cartItems: CartItem[];

    // Firebase orders
    orders: Order[];
    ordersStatus: AsyncStatus;

    ordersLoading: boolean;
    ordersError: string | null;

    // Retroalimentación
    statusMessage?: string;

    ordersUnsubscribe?: Unsubscribe;
}

const initialState: FoodState = {
    isChooseFoodPage: false,
    selectedFood: undefined,

    menuItems: [
        {
            id: 1,
            name: "Hamburguesa de Pollo",
            quantity: 40,
            desc: "Hamburguesa de pollo frito - ... y mayones",
            price: 24,
            image: "cb.jpg",
        },
        {
            id: 2,
            name: "Hamburguesa de Carne",
            quantity: 20,
            desc: "Hamburguesa de carne con queso y tomate",
            price: 30,
            image: "vb.jpg",
        },
        {
            id: 3,
            name: "Helado",
            quantity: 30,
            desc: "Cono de helado",
            price: 28,
            image: "ic.jpg",
        },
        {
            id: 4,
            name: "Patatas fritas",
            quantity: 100,
            desc: "Patatas fritas con salsa verde",
            price: 123,
            image: "chips.jpg",
        },
    ],

    cartItems: [],

    orders: [],
    ordersStatus: "idle",
    ordersLoading: true,
    ordersError: null,

    statusMessage: undefined,
    ordersUnsubscribe: undefined,
};

export const startOrdersSubscription = createAsyncThunk<void, void, { rejectValue: string }>(
    "food/startOrdersSubscription",
    async (_arg, thunkApi) => {
        try {
            logger.debug("Orders: subscribe start (thunk)");

            const unsub = ordersService.subscribe(
                (orders) => {
                    thunkApi.dispatch(ordersReceived(orders));
                },
                (e) => {
                    thunkApi.dispatch(ordersFailed(String(e)));
                }
            );

            thunkApi.dispatch(ordersSubscriptionStarted(unsub));
        } catch (e) {
            return thunkApi.rejectWithValue(String(e));
        }
    }
);

export const stopOrdersSubscription = createAsyncThunk<void, void>(
    "food/stopOrdersSubscription",
    async (_arg, thunkApi) => {
        const state = thunkApi.getState() as any;
        const unsub: Unsubscribe | undefined = state.food?.ordersUnsubscribe;

        if (unsub) unsub();
        thunkApi.dispatch(ordersSubscriptionStopped());
    }
);

export const markOrderPaid = createAsyncThunk<void, { id: string }, { rejectValue: string }>(
    "food/markOrderPaid",
    async ({ id }, thunkApi) => {
        try {
            await ordersService.patch(id, { status: "PAID" });
        } catch (e) {
            return thunkApi.rejectWithValue(String(e));
        }
    }
);

export const deleteOrder = createAsyncThunk<void, { id: string }, { rejectValue: string }>(
    "food/deleteOrder",
    async ({ id }, thunkApi) => {
        try {
            await ordersService.deleteById(id);
        } catch (e) {
            return thunkApi.rejectWithValue(String(e));
        }
    }
);

function computeCartTotal(items: CartItem[]): number {
    return items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

const foodSlice = createSlice({
    name: "food",
    initialState,
    reducers: {
        togglePage(state) {
            state.isChooseFoodPage = !state.isChooseFoodPage;
            state.selectedFood = undefined;
            state.statusMessage = undefined;
        },

        selectFood(state, action: PayloadAction<MenuItem | undefined>) {
            state.selectedFood = action.payload;
        },

        orderFood(state, action: PayloadAction<{ food: MenuItem; quantity: number }>) {
            const { food, quantity } = action.payload;

            if (!Number.isFinite(quantity) || quantity <= 0) return;

            const menuItem = state.menuItems.find((m) => m.id === food.id);
            if (!menuItem) return;

            if (quantity > menuItem.quantity) return;

            menuItem.quantity = Math.max(0, menuItem.quantity - quantity);

            const existing = state.cartItems.find((c) => c.id === food.id);
            if (existing) existing.quantity += quantity;
            else state.cartItems.push({ id: food.id, name: food.name, price: food.price, quantity });

            state.statusMessage = `Added to cart: ${food.name} x${quantity}. Cart total=${computeCartTotal(
                state.cartItems
            )}$`;
        },

        removeFromCart(state, action: PayloadAction<{ id: number }>) {
            const id = action.payload.id;

            const removed = state.cartItems.find((c) => c.id === id);
            if (!removed) return;

            const menuItem = state.menuItems.find((m) => m.id === id);
            if (menuItem) menuItem.quantity += removed.quantity;

            state.cartItems = state.cartItems.filter((c) => c.id !== id);
            state.statusMessage = `Removed from cart: id=${id}`;
        },

        ordersSubscriptionStarted(state, action: PayloadAction<Unsubscribe>) {
            if (state.ordersUnsubscribe) state.ordersUnsubscribe();

            state.ordersUnsubscribe = action.payload;
            state.ordersStatus = "succeeded";
            state.ordersLoading = false;
            state.ordersError = null;
            state.statusMessage = "Orders subscription started.";
        },

        ordersSubscriptionStopped(state) {
            if (state.ordersUnsubscribe) state.ordersUnsubscribe();

            state.ordersUnsubscribe = undefined;
            state.ordersStatus = "idle";
            state.ordersLoading = false;
            state.statusMessage = "Orders subscription stopped.";
        },

        ordersReceived(state, action: PayloadAction<Order[]>) {
            state.orders = action.payload;
            state.ordersStatus = "succeeded";
            state.ordersLoading = false;
            state.ordersError = null;
            state.statusMessage = `Orders updated: ${action.payload.length}`;
        },

        ordersFailed(state, action: PayloadAction<string>) {
            state.ordersStatus = "failed";
            state.ordersLoading = false;
            state.ordersError = action.payload;
            state.statusMessage = "Error loading orders.";
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(startOrdersSubscription.pending, (state) => {
                state.ordersStatus = "loading";
                state.ordersLoading = true;
                state.ordersError = null;
                state.statusMessage = "Subscribing to orders...";
            })
            .addCase(startOrdersSubscription.rejected, (state, action) => {
                state.ordersStatus = "failed";
                state.ordersLoading = false;
                state.ordersError = action.payload ?? action.error.message ?? "Unknown error";
                state.statusMessage = "Failed to subscribe to orders.";
            })
            .addCase(markOrderPaid.pending, (state) => {
                state.statusMessage = "Marking order as PAID...";
            })
            .addCase(markOrderPaid.rejected, (state, action) => {
                state.statusMessage = `Failed to mark paid: ${action.payload ?? action.error.message}`;
            })
            .addCase(deleteOrder.pending, (state) => {
                state.statusMessage = "Deleting order...";
            })
            .addCase(deleteOrder.rejected, (state, action) => {
                state.statusMessage = `Failed to delete: ${action.payload ?? action.error.message}`;
            });
    },
});

export const {
    togglePage,
    selectFood,
    orderFood,
    removeFromCart,
    ordersReceived,
    ordersFailed,
    ordersSubscriptionStarted,
    ordersSubscriptionStopped,
} = foodSlice.actions;

export default foodSlice.reducer;
