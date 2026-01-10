/**
 * Generates a UUID v7 (time-ordered UUID)
 * Based on the draft RFC for UUIDv7
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 * Where the first 48 bits are a Unix timestamp in milliseconds
 */
export function generateUUIDv7(): string {
  const timestamp = Date.now();
  
  // Get timestamp bytes (48 bits = 6 bytes)
  const timestampHex = timestamp.toString(16).padStart(12, '0');
  
  // Generate random bytes for the rest
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);
  
  // Convert random bytes to hex
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Construct UUID v7
  // Format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
  // t = timestamp, x = random, y = variant (8, 9, a, or b)
  const uuid = [
    timestampHex.slice(0, 8),                           // First 8 hex chars of timestamp
    timestampHex.slice(8, 12),                          // Next 4 hex chars of timestamp
    '7' + randomHex.slice(0, 3),                        // Version 7 + 3 random hex chars
    ((parseInt(randomHex.slice(3, 4), 16) & 0x3) | 0x8).toString(16) + randomHex.slice(4, 7), // Variant + 3 random
    randomHex.slice(7, 19)                              // Remaining 12 random hex chars
  ].join('-');
  
  return uuid;
}

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}