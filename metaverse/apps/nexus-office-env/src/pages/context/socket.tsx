import { useContext } from "react";
import { SocketContext } from "./context";


export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};