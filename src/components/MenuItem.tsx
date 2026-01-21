"use client";

interface MenuItemProps {
  name: string;
  price: number;
  ingredients: string;
  warning?: string;
}

export default function MenuItem({
  name,
  price,
  ingredients,
  warning,
}: MenuItemProps) {
  return (
    <div className={`menu-item ${warning ? "menu-item--caution" : ""}`}>
      <div className="menu-item__header">
        <h4 className="menu-item__name">{name}</h4>
        <span className="menu-item__price">${price}</span>
      </div>
      <p className="menu-item__ingredients">{ingredients}</p>
      {warning && (
        <p className="menu-item__warning">
          <span className="menu-item__warning-icon">!</span>
          {warning}
        </p>
      )}
    </div>
  );
}
