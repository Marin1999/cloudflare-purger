const http = require('http');
const config = require('./config');
const { purgeUrls } = require('./cloudflareClient');
const { verifyGhostSignature } = require('./ghostSignature');
const { readRequestBody, sendText } = require('./httpUtils');

function buildPostUrlFromSlug(slug) {
  if (!slug) {
    return null;
  }

  const normalizedSlug = slug.replace(/^\/+|\/+$/g, '');

  if (!normalizedSlug) {
    return null;
  }

  return `${config.siteUrl}/${normalizedSlug}/`;
}

function getUpdatedPostPurgeUrl(currentPost) {
  if (!config.purgeUpdatedPostUrl) {
    return null;
  }

  return buildPostUrlFromSlug(currentPost?.slug);
}

async function handleRequest(req, res) {
  if (req.method !== 'POST') {
    return sendText(res, 405, 'Method Not Allowed');
  }

  if (req.url !== config.purgePath) {
    return sendText(res, 404, 'Not Found');
  }

  try {
    const body = await readRequestBody(req);
    const signatureHeader = req.headers['x-ghost-signature'];

    if (!verifyGhostSignature(body, signatureHeader, config.ghostWebhookSecret)) {
      console.warn('Rejected webhook with invalid signature');
      return sendText(res, 401, 'Unauthorized');
    }

    const payload = JSON.parse(body);
    const currentPost = payload?.post?.current;
    const updatedPostPurgeUrl = getUpdatedPostPurgeUrl(currentPost);

    console.log('Updated post purge URL:', updatedPostPurgeUrl);

    const urlsToPurge = [...new Set([
      ...config.purgeUrls,
      ...(updatedPostPurgeUrl ? [updatedPostPurgeUrl] : [])
    ])];

    await purgeUrls({
      apiToken: config.cloudflareApiToken,
      urls: urlsToPurge,
      zoneId: config.cloudflareZoneId
    });

    console.log(`Purged cache for ${urlsToPurge.join(', ')}`);
    return sendText(res, 200, 'Cache purged');
  } catch (error) {
    console.error('Failed to process purge request:', error);
    return sendText(res, 500, 'Purge failed');
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

server.listen(config.port, () => {
  console.log(`Cache purger listening on port ${config.port}`);
});
