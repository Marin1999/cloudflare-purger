const crypto = require('crypto');

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

  const timestamp = signatureParts.t;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody + timestamp)
    .digest('hex');

  const receivedBuffer = Buffer.from(signatureParts.sha256, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

module.exports = {
  verifyGhostSignature
};
