import {sanitizeArtworkManifest, mergedArtworks, artworkStats} from './artwork-core.mjs';
const KEY = 'bloom-art-config-v02';
const empty = () => ({npc:{},item:{}});
let defaults = empty();
let overrides = empty();
try {const raw=localStorage.getItem(KEY);if(raw) overrides=sanitizeArtworkManifest(JSON.parse(raw));} catch {overrides=empty();}
const emoji = {
 'Cauliflower Burger':'🍔','Bumpkin Salad':'🥗','Roast Veggies':'🥕',
 'Club Sandwich':'🥪','Boiled Eggs':'🥚','Goblin Brunch':'🍽',
 'Cauliflower':'🥦',Wheat:'🌾',Beetroot:'🫜',Parsnip:'🥕',
 Eggplant:'🍆',Potato:'🥔',Pumpkin:'🎃',Radish:'🥬',Cabbage:'🥬',
 Egg:'🥚',Sunflower:'🌻',Carrot:'🥕',Gordo:'🧑‍🍳',Grimbly:'👨‍🌾'
};
const get = () => mergedArtworks(defaults,overrides);
export const artConfig = {
 async load(url='./data/artwork.json') {
   const response=await fetch(url,{cache:'no-store'});
   if(!response.ok) throw new Error(`Catálogo HTTP ${response.status}`);
   defaults=sanitizeArtworkManifest(await response.json());
   return defaults;
 },
 get,
 set(value){overrides=sanitizeArtworkManifest(value);try{localStorage.setItem(KEY,JSON.stringify(overrides))}catch{}},
 reset(){overrides=empty();try{localStorage.removeItem(KEY)}catch{}},
 stats(catalog){return artworkStats(get(),catalog)}
};
export function artwork(name,kind='item') {
 const wrapper=document.createElement('span');wrapper.className='artwork';
 wrapper.setAttribute('role','img');wrapper.setAttribute('aria-label',name);
 const url=get()[kind]?.[name];
 const fallback=() => document.createTextNode(emoji[name]||(kind==='npc'?'👤':'🌱'));
 if(url){
   const img=document.createElement('img');
   img.src=url;img.alt='';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
   img.addEventListener('error',()=>img.replaceWith(fallback()),{once:true});wrapper.append(img);
 } else wrapper.append(fallback());
 return wrapper;
}
