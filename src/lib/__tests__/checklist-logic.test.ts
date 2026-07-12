import {
  buildChecklist,
  checklistId,
  checklistProgress,
  toggleItem,
  todayKey,
} from "../checklist-logic";

describe("todayKey", () => {
  it("formats a date as YYYY-MM-DD with zero padding", () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("checklistId", () => {
  it("is unique per day and type", () => {
    expect(checklistId("opening", "2026-07-12")).toBe("2026-07-12_opening");
    expect(checklistId("closing", "2026-07-12")).toBe("2026-07-12_closing");
  });
});

describe("buildChecklist", () => {
  it("creates an all-unchecked list with a stable id", () => {
    const cl = buildChecklist("opening", "2026-07-12");
    expect(cl.id).toBe("2026-07-12_opening");
    expect(cl.items.length).toBeGreaterThan(0);
    expect(cl.items.every((it) => it.completedAt === null)).toBe(true);
  });
});

describe("toggleItem", () => {
  const items = buildChecklist("opening", "2026-07-12").items;

  it("stamps a time when checking an item", () => {
    const next = toggleItem(items, items[0].id, "2026-07-12T08:00:00.000Z");
    expect(next[0].completedAt).toBe("2026-07-12T08:00:00.000Z");
    expect(next[1].completedAt).toBeNull();
  });

  it("clears the stamp when unchecking", () => {
    const checked = toggleItem(items, items[0].id, "2026-07-12T08:00:00.000Z");
    const unchecked = toggleItem(checked, items[0].id, "2026-07-12T09:00:00.000Z");
    expect(unchecked[0].completedAt).toBeNull();
  });

  it("does not mutate the input", () => {
    toggleItem(items, items[0].id, "2026-07-12T08:00:00.000Z");
    expect(items[0].completedAt).toBeNull();
  });
});

describe("checklistProgress", () => {
  it("counts done versus total", () => {
    const cl = buildChecklist("closing", "2026-07-12");
    cl.items = toggleItem(cl.items, cl.items[0].id, "2026-07-12T20:00:00.000Z");
    const { done, total } = checklistProgress(cl);
    expect(done).toBe(1);
    expect(total).toBe(cl.items.length);
  });
});
