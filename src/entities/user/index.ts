export type UserEntity = {
  id: number;
  name: string;
  phone: string;
  role: "GUEST" | "OWNER" | "ADMIN";
};
