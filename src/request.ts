/**
 * Request/Response Pattern — Promise-based RPC over chrome messaging
 */
type RequestHandler<T = unknown, R = unknown> = (data: T, sender: chrome.runtime.MessageSender) => R | Promise<R>;

/**
 * Converts any error to a descriptive error message
 * Preserves Error objects for better debugging, converts others to strings
 */
function serializeError(error: unknown): string {
    if (error instanceof Error) {
        return error.message + (error.stack ? `\n${error.stack}` : '');
    }
    return String(error);
}

export class RequestResponse {
    private handlers = new Map<string, RequestHandler>();
    private prefix: string;

    constructor(prefix: string = '__rpc__') {
        this.prefix = prefix;
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (!msg?.type?.startsWith(this.prefix)) return false;
            const method = msg.type.slice(this.prefix.length);
            const handler = this.handlers.get(method);
            if (!handler) { 
                const availableMethods = Array.from(this.handlers.keys()).join(', ');
                sendResponse({ error: `Unknown method: ${method}. Available methods: ${availableMethods || 'none'}` }); 
                return false; 
            }
            try {
                const result = handler(msg.data, sender);
                if (result instanceof Promise) {
                    result.then((r) => sendResponse({ result: r })).catch((e) => sendResponse({ error: serializeError(e) }));
                    return true;
                }
                sendResponse({ result });
            } catch (e) { sendResponse({ error: serializeError(e) }); }
            return false;
        });
    }

    /** Register a method */
    register<T = unknown, R = unknown>(method: string, handler: RequestHandler<T, R>): void {
        this.handlers.set(method, handler as RequestHandler);
    }

    /** Call a remote method */
    async call<T, R = unknown>(method: string, data?: T): Promise<R> {
        const response = await chrome.runtime.sendMessage({ type: `${this.prefix}${method}`, data }) as { result?: R; error?: string };
        if (response?.error) throw new Error(`RPC call to '${method}' failed: ${response.error}`);
        return response?.result as R;
    }

    /** Call a method on a specific tab */
    async callTab<T, R = unknown>(tabId: number, method: string, data?: T): Promise<R> {
        const response = await chrome.tabs.sendMessage(tabId, { type: `${this.prefix}${method}`, data }) as { result?: R; error?: string };
        if (response?.error) throw new Error(`RPC call to tab ${tabId} method '${method}' failed: ${response.error}`);
        return response?.result as R;
    }
}
