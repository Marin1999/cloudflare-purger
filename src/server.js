const http = require('http');
const crypto = require('crypto');

const {
  PORT = 3001,
  SITE_URL,
  PURGE_PATH,
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ZONE_ID,
  GHOST_WEBHOOK_SECRET
} = process.env;

const REQUIRED_ENV_VARS = [
  'SITE_URL',
  'PURGE_PATH',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ZONE_ID',
  'GHOST_WEBHOOK_SECRET'
];

validateEnvironment();

function validateEnvironment() {
  const missingVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missingVars.length === 0) {
    return;
  }

  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function parseSignatureHeader(signatureHeader) {
  if (!signatureHeader) {
    return null;
  }

  return signatureHeader.split(',').reduce((parts, part) => {
    const [key, value] = part.split('=');

    if (key && value) {
      parts[key.trim()] = value.trim();
    }

    return parts;
  }, {});
}

function verifyGhostSignature(rawBody, signatureHeader, secret) {
  const signatureParts = parseSignatureHeader(signatureHeader);

  if (!signatureParts?.t || !signatureParts?.sha256) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${signatureParts.t}.${rawBody}`)
    .digest('hex');

  const receivedBuffer = Buffer.from(signatureParts.sha256, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

async function purgeHomepage() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: [`${SITE_URL}/`]
      })
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(`Cloudflare purge failed: ${JSON.stringify(data)}`);
  }
}

async function handleRequest(req, res) {
  if (req.method !== 'POST') {
    return sendText(res, 405, 'Method Not Allowed');
  }

  if (req.url !== PURGE_PATH) {
    return sendText(res, 404, 'Not Found');
  }

  try {
    const body = await readRequestBody(req);
    const signatureHeader = req.headers['x-ghost-signature'];

    if (!verifyGhostSignature(body, signatureHeader, GHOST_WEBHOOK_SECRET)) {
      console.warn('Rejected webhook with invalid signature');
      return sendText(res, 401, 'Unauthorized');
    }

    await purgeHomepage();
    console.log(`Purged homepage cache for ${SITE_URL}/`);
    return sendText(res, 200, 'Homepage cache purged');
  } catch (error) {
    console.error('Failed to process purge request:', error);
    return sendText(res, 500, 'Purge failed');
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`Cache purger listening on port ${PORT}`);
});
