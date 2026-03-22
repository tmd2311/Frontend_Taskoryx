import { Client } from '@stomp/stompjs';
import { config, STORAGE_KEYS } from '../utils/config';

type MessageHandler = (body: any) => void;

let stompClient: Client | null = null;
const subscriptions: Map<string, any> = new Map();

export const websocketService = {
  async connect(handlers: {
    onNotification?: MessageHandler;
  }) {
    if (stompClient?.connected) return;

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return;

    try {
      // Dynamic import để tránh Vite bị lỗi khi bundle CJS module
      const SockJSModule = await import('sockjs-client');
      const SockJS = SockJSModule.default;

      stompClient = new Client({
        // SockJS protocol – backend yêu cầu
        webSocketFactory: () => new (SockJS as any)(`${config.apiBaseUrl}/ws`),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 10000,
        onConnect: () => {
          if (handlers.onNotification) {
            const sub = stompClient!.subscribe('/user/queue/notifications', (msg) => {
              try {
                handlers.onNotification!(JSON.parse(msg.body));
              } catch {
                // bỏ qua parse error
              }
            });
            subscriptions.set('/user/queue/notifications', sub);
          }
        },
        onStompError: () => {
          // lỗi STOMP – sẽ tự reconnect sau reconnectDelay
        },
        onWebSocketError: () => {
          // lỗi WebSocket – sẽ tự reconnect
        },
      });

      stompClient.activate();
    } catch {
      // SockJS không khả dụng hoặc backend chưa bật – im lặng
    }
  },

  subscribeToProject(projectId: string, handler: MessageHandler) {
    if (!stompClient?.connected) return;
    const topic = `/topic/project/${projectId}`;
    if (subscriptions.has(topic)) return;

    const sub = stompClient.subscribe(topic, (msg) => {
      try {
        handler(JSON.parse(msg.body));
      } catch {
        // bỏ qua
      }
    });
    subscriptions.set(topic, sub);
  },

  unsubscribeFromProject(projectId: string) {
    const topic = `/topic/project/${projectId}`;
    const sub = subscriptions.get(topic);
    if (sub) {
      sub.unsubscribe();
      subscriptions.delete(topic);
    }
  },

  disconnect() {
    try {
      subscriptions.forEach((sub) => { try { sub.unsubscribe(); } catch { /* */ } });
      subscriptions.clear();
      if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
      }
    } catch {
      // im lặng
    }
  },

  isConnected() {
    return stompClient?.connected ?? false;
  },
};
