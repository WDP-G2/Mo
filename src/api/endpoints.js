export const ENDPOINTS = {
  auth: {
    register: '/users/register',
    login: '/users/login',
    me: '/users/me',
  },
  users: {
    list: '/users',
    byRole: (role) => `/users?role=${encodeURIComponent(role)}`,
  },
  tournaments: {
    list: '/tournaments',
  },
  news: {
    list: '/news',
  },
};

