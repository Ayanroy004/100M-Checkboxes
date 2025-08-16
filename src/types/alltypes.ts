export interface UserData {
  name: string;
  role: "admin" | "user";
}
export interface jwtPayload {
  name: string;
  role: "admin" | "user";
  userId: string;
}