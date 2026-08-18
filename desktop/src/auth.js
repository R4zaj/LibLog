// Single source of truth for the librarian session. Every screen that reads or
// clears the session should go through here so logging out actually logs out.

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const isLoggedIn = () => !!getToken();

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // A corrupted user blob shouldn't take the whole app down.
    return null;
  }
};

export const setSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Auth header for fetch(). Omits the header entirely when there is no token,
// so we never send "Bearer null".
export const authHeaders = (extra = {}) => {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
};

// Display helpers for the profile widgets in the sidebar and page headers.
export const getDisplayName = () => {
  const u = getUser();
  if (!u) return 'Librarian';
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || u.email || 'Librarian';
};

export const getInitials = () => {
  const u = getUser();
  if (!u) return 'LB';
  const initials = [u.first_name, u.last_name]
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase();
  return initials || (u.email ? u.email.slice(0, 2).toUpperCase() : 'LB');
};

export const getRoleLabel = () => {
  const u = getUser();
  if (!u?.role) return 'Staff Access';
  return u.role === 'ADMIN' ? 'Admin Access' : `${u.role.charAt(0)}${u.role.slice(1).toLowerCase()} Access`;
};
