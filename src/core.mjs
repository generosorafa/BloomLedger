// Independent economic model. No Sunflower Land copyrighted game code is copied.
export const RECIPES = Object.freeze({
  'Cauliflower Burger': { building:'Kitchen', seconds:10800, xp:255, ingredients: { Cauliflower:15, Wheat:5 } },
  'Bumpkin Salad': { building:'Kitchen', seconds:12600, xp:290, ingredients: { Beetroot:20, Parsnip:10 } },
  'Bumpkin ganoush': { building:'Kitchen', seconds:18000, xp:1000, ingredients: { Eggplant:30, Potato:50, Parsnip:10 } },
  "Goblin's Treat": { building:'Kitchen', seconds:21600, xp:500, ingredients: { Pumpkin:10, Radish:20, Cabbage:10 } },
  'Boiled Eggs': { building:'Fire Pit', seconds:3600, xp:90, ingredients: { Egg:10 } },
  'Goblin Brunch': { building:'Kitchen', seconds:43200, xp:2500, ingredients: { 'Boiled Eggs':5, "Goblin's Treat":1 } },
  'Roast Veggies': { building:'Kitchen', seconds:7200, xp:170, ingredients: { Cauliflower:15, Carrot:10 } },
  'Club Sandwich': { building:'Kitchen', seconds:10800, xp:170, ingredients: { Sunflower:100, Carrot:25, Wheat:5 } },
  'Mashed Potato': { building:'Fire Pit', seconds:30, xp:3, ingredients: { Potato:8 } },
  'Bumpkin Roast': { building:'Kitchen', seconds:43200, xp:2500, ingredients: { 'Mashed Potato':20, 'Roast Veggies':5 } },
});
export const ORDERS = Object.freeze([
  { id:'gordo-burger', npc:'Gordo', item:'Cauliflower Burger', qty:4, reference:1.0 },
  { id:'gordo-salad', npc:'Gordo', item:'Bumpkin Salad', qty:3, reference:1.0 },
  { id:'gordo-ganoush', npc:'Gordo', item:'Bumpkin ganoush', qty:1, reference:1.0 },
  { id:'gordo-brunch', npc:'Gordo', item:'Goblin Brunch', qty:1, reference:1.0 },
  { id:'grimbly-veggies', npc:'Grimbly', item:'Roast Veggies', qty:1, reference:0.4 },
  { id:'grimbly-sandwich', npc:'Grimbly', item:'Club Sandwich', qty:1, reference:0.4 },
]);
const cleanNumber = v => typeof v === 'number' ? v : (typeof v === 'string' && v.trim() ? Number(v.replace(',','.')) : NaN);
export function flattenIngredients(name, quantity=1, stack=[]) {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantidade inválida');
  if (!RECIPES[name]) return { [name]:quantity };
  if (stack.includes(name)) throw new Error('Ciclo de receitas detectado');
  const totals={};
  for (const [ingredient,count] of Object.entries(RECIPES[name].ingredients)) {
    for (const [resource,value] of Object.entries(flattenIngredients(ingredient, quantity*count, [...stack,name]))) {
      totals[resource]=(totals[resource]||0)+value;
    }
  }
  return totals;
}
// Margem calculada sobre a recompensa do pedido, não sobre o custo (ROI).
// >50% verde; entre 0% e 50% inclusive laranja; negativo vermelho.
export function classifyMargin(margin, profit) {
  if (profit === null || !Number.isFinite(profit)) return 'unknown';
  if (profit < -1e-10) return 'loss';
  if (margin === null || !Number.isFinite(margin)) return 'unknown';
  return margin > 50 + 1e-10 ? 'excellent' : 'caution';
}
export function computeOrder({item,qty,reward,prices,inventory={},extra=0}) {
  const n=cleanNumber(qty), r=cleanNumber(reward), fee=cleanNumber(extra);
  if (!Number.isFinite(n)||n<=0||!Number.isInteger(n)||!Number.isFinite(r)||r<0||!Number.isFinite(fee)||fee<0) throw new Error('Quantidade, recompensa ou custos inválidos');
  const amounts=flattenIngredients(item,n);
  const rows=Object.entries(amounts).map(([name,required])=>{
    const have=Math.max(0,cleanNumber(inventory[name])||0);
    const buy=Math.max(0,required-have);
    const price=cleanNumber(prices[name]);
    const valid=Number.isFinite(price)&&price>=0;
    return {name,required,have,buy,price:valid?price:null,opportunity:valid?price*required:null,outlay:valid?price*buy:null};
  });
  const missing=rows.filter(x=>x.price===null).map(x=>x.name);
  const complete=missing.length===0;
  const opportunity=complete?rows.reduce((a,x)=>a+x.opportunity,0):null;
  const outlay=complete?rows.reduce((a,x)=>a+x.outlay,0):null;
  const estimatedProfit=complete?r-opportunity-fee:null;
  const margin=complete && r>0 ? estimatedProfit/r*100 : null;
  const status=classifyMargin(margin,estimatedProfit);
  const finished=cleanNumber(prices[item]);
  const finishedCost=Number.isFinite(finished)&&finished>=0?finished*n:null;
  return {
    rows,missing,complete,reward:r,extra:fee,opportunity,outlay,finishedCost,
    profit:estimatedProfit,margin,status,
    cashProfit:complete?r-outlay-fee:null,
    roi:complete&&opportunity+fee>0?(r-opportunity-fee)/(opportunity+fee)*100:null,
    recommendation:complete && finishedCost!==null && finishedCost<opportunity?'Comprar pronto pode custar menos':'Comparar custo de produzir',
    minutes:RECIPES[item]?RECIPES[item].seconds*n/60:null,
    xp:RECIPES[item]?RECIPES[item].xp*n:null,
  };
}
export function normalizePrices(payload) {
  // Only FLOWER/unit prices; unknown currency, min orders and quantity-dependent offers are NOT converted.
  const root = (payload && typeof payload==='object') ? payload : {};
  const source = root.prices ?? root.resources ?? root.data ?? root;
  const records = Array.isArray(source)?source.map(x=>[x?.name??x?.item??x?.resource,x]):Object.entries(source);
  const output={};
  for (const [name,v] of records) {
    if (typeof name!=='string'||!name||name==='updated_at') continue;
    let candidate=v;
    if (v && typeof v==='object' && !Array.isArray(v)) {
      // Prefer quoted minimum ask over last trade, when field is present.
      candidate=v.lowestAsk ?? v.lowest_ask ?? v.floorPrice ?? v.floor_price ?? v.minPrice ?? v.min_price ?? v.price;
    }
    const number=cleanNumber(candidate);
    if (Number.isFinite(number)&&number>=0) output[name]=number;
  }
  return output;
}
