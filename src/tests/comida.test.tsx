/** @vitest-environment jsdom */
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import foodReducer from "../store/foodSlice";
import { LanguageContext } from "../contexts/LanguageContext";
import esMessages from "../lang/es.json";
import enMessages from "../lang/en.json";
import { IntlProvider } from "react-intl";
import React from "react";

// Mock AuthService to provide a logged-in admin user
vi.mock("../services/AuthService", () => ({
    default: {
        onAuthStateChanged: (callback: any) => {
            // Simulate immediate auth
            callback({ uid: "test-uid", email: "admin@email.com" });
            return () => {};
        },
        getUserRoles: async () => ["ADMIN"],
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getCurrentUser: () => ({ uid: "test-uid", email: "admin@email.com" }),
    },
}));

// Mock ordersService to avoid Firebase calls and provide some data
vi.mock("../services/ordersService", () => ({
    default: {
        subscribe: vi.fn((onNext) => {
            onNext([]); // Start with no orders
            return () => {};
        }),
        create: vi.fn().mockResolvedValue("mock-order-id"),
        patch: vi.fn().mockResolvedValue(undefined),
        deleteById: vi.fn().mockResolvedValue(undefined),
    },
}));

function createTestStore() {
    return configureStore({
        reducer: {
            food: foodReducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false,
            }),
    });
}

const TestWrapper: React.FC<{ children: React.ReactNode; locale?: string; store: any }> = ({ children, locale = "es", store }) => {
    const messages = locale === 'es' ? esMessages : enMessages;
    return (
        <Provider store={store}>
            <IntlProvider locale={locale} messages={messages}>
                <LanguageContext.Provider value={{ locale, messages, changeLanguage: () => {} }}>
                    {children}
                </LanguageContext.Provider>
            </IntlProvider>
        </Provider>
    );
};

describe("AC5.4 - Comida rápida", () => {
    let testStore: any;

    beforeEach(() => {
        testStore = createTestStore();
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("Muestra 4 productos en el panel de control", async () => {
        const user = userEvent.setup();
        render(<TestWrapper store={testStore}><App /></TestWrapper>);

        // Navegar a Panel de control
        const dashboardLinks = await screen.findAllByRole("link", { name: /Panel de control/i });
        await user.click(dashboardLinks[0]);
        
        // Кликнуть "Pedir Comida"
        const orderFoodBtn = await screen.findByRole("button", { name: /Pedir Comida/i });
        await user.click(orderFoodBtn);

        // 4 имени
        expect(await screen.findByText("Hamburguesa de Pollo")).toBeTruthy();
        expect(screen.getByText("Hamburguesa de Carne")).toBeTruthy();
        expect(screen.getByText("Helado")).toBeTruthy();
        expect(screen.getByText("Patatas fritas")).toBeTruthy();
    });

    it("В испанской локали цены отображаются с €", async () => {
        const user = userEvent.setup();
        render(<TestWrapper store={testStore} locale="es"><App /></TestWrapper>);

        const dashboardLinks = await screen.findAllByRole("link", { name: /Panel de control/i });
        await user.click(dashboardLinks[0]);
        
        const orderFoodBtn = await screen.findByRole("button", { name: /Pedir Comida/i });
        await user.click(orderFoodBtn);

        expect(await screen.findByText(/24.*€/)).toBeTruthy();
    });

    it("В английской локали цены отображаются с $", async () => {
        const user = userEvent.setup();
        render(<TestWrapper store={testStore} locale="en"><App /></TestWrapper>);

        const dashboardLinks = await screen.findAllByRole("link", { name: /Dashboard/i });
        await user.click(dashboardLinks[0]);
        
        const orderFoodBtn = await screen.findByRole("button", { name: /Order Food/i });
        await user.click(orderFoodBtn);

        expect(await screen.findByText(/\$24/)).toBeTruthy();
    });

    it("En la compra se actualiza correctamente el precio", async () => {
        const user = userEvent.setup();
        render(<TestWrapper store={testStore}><App /></TestWrapper>);

        const dashboardLinks = await screen.findAllByRole("link", { name: /Panel de control/i });
        await user.click(dashboardLinks[0]);
        
        const orderFoodBtn = await screen.findByRole("button", { name: /Pedir Comida/i });
        await user.click(orderFoodBtn);
        
        const pedirButtons = await screen.findAllByRole("button", { name: "Pedir" });
        await user.click(pedirButtons[0]);

        expect(await screen.findByText("Pedido")).toBeTruthy();

        const getPriceValue = () => {
            const priceLabel = screen.getByText(/Precio:/i);
            return priceLabel.parentElement?.textContent ?? "";
        };

        await waitFor(() => {
            expect(getPriceValue()).toMatch(/24/);
        });

        const qtyInput = screen.getByRole("spinbutton");
        fireEvent.change(qtyInput, { target: { value: "3" } });

        await waitFor(() => {
            const val = getPriceValue();
            // console.log("Price value:", val);
            expect(val).toMatch(/72/);
            expect(val).toMatch(/€/);
        }, { timeout: 2000 });
    });
});
