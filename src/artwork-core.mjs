// Pure data helpers, independent of browser APIs.
// A public repository and a readable URL are not a licence to redistribute artwork.
export function safeArtworkUrl(value) {
  if (typeof value !== 'string' || value.length > 1500) return null;
  const url = value.trim();
  if (/^https:\/\/[^\s]+$/i.test(url)) {
    try {const parsed = new URL(url); return parsed.username || parsed.password ? null : parsed.toString();}
    catch {return null;}
  }
  // Only paths within the project's own assets folder (not traversal or external protocols).
  if (url.startsWith('./assets/') && !url.includes('..') && !/[?#\\<>\s]/.test(url) &&
      /^\.\/assets\/[\w./-]+\.(?:png|webp|jpg|jpeg|gif|svg)$/i.test(url)) return url;
  return null;
}
export function sanitizeArtworkManifest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('O catálogo precisa ser um objeto JSON.');
  const output = {npc: {}, item: {}};
  for (const kind of ['npc', 'item']) {
    const group = value[kind];
    if (group === undefined) continue;
    if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error(`O campo ${kind} deve ser um objeto.`);
    const records = Object.entries(group);
    if (records.length > 500) throw new Error('Limite de 500 imagens por grupo.');
    for (const [name, entry] of records) {
      if (name.length > 120 || !name.trim() || ['__proto__','constructor','prototype'].includes(name)) throw new Error('Nome de item inválido.');
      // Empty strings and null mean "permission still pending", not an image.
      if (entry === '' || entry === null) continue;
      const url = safeArtworkUrl(entry);
      if (!url) throw new Error(`Caminho inseguro ou inválido para ${name}. Use HTTPS ou ./assets/arquivo.png.`);
      Object.defineProperty(output[kind],name,{value:url,enumerable:true,writable:true,configurable:true});
    }
  }
  return output;
}
export function mergedArtworks(base, overrides) {
  return {npc: {...base.npc, ...overrides.npc}, item: {...base.item, ...overrides.item}};
}
export function artworkStats(config, catalog) {
  const npcs = [...new Set(catalog.npc)];
  const items = [...new Set(catalog.item)];
  const found = npcs.filter(x => !!config.npc[x]).length + items.filter(x => !!config.item[x]).length;
  return {found, total: npcs.length + items.length};
}
