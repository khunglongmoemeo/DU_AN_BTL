/**
 * Proxy config cho dev environment
 * /api/* -> localhost:5000 (backend)
 */
export default {
  dev: {
    // Proxy /api/ sang backend
    '/api/': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
    // Proxy /socket.io/ sang backend (Socket.IO)
    '/socket.io/': {
      target: 'http://localhost:5000',
      ws: true,
      changeOrigin: true,
    },
    '/v1/': {
      target: 'http://203.162.10.108:8099',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
  test: {
    '/v2.2/': {
      target: 'https://apidev.sotaydangvien.com',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
  pre: {
    '/v2.2/': {
      target: 'https://apidev.sotaydangvien.com',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
};
