/**
 * Request/Response Pattern — Promise-based RPC over chrome messaging
 */
type RequestHandler<T = unknown, R = unknown> = (data: T, sender: chrome.runtime.MessageSender) => R | Promise<R>;

/**
 * Format an error for transmission over chrome messaging.
 * Preserves error message, name, and stack trace information for better debugging.
 */
function formatError(error: unknown): string {
    if (error instanceof Error) {
        // Include error name and stack for better debugging
        const stackInfo = error.stack ? `\nStack: ${error.stack}` : '';
        return `${error.name}: ${error.message}${stackInfo}`;
    }
    // For non-Error objects, try to serialize useful information
    if (error !== null && typeof error === 'object') {
        try {
            return JSON.stringify(error, null, 2);
        } catch {
            return String(error);
        }
    }
    // For primitives and null/undefined
    return String(error ?? 'Unknown error');
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
                const suggestion = availableMethods
                    ? `\n\nAvailable methods: ${availableMethods}`
                    : '\n\nNo methods have been registered yet. Use .register() to add methods.';
                sendResponse({ error: `Unknown method: '${method}'${suggestion}` });
                return false;
            }
            try {
                const result = handler(msg.data, sender);
                if (result instanceof Promise) {
                    result.then((r) => sendResponse({ result: r })).catch((e) => sendResponse({ error: formatError(e) }));
                    return true;
                }
                sendResponse({ result });
            } catch (e) { sendResponse({ error: formatError(e) }); }
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
        if (response?.error) throw new Error(response.error);
        return response?.result as R;
    }

    /** Call a method on a specific tab */
    async callTab<T, R = unknown>(tabId: number, method: string, data?: T): Promise<R> {
        const response = await chrome.tabs.sendMessage(tabId, { type: `${this.prefix}${method}`, data }) as { result?: R; error?: string };
        if (response?.error) throw new Error(response.error);
        return response?.result as R;
    }
}
