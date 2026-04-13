import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { baseColumns } from "./base";
import { userRoleEnum } from "./enums";

export const users = pgTable("users", {
  ...baseColumns,
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  googleId: text("google_id").unique(),
  role: userRoleEnum("role").notNull().default("member"),
  themePreference: text("theme_preference").default("system"),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false),
});
