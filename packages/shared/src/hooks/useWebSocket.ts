/**
 * useWebSocket Hook
 *
 * Real-time WebSocket connection for live updates
 * Handles connection, reconnection, and message handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ServerWSMessage, ClientWSMessage, WebSocketMessage } from '../types';

// Export message types for consumers
export type { ServerWSMessage, ClientWSMessage };

export interface UseWebSocketOptions<T extends ServerWSMessage = ServerWSMessage> {
  sessionCode: string;
  onMessage?: (data: T) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  wsUrl?: string;
}

export function useWebSocket<T extends ServerWSMessage = ServerWSMessage>(options: UseWebSocketOptions<T>) {
  const {
    sessionCode,
    onMessage,
    onOpen,
    onClose,
    onError,
    enabled = true,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    wsUrl,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Store callbacks in refs to avoid dependency array issues
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  onMessageRef.current = onMessage;
  onOpenRef.current = onOpen;
  onCloseRef.current = onClose;
  onErrorRef.current = onError;

  const connect = useCallback(() => {
    if (!enabled || !sessionCode) return;

    // Determine WebSocket URL with proper security
    function getDefaultWsUrl(): string {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      if (isHttps) {
        return `wss://${window.location.host}`;
      }
      if (import.meta.env.DEV) {
        return 'ws://localhost:8000';
      }
      return `wss://${window.location.host}`;
    }

    const baseUrl = wsUrl || import.meta.env.VITE_WS_URL || getDefaultWsUrl();
    const url = `${baseUrl}/ws/reviewarcade/${sessionCode}`;

    // Only log in development
    if (import.meta.env.DEV) {
      console.log('Connecting to WebSocket:', url);
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        if (import.meta.env.DEV) console.log('WebSocket connected');
        if (!mountedRef.current) return;

        setIsConnected(true);
        setReconnectAttempts(0);
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data);

          // Basic validation: must be an object with a type property
          if (typeof data !== 'object' || data === null || typeof data.type !== 'string') {
            if (import.meta.env.DEV) {
              console.warn('Invalid WebSocket message format:', data);
            }
            return;
          }

          // Only update if data changed to prevent unnecessary re-renders
          setLastMessage((prev) =>
            JSON.stringify(prev) !== JSON.stringify(data) ? data as T : prev
          );
          onMessageRef.current?.(data as T);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Failed to parse WebSocket message:', error);
          }
        }
      };

      ws.onclose = () => {
        if (import.meta.env.DEV) console.log('WebSocket disconnected');
        if (!mountedRef.current) return;

        setIsConnected(false);
        onCloseRef.current?.();

        // Reconnect if enabled and not exceeded max attempts
        if (reconnect && reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (!mountedRef.current) return;

        onErrorRef.current?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [sessionCode, enabled, reconnect, reconnectInterval, maxReconnectAttempts, reconnectAttempts, wsUrl]);

  const send = useCallback(
    (data: ClientWSMessage | WebSocketMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      } else {
        console.warn('WebSocket not connected, message not sent:', data);
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    disconnect,
    reconnectAttempts,
  };
}
