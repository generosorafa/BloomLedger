import {RECIPES, ORDERS, computeOrder, normalizePrices, flattenIngredients} from './core.mjs';
import {artConfig, artwork} from './artwork.mjs';
const $=id=>document.getElementById(id);
const state={prices:{},inventory:{},source:'demonstration',updatedAt:null};
const PRICE_URL='https://sfl.world/api/v1/prices';
const allResources=[...new Set(Object.keys(RECIPES).flatMap(n=>Object.keys(flattenIngredients(n))))].sort((a,b)=>a.localeCompare(b));
const allMarketItems=[...new Set([...allResources,...Object.keys(RECIPES)])].sort((a,b)=>a.localeCompare(b));
const artCatalog={npc:[...new Set(ORDERS.map(order=>order.npc))],item:allMarketItems};
const fmt=(n,d=4)=>n===null||!Number.isFinite(n)?'—':n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const sourceLabels={demonstration:'DEMONSTRAÇÃO',manual:'INFORMADO MANUALMENTE',community:'FONTE COMUNITÁRIA'};
const marginStatuses={
  unknown:{label:'Aguardando dados',caption:'Sem preços completos e recompensa, ainda não há classificação.',icon:'○'},
  excellent:{label:'EXCELENTE',caption:'Mais de metade da recompensa sobra como lucro econômico.',icon:'✓'},
  caution:{label:'ATENÇÃO',caption:'Até metade da recompensa sobra como lucro econômico.',icon:'!'},
  loss:{label:'PREJUÍZO',caption:'Custo dos ingredientes e taxas supera a recompensa.',icon:'×'}
};
function setArt(container,name,kind){
  if (!container) return;
  const img=artwork(name,kind);img.classList.add('featured-art');
  container.className='art-slot';container.replaceChildren(img);
}

