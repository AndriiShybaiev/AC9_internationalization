import React, {
  lazy,
  Suspense,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode, type JSX,
} from "react";

import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";

import type { MenuItem } from "./entities/entities";
import type { RootState, AppDispatch } from "./store/store";

import FoodOrder from "./components/FoodOrder";
import ErrorBoundary from "./components/ErrorBoundary";
import logger from "./services/logging";

import { AuthProvider, AuthContext } from "./contexts/AuthContext";
import { LanguageContext } from "./contexts/LanguageContext";
import { FormattedMessage } from "react-intl";
import authService from "./services/AuthService";
import { Role } from "./services/IAuthService";
import userService from "./services/UserService";


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

import AdminUsers from "./components/AdminUsers";


// AC 5.1 - Carga Diferida (Lazy) para Foods
const Foods = lazy(() => import("./components/Foods"));

export interface FoodAppContextType {
  orderFood: (food: MenuItem, quantity: number) => void;
}

export const foodAppContext = createContext<FoodAppContextType | null>(null);

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, roles } = useContext(AuthContext);

  // AC 8.1 Access only if user != null and roles include ADMIN
  if (!user || !roles || !roles.includes(Role.ADMIN)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const Navbar: React.FC = () => {
  const { user, roles } = useContext(AuthContext);
  const { changeLanguage, locale } = useContext(LanguageContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  return (
      <nav className="bg-slate-900 p-4 shadow-lg flex justify-between items-center">
        <ul className="flex space-x-6 items-center">
          <li>
            <Link to="/" className="text-slate-100 hover:text-blue-400 transition font-medium">
              <FormattedMessage id="nav.home" />
            </Link>
          </li>

          {user && (
              <li>
                <Link to="/dashboard" className="text-slate-100 hover:text-blue-400 transition font-medium">
                  <FormattedMessage id="nav.dashboard" />
                </Link>
              </li>
          )}

          {user && roles && roles.includes(Role.ADMIN) && (
              <li>
                <Link to="/admin" className="text-slate-100 hover:text-blue-400 transition font-medium">
                  <FormattedMessage id="nav.admin" />
                </Link>
              </li>
          )}

          {!user && (
              <li>
                <Link to="/login" className="text-slate-100 hover:text-blue-400 transition font-medium">
                  <FormattedMessage id="nav.login" />
                </Link>
              </li>
          )}

          {!user && (
              <li>
                <Link to="/register" className="text-slate-100 hover:text-blue-400 transition font-medium">
                  <FormattedMessage id="nav.register" />
                </Link>
              </li>
          )}

          {user && (
              <li>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600 transition font-bold shadow-sm"
                >
                  <FormattedMessage id="nav.logout" />
                </button>
              </li>
          )}
        </ul>

        <div className="flex items-center space-x-3 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
            <button
                onClick={() => changeLanguage('es')}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 transform hover:scale-110 focus:outline-none ${
                    locale === 'es' 
                    ? 'bg-slate-700 shadow-inner ring-1 ring-blue-400/50' 
                    : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'
                }`}
                title="Español"
            >
                <span className="text-2xl leading-none">🇪🇸</span>
            </button>
            <button
                onClick={() => changeLanguage('en')}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 transform hover:scale-110 focus:outline-none ${
                    locale === 'en' 
                    ? 'bg-slate-700 shadow-inner ring-1 ring-blue-400/50' 
                    : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'
                }`}
                title="English"
            >
                <span className="text-2xl leading-none">🇺🇸</span>
            </button>
        </div>
      </nav>
  );
};

const Home: React.FC = () => {
  const { user, roles } = useContext(AuthContext);

  return (
      <div className="container mx-auto p-4">
        <h3 className="text-2xl font-bold mb-4">
          <FormattedMessage id="home.welcome" />
        </h3>

        {!user && (
            <p className="mb-4">
              <FormattedMessage id="home.notLoggedIn" />
            </p>
        )}

        {user && (
            <p className="mb-4">
              <FormattedMessage
                  id="home.loggedInAs"
                  values={{
                    email: user.email ?? "(sin email)",
                    role: roles && roles.includes(Role.ADMIN) ? "(ADMIN)" : ""
                  }}
              />
            </p>
        )}

        <div className="flex space-x-4 mt-6">
            <Link to="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-md font-medium">
                <FormattedMessage id="nav.dashboard" />
            </Link>
            <Link to="/admin" className="bg-slate-200 text-slate-800 px-6 py-2 rounded-lg hover:bg-slate-300 transition shadow-sm font-medium">
                <FormattedMessage id="nav.admin" />
            </Link>
        </div>
      </div>
  );
};

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await authService.signIn(email, password);
      console.log("Usuario autenticado", userCredential.user);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error al iniciar sesión", err);
      setError(err?.message ?? "Error");
    }
  };

  return (
      <div className="flex justify-center items-center mt-10 p-4">
        <form onSubmit={handleLogin} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-slate-700">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
              <FormattedMessage id="login.title" />
          </h2>

          <div className="space-y-4">
              <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
              />

              <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
              />

              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-bold shadow-lg transform hover:-translate-y-0.5 active:translate-y-0">
                  <FormattedMessage id="login.button" />
              </button>
          </div>

          {error && <p className="mt-4 text-red-500 text-sm text-center font-medium">{error}</p>}
        </form>
      </div>
  );
};

