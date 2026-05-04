import type { UserProfile } from "../types";

export const currentUserId = "user-1";

export const users: UserProfile[] = [
  {
    id: "user-1",
    name: "Maksym Kovalenko",
    location: "Kyiv",
    bio: "Student building a reliable local network for small everyday tasks.",
    skills: ["English tutoring", "Laptop setup", "Presentation design"],
    interests: ["education", "technology", "local community"],
    rating: 4.8,
    completedTasks: 12,
    avatarUrl: "/placeholder-user.jpg",
  },
  {
    id: "user-2",
    name: "Anastasiia Melnyk",
    location: "Kyiv",
    bio: "Helps with design, study planning, and quick errands around the city.",
    skills: ["Design review", "Study planning", "Errands"],
    interests: ["design", "productivity", "coffee"],
    rating: 4.9,
    completedTasks: 18,
    avatarUrl: "/placeholder-user.jpg",
  },
  {
    id: "user-3",
    name: "Dmytro Shevchenko",
    location: "Lviv",
    bio: "Can fix basic home tech issues and explain technical topics simply.",
    skills: ["Router setup", "Phone setup", "Math tutoring"],
    interests: ["hardware", "teaching", "cycling"],
    rating: 4.7,
    completedTasks: 9,
    avatarUrl: "/placeholder-user.jpg",
  },
];
