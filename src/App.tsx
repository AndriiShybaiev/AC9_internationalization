import './App.css'
import {useState} from "react";
import type {MenuItem} from "./entities/entities.ts";
import Foods from "./components/Foods.tsx";

function App() {
  const [isChooseFoodPage, setIsChooseFoodPage] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      id: '1',
      name: "Hamburguesa de Pollo",
      quantity: "40",
      desc: "Hamburguesa de pollo frito - ... y mayones",
      price: 24,
      image: 'cb.jpg'
    },
    {
      id: '2',
      name: "Hamburguesa de Carne",
      quantity: "20",
      desc: "Hamburguesa de carne con queso y tomate",
      price: 30,
      image: 'vb.jpg'
    },
    {
      id: '3',
      name: "Hamburguesa Vegetariana",
      quantity: "15",
      desc: "Hamburguesa vegetariana con queso y tomate",
      price: 28,
      image: 'ic.jpg'
    },
    {
      id: "4",
      name: "Patatas fritas",
      quantity: "54",
      desc: "Patatas fritas con salsa verde",
      price: 123,
      image: "chips.jpg"
    }
  ])

  return (
<div className="App">
  <button className="toggleButton" onClick={() => setIsChooseFoodPage(!isChooseFoodPage)}>
    {isChooseFoodPage ? "Disponibilidad" : "Pedir Comida"}
  </button>
  <h3 className="title">Comida Rapida Online</h3>
  {!isChooseFoodPage && <Foods foodItems={menuItems}/>}
  <>
  <h4 className="subTitle">Menús</h4>
  <ul className="ulApp">
    {menuItems.map((item) => {
      return (
          <li key={item.id} className="liApp">
            <p>{item.name}</p>
            <p>#{item.quantity}</p>
          </li>
      );
    })}
    </ul>
    </>
  {isChooseFoodPage && <Foods foodItems={menuItems}/>}
    </div>
  );
};

export default App
