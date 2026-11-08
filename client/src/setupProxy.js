const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Configure Create React App dev-server proxy
 * Only proxies /api and /socket.io requests to backend on port 8000
 * Prevents Webpack internal *.hot-update.json files from being routed to the backend
 */
module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      logLevel: 'warn',
      onError: (err, req, res) => {
        if (!res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              message:
                'Backend server is not reachable on http://localhost:8000. Please run "npm run dev" in tech-share-web/server.',
            })
          );
        }
      },
    })
  );

  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      ws: true,
      logLevel: 'warn',
    })
  );
};

