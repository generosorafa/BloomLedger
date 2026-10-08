import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseMarketFeed,isMarketFresh,quantityQuote} from '../src/market.mjs';
import {evaluateItem,evaluateNpc} from '../src/analytics.mjs';
const now=()=>new Date().toISOString();
const fixture=(prices,offers={})=>({schema:'bloom-market-v1',currency:'FLOWER',source:'test',fetchedAt:now(),marketUpdatedAt:now(),prices,offers});
test('strictly reject feeds without verified currency',()=>{
 assert.throws(()=>parseMarketFeed({prices:{Wheat:0.1}}),/Moeda/);
 assert.throws(()=>parseMarketFeed({currency:'USD',prices:{Wheat:0.1}}),/Moeda/);
 assert.throws(()=>parseMarketFeed({currency:'FLOWER',prices:{Wheat:-1}}),/Nenhum/);
});
test('accept a valid offer book but reject fake/unpriced entries',()=>{
 const r=parseMarketFeed({currency:'FLOWER',prices:{Cauliflower:{lowestAsk:0.01,offers:[{price:0.012,quantity:20},{price:0.01,quantity:10}]},Wheat:0.02,Fake:-1}});
 assert.deepEqual(r.prices,{Cauliflower:0.01,Wheat:0.02});
 assert.equal(r.offers.Cauliflower.length,2);
 assert.ok(isMarketFresh(r));
});
test('use available quantities instead of multiplying by misleading minimum ask',()=>{
 const snapshot=fixture({Cauliflower:0.01},{Cauliflower:[{price:0.01,quantity:10},{price:0.02,quantity:50}]});
 assert.equal(quantityQuote('Cauliflower',60,snapshot).total,1.1);
 assert.equal(quantityQuote('Cauliflower',61,snapshot),null);
});
test('stale snapshots cannot supply automatic recommendations',()=>{
 const stale=fixture({Wheat:0.02});stale.fetchedAt=new Date(Date.now()-3*60*60*1000).toISOString();
 assert.equal(isMarketFresh(stale),false);
 assert.equal(evaluateItem('Wheat',1,{snapshot:stale}).cost,null);
});
test('4 Gordo burgers cost recipe resources; choose lower finished offer if available',()=>{
 const ingredients=fixture({Cauliflower:0.01,Wheat:0.02});
 assert.equal(evaluateItem('Cauliflower Burger',4,{snapshot:ingredients}).craftCost,1);
 assert.equal(evaluateItem('Cauliflower Burger',4,{snapshot:ingredients}).cost,1);
 const finished=fixture({Cauliflower:0.01,Wheat:0.02,'Cauliflower Burger':0.18});
 const c=evaluateItem('Cauliflower Burger',4,{snapshot:finished});
 assert.equal(c.buyCost,0.72);assert.equal(c.cost,0.72);assert.equal(c.method,'buy');
});
test('npc average tracks coverage and distinguishes estimated reference',()=>{
 const npc={name:'Gordo',averageReward:1,orders:[[4,'Cauliflower Burger'],[1,'Unknown']]};
 const v=evaluateNpc(npc,{prices:{Cauliflower:.005,Wheat:.015}});
 assert.equal(v.pricedCount,1);assert.equal(v.totalCount,2);assert.equal(v.status,'caution');
 assert.equal(v.orders[1].status,'unknown');
});
test('catalog lists 24 NPCs and 62 reference FLOWER deliveries',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../data/npcs.json',import.meta.url),'utf8'));
 assert.equal(data.npcs.length,24);
 assert.equal(data.npcs.filter(n=>n.type==='FLOWER').length,6);
 assert.equal(data.npcs.filter(n=>n.type==='COINS').length,7);
 assert.equal(data.npcs.filter(n=>n.type==='TICKETS').length,11);
 assert.equal(data.npcs.filter(n=>n.type==='FLOWER').reduce((s,n)=>s+n.orders.length,0),62);
});
