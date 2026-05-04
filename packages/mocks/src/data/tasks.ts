import type { Task } from "../types";

export const tasks: Task[] = [
  {
    id: "task-1",
    title: "Help set up a Wi-Fi router",
    description: "Need help configuring a new router and checking coverage in a small apartment.",
    category: "Home tech",
    location: "Kyiv, Podil",
    compensation: { type: "money", amount: 350, currency: "UAH" },
    status: "open",
    ownerId: "user-2",
    createdAt: "2026-05-01T10:00:00.000Z",
  },
  {
    id: "task-2",
    title: "Review my English presentation",
    description: "Looking for feedback on a 7-minute university presentation before Thursday.",
    category: "Education",
    location: "Remote",
    compensation: { type: "money", amount: 250, currency: "UAH" },
    status: "matched",
    ownerId: "user-1",
    selectedResponseId: "response-2",
    createdAt: "2026-05-02T14:30:00.000Z",
  },
  {
    id: "task-3",
    title: "Carry a small package across campus",
    description: "Need someone to pick up documents from the library and bring them to dorm 4.",
    category: "Errands",
    location: "Kyiv, KPI",
    compensation: { type: "money", amount: 150, currency: "UAH" },
    status: "open",
    ownerId: "user-3",
    createdAt: "2026-05-03T08:45:00.000Z",
  },
];
