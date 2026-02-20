import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private isConnectedFlag = false;

  connect(token: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    // Connect to the same origin (relative path) so it works through proxy or Cloudflare
    this.socket = io({
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("Socket connected");
      this.isConnectedFlag = true;
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
      this.isConnectedFlag = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnectedFlag = false;
  }

  isConnected(): boolean {
    return this.isConnectedFlag && this.socket?.connected === true;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
