import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import BoardColumn from "../BoardColumn";
import TicketCard from "../TicketCard";
import type { Technician, Ticket } from "../../types";

const technicians: Technician[] = [
  { id: "tech-1", name: "Alex" },
  { id: "tech-2", name: "Sam" },
];

const waitingTicket: Ticket = {
  id: "t1",
  vehicle: { year: 2019, make: "Honda", model: "Civic" },
  service: "oil-change",
  status: { kind: "waiting", since: new Date().toISOString() },
  partsUsed: [],
  notes: "Customer waiting inside",
  createdAt: new Date().toISOString(),
};

const inBayTicket: Ticket = {
  ...waitingTicket,
  id: "t2",
  status: {
    kind: "in-bay",
    bayId: "bay-1",
    technicianId: "tech-1",
    startedAt: new Date().toISOString(),
  },
};

describe("TicketCard", () => {
  it("shows vehicle, service, and notes for a waiting ticket", () => {
    render(<TicketCard ticket={waitingTicket} technicians={technicians} />);
    expect(screen.getByText("2019 Honda Civic")).toBeInTheDocument();
    expect(screen.getByText("Oil change")).toBeInTheDocument();
    expect(screen.getByText("Customer waiting inside")).toBeInTheDocument();
  });

  it("fires onRequestAssign when the assign button is clicked", () => {
    const onRequestAssign = jest.fn();
    render(
      <TicketCard
        ticket={waitingTicket}
        technicians={technicians}
        onRequestAssign={onRequestAssign}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /assign to bay/i }));
    expect(onRequestAssign).toHaveBeenCalledWith(waitingTicket);
  });

  it("shows the technician name and return button for an in-bay ticket", () => {
    const onReturnToWaiting = jest.fn();
    render(
      <TicketCard
        ticket={inBayTicket}
        technicians={technicians}
        onReturnToWaiting={onReturnToWaiting}
      />,
    );
    expect(screen.getByText("Alex")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back to waiting/i }));
    expect(onReturnToWaiting).toHaveBeenCalledWith(inBayTicket);
  });

  it("does not offer an assign button on an in-bay ticket", () => {
    render(
      <TicketCard
        ticket={inBayTicket}
        technicians={technicians}
        onRequestAssign={jest.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /assign to bay/i }),
    ).not.toBeInTheDocument();
  });
});

describe("BoardColumn", () => {
  it("renders title, count, and children", () => {
    render(
      <BoardColumn title="Waiting" count={2}>
        <p>card A</p>
        <p>card B</p>
      </BoardColumn>,
    );
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("card A")).toBeInTheDocument();
  });

  it("calls onDropTicket with the dragged ticket id", () => {
    const onDropTicket = jest.fn();
    render(
      <BoardColumn title="Bay 1" count={0} onDropTicket={onDropTicket}>
        {null}
      </BoardColumn>,
    );
    const column = screen.getByRole("region", { name: "Bay 1" });
    fireEvent.drop(column, {
      dataTransfer: { getData: () => "ticket-123" },
    });
    expect(onDropTicket).toHaveBeenCalledWith("ticket-123");
  });
});
