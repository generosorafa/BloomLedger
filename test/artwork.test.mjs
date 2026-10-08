import test from 'node:test';
import assert from 'node:assert/strict';
import {safeArtworkUrl,sanitizeArtworkManifest,mergedArtworks,artworkStats} from '../src/artwork-core.mjs';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../data/artwork.json',import.meta.url),'utf8'));
test('project artwork manifest is valid with placeholders for unauthorized assets',()=>{
  assert.deepEqual(sanitizeArtworkManifest(manifest),{npc:{},item:{}});
  assert.ok('Gordo' in manifest.npc);
  assert.ok('Cauliflower Burger' in manifest.item);
  assert.ok('Wheat' in manifest.item);
});
test('only explicit HTTPS or local asset paths accepted',()=>{
  assert.equal(safeArtworkUrl('./assets/npcs/gordo.png'),'./assets/npcs/gordo.png');
  assert.equal(safeArtworkUrl('https://example.org/authorized/image.png'),'https://example.org/authorized/image.png');
  for(const value of ['javascript:alert(1)','http://example.com/a.png','../../secrets.json','./assets/../../secret.png','data:image/svg+xml,<svg>','./assets/fake.jpg?other=1']) {
    assert.equal(safeArtworkUrl(value),null,value);
  }
});
test('rejects dangerous and invalid catalog entries',()=>{
  assert.throws(()=>sanitizeArtworkManifest({npc:{Gordo:'javascript:alert(1)'}}),/inseguro/);
  assert.throws(()=>sanitizeArtworkManifest({npc:["x"]}),/objeto/);
  assert.throws(()=>sanitizeArtworkManifest(null),/objeto/);
});
test('merges approved assets and counts only configured entries',()=>{
  const configs=mergedArtworks({npc:{Gordo:'./assets/npcs/gordo.png'},item:{}},{npc:{},item:{Wheat:'./assets/items/wheat.png'}});
  assert.deepEqual(artworkStats(configs,{npc:['Gordo','Grimbly'],item:['Wheat','Cauliflower']}),{found:2,total:4});
});
