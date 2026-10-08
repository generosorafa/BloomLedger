import {RECIPES,flattenIngredients,classifyMargin} from './core.mjs';
import {quantityQuote,isMarketFresh} from './market.mjs';

export function getPriceQuote(name, qty, {snapshot=null, prices={}}={}) {
  if(snapshot&&isMarketFresh(snapshot)) return quantityQuote(name,qty,snapshot);
  const unit=prices[name];
  return typeof unit==='number'&&Number.isFinite(unit)&&unit>=0 ? {total:unit*qty,method:'unit_estimate'} : null;
}
export function evaluateItem(item, qty, context) {
  if(!Number.isInteger(qty)||qty<=0)throw new Error('Quantidade inválida');
  const finished=getPriceQuote(item,qty,context);
  const canCraft=Boolean(RECIPES[item]);
  const ingredients=canCraft?flattenIngredients(item,qty):{[item]:qty};
  const lines=Object.entries(ingredients).map(([name,amount])=>{
    const quote=getPriceQuote(name,amount,context);
    return {name,qty:amount,cost:quote?.total??null,method:quote?.method??null};
  });
  const craftComplete=canCraft&&lines.every(line=>line.cost!==null);
  const craftCost=craftComplete?lines.reduce((n,line)=>n+line.cost,0):null;
  let cost=null,method='unavailable';
  if (finished!==null && (craftCost===null || finished.total <= craftCost)) {cost=finished.total;method='buy';}
  else if(craftCost!==null){cost=craftCost;method='craft';}
  return {item,qty,cost,method,buyCost:finished?.total??null,craftCost,ingredients:lines,missing:lines.filter(l=>l.cost===null).map(l=>l.name),estimateMethod:finished?.method};
}
export function evaluateNpc(npc,context, overrides={}) {
  const orders=(npc.orders??[]).map(([qty,item],index)=>{
    const choice=evaluateItem(item,qty,context);
    const override=overrides[`${npc.name}:${index}`];
    const explicit=typeof override==='number'&&Number.isFinite(override)&&override>=0;
    const reward=explicit?override:npc.averageReward;
    const profit=choice.cost!==null&&Number.isFinite(reward)?reward-choice.cost:null;
    const margin=profit!==null&&reward>0?profit/reward*100:null;
    return {...choice,index,reward,explicit,profit,margin,status:classifyMargin(margin,profit)};
  });
  const priced=orders.filter(o=>o.cost!==null);
  const averageCost=priced.length?priced.reduce((s,o)=>s+o.cost,0)/priced.length:null;
  const avgReward=npc.averageReward??null;
  const estimatedMargin=averageCost!==null&&avgReward>0?(avgReward-averageCost)/avgReward*100:null;
  return {npc,orders,pricedCount:priced.length,totalCount:orders.length,averageCost,averageReward:avgReward,estimatedMargin,
    status:averageCost!==null?classifyMargin(estimatedMargin,avgReward-averageCost):'unknown'};
}
