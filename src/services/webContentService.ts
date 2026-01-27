export interface WebPageResponse {
    success: boolean;
    url?: string;
    title?: string;
    content?: string;
    error?: string;
}

function buildUrl(base: string, params: URLSearchParams): string {
    const prefix = base ? base.replace(/\/$/, '') : '';
    return `${prefix}/api/web/page?${params.toString()}`;
}

export async function fetchWebPage(url: string): Promise<WebPageResponse> {
    if (!url) {
        return { success: false, error: 'missing_url' };
    }

    const params = new URLSearchParams({ url });
    const base = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE || '';
    const primaryUrl = buildUrl(base, params);
    const token = (import.meta as { env?: Record<string, string> }).env?.VITE_API_TOKEN;
    const headers = token ? { 'x-aether-token': token } : undefined;

    try {
        let response = await fetch(primaryUrl, { headers });
        if (!response.ok && !base && typeof window !== 'undefined') {
            const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            if (isLocalhost) {
                const fallbackUrl = buildUrl('http://localhost:8787', params);
                response = await fetch(fallbackUrl, { headers });
            }
        }

        const data = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!response.ok) {
            return { success: false, error: (data as { error?: string }).error || `http_${response.status}` };
        }

        return {
            success: true,
            url: (data as { url?: string }).url || url,
            title: (data as { title?: string }).title,
            content: (data as { content?: string }).content,
        };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'page_fetch_failed' };
    }
}
