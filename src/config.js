const REQUIRED_ENV_VARS = [
  'SITE_URL',
  'PURGE_PATH',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ZONE_ID',
  'GHOST_WEBHOOK_SECRET'
];

function validateEnvironment() {
  const missingVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missingVars.length === 0) {
    return;
  }

  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

function parsePurgeUrls(siteUrl, purgeUrls = '/') {
  const urls = purgeUrls
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      const normalizedPath = url.startsWith('/') ? url : `/${url}`;
      return `${siteUrl}${normalizedPath}`;
    });

  if (urls.length === 0) {
    console.error('PURGE_URLS must contain at least one URL or path');
    process.exit(1);
  }

  return urls;
}

function parseBoolean(value) {
  return value === 'true';
}

validateEnvironment();

const siteUrl = process.env.SITE_URL.replace(/\/+$/, '');

module.exports = {
  port: process.env.PORT || 3001,
  siteUrl,
  purgeUrls: parsePurgeUrls(siteUrl, process.env.PURGE_URLS),
  purgeUpdatedPostUrl: parseBoolean(process.env.PURGE_UPDATED_POST_URL),
  purgePath: process.env.PURGE_PATH,
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
  cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID,
  ghostWebhookSecret: process.env.GHOST_WEBHOOK_SECRET
};
