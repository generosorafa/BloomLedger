import test from 'node:test';
import assert from 'node:assert/strict';
import {flattenIngredients,computeOrder,normalizePrices,classifyMargin} from '../src/core.mjs';
test('Gordo: 4 burgers = 60 cauliflower + 20 wheat',()=>{
  assert.deepEqual(flattenIngredients('Cauliflower Burger',4),{Cauliflower:60,Wheat:20});
});
test('Goblin Brunch expands the complete nested recipe',()=>{
  assert.deepEqual(flattenIngredients('Goblin Brunch'),{ Egg:50,Pumpkin:10,Radish:20,Cabbage:10 });
});
test('calculates P2P cost, profits and ROI (illustrative values)',()=>{
  const r=computeOrder({item:'Cauliflower Burger',qty:4,reward:1,prices:{Cauliflower:.0068,Wheat:.0187}});
  assert.ok(Math.abs(r.opportunity-.782)<1e-10);
  assert.ok(Math.abs(r.profit-.218)<1e-10);
  assert.ok(Math.abs(r.roi-27.87723785166)<1e-9);
  assert.equal(r.minutes,720);
});
test('inventory reduces outlay, never economic opportunity cost',()=>{
  const r=computeOrder({item:'Cauliflower Burger',qty:4,reward:1,prices:{Cauliflower:.0068,Wheat:.0187},inventory:{Cauliflower:50,Wheat:20}});
  assert.ok(Math.abs(r.outlay-.068)<1e-10);
  assert.ok(Math.abs(r.opportunity-.782)<1e-10);
});
test('does not invent a profit when a resource price is missing',()=>{
  const r=computeOrder({item:'Cauliflower Burger',qty:4,reward:1,prices:{Cauliflower:.0068}});
  assert.equal(r.complete,false);assert.equal(r.profit,null);assert.deepEqual(r.missing,['Wheat']);
});
test('supports common flat and nested community JSON shapes',()=>{
  assert.deepEqual(normalizePrices({prices:{Cauliflower:{floorPrice:'0.0068'},Wheat:0.0187}}),{Cauliflower:.0068,Wheat:.0187});
  assert.deepEqual(normalizePrices([{name:'Cauliflower',price:.0068}]),{Cauliflower:.0068});
});
test('rejects negative prices and invalid quantity',()=>{
  assert.deepEqual(normalizePrices({Cauliflower:-2,Wheat:0}),{Wheat:0});
  assert.throws(()=>computeOrder({item:'Cauliflower Burger',qty:0,reward:1,prices:{}}),/inválidos/);
});

test('colors follow gross reward margin, not cost ROI',()=>{
  assert.equal(classifyMargin(50,5),'caution');
  assert.equal(classifyMargin(50.001,5),'excellent');
  assert.equal(classifyMargin(0,0),'caution');
  assert.equal(classifyMargin(-1,-0.1),'loss');
  assert.equal(classifyMargin(null,null),'unknown');
});
test('cauliflower burger margin and status use order reward',()=>{
  const p={Cauliflower:.0068,Wheat:.0187};
  assert.equal(computeOrder({item:'Cauliflower Burger',qty:4,reward:2,prices:p}).status,'excellent');
  assert.equal(computeOrder({item:'Cauliflower Burger',qty:4,reward:1,prices:p}).status,'caution');
  assert.equal(computeOrder({item:'Cauliflower Burger',qty:4,reward:.5,prices:p}).status,'loss');
  assert.equal(computeOrder({item:'Cauliflower Burger',qty:4,reward:1,prices:{Cauliflower:0}}).status,'unknown');
});
