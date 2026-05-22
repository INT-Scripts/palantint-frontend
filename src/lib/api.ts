export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem("palantint_token") : null;
    if (!token) return { "Content-Type": "application/json" };
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
        ...getAuthHeaders(),
        ...options.headers,
    };

    // If sending form-data (e.g. for media upload), remove global Content-Type 
    // so the browser automatically sets it with the boundary.
    if (options.body && options.body instanceof FormData) {
        if (headers && typeof headers === 'object' && "Content-Type" in headers) {
            delete (headers as any)["Content-Type"];
        }
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Unauthorized: Clear token and redirect to login
        if (typeof window !== "undefined") {
            localStorage.removeItem("palantint_token");
            const PUBLIC_ROUTES = [
                "/",
                "/login",
                "/clubs",
                "/apartments",
                "/campus"
            ];
            const isPublic = PUBLIC_ROUTES.some(route => window.location.pathname === route || window.location.pathname.startsWith(route + "/"));
            if (!isPublic && window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
    }

    const contentType = response.headers.get("Content-Type");
    const isJson = contentType && contentType.includes("application/json");

    // Parse JSON response
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        throw new Error(data.detail || data.message || "An error occurred");
    }

    return data;
}
