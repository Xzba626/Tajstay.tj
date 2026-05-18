import type { User } from "@prisma/client";

/** Поля пользователя без секретов — для JSON API и клиента. */
export type PublicUser = Omit<User, "password">;

export function toPublicUser(user: User): PublicUser {
  const { password: _p, ...rest } = user;
  return rest;
}
