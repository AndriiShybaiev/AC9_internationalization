import { configureStore } from "@reduxjs/toolkit";
import type { Middleware } from "@reduxjs/toolkit";

import foodReducer from "./foodSlice";
import logger from "../services/logging";

const loggerMiddleware: Middleware = (storeAPI) => (next) => (action) => {
    logger.debug(`[redux] action: ${String((action as any)?.type)}`);
    const result = next(action);
    logger.debug(`[redux] state: ${JSON.stringify(storeAPI.getState())}`);
    return result;
};

export const store = configureStore({
    reducer: {
        food: foodReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }).concat(loggerMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
