const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:8000';

  app.use(
    ['/admin', '/api', '/css', '/js/admin', '/uploads'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      cookieDomainRewrite: 'localhost',
    })
  );
};
