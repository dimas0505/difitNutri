const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('🔧 Configurando proxy para /api -> http://localhost:8000');
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('📤 Proxy Request:', req.method, req.url, '-> http://localhost:8000' + req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('📥 Proxy Response:', proxyRes.statusCode, req.url);
      },
      onError: (err, req, res) => {
        console.error('❌ Proxy Error:', err.message, 'for', req.url);
      }
    })
  );
};
