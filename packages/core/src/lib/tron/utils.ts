export function toBytes32Hex(value: string): string {
  // Ensure a 0x-prefixed 32-byte hex string for bytes32 params
  let hex = value.startsWith('0x') ? value.slice(2) : value;
  hex = hex.toLowerCase();
  if (hex.length > 64) {
    hex = hex.slice(hex.length - 64);
  }
  if (hex.length < 64) {
    hex = hex.padStart(64, '0');
  }
  return `0x${hex}`;
}
