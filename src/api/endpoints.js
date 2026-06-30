export const ENDPOINTS = {
  auth: {
    register: '/users/register',
    login: '/users/login',
    me: '/users/me',
  },
  users: {
    list: '/users',
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
};
