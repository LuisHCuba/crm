// Shim mínimo de "crypto" para o browser. O bcryptjs só usa
// crypto.randomBytes (na geração de salt). compareSync não precisa disso,
// mas o require acontece no carregamento do módulo. Implementamos randomBytes
// via WebCrypto (getRandomValues), evitando puxar todo o crypto-browserify.
export function randomBytes(size: number): Uint8Array {
  const arr = new Uint8Array(size);
  globalThis.crypto.getRandomValues(arr);
  return arr;
}

export default { randomBytes };
