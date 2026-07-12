import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import AddInventoryForm from "../AddInventoryForm";
import InventoryRow from "../InventoryRow";
import LowStockBanner from "../LowStockBanner";
import type { InventoryItem } from "../../types";

const oil: InventoryItem = {
  id: "oil-5w30",
  name: "5W-30",
  kind: "oil",
  quantity: 20,
  lowStockThreshold: 8,
};

const lowFilter: InventoryItem = {
  id: "ph7317",
  name: "PH7317",
  kind: "filter",
  quantity: 2,
  lowStockThreshold: 6,
};

function renderRow(item: InventoryItem, props: Partial<{
  onUpdate: jest.Mock;
  onDelete: jest.Mock;
}> = {}) {
  const onUpdate = props.onUpdate ?? jest.fn();
  const onDelete = props.onDelete ?? jest.fn();
  render(
    <table>
      <tbody>
        <InventoryRow item={item} onUpdate={onUpdate} onDelete={onDelete} />
      </tbody>
    </table>,
  );
  return { onUpdate, onDelete };
}

describe("InventoryRow", () => {
  it("shows the item name and an OK status when stocked", () => {
    renderRow(oil);
    expect(screen.getByText("5W-30")).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("flags a low item with a text label, not colour alone", () => {
    renderRow(lowFilter);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("restocks by one when + is pressed", () => {
    const { onUpdate } = renderRow(oil);
    fireEvent.click(screen.getByRole("button", { name: /add one 5W-30/i }));
    expect(onUpdate).toHaveBeenCalledWith("oil-5w30", { quantity: 21 });
  });

  it("removes one when − is pressed", () => {
    const { onUpdate } = renderRow(oil);
    fireEvent.click(screen.getByRole("button", { name: /remove one 5W-30/i }));
    expect(onUpdate).toHaveBeenCalledWith("oil-5w30", { quantity: 19 });
  });

  it("deletes the item", () => {
    const { onDelete } = renderRow(oil);
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onDelete).toHaveBeenCalledWith(oil);
  });
});

describe("LowStockBanner", () => {
  it("renders nothing when everything is stocked", () => {
    const { container } = render(<LowStockBanner inventory={[oil]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the low items when stock is short", () => {
    render(<LowStockBanner inventory={[oil, lowFilter]} />);
    expect(screen.getByText(/low stock/i)).toBeInTheDocument();
    expect(screen.getByText(/PH7317/)).toBeInTheDocument();
  });
});

describe("AddInventoryForm", () => {
  it("submits the entered item", async () => {
    const onAdd = jest.fn().mockResolvedValue(undefined);
    render(<AddInventoryForm onAdd={onAdd} onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "0W-20" },
    });
    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText("Low-stock at"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    expect(onAdd).toHaveBeenCalledWith({
      name: "0W-20",
      kind: "oil",
      quantity: 30,
      lowStockThreshold: 10,
    });
  });
});
