import type { MenuItem } from "../entities/entities";
import { FormattedMessage } from "react-intl";

interface FoodsProps {
    foodItems: MenuItem[];
    onFoodSelected: (food: MenuItem) => void;
}

function Foods(props: FoodsProps) {
    return (
        <div className="mt-4">
            <h4 className="text-xl font-semibold mb-4 text-gray-700">
                <FormattedMessage id="foods.title" />
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {props.foodItems.map((item) => (
                    <li key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-slate-700 flex flex-col group">
                        <div className="h-52 overflow-hidden bg-gray-200 dark:bg-slate-700 relative">
                            <img
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                src={`${import.meta.env.BASE_URL}images/${item.image}`}
                                alt={item.name}
                            />
                            <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">{item.price}$</span>
                            </div>
                        </div>
                        <div className="p-5 flex flex-col flex-grow">
                            <h5 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-2">{item.name}</h5>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 flex-grow leading-relaxed">{item.desc}</p>
                            <div className="mt-auto">
                                <button
                                    onClick={() => props.onFoodSelected(item)}
                                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition font-bold shadow-md transform active:scale-95"
                                >
                                    <FormattedMessage id="foods.order" />
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Foods;
