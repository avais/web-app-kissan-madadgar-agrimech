// @ts-ignore
const env = window.__env || window.env || {};

export const environment = {
  production: env.production !== undefined ? env.production : false,
  apiUrl: env.apiUrl || 'https://kissanmadadgar.agrimech.gop.pk'
  //apiUrl: env.apiUrl || 'http://localhost:9089'
};
