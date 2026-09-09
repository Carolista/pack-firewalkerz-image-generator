import {
	SUPABASE_PUBLISHABLE_KEY,
	SUPABASE_URL,
} from '../../src/services/supabaseConfig.js';

export const ADMIN_SESSION_KEY = 'packFirewalkerzAdminSession';

export function createAuthClient({ onSessionExpired } = {}) {
	let session = readSession();
	let reauthenticationResolver;

	async function authenticate(email, password) {
		const response = await fetch(
			`${SUPABASE_URL}/auth/v1/token?grant_type=password`,
			{
				method: 'POST',
				headers: {
					apikey: SUPABASE_PUBLISHABLE_KEY,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
			},
		);
		const data = await response.json();
		if (!response.ok) {
			throw new Error(
				data.error_description ?? data.msg ?? 'Sign-in failed.',
			);
		}
		session = data;
		persistSession(session);
		return session;
	}

	return {
		getSession() {
			return session;
		},
		async signIn(email, password) {
			return authenticate(email, password);
		},
		async signOut() {
			if (session?.access_token) {
				await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
					method: 'POST',
					headers: {
						apikey: SUPABASE_PUBLISHABLE_KEY,
						Authorization: `Bearer ${session.access_token}`,
					},
				}).catch(() => {});
			}
			clearSession();
			session = null;
		},
		async reauthenticate() {
			const pending = new Promise(resolve => {
				reauthenticationResolver = resolve;
			});
			onSessionExpired?.();
			return pending;
		},
		async completeReauthentication(email, password) {
			await authenticate(email, password);
			reauthenticationResolver?.();
			reauthenticationResolver = null;
		},
	};
}

function persistSession(session) {
	localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
	localStorage.removeItem(ADMIN_SESSION_KEY);
}

function readSession() {
	try {
		return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY));
	} catch {
		return null;
	}
}
