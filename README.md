# Cloudflare Cache Purger

Small Node.js webhook server that verifies a Ghost webhook signature and purges configured URLs from Cloudflare.

## What It Does

When the server receives a valid `POST` request on the configured path, it calls the Cloudflare purge cache API for the URLs configured in `PURGE_URLS`.

```text
PURGE_URLS=/,/about/,/contact/
```

When `PURGE_UPDATED_POST_URL=true`, the server also purges the updated post URL from the Ghost webhook payload when `post.current.url` or `post.current.slug` is present.

## Requirements

- Node.js `20+`
- A Cloudflare API token with cache purge permission for the target zone
- A Ghost webhook secret shared with your Ghost instance

## Environment Variables

Copy `.env.example` and set these values:

```env
SITE_URL=https://example.com
PURGE_URLS=/,/about/,/contact/
PURGE_UPDATED_POST_URL=false
PURGE_PATH=/purge-cache
PORT=3001
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
GHOST_WEBHOOK_SECRET=your_ghost_webhook_secret
```

Notes:

- `PORT` is optional and defaults to `3001`.
- `SITE_URL` should not include a trailing slash.
- `PURGE_URLS` is optional and defaults to `/`.
- `PURGE_URLS` accepts comma-separated relative paths or full URLs.
- `PURGE_UPDATED_POST_URL` is optional and defaults to `false`. Set it to `true` to purge the updated post URL from the webhook payload.
- `PURGE_PATH` should begin with `/`.

## Run Locally

```bash
npm start
```

You should see:

```text
Cache purger listening on port 3001
```

## Ghost Signature Format

This server expects Ghost's `x-ghost-signature` header format:

```text
t=<timestamp>, sha256=<signature>
```

The signature is verified against the raw request body using `GHOST_WEBHOOK_SECRET`.

## Docker

Build the image:

```bash
docker build -t cloudflare-purger .
```

Run it:

```bash
docker run --rm -p 3001:3001 \
  -e PORT=3001 \
  -e SITE_URL=https://example.com \
  -e PURGE_URLS=/,/about/,/contact/ \
  -e PURGE_UPDATED_POST_URL=false \
  -e PURGE_PATH=/purge-cache \
  -e CLOUDFLARE_API_TOKEN=your_token \
  -e CLOUDFLARE_ZONE_ID=your_zone_id \
  -e GHOST_WEBHOOK_SECRET=your_secret \
  cloudflare-purger
```

## Responses

- `200 Cache purged` for a successful purge
- `401 Unauthorized` for an invalid or missing signature
- `404 Not Found` for the wrong path
- `405 Method Not Allowed` for non-`POST` requests
- `500 Purge failed` if Cloudflare rejects the purge or another server error occurs
