const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const getToken = (): string | null => {
	return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
	localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
	localStorage.removeItem(TOKEN_KEY);
};

export const getCurrentUser = (): Record<string, unknown> | null => {
	const raw = localStorage.getItem(USER_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
};

export const setCurrentUser = (user: Record<string, unknown>): void => {
	localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const removeCurrentUser = (): void => {
	localStorage.removeItem(USER_KEY);
};

export const logout = () => {
	removeToken();
	removeCurrentUser();
	localStorage.clear();
	window.location.href = '/user/login';
};

export const redirectByRole = (role: string): string => {
	switch (role) {
		case 'manager':
		case 'admin':
			return '/manager';
		case 'student':
			return '/student';
		default:
			return '/';
	}
};
