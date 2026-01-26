export interface WebSearchResult {
    title: string;
    url: string;
    description?: string;
    age?: string;
}

export interface WebSearchResponse {
    success: boolean;
    results?: WebSearchResult[];
    error?: string;
}

interface SearchOptions {
    count?: number;
    country?: string;
    freshness?: string;
    safesearch?: string;
    searchLang?: string;
}

function buildSearchUrl(base: string, params: URLSearchParams): string {
    const prefix = base ? base.replace(/\/$/, '') : '';
    return `${prefix}/api/search?${params.toString()}`;
}

export async function searchWeb(query: string, options: SearchOptions = {}): Promise<WebSearchResponse> {
    if (!query) {
        return { success: false, error: 'missing_query' };
    }

    const params = new URLSearchParams({
        q: query,
        count: String(options.count ?? 5),
    });

    const normalizedCountry = options.country?.toUpperCase();
    const normalizedSearchLang = options.searchLang?.includes('-')
        ? options.searchLang.split('-')[0]
        : options.searchLang;

    if (normalizedCountry && normalizedCountry !== 'CN') params.set('country', normalizedCountry);
    if (options.freshness) params.set('freshness', options.freshness);
    if (normalizedSearchLang) params.set('search_lang', normalizedSearchLang);
    if (options.safesearch && !normalizedSearchLang) params.set('safesearch', options.safesearch);

    const base = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE || '';
    const primaryUrl = buildSearchUrl(base, params);

    try {
        let response = await fetch(primaryUrl);
        if (!response.ok && !base && typeof window !== 'undefined') {
            // Fallback to local backend when dev proxy is not available
            const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            if (isLocalhost) {
                const fallbackUrl = buildSearchUrl('http://localhost:8787', params);
                response = await fetch(fallbackUrl);
            }
        }

        const data = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!response.ok) {
            return { success: false, error: (data as { error?: string }).error || `http_${response.status}` };
        }
        return { success: true, results: (data as { results?: WebSearchResult[] }).results || [] };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'search_failed' };
    }
}
