const ROLE_ALIASES = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  HORSE_OWNER: 'OWNER',
  JOCKEY: 'JOCKEY',
  REFEREE: 'REFEREE',
  SPECTATOR: 'SPECTATOR',
  USER: 'USER',
};

export function normalizeRole(role) {
  if (!role) return null;
  const raw = String(role).replace(/^ROLE_/, '').trim();
  const upper = raw.toUpperCase();
  return ROLE_ALIASES[upper] || upper;
}

export function isAdminRole(role) {
  return normalizeRole(role) === 'ADMIN';
}

