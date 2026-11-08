const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000';
  const options = { target, changeOrigin: true, logLevel: 'warn' };

  // Register on all requests so the first page load can attach the upgrade listener.
  app.use(createProxyMiddleware(
    (pathname) => pathname === '/socket.io' || pathname.startsWith('/socket.io/'),
    { ...options, ws: true }
  ));

  app.use('/api', createProxyMiddleware({
    ...options,
    onError: (_error, _req, res) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      res.status(503).json({
        success: false,
        message: `Backend server is not reachable at ${target}. Run "npm run dev:server" from the project root.`,
      });
    },
  }));

  app.use(['/admin', '/css', '/js/admin', '/uploads'], createProxyMiddleware(options));
};
