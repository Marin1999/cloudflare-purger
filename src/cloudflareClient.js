async function purgeUrls({ apiToken, urls, zoneId }) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: urls
      })
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(`Cloudflare purge failed: ${JSON.stringify(data)}`);
  }
}

module.exports = {
  purgeUrls
};
