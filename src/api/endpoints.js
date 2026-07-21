export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    me: '/auth/me',
  },
  users: {
    list: '/users',
    profile: '/users/me/profile',
    jockeyDirectory: '/users/jockeys/directory',
    byRole: (role) => `/users?role=${encodeURIComponent(role)}`,
  },
  tournaments: {
    list: '/tournaments',
    ownerOpen: '/tournaments/owner/open',
    ownerRegistrations: '/tournaments/owner/registrations',
    jockeyRegistrations: '/tournaments/jockey/registrations',
  },
  news: {
    list: '/news',
  },
  horses: {
    list: '/horses',
  },
  invitations: {
    list: '/invitations',
    me: '/invitations/me',
    sent: '/invitations/sent',
    respond: (id) => `/invitations/${id}/respond`,
  },
  jockey: {
    dashboard: '/jockey/dashboard',
    races: '/jockey/races',
    performance: '/jockey/performance',
    prizes: '/jockey/prizes',
    profile: '/jockey/profile',
    invitations: '/jockey/invitations',
    acceptInvitation: (id) => `/jockey/invitations/${id}/accept`,
    rejectInvitation: (id) => `/jockey/invitations/${id}/reject`,
  },
  referee: {
    dashboard: '/referee/dashboard',
    races: '/referee/races',
    startRace: (id) => `/referee/races/${id}/start`,
    payments: '/referee/payments',
    invitations: '/referee/invitations',
    acceptInvitation: (id) => `/referee/invitations/${id}/accept`,
    rejectInvitation: (id) => `/referee/invitations/${id}/reject`,
  },
  owner: {
    dashboard: '/owner/dashboard',
    horses: '/owner/horses',
    raceRegistrations: '/owner/race-registrations',
    jockeyInvitations: '/owner/jockey-invitations',
    cancelJockeyInvitation: (id) => `/owner/jockey-invitations/${id}/cancel`,
  },
  spectator: {
    dashboard: '/spectator/dashboard',
  },
};
