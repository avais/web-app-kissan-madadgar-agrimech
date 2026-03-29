// environment.js
// This file can be modified on the live production server without rebuilding the application.
(function (window) {
  window.__env = window.__env || {};

  // API url
  //window.__env.apiUrl = 'http://localhost:9089';

  // Example for production server:
  window.__env.apiUrl = 'https://kissanmadadgar.agrimech.gop.pk';

  // Whether or not to enable debug mode
  window.__env.production = true;
}(this));
