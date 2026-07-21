export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem("palantint_token") : null;
    if (!token) return { "Content-Type": "application/json" };
    
    if (typeof window !== "undefined") {
        document.cookie = `palantint_token=${token}; path=/; max-age=${5 * 60}; SameSite=Lax`;
    }
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("palantint_refresh_token") : null;
    if (!refreshToken) return false;

    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                });

                if (!response.ok) {
                    throw new Error("Refresh failed");
                }

                const data = await response.json();
                if (data.access_token && data.refresh_token) {
                    localStorage.setItem("palantint_token", data.access_token);
                    localStorage.setItem("palantint_refresh_token", data.refresh_token);
                    document.cookie = `palantint_token=${data.access_token}; path=/; max-age=${5 * 60}; SameSite=Lax`;
                    document.cookie = `palantint_refresh_token=${data.refresh_token}; path=/; max-age=${60 * 60}; SameSite=Lax`;
                    return true;
                }
                return false;
            } catch (err) {
                console.error("Token refresh error:", err);
                return false;
            } finally {
                refreshPromise = null;
            }
        })();
    }

    return refreshPromise;
}

export async function fetchPrivate(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}/private${endpoint}`;

    const headers = {
        ...getAuthHeaders(),
        ...options.headers,
    };

    if (options.body && options.body instanceof FormData) {
        if (headers && typeof headers === 'object' && "Content-Type" in headers) {
            delete (headers as Record<string, string>)["Content-Type"];
        }
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
            const retryHeaders = {
                ...getAuthHeaders(),
                ...options.headers,
            };
            if (options.body && options.body instanceof FormData) {
                if (retryHeaders && typeof retryHeaders === 'object' && "Content-Type" in retryHeaders) {
                    delete (retryHeaders as Record<string, string>)["Content-Type"];
                }
            }
            response = await fetch(url, { ...options, headers: retryHeaders });
        } else {
            if (typeof window !== "undefined") {
                localStorage.removeItem("palantint_token");
                localStorage.removeItem("palantint_refresh_token");
                document.cookie = "palantint_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                document.cookie = "palantint_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
            }
        }
    }

    const contentType = response.headers.get("Content-Type");
    const isJson = contentType && contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        const detail = (typeof data === "object" && data !== null) ? (data.detail || data.message) : data;
        throw new Error(`fetchPrivate "${endpoint}" failed with status ${response.status}: ${detail || "An error occurred"}`);
    }

    return data;
}

export async function fetchPublic(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (options.body && options.body instanceof FormData) {
        if (headers && typeof headers === 'object' && "Content-Type" in headers) {
            delete (headers as Record<string, string>)["Content-Type"];
        }
    }

    const response = await fetch(url, { ...options, headers });

    const contentType = response.headers.get("Content-Type");
    const isJson = contentType && contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        const detail = (typeof data === "object" && data !== null) ? (data.detail || data.message) : data;
        throw new Error(`fetchPublic "${endpoint}" failed with status ${response.status}: ${detail || "An error occurred"}`);
    }

    return data;
}

// Deprecated alias for fetchPrivate (or direct route if auth/login)
export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    if (endpoint.startsWith("/auth/login")) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            "Content-Type": "application/json",
            ...options.headers,
        };
        const response = await fetch(url, { ...options, headers });
        const contentType = response.headers.get("Content-Type");
        const isJson = contentType && contentType.includes("application/json");
        const data = isJson ? await response.json() : await response.text();
        if (!response.ok) {
            throw new Error(data.detail || data.message || "An error occurred");
        }
        return data;
    }
    return fetchPrivate(endpoint, options);
}

export const getStudentImageUrl = (studentId: string): string => {
    if (!studentId) return "";
    const token = typeof window !== "undefined" ? localStorage.getItem("palantint_token") : null;
    return `${API_BASE_URL}/private/students/${studentId}/image${token ? `?token=${token}` : ""}`;
};
