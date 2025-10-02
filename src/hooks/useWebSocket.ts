import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/types";

interface UseWebSocketOptions {
  onNotificationReceived?: (notification: Notification) => void;
  onConnectionStatusChange?: (isConnected: boolean) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketMessage {
  type:
    | "notification"
    | "notification_update"
    | "bulk_update"
    | "ping"
    | "pong";
  data?: any;
  notification?: Notification;
}

export function useWebSocket({
  onNotificationReceived,
  onConnectionStatusChange,
  autoReconnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5,
}: UseWebSocketOptions = {}) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // WebSocket URL from environment or default
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:5000";

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const handleConnectionStatusChange = useCallback(
    (connected: boolean) => {
      setIsConnected(connected);
      onConnectionStatusChange?.(connected);
    },
    [onConnectionStatusChange]
  );

  const setupPingPong = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Ping every 30 seconds
  }, []);

  const connect = useCallback(() => {
    if (!user || isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);
    setLastError(null);

    try {
      const token = localStorage.getItem("token");
      const wsUrlWithAuth = `${wsUrl}?token=${token}`;

      wsRef.current = new WebSocket(wsUrlWithAuth);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnecting(false);
        setReconnectAttempts(0);
        handleConnectionStatusChange(true);
        setupPingPong();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case "notification":
              if (message.notification) {
                onNotificationReceived?.(message.notification);
              }
              break;

            case "notification_update":
              // Handle notification status updates
              console.log("Notification updated:", message.data);
              break;

            case "bulk_update":
              // Handle bulk notification updates (e.g., mark all as read)
              console.log("Bulk notification update:", message.data);
              break;

            case "pong":
              // Pong response - connection is alive
              break;

            default:
              console.log("Unknown WebSocket message type:", message.type);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnecting(false);
        handleConnectionStatusChange(false);
        cleanup();

        // Attempt to reconnect if enabled and not a normal closure
        if (
          autoReconnect &&
          event.code !== 1000 &&
          reconnectAttempts < maxReconnectAttempts
        ) {
          setReconnectAttempts((prev) => prev + 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setLastError("WebSocket connection failed");
        setIsConnecting(false);
        handleConnectionStatusChange(false);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setIsConnecting(false);
      setLastError("Failed to create WebSocket connection");
    }
  }, [
    user,
    isConnecting,
    isConnected,
    wsUrl,
    autoReconnect,
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    onNotificationReceived,
    handleConnectionStatusChange,
    setupPingPong,
    cleanup,
  ]);

  const disconnect = useCallback(() => {
    cleanup();

    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setReconnectAttempts(0);
    setLastError(null);
  }, [cleanup]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const forceReconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  // Connect when user is available
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    reconnectAttempts,
    lastError,
    connect,
    disconnect,
    sendMessage,
    forceReconnect,
  };
}
