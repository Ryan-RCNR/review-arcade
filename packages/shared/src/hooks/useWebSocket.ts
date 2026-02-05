/**
 * useWebSocket Hook
 *
 * Real-time WebSocket connection for live updates
 * Handles connection, reconnection, and message handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage } from '../types';

export interface UseWebSocketOptions {
  sessionCode: string;
  onMessage?: (data: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  wsUrl?: string;
}

export function useWebSocket(options: UseWebSocketOptions) {
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
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !sessionCode) return;

    const baseUrl = wsUrl || import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const url = `${baseUrl}/ws/reviewarcade/${sessionCode}`;

    console.log('Connecting to WebSocket:', url);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        if (!mountedRef.current) return;

        setIsConnected(true);
        setReconnectAttempts(0);
        if (onOpen) onOpen();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (!mountedRef.current) return;

        setIsConnected(false);
        if (onClose) onClose();

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

        if (onError) onError(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [sessionCode, enabled, reconnect, reconnectInterval, maxReconnectAttempts, reconnectAttempts, wsUrl, onOpen, onClose, onError, onMessage]);

  const send = useCallback(
    (data: WebSocketMessage) => {
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
