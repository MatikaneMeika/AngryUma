// 纯原生 Node.js 极速静态服务器，零外部依赖
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const ROOT_DIR = __dirname;
let PORT = 8080;

function getLocalIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && (i.family === 'IPv4' || i.family === 4) && !i.internal && !i.address.startsWith('169.254'))
    .map(i => i.address);
}

function startServer(port) {
  const server = http.createServer((req, res) => {
    let reqUrl = decodeURI(req.url.split('?')[0]);
    if (reqUrl === '/') reqUrl = '/index.html';

    const filePath = path.normalize(path.join(ROOT_DIR, reqUrl));

    // 安全检查，禁止路径遍历
    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('403 Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end(`404 Not Found: ${reqUrl}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });

      fs.createReadStream(filePath).pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`端口 ${port} 已被占用，尝试 ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('服务器启动错误:', err);
    }
  });

  server.listen(port, () => {
    const localUrl = `http://localhost:${port}`;
    const ips = getLocalIPs();

    console.log('\n======================================================');
    console.log('   🐎 愤怒的马娘 (Angry Uma) 本地预览服务器已启动！');
    console.log('======================================================');
    console.log(`\n👉 本机电脑访问地址:   \x1b[36m${localUrl}\x1b[0m`);
    if (ips.length > 0) {
      console.log(`📱 手机局域网同一 WiFi 访问:`);
      ips.forEach(ip => console.log(`   \x1b[32mhttp://${ip}:${port}\x1b[0m`));
    }
    console.log('\n💡 提示: 按 Ctrl + C 即可关闭服务器。\n');

    // 自动调用默认浏览器打开
    const openCmd = process.platform === 'win32' ? `start ${localUrl}` :
                    process.platform === 'darwin' ? `open ${localUrl}` : `xdg-open ${localUrl}`;
    exec(openCmd, (error) => {
      if (error) console.log('（如浏览器未自动弹出，请手动复制上方地址打开）');
    });
  });
}

startServer(PORT);