const Register: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const userCredential = await authService.signUp(email, password);
      await userService.setUserRoles(userCredential.user.uid, {
        email: userCredential.user.email,
        roles: { admin: false },
      });
      console.log("Usuario registrado", userCredential.user);

      setSuccess("success"); // used as key below

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Error al registrarse", err);
      setError(err?.message ?? "Error");
    }
  };

  return (
      <div className="flex justify-center items-center mt-10 p-4">
        <form onSubmit={handleRegister} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-slate-700">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
              <FormattedMessage id="register.title" />
          </h2>

          <div className="space-y-4">
              <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
              />

              <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
              />

              <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition font-bold shadow-lg transform hover:-translate-y-0.5 active:translate-y-0">
                  <FormattedMessage id="register.button" />
              </button>
          </div>

          {error && <p className="mt-4 text-red-500 text-sm text-center font-medium">{error}</p>}
          {success && (
              <p className="mt-4 text-green-600 text-sm text-center font-bold animate-pulse">
                  <FormattedMessage id="register.success" />
              </p>
          )}
        </form>
      </div>
  );
};

/* Dashboard = "hacer pedidos" (only auth) */
const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useContext(AuthContext);

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
    if (!user) return;

    dispatch(startOrdersSubscription());

    return () => {
      dispatch(stopOrdersSubscription());
    };
  }, [dispatch, user]);

  const orderFood: FoodAppContextType["orderFood"] = (food, quantity) => {
    dispatch(orderFoodAction({ food, quantity }));
  };

  return (
      <foodAppContext.Provider value={{ orderFood }}>
        <div className="container mx-auto p-4 max-w-6xl">
          <button
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl mb-8 hover:bg-indigo-700 transition shadow-lg flex items-center space-x-2 font-bold transform hover:-translate-y-1"
              onClick={() => {
                logger.info(`UI: toggle page; current=${isChooseFoodPage ? "ORDER" : "STOCK"}`);
                dispatch(togglePage());
              }}
          >
            <FormattedMessage id={isChooseFoodPage ? "dashboard.availability" : "dashboard.orderFood"} />
          </button>

          <h3 className="text-3xl font-bold mb-6">
              <FormattedMessage id="app.title" />
          </h3>

          {statusMessage && <p className="bg-green-100 text-green-800 p-2 rounded mb-4">{statusMessage}</p>}

          {isChooseFoodPage && (
              <div className="mb-8">
                {selectedFood === undefined ? (
                    <Suspense fallback={<div className="text-gray-500">Cargando detalles ......</div>}>
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
              </div>
          )}

          <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6 mb-8 border border-gray-100 dark:border-slate-700 transition-colors">
            <h4 className="text-2xl font-bold mb-6 border-b dark:border-slate-700 pb-3 text-gray-900 dark:text-gray-100">
                <FormattedMessage id="dashboard.cart" />
            </h4>

            {cartItems.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic py-4">
                    <FormattedMessage id="dashboard.cartEmpty" />
                </p>
            ) : (
                <>
                  <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                    {cartItems.map((c) => (
                        <li key={c.id} className="py-4 flex justify-between items-center">
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      {c.name} <span className="text-gray-400 dark:text-gray-500 text-sm">x{c.quantity}</span>
                    </span>
                          <div className="flex items-center space-x-6">
                              <span className="font-bold text-gray-900 dark:text-gray-100">{c.price * c.quantity}$</span>
                              <button
                                  onClick={() => dispatch(removeFromCart({ id: c.id }))}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-bold transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              >
                                  <FormattedMessage id="dashboard.delete" />
                              </button>
                          </div>
                        </li>
                    ))}
                  </ul>

                  <p className="mt-6 text-right text-2xl font-black text-gray-900 dark:text-gray-100">
                      <span className="text-lg font-normal text-gray-500 dark:text-gray-400 mr-2"><FormattedMessage id="dashboard.total" />:</span>
                      {cartTotal}$
                  </p>
                </>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6 border border-gray-100 dark:border-slate-700 transition-colors">
            <h4 className="text-2xl font-bold mb-6 border-b dark:border-slate-700 pb-3 text-gray-900 dark:text-gray-100">
                <FormattedMessage id="dashboard.orders" />
            </h4>

            {ordersLoading && <p className="text-gray-500 dark:text-gray-400 animate-pulse py-4">Cargando pedidos...</p>}
            {ordersError && <p className="text-red-500 dark:text-red-400 py-4 font-medium">Error cargando pedidos: {ordersError}</p>}
            {!ordersLoading && !ordersError && orders.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 italic py-4">
                    <FormattedMessage id="dashboard.noOrders" />
                </p>
            )}

            {!ordersLoading && !ordersError && orders.length > 0 && (
                <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                  {orders.map((o) => (
                      <li key={o.id} className="py-5 flex flex-col md:flex-row md:justify-between md:items-center group">
                  <div className="flex flex-col mb-4 md:mb-0">
                    <span className="text-sm font-mono text-gray-400 dark:text-gray-500 mb-1">#{o.id}</span>
                    <div className="flex items-center space-x-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${o.status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{o.status}</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{o.total}$</span>
                    </div>
                  </div>

                        <div className="flex space-x-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => dispatch(markOrderPaid({ id: o.id }))}
                                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition shadow-md font-bold"
                            >
                                <FormattedMessage id="dashboard.markPaid" />
                            </button>

                            <button
                                onClick={() => dispatch(deleteOrder({ id: o.id }))}
                                className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition font-bold"
                            >
                                <FormattedMessage id="dashboard.delete" />
                            </button>
                        </div>
                      </li>
                  ))}
                </ul>
            )}
          </div>
        </div>
      </foodAppContext.Provider>
  );
};

//AC 8.1 Admin = "visualizar stock" (only ADMIN)
const AdminPanel: React.FC = () => {
  const menuItems = useSelector((s: RootState) => s.food.menuItems);

  return (
      <div className="container mx-auto p-4 max-w-6xl">
        <h2 className="text-3xl font-black mb-8 text-gray-900 dark:text-gray-100">
            <FormattedMessage id="admin.title" />
        </h2>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-slate-700 mb-8">
            <h4 className="text-xl font-bold mb-6 text-gray-600 dark:text-gray-400 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <FormattedMessage id="admin.stock" />
            </h4>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                  <li key={item.id} className="bg-gray-50 dark:bg-slate-900 p-5 rounded-2xl flex justify-between items-center border border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                    <p className="font-bold text-gray-800 dark:text-gray-200">{item.name}</p>
                    <p className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-black shadow-md">{item.quantity}</p>
                  </li>
              ))}
            </ul>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-slate-700">
            <AdminUsers />
        </div>
      </div>
  );
};

function App() {
  return (
      <ErrorBoundary fallback={<div>Algo salió mal!</div>}>
        <AuthProvider>
          <Router>
            <Navbar />

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
              />

              <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminPanel />
                    </AdminRoute>
                  }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </ErrorBoundary>
  );
}

export default App;
