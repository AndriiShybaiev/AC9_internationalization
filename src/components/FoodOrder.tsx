import {useState, type MouseEventHandler, type ChangeEvent, useContext} from "react";
import type {CartItem, MenuItem} from "../entities/entities";
import {foodAppContext} from "../App.tsx";
import logger from "../services/logging";
import orderService from "../services/ordersService";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { LanguageContext } from "../contexts/LanguageContext";

interface FoodOrderProps {
    food: MenuItem;
    onReturnToMenu: MouseEventHandler<HTMLButtonElement> | undefined;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function FoodOrder(props: FoodOrderProps) {
    const quantityContext = useContext(foodAppContext);
    const { locale } = useContext(LanguageContext);
    if (!quantityContext) throw new Error("No se ha encontrado el contexto de pedidos");

    const [quantity, setQuantity] = useState(1);
    const [totalAmount, setTotalAmount] = useState(props.food.price);
    const [isOrdered, setIsOrdered] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleQuantityChange = (e: ChangeEvent<HTMLInputElement>) => {
        const q = Number(e.target.value);
        const safeQ = Number.isFinite(q) && q > 0 ? q : 1;
        logger.debug(`FoodOrder: quantity changed; raw=${e.target.value}, safe=${safeQ}`);
        setQuantity(safeQ);
        setTotalAmount(props.food.price * safeQ);
    };

    const handleSendOrder = async () => {
        logger.info(`FoodOrder: send order clicked; foodId=${props.food.id}, qty=${quantity}`);
        setSaveState("saving");
        setSaveError(null);
        try{
            quantityContext?.orderFood(props.food, quantity);

            const item: CartItem = {
                id: props.food.id,
                name: props.food.name,
                price: props.food.price,
                quantity,
            };

            const orderId = await orderService.create({ items: [item] });
            logger.info(`Order: saved to Firebase; id=${orderId}`);

            setIsOrdered(true);
            setSaveState("saved");
        } catch (e) {
            logger.error(`Order: save failed; ${String(e)}`);
            setIsOrdered(false);
            setSaveState("error");
            setSaveError(String(e));
        }

    };

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xl max-w-lg mx-auto transform transition-all">
            <h4 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
                <FormattedMessage id="order.title" />
            </h4>
            <p className="text-xl text-blue-600 dark:text-blue-400 font-semibold mb-8">
                <FormattedMessage id={`food.${props.food.id}.name`} defaultMessage={props.food.name} />
            </p>

            {!isOrdered ? (
                <div className="space-y-8">
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                        <label className="text-gray-700 dark:text-gray-300 font-bold text-lg">
                            <FormattedMessage id="order.quantity" />
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={handleQuantityChange}
                            className="w-24 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100 font-bold text-center"
                        />
                    </div>

                    <div className="flex justify-between items-center px-2">
                        <span className="text-gray-600 dark:text-gray-400 font-medium text-lg">
                            <FormattedMessage id="order.price" />
                        </span>
                        <span className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            <FormattedNumber value={totalAmount} style="currency" currency={locale === 'es' ? 'EUR' : 'USD'} minimumFractionDigits={0} />
                        </span>
                    </div>

                    <div className="space-y-4 pt-4">
                        <button
                            onClick={handleSendOrder}
                            disabled={saveState === "saving"}
                            className={`w-full py-4 rounded-2xl font-black text-white text-lg transition-all transform hover:-translate-y-1 active:translate-y-0 shadow-lg ${
                                saveState === "saving" ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 shadow-green-200 dark:shadow-none"
                            }`}
                        >
                            {saveState === "saving" ? (
                                <FormattedMessage id="order.saving" />
                            ) : (
                                <FormattedMessage id="order.send" />
                            )}
                        </button>

                        <button
                            onClick={props.onReturnToMenu}
                            className="w-full py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-bold transition flex items-center justify-center space-x-2"
                        >
                            <span className="text-lg">←</span>
                            <FormattedMessage id="order.return" />
                        </button>
                    </div>

                    {saveState === "saving" && <p className="text-sm text-blue-500 animate-pulse italic text-center font-medium"><FormattedMessage id="order.savingFirebase" /></p>}
                    {saveState === "saved" && <p className="text-sm text-green-600 font-bold text-center bg-green-50 dark:bg-green-900/20 py-2 rounded-lg"><FormattedMessage id="order.saved" /></p>}
                    {saveState === "error" && (
                        <p className="text-sm text-red-600 font-bold text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">
                            <FormattedMessage id="order.error" values={{ error: saveError }} />
                        </p>
                    )}
                </div>
            ) : (
                <div className="text-center space-y-8 py-4">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">✅</span>
                    </div>
                    <p className="text-2xl text-green-700 dark:text-green-400 font-black">
                        <FormattedMessage id="order.confirmed" />
                    </p>
                    <button
                        onClick={props.onReturnToMenu}
                        className="w-full bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition shadow-xl font-black text-lg transform hover:-translate-y-1 active:translate-y-0"
                    >
                        <FormattedMessage id="order.return" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default FoodOrder;
