import {RECIPES,flattenIngredients} from './core.mjs';
import {isMarketFresh} from './market.mjs';
import {evaluateNpc,evaluateItem} from './analytics.mjs';
import {artConfig,artwork} from './artwork.mjs';
const $=id=>document.getElementById(id);
const state={npcs:[],snapshot:null,manual:{},mode:'automatic',filter:'ALL',search:'',sort:'game',selected:null,selectedOrder:null,overrides:{},fee:0,loading:false};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const num=(n,d=3)=>n==null||!Number.isFinite(n)?'—':n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const statusLabel={excellent:'EXCELENTE',caution:'ATENÇÃO',loss:'PREJUÍZO',unknown:'SEM DADOS'};
const key=(npc,i)=>`${npc.name}:${i}`;
const safeLoad=(name,defaultValue)=>{try{return JSON.parse(localStorage.getItem(name))??defaultValue}catch{return defaultValue}};
state.overrides=safeLoad('bloom-v04-rewards',{});
function saveRewards(){try{localStorage.setItem('bloom-v04-rewards',JSON.stringify(state.overrides))}catch{}}
function currentContext(){return state.mode==='automatic'?{snapshot:state.snapshot}:{prices:state.manual};}
function hasUsableSource(){return state.mode==='automatic'?isMarketFresh(state.snapshot):Object.keys(state.manual).length>0;}
function quoteState(){
  const banner=$('data-banner'), badge=$('header-market'),note=$('data-message');
  let message,kind='bad',label='SEM COTAÇÃO';
  if(state.mode==='manual'){
    kind='good';label='MANUAL / TESTE';message='Preços informados manualmente ou de demonstração. Não são cotações atuais do P2P.';
  } else if(isMarketFresh(state.snapshot)){
    kind='good';label='P2P SINCRONIZADO';message=`Cotação automática de ${state.snapshot.source}, capturada em ${new Date(state.snapshot.fetchedAt).toLocaleString('pt-BR')}. ${Object.keys(state.snapshot.prices).length} itens; não confundir preço mínimo com disponibilidade completa.`;
  } else if(state.snapshot?.fetchedAt){
    kind='bad';label='P2P DESATUALIZADO';message='O cache do P2P expirou ou a última atualização de mercado está antiga. Preços bloqueados para evitar recomendações erradas.';
  }else{message='Ainda não há cotação P2P validada. Configure a fonte no GitHub Actions ou visualize o modo de demonstração.';}
  banner.className=`banner ${kind}`;note.textContent=message;badge.className=`market-badge ${kind==='good'?'fresh':'stale'}`;badge.textContent='● '+label;
  $('last-updated').textContent=state.mode==='manual'?'Modo manual':state.snapshot?.fetchedAt?`Captura: ${new Date(state.snapshot.fetchedAt).toLocaleString('pt-BR')}`:'Mercado não configurado';
  $('source-name').textContent=state.mode==='manual'?'Manual / demonstração':state.snapshot?.source||'Não configurada';
  $('source-time').textContent=state.mode==='manual'?'Valores locais':state.snapshot?.fetchedAt?new Date(state.snapshot.fetchedAt).toLocaleString('pt-BR'):'—';
  $('source-currency').textContent=hasUsableSource()?'FLOWER':'—';
  $('source-items').textContent=String(state.mode==='manual'?Object.keys(state.manual).length:Object.keys(state.snapshot?.prices||{}).length);
  $('market-source').textContent=state.mode==='manual'?'PREÇOS MANUAIS':isMarketFresh(state.snapshot)?'SINCRONIZADO':'NÃO CONECTADO';
}
function npcView(npc){return evaluateNpc(npc,currentContext(),state.overrides)}
function makeAvatar(name){const a=el('div','avatar');a.append(artwork(name,'npc'));return a}
function renderTabs(){for(const b of document.querySelectorAll('[data-filter]'))b.classList.toggle('active',b.dataset.filter===state.filter);
 for(const [id,t] of [['num-all','ALL'],['num-flower','FLOWER'],['num-coins','COINS'],['num-tickets','TICKETS']]) $(id).textContent=String(t==='ALL'?state.npcs.length:state.npcs.filter(n=>n.type===t).length);
}
function buildCard(npc) {
  const view=npcView(npc),isFlower=npc.type==='FLOWER',card=el('article',`npc-card ${view.status}${state.selected===npc.name?' active':''}`);
  const head=el('div','npc-card-head');head.append(makeAvatar(npc.name));const headText=el('div');headText.append(el('h3','npc-name',npc.name));
  const tags=el('div','npc-tags');tags.append(el('span',`npc-type ${npc.type.toLowerCase()}`,npc.type==='FLOWER'?'✿ FLOWER':npc.type==='COINS'?'◉ COINS':'▣ TICKETS'));tags.append(el('span','npc-level',`LVL ${npc.level}`));headText.append(tags);head.append(headText);card.append(head);
  const figures=el('div','npc-figures');
  const row=(label,value,margin=false)=>{const div=el('div',`figure${margin?' margin-line':''}`);div.append(el('span','',label),el('strong',margin?view.status:'',value));figures.append(div)};
  if(isFlower){row('Recompensa média',`${num(view.averageReward,2)} ✿`);row('Custo médio',view.averageCost===null?'—':`${num(view.averageCost,3)} ✿`);row('Margem estimada',view.estimatedMargin===null?'—':`${view.estimatedMargin>=0?'+':''}${num(view.estimatedMargin,1)}%`,true)}
  else {row('Recompensa',npc.type==='TICKETS'?`${npc.ticketReward||'—'} ticket(s)`:'Em coins');row('Custo médio','—');row('Margem','Aguardando conversão',true)}
  card.append(figures);
  const covered=el('div','coverage',isFlower?`${view.pricedCount} de ${view.totalCount} pedidos com preço · referência média`:`${npc.orderCount||0} pedidos de referência · cálculo pendente`);card.append(covered);
  const action=el('button','card-action',isFlower?'▸ VER TODOS OS PEDIDOS':'▸ DETALHES DO NPC');action.type='button';action.setAttribute('aria-label',`Ver pedidos de ${npc.name}`);
  action.append(el('span','',String(npc.orders?.length||npc.orderCount||0)));
  action.addEventListener('click',()=>openNpc(npc.name));card.append(action);
  return card;
}
function renderGrid(){renderTabs();const ctx=currentContext();let arr=state.npcs.filter(n=>(state.filter==='ALL'||n.type===state.filter)&&(!state.search||n.name.toLowerCase().includes(state.search)||n.orders?.some(([,item])=>item.toLowerCase().includes(state.search))));
 if(state.sort==='level')arr.sort((a,b)=>a.level-b.level);
 if(state.sort==='profit')arr.sort((a,b)=>(npcView(b).estimatedMargin??-Infinity)-(npcView(a).estimatedMargin??-Infinity));
 if(state.sort==='cost')arr.sort((a,b)=>(npcView(a).averageCost??Infinity)-(npcView(b).averageCost??Infinity));
 const grid=$('npc-grid');grid.replaceChildren(...arr.map(buildCard));if(!arr.length)grid.append(el('p','empty-message','Nenhum NPC corresponde à pesquisa.'));
 const views=state.npcs.filter(n=>n.type==='FLOWER').map(n=>evaluateNpc(n,ctx,state.overrides));
 $('count-npc').textContent=state.npcs.length;$('count-flower').textContent=views.reduce((s,v)=>s+v.totalCount,0);$('count-priced').textContent=views.reduce((s,v)=>s+v.pricedCount,0);$('count-good').textContent=views.filter(v=>v.status==='excellent').length;
 quoteState();if(state.selected)renderDetail();if(state.selectedOrder!==null)renderWorkbench();
}
function openNpc(name){state.selected=name;state.selectedOrder=null;$('workbench').hidden=true;renderGrid();$('detail').hidden=false;$('detail').scrollIntoView({behavior:'smooth',block:'start'});}
function renderDetail(){const npc=state.npcs.find(n=>n.name===state.selected);if(!npc)return;
 const view=npcView(npc);$('detail-avatar').replaceChildren(makeAvatar(npc.name));$('detail-name').textContent=npc.name;
 $('detail-intro').textContent=npc.type==='FLOWER'?`${view.pricedCount}/${view.totalCount} pedidos com cotação · recompensa média de referência ${num(npc.averageReward,2)} FLOWER`:'Pedidos deste NPC ainda não foram integrados. Coins e tickets não são convertidos automaticamente em FLOWER.';
 const body=$('order-rows');body.replaceChildren();if(npc.type!=='FLOWER'){
   const tr=el('tr'),td=el('td','','Catálogo completo e valor de recompensas ainda pendentes para este NPC.');td.colSpan=5;tr.append(td);body.append(tr);return;
 }
 for(const order of view.orders){const tr=el('tr'),tdItem=el('td'),resource=el('div','resource');resource.append(artwork(order.item));resource.append(el('span','',`${order.qty} × ${order.item}`));tdItem.append(resource);tr.append(tdItem);
 const tdCost=el('td','',order.cost===null?'—':`${num(order.cost)} ✿`),tdProfit=el('td',`profit ${order.status}-text`,order.profit===null?'—':`${order.profit>=0?'+':''}${num(order.profit)} ✿`),tdMargin=el('td',`${order.status}-text`,order.margin===null?'—':`${num(order.margin,1)}%`);
 tr.append(tdCost,tdProfit,tdMargin);const tdAction=el('td'),btn=el('button','small-action','CALCULAR ↗');btn.addEventListener('click',()=>openOrder(order.index));tdAction.append(btn);tr.append(tdAction);body.append(tr);
 }
}
function openOrder(index){state.selectedOrder=index;state.fee=0;const npc=state.npcs.find(n=>n.name===state.selected),[qty,item]=npc.orders[index];$('edit-qty').value=String(qty);$('edit-reward').value=String(state.overrides[key(npc,index)]??npc.averageReward);$('edit-fees').value='0';$('workbench').hidden=false;renderWorkbench();$('workbench').scrollIntoView({behavior:'smooth',block:'start'});}
function renderWorkbench(){const npc=state.npcs.find(n=>n.name===state.selected);if(!npc || state.selectedOrder===null)return;
 const [originalQty,item]=npc.orders[state.selectedOrder];const qty=Number($('edit-qty').value),reward=Number($('edit-reward').value),fees=Number($('edit-fees').value);
 $('workbench-title').textContent=`${npc.name} · ${qty||originalQty} × ${item}`;
 const valid=Number.isInteger(qty)&&qty>0&&Number.isFinite(reward)&&reward>=0&&Number.isFinite(fees)&&fees>=0;
 const choice=valid?evaluateItem(item,qty,currentContext()):null;
 const summary=$('choice-summary');summary.replaceChildren();for(const [label,value] of [['Comprar pronto',choice?.buyCost],['Fabricar',choice?.craftCost],['Menor custo',choice?.cost]]){
  const box=el('div');box.append(el('small','',label),el('strong','',value===null||value===undefined?'—':`${num(value)} ✿`));summary.append(box)
 }
 const materials=$('ingredients');materials.replaceChildren();if(choice){for(const i of choice.ingredients){const row=el('div','ing-line'),l=el('span','resource');l.append(artwork(i.name),el('span','',`${num(i.qty,0)} × ${i.name}`));row.append(l,el('span','',i.cost===null?'Sem cotação':`${num(i.cost)} ✿`));materials.append(row)}}
 const cost=choice?.cost??null,profit=cost===null?null:reward-cost-fees,margin=profit!==null&&reward>0?profit/reward*100:null;
 const cls=profit===null||margin===null?'unknown':profit<0?'loss':margin>50?'excellent':'caution';const outcome=$('outcome');outcome.className=`outcome ${cls}`;
 $('outcome-value').textContent=margin===null?'—':`${margin>=0?'+':''}${num(margin,1)}%`;
 $('outcome-label').textContent=statusLabel[cls];$('outcome-text').textContent=profit===null?'Ainda não há preço suficiente para calcular este pedido.':`Recompensa ${num(reward)} − custo ${num(cost)} − extras ${num(fees)} = ${num(profit)} FLOWER. ${choice.method==='buy'?'Comprar produto pronto é a menor opção cotada.':choice.method==='craft'?'Fabricar pelos ingredientes é a menor opção cotada.':''}`;
 $('outcome-graph').replaceChildren();if(margin!==null){const i=el('i');i.style.width=`${Math.max(0,Math.min(100,margin))}%`;$('outcome-graph').append(i)}
}
function candidateItems(){const data=state.npcs.filter(n=>n.type==='FLOWER').flatMap(n=>n.orders.map(([,item])=>item));const recipeLeaf=Object.keys(RECIPES).flatMap(name=>Object.keys(flattenIngredients(name)));return [...new Set([...data,...recipeLeaf,...Object.keys(RECIPES)])].sort((a,b)=>a.localeCompare(b));}
function showEditor(){const term=$('item-search').value.trim().toLowerCase(),names=candidateItems().filter(n=>n.toLowerCase().includes(term)).slice(0,term?35:12);const box=$('price-editor');box.replaceChildren();for(const name of names){const row=el('label','price-row');row.append(el('span','',name));const inp=el('input');inp.type='number';inp.step='any';inp.min='0';inp.placeholder='—';const price=state.mode==='manual'?state.manual[name]:isMarketFresh(state.snapshot)?state.snapshot.prices[name]:null;inp.value=price??'';inp.setAttribute('aria-label',`Preço unitário de ${name}`);inp.addEventListener('change',()=>{if(state.mode!=='manual')state.manual={...(state.snapshot?.prices||{})};state.mode='manual';const n=Number(inp.value);if(inp.value.trim()&&Number.isFinite(n)&&n>=0)state.manual[name]=n;else delete state.manual[name];renderGrid();showEditor()});row.append(inp);box.append(row)}}
async function getAutoSnapshot(){const res=await fetch(`./data/p2p-latest.json?t=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);const data=await res.json();if(data.schema!=='bloom-market-v1'||data.currency!=='FLOWER')throw new Error('Snapshot inválido');return data;}
async function refreshMarket(manualClick=false){if(state.loading)return;state.loading=true;const button=$('refresh');button.disabled=true;button.textContent='↻ Verificando…';try{state.snapshot=await getAutoSnapshot();if(state.mode!=='manual'||manualClick)state.mode='automatic';if(manualClick&&!isMarketFresh(state.snapshot))$('data-message').textContent='Cache inválido ou expirado. Configure uma fonte permitida no Actions.';}catch(err){if(manualClick){state.mode='automatic';state.snapshot=null;console.warn('Falha na cotação',err.message)}}finally{state.loading=false;button.disabled=false;button.textContent='↻ Atualizar mercado';renderGrid();showEditor();}}
async function demonstration(){try{const res=await fetch('./data/example-prices.json',{cache:'no-store'});const data=await res.json();state.manual=Object.fromEntries(Object.entries(data.prices??data).filter(([k,v])=>Number.isFinite(v)&&v>=0));state.mode='manual';renderGrid();showEditor();}catch(err){console.error(err)}}
function importPrices(){try{const obj=JSON.parse($('price-json').value);const values=obj.prices??obj;const out={};for(const [k,v] of Object.entries(values)){if(typeof k!=='string'||k.length>120)continue;const numval=Number(v);if(Number.isFinite(numval)&&numval>=0)out[k]=numval}if(!Object.keys(out).length)throw new Error('Nenhum preço válido');state.mode='manual';state.manual=out;renderGrid();showEditor();$('price-json').value='';}catch(err){window.alert('Não foi possível importar: '+err.message)}}
async function init(){try{const res=await fetch('./data/npcs.json',{cache:'no-store'});if(!res.ok)throw new Error(`Catálogo HTTP ${res.status}`);const json=await res.json();state.npcs=json.npcs??[];await artConfig.load();}catch(err){console.warn(err);$('data-message').textContent='Falha ao carregar catálogo: '+err.message}
 renderGrid();showEditor();await refreshMarket();
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;renderGrid()}));
 $('search').addEventListener('input',e=>{state.search=e.target.value.toLowerCase().trim();renderGrid()});$('sort').addEventListener('change',e=>{state.sort=e.target.value;renderGrid()});
 $('refresh').addEventListener('click',()=>refreshMarket(true));$('demo').addEventListener('click',demonstration);$('clear-demo').addEventListener('click',()=>{state.mode='automatic';renderGrid();showEditor();refreshMarket()});
 $('close-detail').addEventListener('click',()=>{state.selected=null;state.selectedOrder=null;$('detail').hidden=true;$('workbench').hidden=true;renderGrid()});
 $('close-workbench').addEventListener('click',()=>{state.selectedOrder=null;$('workbench').hidden=true});
 $('item-search').addEventListener('input',showEditor);$('import-prices').addEventListener('click',importPrices);
 ['edit-qty','edit-reward','edit-fees'].forEach(id=>$(id).addEventListener('input',()=>{
   if(id==='edit-reward'){const npc=state.npcs.find(n=>n.name===state.selected);if(npc&&state.selectedOrder!==null){const raw=$('edit-reward').value, v=Number(raw);if(raw.trim()&&Number.isFinite(v)&&v>=0)state.overrides[key(npc,state.selectedOrder)]=v;else delete state.overrides[key(npc,state.selectedOrder)];saveRewards();renderGrid()}}
   renderWorkbench();
 }));
 // GitHub Pages serves the last valid snapshot; browser polling avoids hammering upstream APIs.
 setInterval(()=>{if(document.visibilityState==='visible'&&state.mode==='automatic')refreshMarket()},10*60*1000);
}
init();
