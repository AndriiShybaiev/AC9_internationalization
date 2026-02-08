import "./App.css";

import { lazy, Suspense, createContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import type { MenuItem } from "./entities/entities";
import type { RootState, AppDispatch } from "./store/store";

import FoodOrder from "./components/FoodOrder";
import ErrorBoundary from "./components/ErrorBoundary";
import logger from "./services/logging";

import {
  togglePage,
  selectFood,
  orderFood as orderFoodAction,
  removeFromCart,
  startOrdersSubscription,
  stopOrdersSubscription,
  markOrderPaid,
  deleteOrder,
} from "./store/foodSlice";

// AC 5.1 - Carga Diferida (Lazy) para Foods
const Foods = lazy(() => import("./components/Foods"));

export interface FoodAppContextType {
  orderFood: (food: MenuItem, quantity: number) => void;
}

export const foodAppContext = createContext<FoodAppContextType | null>(null);

function App() {
  const dispatch = useDispatch<AppDispatch>();

  const isChooseFoodPage = useSelector((s: RootState) => s.food.isChooseFoodPage);
  const menuItems = useSelector((s: RootState) => s.food.menuItems);
  const selectedFood = useSelector((s: RootState) => s.food.selectedFood);

  const cartItems = useSelector((s: RootState) => s.food.cartItems);
  const cartTotal = cartItems.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const orders = useSelector((s: RootState) => s.food.orders);
  const ordersLoading = useSelector((s: RootState) => s.food.ordersLoading);
  const ordersError = useSelector((s: RootState) => s.food.ordersError);

  const statusMessage = useSelector((s: RootState) => s.food.statusMessage);

  useEffect(() => {
    dispatch(startOrdersSubscription());

    return () => {
      dispatch(stopOrdersSubscription());
    };
  }, [dispatch]);

  const orderFood: FoodAppContextType["orderFood"] = (food, quantity) => {
    dispatch(orderFoodAction({ food, quantity }));
  };

  return (
      <ErrorBoundary fallback={<div>Algo salió mal!</div>}>
        <foodAppContext.Provider value={{ orderFood }}>
          <div className="App">
            <button
                className="toggleButton"
                onClick={() => {
                  logger.info(`UI: toggle page; current=${isChooseFoodPage ? "ORDER" : "STOCK"}`);
                  dispatch(togglePage());
                }}
            >
              {isChooseFoodPage ? "Disponibilidad" : "Pedir Comida"}
            </button>

            <h3 className="title">Comida Rapida Online</h3>

            {statusMessage && <p className="statusMessage">{statusMessage}</p>}

            {!isChooseFoodPage && (
                <>
                  <h4 className="subTitle">Menús</h4>
                  <ul className="ulApp">
                    {menuItems.map((item) => (
                        <li key={item.id} className="liApp">
                          <p>{item.name}</p>
                          <p>#{item.quantity}</p>
                        </li>
                    ))}
                  </ul>
                </>
            )}

            {isChooseFoodPage && (
                <>
                  {selectedFood === undefined ? (
                      <Suspense fallback={<div>Cargando detalles ......</div>}>
                        <Foods
                            foodItems={menuItems}
                            onFoodSelected={(food) => {
                              logger.info(`UI: food selected; id=${food.id}, name=${food.name}`);
                              dispatch(selectFood(food));
                            }}
                        />
                      </Suspense>
                  ) : (
                      <FoodOrder
                          food={selectedFood}
                          onReturnToMenu={() => {
                            logger.debug("UI: return to menu");
                            dispatch(selectFood(undefined));
                          }}
                      />
                  )}
                </>
            )}

            {/* --- carrito UI --- */}
            <div className="cartBox">
              <h4 className="subTitle">Carrito</h4>

              {cartItems.length === 0 ? (
                  <p className="cartEmpty">Carrito vacío</p>
              ) : (
                  <>
                    <ul className="ulCart">
                      {cartItems.map((c) => (
                          <li key={c.id} className="liCart">
                      <span>
                        {c.name} x{c.quantity}
                      </span>
                            <span>{c.price * c.quantity}$</span>
                            <button onClick={() => dispatch(removeFromCart({ id: c.id }))}>Quitar</button>
                          </li>
                      ))}
                    </ul>

                    <p className="cartTotal">Total: {cartTotal}$</p>
                  </>
              )}
            </div>

            {/* --- pedidos UI (Firebase) --- */}
            <div className="ordersBox">
              <h4 className="subTitle">Pedidos (Firebase)</h4>

              {ordersLoading && <p>Cargando pedidos...</p>}
              {ordersError && <p>Error cargando pedidos: {ordersError}</p>}
              {!ordersLoading && !ordersError && orders.length === 0 && <p>No hay pedidos.</p>}

              {!ordersLoading && !ordersError && orders.length > 0 && (
                  <ul className="ulOrders">
                    {orders.map((o) => (
                        <li key={o.id} className="liOrders">
                    <span>
                      #{o.id} — {o.status} — {o.total}$
                    </span>

                          <button onClick={() => dispatch(markOrderPaid({ id: o.id }))}>
                            Marcar pagado
                          </button>

                          <button onClick={() => dispatch(deleteOrder({ id: o.id }))}>Borrar</button>
                        </li>
                    ))}
                  </ul>
              )}
            </div>
          </div>
        </foodAppContext.Provider>
      </ErrorBoundary>
  );
}

export default App;
