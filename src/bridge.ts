/**
 * Core Bridge — Type-safe message passing between contexts
 */

export type BridgeContext = 'background' | 'popup' | 'options' | 'content' | 'sidepanel' | 'devtools';

export interface BridgeMessage<T = unknown> {
    type: string;
    data: T;
    source: BridgeContext;
    target?: BridgeContext;
    id: string;
    timestamp: number;
}

type MessageHandler<T = unknown, R = unknown> = (data: T, sender: chrome.runtime.MessageSender) => R | Promise<R>;

export class Bridge {
    private context: BridgeContext;
    private handlers = new Map<string, MessageHandler>();
    private prefix: string;

    constructor(context: BridgeContext, prefix: string = '__bridge__') {
        this.context = context;
        this.prefix = prefix;
        this.startListening();
    }

    /** Send a message to any context */
    async send<T, R = unknown>(type: string, data: T, target?: BridgeContext): Promise<R> {
        const message: BridgeMessage<T> = {
            type: `${this.prefix}${type}`,
            data,
            source: this.context,
            target,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
        };

        return chrome.runtime.sendMessage(message) as Promise<R>;
    }

    /** Send a message to a specific tab's content script */
    async sendToTab<T, R = unknown>(tabId: number, type: string, data: T): Promise<R> {
        const message: BridgeMessage<T> = {
            type: `${this.prefix}${type}`,
            data,
            source: this.context,
            target: 'content',
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
        };

        return chrome.tabs.sendMessage(tabId, message) as Promise<R>;
    }

    /** Register a message handler */
    on<T = unknown, R = unknown>(type: string, handler: MessageHandler<T, R>): () => void {
        const fullType = `${this.prefix}${type}`;
        this.handlers.set(fullType, handler as MessageHandler);
        return () => { this.handlers.delete(fullType); };
    }

    /** One-time message handler */
    once<T = unknown, R = unknown>(type: string, handler: MessageHandler<T, R>): void {
        const fullType = `${this.prefix}${type}`;
        const wrappedHandler: MessageHandler = (data, sender) => {
            this.handlers.delete(fullType);
            return (handler as MessageHandler)(data, sender);
        };
        this.handlers.set(fullType, wrappedHandler);
    }

    /** Remove all handlers */
    removeAll(): void { this.handlers.clear(); }

    private startListening(): void {
        chrome.runtime.onMessage.addListener((message: BridgeMessage, sender, sendResponse) => {
            if (!message.type?.startsWith(this.prefix)) return false;

            // Check target filter
            if (message.target && message.target !== this.context) return false;

            const handler = this.handlers.get(message.type);
            if (!handler) {
                console.warn(`[webext-bridge] No handler registered for message type: ${message.type}`);
                return false;
            }

            try {
                const result = handler(message.data, sender);
                if (result instanceof Promise) {
                    result.then(sendResponse).catch((error) => {
                        console.error(`[webext-bridge] Error in handler for ${message.type}:`, error);
                        sendResponse({ __webextBridgeError: error instanceof Error ? error.message : String(error) });
                    });
                    return true; // Keep channel open for async
                }

                sendResponse(result);
            } catch (error) {
                console.error(`[webext-bridge] Error in handler for ${message.type}:`, error);
                sendResponse({ __webextBridgeError: error instanceof Error ? error.message : String(error) });
            }
            return false;
        });
    }
}
