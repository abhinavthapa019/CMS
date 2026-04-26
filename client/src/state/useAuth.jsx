import { useContext } from "react";
import { AuthCtx } from "./authContext.jsx";

export function useAuth() {
  return useContext(AuthCtx);
}
