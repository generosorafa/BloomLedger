// All market data is public price information. No credentials run in the browser.
// Fail closed if source currency or price structure has not been verified.
const number = value => typeof value === 'number' ? value : (typeof value === 'string' && value.trim() ? Number(value.replace(',', '.')) : NaN);
const plain = v => v && typeof v === 'object' && !Array.isArray(v);
const positiveTime = value => { const n=Date.parse(value||''); return Number.isFinite(n)?n:null; };
export const MAX_QUOTE_AGE_MS = 90 * 60 * 1000;

export function parseMarketFeed(payload, { confirmedCurrency, source='Community feed', fetchedAt=new Date().toISOString() }={}) {
  if (!plain(payload)) throw new Error('Resposta de preços deve ser um objeto JSON');
  const nativeCurrency=String(payload.currency ?? payload.meta?.currency ?? payload.quoteCurrency ?? '').toUpperCase();
  if (nativeCurrency && nativeCurrency!=='FLOWER' && nativeCurrency!=='SFL') throw new Error(`Moeda nao suportada: ${nativeCurrency}`);
  const currency=nativeCurrency || String(confirmedCurrency||'').toUpperCase();
  if (currency!=='FLOWER' && currency!=='SFL') throw new Error('Moeda do mercado não validada (FLOWER/SFL). Configurar após conferir a API.');
  const pricesRoot=payload.prices ?? payload.resources ?? payload.data?.prices ?? payload.data ?? null;
  if (!pricesRoot || (!plain(pricesRoot) && !Array.isArray(pricesRoot))) throw new Error('Fonte sem lista de preços reconhecível');
  const entries=Array.isArray(pricesRoot)
    ? pricesRoot.map(x=>[x?.name??x?.item??x?.resource,x])
    : Object.entries(pricesRoot);
  const prices={}, offers={};
  for (const [name,raw] of entries) {
    if (typeof name!=='string' || !name || name.length>120 || name==='updated_at') continue;
    const info=plain(raw)?raw:{};
    const direct=plain(raw) ? (info.lowestAsk??info.lowest_ask??info.floorPrice??info.floor_price??info.minPrice??info.min_price??info.price) : raw;
    const value=number(direct);
    if(Number.isFinite(value) && value>=0 && value<=1000000) prices[name]=value;
    const rawOffers=info.offers??info.asks??info.listings;
    if(Array.isArray(rawOffers)) {
      const rows=rawOffers.map(o=>({price:number(o?.price??o?.unitPrice),quantity:number(o?.quantity??o?.amount??o?.available)}))
        .filter(o=>Number.isFinite(o.price)&&o.price>=0&&Number.isFinite(o.quantity)&&o.quantity>0);
      if(rows.length) {
        offers[name]=rows.sort((a,b)=>a.price-b.price).slice(0,500);
        if(prices[name]===undefined) prices[name]=offers[name][0].price;
      }
    }
  }
  if (!Object.keys(prices).length) throw new Error('Nenhum preço unitário validado');
  const time=positiveTime(payload.marketUpdatedAt ?? payload.updatedAt ?? payload.updated_at ?? payload.meta?.updated_at);
  const pulled=positiveTime(fetchedAt);
  if(pulled===null) throw new Error('Data de captura inválida');
  if(time!==null && time>Date.now()+5*60*1000) throw new Error('Fonte retornou atualização no futuro');
  // Timestamp of a fetch is not necessarily the time of the source's last trade.
  return {schema:'bloom-market-v1',currency:'FLOWER',source:String(source).slice(0,160),fetchedAt:new Date(pulled).toISOString(),marketUpdatedAt:time===null?null:new Date(time).toISOString(),prices,offers,priceMethod:'lowest_ask_or_price',currencyAlias:currency};
}
export function isMarketFresh(snapshot, now=Date.now()) {
  if (!plain(snapshot) || snapshot.schema!=='bloom-market-v1' || snapshot.currency!=='FLOWER') return false;
  const stamp=positiveTime(snapshot.fetchedAt);
  if(stamp===null || stamp>now+60000 || now-stamp>MAX_QUOTE_AGE_MS) return false;
  const marketTime=positiveTime(snapshot.marketUpdatedAt);
  if(marketTime!==null && (marketTime>now+60000 || now-marketTime>MAX_QUOTE_AGE_MS)) return false;
  return Object.keys(snapshot.prices??{}).length>0;
}
export function quantityQuote(item,qty,snapshot){
  if (!isMarketFresh(snapshot)) return null;
  if (!Number.isInteger(qty)||qty<=0) return null;
  const asks=snapshot.offers?.[item];
  if(Array.isArray(asks)&&asks.length){
    let remaining=qty,total=0;
    for(const {price,quantity} of [...asks].sort((a,b)=>a.price-b.price)){
      if(!Number.isFinite(price)||!Number.isFinite(quantity)||price<0||quantity<=0)continue;
      const count=Math.min(remaining,quantity);total+=count*price;remaining-=count;
      if(remaining<=1e-10) return {total,method:'orderbook',coverage:qty};
    }
    return null; // Never pretend the whole order is available at the floor price.
  }
  const price=snapshot.prices?.[item];
  return Number.isFinite(price)&&price>=0?{total:qty*price,method:'floor_estimate',coverage:null}:null;
}
