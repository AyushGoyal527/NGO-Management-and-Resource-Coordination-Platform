import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => globalThis.__auth,
}));
vi.mock("../src/services/resourceService", async (orig) => ({
  ...(await orig()),
  lookups: {
    managers: vi.fn(async () => ({ items: [{ _id: "m1", name: "Meera" }] })),
    programs: vi.fn(async () => ({
      items: [{ _id: "p1", name: "Food Drive" }],
    })),
    volunteers: vi.fn(async () => ({ items: [] })),
    people: vi.fn(async () => ({ items: [] })),
  },
}));

import ResourcePage from "../src/components/ResourcePage";
import volunteers from "../src/modules/volunteers";
import students from "../src/modules/students";
import beneficiaries from "../src/modules/beneficiaries";
import resources from "../src/modules/resources";
import events from "../src/modules/events";
import programs from "../src/modules/programs";
import announcements from "../src/modules/announcements";

const configs = {
  volunteers,
  students,
  beneficiaries,
  resources,
  events,
  programs,
  announcements,
};
const login = (role, permissions = []) => {
  globalThis.__auth = {
    user: { _id: "u1", name: "Meera", role, permissions },
    hasPermission: (p) => role === "admin" || permissions.includes(p),
    logout: vi.fn(),
  };
};
const row = (cfg) => ({
  _id: "r1",
  name: "Sample record",
  title: "Sample record",
  status: "active",
  createdAt: new Date().toISOString(),
  date: new Date().toISOString(),
  audience: "all",
  createdBy: { name: "Admin" },
});

beforeEach(() => {
  vi.clearAllMocks();
  login("admin");
});
afterEach(cleanup);

describe.each(Object.entries(configs))("%s screen", (key, cfg) => {
  const mount = () => {
    vi.spyOn(cfg.service, "list").mockResolvedValue({
      items: [row(cfg)],
      pagination: { page: 1, limit: 10, total: 1, pages: 1 },
    });
    return render(
      <MemoryRouter>
        <ResourcePage config={cfg} />
      </MemoryRouter>,
    );
  };
  it("lists records under its title", async () => {
    mount();
    expect(
      await screen.findByRole("heading", { name: cfg.title }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.getAllByText("Sample record").length).toBeGreaterThan(0),
    );
  });
  it("shows a helpful empty state", async () => {
    vi.spyOn(cfg.service, "list").mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 1 },
    });
    render(
      <MemoryRouter>
        <ResourcePage config={cfg} />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: cfg.title });
    await waitFor(() => expect(screen.queryByText("Sample record")).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("shows an error with retry when loading fails", async () => {
    vi.spyOn(cfg.service, "list").mockRejectedValue(new Error("x"));
    render(
      <MemoryRouter>
        <ResourcePage config={cfg} />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("button", { name: /try again|retry/i }),
    ).toBeTruthy();
  });
  it("opens an add form with every required field labelled, and blocks an empty save", async () => {
    mount();
    await userEvent.click(
      await screen.findByRole("button", { name: /^add /i }),
    );
    const required = cfg.fields.filter(
      (f) => f.required && !f.permission && f.type !== "manager",
    );
    for (const f of required)
      expect(
        (
          await screen.findAllByLabelText(
            new RegExp(f.label.replace(/[()]/g, "\\$&"), "i"),
          )
        ).length,
      ).toBeGreaterThan(0);
    const create = vi.spyOn(cfg.service, "create").mockResolvedValue({});
    const submit = screen
      .getAllByRole("button")
      .find(
        (b) =>
          (/^(add|save|create)/i.test(b.textContent) && b.type !== "button") ||
          b.type === "submit",
      );
    await userEvent.click(submit);
    if (required.some((f) => !f.default && f.type !== "select"))
      expect(create).not.toHaveBeenCalled();
  });
  it("hides add, edit and delete from someone who only has view access", async () => {
    login("manager", [`${cfg.module}.view`]);
    mount();
    await screen.findByRole("heading", { name: cfg.title });
    await waitFor(() =>
      expect(screen.getAllByText("Sample record").length).toBeGreaterThan(0),
    );
    expect(screen.queryByRole("button", { name: /^add /i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /^(edit|delete|archive)/i }),
    ).toBeNull();
  });
});