function announce(kind,title,message){
  $('alert').className=`notice ${kind}`;
  $('status-title').textContent=title;
  $('status-message').textContent=message;
  $('label-data').textContent=state.source==='community'?'COMUNITÁRIO':state.source==='manual'?'MANUAL':'EXEMPLO';
  $('source').textContent=sourceLabels[state.source]||'SEM PREÇOS';
}
function save(){
  try {localStorage.setItem('bloom-v01',JSON.stringify(state));} catch (_){}
}
function setPrices(p,source,updatedAt=Date.now()){
  state.prices={...p};state.source=source;state.updatedAt=updatedAt;save();renderPriceGrid();render();
}
function hydrate(){
  try {const old=JSON.parse(localStorage.getItem('bloom-v01')||'null');
    if(old&&typeof old==='object'&&old.prices&&typeof old.prices==='object'){
      state.prices=normalizePrices(old.prices);
      state.inventory=old.inventory&&typeof old.inventory==='object'?old.inventory:{};
      state.source=['manual','community','demonstration'].includes(old.source)?old.source:'manual';
      state.updatedAt=old.updatedAt||null;
      return true;
    }
  }catch(_){} return false;
}
function setOrder(order){
  if(!order)return;
  $('item').value=order.item;$('qty').value=String(order.qty);
  $('reward').value='';
  $('reward').placeholder='Informe a recompensa mostrada no jogo';
  render();
}
function initSelectors(){
  for(const order of ORDERS){const opt=document.createElement('option');opt.value=order.id;opt.textContent=`${order.npc} · ${order.qty} × ${order.item}`;$('order').append(opt)}
  const other=document.createElement('option');other.value='custom';other.textContent='Pedido personalizado';$('order').append(other);
  for(const name of Object.keys(RECIPES).sort()){
    const opt=document.createElement('option');opt.value=name;opt.textContent=name;$('item').append(opt);
  }
  $('order').value=ORDERS[0].id;setOrder(ORDERS[0]);
  $('order').addEventListener('change',()=>setOrder(ORDERS.find(o=>o.id===$('order').value)));
  $('item').addEventListener('change',()=>{$('order').value='custom';render()});
  $('qty').addEventListener('input',()=>{$('order').value='custom';render()});
  for(const id of ['reward','extra'])$(id).addEventListener('input',render);
}
function inputNum(name,category,val){
  const input=document.createElement('input');input.type='number';input.min='0';input.step='any';
  input.setAttribute('aria-label',category==='prices'?`Preço ${name} em FLOWER`:`Estoque de ${name}`);
  input.value=val===undefined||val===null?'':String(val);
  input.addEventListener('change',()=>{
    const value=input.value.trim()?Number(input.value):null;
    if(value===null||!Number.isFinite(value)||value<0){delete state[category][name];input.value='';}
    else state[category][name]=value;
    if(category==='prices') {state.source='manual';state.updatedAt=Date.now();renderPriceGrid();}
    save();render();
  });
  return input;
}
function cell(tr,content,attr={}){
  const td=document.createElement('td');if(typeof content==='string')td.textContent=content;else if(content)td.append(content);
  for(const [k,v] of Object.entries(attr))td.setAttribute(k,v);tr.append(td);return td;
}
function render(){
  let data;
  const item=$('item').value;
  const qty=Number($('qty').value);
  const reward=$('reward').value;
  const rewardEntered=reward.trim()!=='';
  try{data=computeOrder({item,qty,reward:rewardEntered?reward:0,prices:state.prices,inventory:state.inventory,extra:$('extra').value})}catch(e){
    $('ingredients').replaceChildren();$('profit').textContent='—';$('cost').textContent='—';$('cash').textContent='—';$('roi').textContent='—';$('time').textContent='—';$('margin-card').className='margin-card unknown';$('margin-label').textContent='Aguardando dados';$('margin-value').textContent='—';$('margin-desc').textContent=e.message;$('margin-bar').replaceChildren();$('tip').textContent=e.message;return;
  }
  $('ingredient-count').textContent=`${data.rows.length} recursos diferentes`;
  const chosenOrder=ORDERS.find(order=>order.id===$('order').value);
  const npcName=chosenOrder?.npc||'Pedido personalizado';
  $('npc-name').textContent=npcName;
  $('chosen-item').textContent=`${qty} × ${item}`;
  setArt($('npc-art'),npcName,'npc');
  setArt($('food-art'),item,'item');
  const body=$('ingredients');body.replaceChildren();
  for(const row of data.rows){const tr=document.createElement('tr');
    const resource=document.createElement('span');resource.className='resource-label';
    resource.append(artwork(row.name,'item'),document.createTextNode(row.name));
    cell(tr,resource);cell(tr,fmt(row.required,row.required%1?2:0));
    cell(tr,inputNum(row.name,'prices',row.price),row.price===null?{'data-missing':''}:{});
    cell(tr,row.opportunity===null?'Sem preço':fmt(row.opportunity));
    cell(tr,inputNum(row.name,'inventory',state.inventory[row.name]??0));body.append(tr);
  }
  $('cost').textContent=data.complete?fmt(data.opportunity):'—';
  $('cash').textContent=data.complete?fmt(data.outlay):'—';
  $('profit').textContent=data.complete&&rewardEntered?`${data.profit>=0?'+':''}${fmt(data.profit)}`:'—';
  $('profit').classList.toggle('negative',Boolean(data.complete&&rewardEntered&&data.profit<0));
  $('roi').textContent=data.complete&&rewardEntered&&data.roi!==null?`${fmt(data.roi,1)}%`:'—';
  const validResult=Boolean(data.complete&&rewardEntered);
  const status=validResult?data.status:'unknown';
  const statusProps=marginStatuses[status];
  const card=$('margin-card');
  card.className=`margin-card ${status}`;
  $('margin-icon').textContent=statusProps.icon;
  $('margin-label').textContent=statusProps.label;
  $('margin-value').textContent=validResult&&data.margin!==null?`${fmt(data.margin,1)}%`:'—';
  $('margin-desc').textContent=statusProps.caption;
  $('margin-stamp').className=`stamp ${status}`;
  $('margin-stamp').textContent=statusProps.label;
  const bar=$('margin-bar');
  bar.replaceChildren();
  if(validResult && data.reward>0){
    const expenses=Math.min(100,Math.max(0,(data.opportunity+data.extra)/data.reward*100));
    const remainder=Math.max(0,100-expenses);
    const costBar=document.createElement('span');costBar.className='expense-piece';costBar.style.width=`${expenses}%`;
    const gainBar=document.createElement('span');gainBar.className='profit-piece';gainBar.style.width=`${remainder}%`;
    bar.append(costBar,gainBar);
    $('margin-breakdown').textContent=`${fmt(data.opportunity+data.extra)} FLOWER em materiais e custos • ${fmt(data.profit)} FLOWER de resultado`;
  } else {
    $('margin-breakdown').textContent='Informe preços e recompensa para visualizar a distribuição.';
  }
  $('time').textContent=data.minutes===null?'—':data.minutes>=60?`${fmt(data.minutes/60,1)}h`:`${fmt(data.minutes,1)}min`;
  if(!data.complete)$('tip').textContent=`Preços pendentes para: ${data.missing.join(', ')}. Sem todos os preços, não calculamos lucro para evitar números incorretos.`;
  else if(!rewardEntered)$('tip').textContent=`Informe a recompensa exata no jogo. Custo de oportunidade: ${fmt(data.opportunity)} FLOWER. Ganho e ROI ficam pendentes até lá.`;
  else {
    let s=`${data.profit>=0?'Lucro econômico estimado positivo.':'Prejuízo econômico estimado.'} Desembolso aproximado: ${fmt(data.outlay)} FLOWER. `;
    if(data.finishedCost!==null)s+=`Comprar ${qty} × ${item} pronto: ${fmt(data.finishedCost)} FLOWER (${data.finishedCost<data.opportunity?'menor que fabricar':'não mais barato que ingredientes'}).`;
    else s+='Preço de comida pronta não informado: comparação comprar pronto × fabricar indisponível.';
    $('tip').textContent=s;
  }
}
function renderPriceGrid(){
  const grid=$('price-grid');grid.replaceChildren();
  for(const name of allMarketItems){
    const div=document.createElement('div');div.className='market-item';
    const label=document.createElement('label');const span=document.createElement('span');span.className='market-name';span.append(artwork(name,'item'),document.createTextNode(name));
    label.append(span,inputNum(name,'prices',state.prices[name]));div.append(label);grid.append(div);
  }
}
async function refreshP2P(){
  const btn=$('refresh');btn.disabled=true;btn.textContent='Consultando P2P…';
  try{
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
    let res;
    try{res=await fetch(PRICE_URL,{signal:controller.signal,cache:'no-store'})}finally{clearTimeout(timer)}
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const payload=await res.json();
    const prices=normalizePrices(payload);
    const covered=allResources.filter(name=>Object.hasOwn(prices,name));
    if(covered.length===0)throw new Error('O formato recebido não contém preços reconhecidos. Importação interrompida.');
    const currency=String(payload?.currency ?? payload?.meta?.currency ?? '').toUpperCase();
    if(currency!=='FLOWER')throw new Error('A fonte não comprovou preços unitários na moeda FLOWER. Por segurança, não importamos valores de unidade desconhecida.');
    setPrices(prices,'community');
    announce('good','CONSULTA REALIZADA',`${covered.length} recursos do catálogo reconhecidos em ${new Date().toLocaleString('pt-BR')}. Fonte sfl.world; confirme atualidade, anúncios e liquidez.`);
  }catch(e){
    announce('bad','P2P INDISPONÍVEL',`Consulta direta falhou (${e.message}). Os preços anteriores foram preservados. Use importação manual ou configure um backend autorizado.`);
  }finally{btn.disabled=false;btn.textContent='↻ Testar fonte P2P'}
}
async function loadDemo(){
  try {const res=await fetch('./data/example-prices.json');if(!res.ok)throw new Error('Falha ao ler arquivo local');
    const payload=await res.json();setPrices(normalizePrices(payload),'demonstration');
    announce('','DADOS DE DEMONSTRAÇÃO','Valores históricos de exemplo, NÃO representam o P2P atual. Informe a recompensa real do delivery.');
  }catch(e){announce('bad','SEM DADOS',e.message)}
}
function importData(){
  try {const prices=normalizePrices(JSON.parse($('json').value));if(Object.keys(prices).length===0)throw new Error('Nenhum preço válido encontrado');
    setPrices(prices,'manual');announce('good','IMPORTAÇÃO MANUAL',`${Object.keys(prices).length} preços carregados. A data é a da importação, não a data de mercado.`);
  }catch(e){announce('bad','JSON INVÁLIDO',e.message)}
}
function exportData(){
  const blob=new Blob([JSON.stringify({source:state.source,exportedAt:new Date().toISOString(),prices:state.prices},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='bloomledger-precos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
initSelectors();
$('refresh').addEventListener('click',refreshP2P);
$('demo').addEventListener('click',loadDemo);
$('import').addEventListener('click',importData);
$('export').addEventListener('click',exportData);
function updateArtCount(){
  const {found,total}=artConfig.stats(artCatalog);
  $('art-count').textContent=`${found} / ${total} imagens configuradas`;
}
function redrawArtwork(){render();renderPriceGrid();updateArtCount();}
$('art-template').addEventListener('click',()=>{
  $('art-json').value=JSON.stringify(artConfig.get(),null,2);
  announce('','CATÁLOGO EM EDIÇÃO','Veja os caminhos atuais. Inserir URLs válidas não concede direitos de uso sobre as imagens.');
});
$('art-reset').addEventListener('click',()=>{
  artConfig.reset();$('art-json').value='';redrawArtwork();
  announce('','AJUSTES LOCAIS LIMPOS','O catálogo padrão do projeto continua ativo.');
});
$('art-apply').addEventListener('click',()=>{
  try {
    artConfig.set(JSON.parse($('art-json').value));
    redrawArtwork();
    announce('good','CATÁLOGO VISUAL APLICADO','Ajustes locais salvos. Para disponibilizar imagens a todos, edite data/artwork.json e publique apenas imagens com direitos confirmados.');
  }catch(e){announce('bad','CONFIGURAÇÃO DE IMAGEM INVÁLIDA',e.message)}
});
// Artwork is optional. A missing manifest cannot block the delivery calculator.
artConfig.load().then(()=>{redrawArtwork();}).catch(e=>{
  updateArtCount();console.warn('Catálogo de imagens indisponível:',e.message);
});
if(hydrate()){
  renderPriceGrid();render();
  const dt=state.updatedAt?new Date(state.updatedAt).toLocaleString('pt-BR'):'data desconhecida';
  announce('','DADOS RESTAURADOS',`${sourceLabels[state.source]} · Salvos localmente em ${dt}. Não representam necessariamente preços atuais.`);
} else loadDemo();
