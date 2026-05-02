
interface FetcherOptions {
    body?: any;
    method?: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
    useToken: boolean;
    headers?: Record<string, string>;
    c_type?: string;
    _retryCount?: number;
    timeout?: number;
    throwOnError?: boolean;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    status?: number;
}

class ApiError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

const getCookie = (name: string): string | null => {
    // Check if we're in browser environment
    if (typeof document === "undefined") return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
};

const setCookie = (name: string, value: string, days = 7) => {
    if (typeof document === "undefined") return;

    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

function LocalStorageClear(key: string) {
    if (typeof window !== "undefined") {
        localStorage.removeItem(key);
    }
}

function clearCookie(name: string) {
    document.cookie = `${name}=; Max-Age=0; path=/;`;
}

const redirectToLogin = () => {
    if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/auth/login"
    ) {
        const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL || "/auth/login";
        window.location.href = loginUrl;

        return;
    }
};

export const fetcher = async <T = any>(
    url: string,
    options: FetcherOptions
): Promise<ApiResponse<T>> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        options.timeout || 30000
    );

    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        const accessToken = getCookie("Authorization_token");

        let csrfToken = "";

        const method = options.method || "GET";

        const headers: Record<string, string> = {
            "x-csrf-token": csrfToken,
            "Accept-Language": options.headers?.["accept-language"] || localStorage.getItem("language") || "en",
            ...options.headers,
        };

        let body: string | FormData | Blob | undefined;

        if (options.body !== undefined) {
            if (options.body instanceof FormData || options.body instanceof Blob) {
                body = options.body;
            } else if (typeof options.body === "string") {
                body = options.body;
                headers["Content-Type"] = options.c_type || "application/json";
            } else {
                body = JSON.stringify(options.body);
                headers["Content-Type"] = options.c_type || "application/json";
            }
        } else {
            headers["Content-Type"] = options.c_type || "application/json";
        }

        if (options.useToken && accessToken) {
            headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const res = await fetch(`${baseUrl}${url}`, {
            method,
            body,
            headers,
            credentials: "include",
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let responseData: any;

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            try {
                responseData = await res.json();
            } catch {
                const apiError = new ApiError(
                    "Invalid JSON response",
                    res.status,
                    `HTTP_${res.status}`
                );
                if (options.throwOnError) throw apiError;
                return {
                    success: false,
                    error: apiError.message,
                    status: apiError.status,
                };
            }
        } else if (
            contentType.includes("application/pdf") ||
            contentType.includes("application/octet-stream")
        ) {
            responseData = await res.blob();
        } else {
            responseData = await res.text();
        }


        if (
            !res.ok &&
            (res.status === 401 ||
                responseData?.message === "Unauthorized" ||
                responseData?.message?.name === "TokenExpiredError")
        ) {
            LocalStorageClear("Authorization");
            clearCookie("Authorization_token");
            redirectToLogin();

            const error = {
                success: false as const,
                error: "Unauthorized. Redirecting to login...",
                status: 401,
            };

            if (options.throwOnError) {
                throw new ApiError(error.error, error.status, "UNAUTHORIZED");
            }
            return error;
        }

        if (!res.ok) {
            const errorMessage =
                responseData?.message || `Request failed with status ${res.status}`;
            const apiError = new ApiError(
                errorMessage,
                res.status,
                `HTTP_${res.status}`
            );

            if (options.throwOnError) throw apiError;
            return {
                success: false,
                error: apiError.message,
                status: apiError.status,
            };
        }

        return {
            success: true,
            data: responseData,
            status: res.status,
        };
    } catch (error: any) {
        clearTimeout(timeoutId);

        let errorResponse;

        // Handle timeout error
        if (error.name === "AbortError") {
            errorResponse = {
                success: false as const,
                error: "Request timeout: The server took too long to respond",
                status: 408,
            };
        } else if (error instanceof ApiError) {
            errorResponse = {
                success: false as const,
                error: error.message,
                status: error.status,
            };
        } else if (
            error instanceof TypeError &&
            error.message.includes("Failed to fetch")
        ) {
            errorResponse = {
                success: false as const,
                error: "Network error: Unable to connect to the server",
                status: 0,
            };
        } else {
            errorResponse = {
                success: false as const,
                error: error.message || "Something went wrong",
                status: 500,
            };
        }

        // If throwOnError is enabled, throw the error instead of returning it
        if (options.throwOnError) {
            throw new ApiError(
                errorResponse.error,
                errorResponse.status,
                "API_ERROR"
            );
        }

        return errorResponse;
    }
};