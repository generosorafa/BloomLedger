// Run on trusted GitHub Actions runner. Source URL / currency need manual confirmation.
import fs from 'node:fs/promises';
import {parseMarketFeed} from '../src/market.mjs';
const url=process.env.P2P_SOURCE_URL;
if(!url) {console.error('P2P_SOURCE_URL ausente: nenhuma cotação inventada ou gerada.');process.exit(2)}
const parsed=new URL(url);
if(parsed.protocol!=='https:')throw new Error('Feed must use HTTPS');
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
let resp;
try{resp=await fetch(url,{signal:controller.signal,headers:{'accept':'application/json','user-agent':'BloomLedgerCommunityMarketSync/0.4'}})}finally{clearTimeout(timer)}
if(!resp.ok)throw new Error(`Feed HTTP ${resp.status}`);
const payload=await resp.json();
const snapshot=parseMarketFeed(payload,{confirmedCurrency:process.env.P2P_SOURCE_CURRENCY,source:parsed.hostname});
const catalog=JSON.parse(await fs.readFile(new URL('../data/npcs.json',import.meta.url),'utf8'));
const names=new Set(catalog.npcs.flatMap(n=>n.orders?.map(([,item])=>item)??[]));
const coverage=[...names].filter(n=>Object.hasOwn(snapshot.prices,n));
if(coverage.length<2)throw new Error(`Cobertura insuficiente: ${coverage.length} comidas cotadas. Não sobrescrever cache.`);
await fs.writeFile(new URL('../data/p2p-latest.json',import.meta.url),JSON.stringify(snapshot,null,2)+'\n');
console.log(`Mercado atualizado: ${Object.keys(snapshot.prices).length} itens, ${coverage.length} entregas reconhecidas, ${snapshot.fetchedAt}`);
