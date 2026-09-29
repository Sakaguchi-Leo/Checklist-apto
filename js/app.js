function defaults(){
  return RAW.map((x,i)=>normalizeItem({id:'i'+(i+1),phase:x[0],category:x[1],name:x[2],kind:x[3],min:x[4],max:x[5],qty:1,applicable:true,status:'Não iniciado',planned:'',unitPrice:'',freight:'',installation:'',supplier:'',order:'',purchaseDate:'',expectedDelivery:'',actualDelivery:'',expectedInstall:'',actualInstall:'',warrantyMonths:'',warrantyEnd:'',payment:'',installments:'',paidInstallments:'',firstDueDate:'',responsible:'',url:'',invoiceUrl:'',notes:'',custom:false,createdAt:new Date().toISOString()},i));
}
function normalizeItem(item,index=0){
  const out={
    id:'i'+(index+1),phase:'P1',category:'Sem categoria',name:'Item',kind:'Importante',min:'',max:'',qty:1,applicable:true,status:'Não iniciado',planned:'',unitPrice:'',freight:'',installation:'',supplier:'',order:'',purchaseDate:'',expectedDelivery:'',actualDelivery:'',expectedInstall:'',actualInstall:'',warrantyMonths:'',warrantyEnd:'',payment:'',installments:'',paidInstallments:'',firstDueDate:'',responsible:'',url:'',invoiceUrl:'',notes:'',custom:true,createdAt:new Date().toISOString(),previousStatus:''
  };
  Object.assign(out,item||{});
  const candidate=String(out.id||'');
  out.id=/^[A-Za-z0-9_-]+$/.test(candidate)?candidate:'imp_'+Date.now()+'_'+index;
  if(!['P0','P1','P2','P3'].includes(out.phase))out.phase='P1';
  if(!STATUSES.includes(out.status))out.status='Não iniciado';
  if(!KINDS.includes(out.kind))out.kind='Importante';
  out.name=String(out.name||'Item').slice(0,120);
  out.category=String(out.category||'Sem categoria').slice(0,100);
  out.responsible=String(out.responsible||'').slice(0,50);
  out.notes=String(out.notes||'').slice(0,300);
  out.applicable=out.status==='Não se aplica'?false:out.applicable!==false;
  return out;
}
function normalizeItems(items){
  const used=new Set();
  return items.map((item,index)=>{const n=normalizeItem(item,index);if(used.has(n.id))n.id='imp_'+Date.now()+'_'+index;used.add(n.id);return n;});
}
let data=load(), view='dashboard', editingId=null;
function load(){
  const keys=[KEY,...LEGACY_KEYS];
  for(const key of keys){
    try{
      const raw=localStorage.getItem(key);
      if(!raw)continue;
      const p=JSON.parse(raw);
      if(p&&Array.isArray(p.items)){
        const items=normalizeItems(p.items);
        if(key!==KEY)localStorage.setItem(KEY,JSON.stringify({version:VERSION,migratedFrom:p.version||2,updatedAt:new Date().toISOString(),items}));
        return items;
      }
    }catch(e){}
  }
  return defaults();
}
function persist(message='Dados salvos'){localStorage.setItem(KEY,JSON.stringify({version:VERSION,updatedAt:new Date().toISOString(),items:data}));document.getElementById('saveState').textContent='Último salvamento: '+new Date().toLocaleString('pt-BR');toast(message);updateSummary()}
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});const num=v=>Number(v)||0;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function paidAmount(i){const t=total(i),n=Math.max(0,Math.floor(num(i.installments))),paid=Math.max(0,Math.floor(num(i.paidInstallments)));if(!PAID.includes(i.status))return 0;if(n>1)return Math.min(t,t*(Math.min(n,paid)/n));return t;}
function dueAmount(i){return Math.max(0,total(i)-paidAmount(i));}
function kindClass(kind){return kind==='Essencial'?'kind-essential':kind==='Importante'?'kind-important':kind==='Não essencial'?'kind-optional':'kind-case';}
function total(i){return num(i.qty)*num(i.unitPrice)+num(i.freight)+num(i.installation)}function planned(i){return i.planned===''?num(i.qty)*num(i.min):num(i.planned)}function isFinal(i){return i.applicable&&FINAL.includes(i.status)}function dateLate(d){if(!d)return false;const today=new Date();today.setHours(0,0,0,0);return new Date(d+'T00:00:00')<today}function isLate(i){if(!i.applicable||isFinal(i)||i.status==='Não se aplica')return false;return (dateLate(i.expectedDelivery)&&!i.actualDelivery)||(dateLate(i.expectedInstall)&&!i.actualInstall)}
function renderTabs(){const views=[['dashboard','Início'],['items','Todos os itens'],['p0','P0'],['p1','P1'],['p2','P2'],['p3','P3']];document.getElementById('viewTabs').innerHTML=views.map(([k,n])=>{const c=k==='items'||k==='dashboard'?data.length:data.filter(i=>i.phase===k.toUpperCase()).length;return `<button class="tab ${view===k?'active':''}" onclick="setView('${k}')">${n}<span class="badge">${c}</span></button>`}).join('')}
function filters(){
  const cats=[...new Set(data.map(i=>i.category))].sort(),resp=[...new Set(data.map(i=>i.responsible).filter(Boolean))].sort();
  const cf=document.getElementById('categoryFilter'),rf=document.getElementById('responsibleFilter'),sf=document.getElementById('statusFilter'),kf=document.getElementById('kindFilter');
  const oldC=cf.value,oldR=rf.value,oldS=sf.value,oldK=kf.value;
  cf.innerHTML='<option value="all">Todas as categorias</option>'+cats.map(x=>`<option>${esc(x)}</option>`).join('');
  rf.innerHTML='<option value="all">Todos os responsáveis</option>'+resp.map(x=>`<option>${esc(x)}</option>`).join('');
  sf.innerHTML='<option value="all">Todos os status</option>'+STATUSES.map(x=>`<option>${x}</option>`).join('');
  kf.innerHTML='<option value="all">Todas as classificações</option>'+KINDS.map(x=>`<option>${x}</option>`).join('');
  cf.value=cats.includes(oldC)?oldC:'all';rf.value=resp.includes(oldR)?oldR:'all';sf.value=STATUSES.includes(oldS)?oldS:'all';kf.value=KINDS.includes(oldK)?oldK:'all';
}
function selected(){
  const q=document.getElementById('search').value.trim().toLowerCase(),ph=document.getElementById('phaseFilter').value,ca=document.getElementById('categoryFilter').value,st=document.getElementById('statusFilter').value,re=document.getElementById('responsibleFilter').value,ki=document.getElementById('kindFilter').value;
  return data.filter(i=>(!['p0','p1','p2','p3'].includes(view)||i.phase===view.toUpperCase())&&(ph==='all'||i.phase===ph)&&(ca==='all'||i.category===ca)&&(st==='all'||i.status===st)&&(re==='all'||i.responsible===re)&&(ki==='all'||i.kind===ki)&&(`${i.name} ${i.category} ${i.supplier} ${i.notes} ${i.kind}`.toLowerCase().includes(q)));
}
function setView(v){view=v;render()}
function render(){renderTabs();filters();document.getElementById('viewNote').textContent=VIEW_NOTES[view];document.querySelector('.filters').classList.toggle('home-filter-hide',view==='dashboard');document.getElementById('viewNote').classList.toggle('home-filter-hide',view==='dashboard');if(view==='dashboard')renderDashboard();else renderItems();updateSummary()}
function renderItems(){
  const list=selected(),groups={};
  list.forEach(i=>(groups[i.category]??=[]).push(i));
  document.getElementById('main').innerHTML=Object.entries(groups).map(([cat,arr])=>`<section class="category"><div class="category-head"><h3>${esc(cat)}</h3><span>${arr.filter(isFinal).length} de ${arr.filter(i=>i.applicable&&i.status!=='Não se aplica').length} concluídos</span></div><div class="table-wrap items-table-wrap"><table class="items-table"><thead><tr><th>OK</th><th>Item</th><th>Fase</th><th>Situação</th><th>Qtd.</th><th>Planejado</th><th>Valor unitário</th><th>Frete</th><th>Instalação</th><th>Total</th><th>Loja / fornecedor</th><th>Pedido</th><th>Compra</th><th>Entrega prevista</th><th>Entrega real</th><th>Instalação prevista</th><th>Instalação real</th><th>Garantia até</th><th>Pagamento</th><th>Parcelas</th><th>Parcelas pagas</th><th>1º vencimento</th><th>Responsável</th><th>Link da compra</th><th>Nota fiscal</th><th>Observação</th><th>Ações</th></tr></thead><tbody>${arr.map(row).join('')}</tbody></table></div><div class="mobile-list">${arr.map(mobileCard).join('')}</div></section>`).join('')||'<div class="panel empty">Nenhum item encontrado.</div>';
}
function mobileCard(i){
  const late=isLate(i),done=isFinal(i),delivery=i.actualDelivery||i.expectedDelivery,totalValue=total(i);
  return `<article class="mobile-item ${done?'completed':''} ${late?'late':''}"><div class="mobile-item-head"><div><strong>${esc(i.name)}</strong><div class="mobile-tags"><span class="pill ${i.phase.toLowerCase()}">${i.phase}</span><span class="kind-pill ${kindClass(i.kind)}">${esc(i.kind)}</span></div></div><input class="check" aria-label="Marcar ${esc(i.name)} como concluído" type="checkbox" ${done?'checked':''} ${!i.applicable?'disabled':''} onchange="quickComplete('${i.id}',this.checked)"></div><div class="mobile-status">${esc(i.status)}</div><div class="mobile-grid"><div><span>Planejado</span><strong>${money(planned(i))}</strong></div><div><span>Comprometido</span><strong>${money(totalValue)}</strong></div><div><span>Entrega</span><strong>${delivery?formatDate(delivery):'—'}</strong></div><div><span>Responsável</span><strong>${esc(i.responsible||'—')}</strong></div></div><div class="mobile-actions"><button class="soft" onclick="openItemModal('${i.id}')">Editar</button>${validUrl(i.url)?`<a class="mobile-link" target="_blank" rel="noopener" href="${esc(i.url)}">Compra</a>`:''}${validUrl(i.invoiceUrl)?`<a class="mobile-link" target="_blank" rel="noopener" href="${esc(i.invoiceUrl)}">NF</a>`:''}</div></article>`;
}
function input(i,k,type='text',cls='medium-input',placeholder=''){return `<input class="field ${cls}" type="${type}" value="${esc(i[k])}" placeholder="${placeholder}" ${type==='number'?'min="0" step="0.01"':''} onchange="setField('${i.id}','${k}',this.value)">`}
function row(i){
  const done=isFinal(i),late=isLate(i),app=i.applicable;
  return `<tr class="${done?'completed':''} ${late?'late':''}"><td><input class="check" aria-label="Marcar ${esc(i.name)} como concluído" type="checkbox" ${done?'checked':''} ${!app?'disabled':''} onchange="quickComplete('${i.id}',this.checked)"></td><td class="item">${esc(i.name)}<div><span class="kind-pill ${kindClass(i.kind)}">${esc(i.kind)}</span></div>${!app?'<div class="muted">Não se aplica</div>':''}</td><td><span class="pill ${i.phase.toLowerCase()}">${i.phase}</span></td><td><select class="field status" onchange="setField('${i.id}','status',this.value)">${STATUSES.map(s=>`<option ${s===i.status?'selected':''}>${s}</option>`).join('')}</select></td><td>${input(i,'qty','number','small-input')}</td><td>${input(i,'planned','number','small-input')}</td><td>${input(i,'unitPrice','number','small-input')}</td><td>${input(i,'freight','number','small-input')}</td><td>${input(i,'installation','number','small-input')}</td><td><strong>${money(total(i))}</strong></td><td>${input(i,'supplier','text','medium-input','Loja')}</td><td>${input(i,'order','text','small-input','Nº')}</td><td>${input(i,'purchaseDate','date','medium-input')}</td><td>${input(i,'expectedDelivery','date','medium-input')}</td><td>${input(i,'actualDelivery','date','medium-input')}</td><td>${input(i,'expectedInstall','date','medium-input')}</td><td>${input(i,'actualInstall','date','medium-input')}</td><td>${input(i,'warrantyEnd','date','medium-input')}</td><td><select class="field medium-input" onchange="setField('${i.id}','payment',this.value)">${PAYMENT_METHODS.map(x=>`<option ${x===i.payment?'selected':''}>${x}</option>`).join('')}</select></td><td>${input(i,'installments','number','small-input')}</td><td>${input(i,'paidInstallments','number','small-input')}</td><td>${input(i,'firstDueDate','date','medium-input')}</td><td>${input(i,'responsible','text','medium-input')}</td><td>${input(i,'url','url','wide-input','https://...')}${validUrl(i.url)?`<a class="open-link" target="_blank" rel="noopener" href="${esc(i.url)}">Abrir compra</a>`:''}</td><td>${input(i,'invoiceUrl','url','wide-input','Link do comprovante')}${validUrl(i.invoiceUrl)?`<a class="open-link" target="_blank" rel="noopener" href="${esc(i.invoiceUrl)}">Abrir documento</a>`:''}</td><td>${input(i,'notes','text','wide-input','Detalhes')}</td><td><div class="row-actions"><button class="icon-btn" onclick="openItemModal('${i.id}')">Editar</button><button class="icon-btn red" onclick="removeItem('${i.id}')">Excluir</button></div></td></tr>`;
}
function addMonthsISO(dateStr,months){
  if(!dateStr)return '';
  const [y,m,d]=dateStr.split('-').map(Number);
  if(!y||!m||!d)return '';
  const target=new Date(y,m-1+Number(months||0),1);
  const lastDay=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
  const day=Math.min(d,lastDay);
  return localISO(new Date(target.getFullYear(),target.getMonth(),day));
}
function daysUntil(dateStr){if(!dateStr)return 99999;const a=new Date();a.setHours(0,0,0,0);const b=new Date(dateStr+'T00:00:00');return Math.round((b-a)/86400000)}
function installmentSchedule(){const out=[];data.filter(i=>i.applicable&&num(i.installments)>0&&total(i)>0).forEach(i=>{const n=Math.max(1,Math.floor(num(i.installments))),paid=Math.min(n,Math.max(0,Math.floor(num(i.paidInstallments)))),start=i.firstDueDate||i.purchaseDate;if(!start)return;const value=total(i)/n;for(let x=paid;x<n;x++)out.push({id:i.id,name:i.name,supplier:i.supplier,due:addMonthsISO(start,x),value,number:x+1,total:n});});return out.sort((a,b)=>a.due.localeCompare(b.due))}
function renderDashboard(){
 const app=data.filter(i=>i.applicable&&i.status!=='Não se aplica'), schedule=installmentSchedule(), upcoming=schedule.filter(x=>daysUntil(x.due)>=0), overdue=schedule.filter(x=>daysUntil(x.due)<0), next30=schedule.filter(x=>daysUntil(x.due)>=0&&daysUntil(x.due)<=30), pendingDeliveries=app.filter(i=>i.expectedDelivery&&!i.actualDelivery), pendingInstalls=app.filter(i=>i.expectedInstall&&!i.actualInstall), committed=app.reduce((a,i)=>a+total(i),0), plannedTotal=app.reduce((a,i)=>a+planned(i),0), paid=app.reduce((a,i)=>a+paidAmount(i),0), remaining=app.reduce((a,i)=>a+dueAmount(i),0), warrantySoon=app.filter(i=>i.warrantyEnd&&daysUntil(i.warrantyEnd)>=0&&daysUntil(i.warrantyEnd)<=90).length;
 const statusCounts={done:app.filter(isFinal).length,progress:app.filter(i=>['Pesquisando','Orçado','Comprado','Entregue','Instalação pendente'].includes(i.status)).length,problem:app.filter(i=>i.status==='Com problema').length,not:app.filter(i=>i.status==='Não iniciado').length};const stotal=Math.max(1,Object.values(statusCounts).reduce((a,b)=>a+b,0)),d1=statusCounts.done/stotal*100,d2=d1+statusCounts.progress/stotal*100,d3=d2+statusCounts.not/stotal*100;
 const cats={};app.forEach(i=>{cats[i.category]??={p:0,a:0};cats[i.category].p+=planned(i);cats[i.category].a+=total(i)});const catRows=Object.entries(cats).sort((a,b)=>b[1].a-a[1].a).slice(0,10);const catMax=Math.max(1,...catRows.map(x=>Math.max(x[1].p,x[1].a)));
 const months=[];const base=new Date();base.setDate(1);for(let m=0;m<6;m++){const d=new Date(base);d.setMonth(d.getMonth()+m);const key=d.toISOString().slice(0,7);months.push({key,label:d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}),delivery:pendingDeliveries.filter(i=>i.expectedDelivery?.startsWith(key)).length,install:pendingInstalls.filter(i=>i.expectedInstall?.startsWith(key)).length,bill:schedule.filter(x=>x.due.startsWith(key)).length})}const maxMonth=Math.max(1,...months.flatMap(m=>[m.delivery,m.install,m.bill]));
 const events=[...pendingDeliveries.map(i=>({type:'Entrega',name:i.name,date:i.expectedDelivery,late:dateLate(i.expectedDelivery)})),...pendingInstalls.map(i=>({type:'Montagem',name:i.name,date:i.expectedInstall,late:dateLate(i.expectedInstall)}))].filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,12);
 const dueRows=[...overdue,...upcoming].slice(0,12);
 document.getElementById('main').innerHTML=`
 <section class="home-hero"><div class="welcome-card"><h2>Visão geral do apartamento</h2><p>Acompanhe orçamento, compras, parcelas, entregas e montagens a partir desta tela.</p><div class="quick-actions"><button onclick="openItemModal()">+ Adicionar item</button><button onclick="setView('items')">Ver todos os itens</button><button onclick="exportJSON()">Fazer backup</button></div></div><div class="attention-card"><h3>Precisam de atenção</h3><div class="attention-line"><span>Contas vencidas</span><strong style="color:var(--red)">${overdue.length}</strong></div><div class="attention-line"><span>Entregas atrasadas</span><strong style="color:var(--red)">${pendingDeliveries.filter(isLate).length}</strong></div><div class="attention-line"><span>Montagens atrasadas</span><strong style="color:var(--red)">${pendingInstalls.filter(isLate).length}</strong></div><div class="attention-line"><span>Itens com problema</span><strong style="color:var(--amber)">${statusCounts.problem}</strong></div><div class="attention-line"><span>Garantias vencendo em 90 dias</span><strong>${warrantySoon}</strong></div></div></section>
 <div class="section-heading"><h2>Resumo financeiro</h2><span>Valores consolidados dos itens aplicáveis</span></div>
 <section class="finance-overview"><div class="finance-box"><span>Planejado</span><strong>${money(plannedTotal)}</strong></div><div class="finance-box"><span>Comprometido</span><strong>${money(committed)}</strong></div><div class="finance-box"><span>Considerado pago</span><strong>${money(paid)}</strong></div><div class="finance-box"><span>A pagar</span><strong>${money(remaining)}</strong></div></section>
 <section class="dashboard-kpis" style="margin-top:12px"><div class="dkpi"><span>Contas nos próximos 30 dias</span><strong>${money(next30.reduce((a,x)=>a+x.value,0))}</strong><small>${next30.length} parcela(s)</small></div><div class="dkpi"><span>Saldo a pagar</span><strong>${money(remaining)}</strong><small>comprometido menos pago</small></div><div class="dkpi"><span>Entregas pendentes</span><strong>${pendingDeliveries.length}</strong><small>${pendingDeliveries.filter(isLate).length} atrasada(s)</small></div><div class="dkpi"><span>Montagens pendentes</span><strong>${pendingInstalls.length}</strong><small>${pendingInstalls.filter(isLate).length} atrasada(s)</small></div></section>
 <div class="section-heading"><h2>Acompanhamento</h2><span>Orçamento e andamento geral</span></div>
 <section class="dash-grid primary-grid"><div class="panel"><div class="panel-title"><h2>Planejado x comprometido</h2></div><div class="bars">${catRows.map(([c,v])=>`<div class="hbar-row"><span>${esc(c)}</span><div class="compare-bars"><div class="compare-line"><small>Plan.</small><div class="bar-bg"><div class="seg-planned" style="width:${v.p/catMax*100}%"></div></div></div><div class="compare-line"><small>Real</small><div class="bar-bg"><div class="seg-actual" style="width:${v.a/catMax*100}%"></div></div></div><small class="muted">Plan. ${money(v.p)} | Real ${money(v.a)}</small></div><strong>${money(v.a-v.p)}</strong></div>`).join('')||'<div class="empty-chart">Sem valores financeiros.</div>'}</div></div>
 <div class="panel"><div class="panel-title"><h2>Situação dos itens</h2></div><div class="donut-wrap"><div class="donut" style="--d1:${d1}%;--d2:${d2}%;--d3:${d3}%"><div class="donut-center"><strong>${app.length}</strong><span>itens</span></div></div><div class="legend"><div><i class="dot" style="background:#2563eb"></i>Concluídos: ${statusCounts.done}</div><div><i class="dot" style="background:#16a34a"></i>Em andamento: ${statusCounts.progress}</div><div><i class="dot" style="background:#f59e0b"></i>Não iniciados: ${statusCounts.not}</div><div><i class="dot" style="background:#dc2626"></i>Com problema: ${statusCounts.problem}</div></div></div></div></section>
 <div class="section-heading"><h2>Agenda e compromissos</h2><span>Próximos vencimentos, entregas e montagens</span></div>
 <section class="dash-grid"><div class="panel full"><div class="panel-title"><h2>Próximos 6 meses</h2><span class="muted">Entregas, montagens e contas</span></div><div class="timeline">${months.map(m=>`<div class="month-col"><div class="month-bars"><div title="${m.delivery} entregas" class="vbar delivery" style="height:${m.delivery/maxMonth*100}%"></div><div title="${m.install} montagens" class="vbar install" style="height:${m.install/maxMonth*100}%"></div><div title="${m.bill} contas" class="vbar bill" style="height:${m.bill/maxMonth*100}%"></div></div><strong>${m.delivery+m.install+m.bill}</strong><span class="month-label">${m.label}</span></div>`).join('')}</div><div class="legend" style="display:flex;justify-content:center;margin-top:10px"><div><i class="dot" style="background:#2563eb"></i>Entregas</div><div><i class="dot" style="background:#7c3aed"></i>Montagens</div><div><i class="dot" style="background:#f59e0b"></i>Contas</div></div></div>
 <div class="panel"><div class="panel-title"><h2>Contas a vencer</h2><span class="muted">Use 1º vencimento e parcelas pagas</span></div><div class="table-wrap"><table class="schedule"><thead><tr><th>Vencimento</th><th>Item</th><th>Parcela</th><th>Fornecedor</th><th>Valor</th></tr></thead><tbody>${dueRows.map(x=>{const d=daysUntil(x.due),cl=d<0?'due-overdue':d<=7?'due-soon':'due-ok';return `<tr><td class="${cl}">${formatDate(x.due)}${d<0?' • vencida':''}</td><td>${esc(x.name)}</td><td>${x.number}/${x.total}</td><td>${esc(x.supplier||'—')}</td><td><strong>${money(x.value)}</strong></td></tr>`}).join('')||'<tr><td colspan="5" class="empty">Nenhuma conta calculada. Preencha compra, total, quantidade de parcelas e 1º vencimento.</td></tr>'}</tbody></table></div></div>
 <div class="panel"><div class="panel-title"><h2>Entregas e montagens</h2></div><div class="table-wrap"><table class="schedule"><thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th>Situação</th></tr></thead><tbody>${events.map(x=>`<tr><td class="${x.late?'due-overdue':'due-ok'}">${formatDate(x.date)}</td><td>${x.type}</td><td>${esc(x.name)}</td><td>${x.late?'Atrasado':'Programado'}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Nenhuma entrega ou montagem programada.</td></tr>'}</tbody></table></div></div></section>`}
function setField(id,k,v){
  const i=data.find(x=>x.id===id);if(!i)return;
  if(['qty','planned','unitPrice','freight','installation','installments','paidInstallments','warrantyMonths'].includes(k)&&v!==''&&num(v)<0){toast('O valor não pode ser negativo');render();return}
  if((k==='url'||k==='invoiceUrl')&&v&&!validUrl(v)){toast('Use um link iniciado por http:// ou https://');render();return}
  if(k==='paidInstallments'&&num(i.installments)>0&&num(v)>num(i.installments)){toast('Parcelas pagas não podem superar o total de parcelas');render();return}
  i[k]=v;
  if((k==='purchaseDate'||k==='warrantyMonths')&&i.purchaseDate&&num(i.warrantyMonths)>0)i.warrantyEnd=addMonthsISO(i.purchaseDate,num(i.warrantyMonths));
  if(k==='status'){i.applicable=v!=='Não se aplica';if(v==='Entregue'&&!i.actualDelivery)i.actualDelivery=todayISO();if(v==='Instalado'&&!i.actualInstall)i.actualInstall=todayISO()}
  persist();render();
}
function quickComplete(id,yes){
  const i=data.find(x=>x.id===id);if(!i)return;
  if(yes){if(!isFinal(i))i.previousStatus=i.status;i.status='Concluído';}
  else{i.status=(i.previousStatus&&STATUSES.includes(i.previousStatus)&&!FINAL.includes(i.previousStatus))?i.previousStatus:'Não iniciado';i.previousStatus='';}
  persist();render();
}
function updateSummary(){
  const app=data.filter(i=>i.applicable&&i.status!=='Não se aplica'),done=app.filter(isFinal).length,pct=app.length?Math.round(done/app.length*100):0,p=app.reduce((a,i)=>a+planned(i),0),c=app.reduce((a,i)=>a+total(i),0),paid=app.reduce((a,i)=>a+paidAmount(i),0),bal=p-c,late=app.filter(isLate).length;
  document.getElementById('mProgress').textContent=pct+'%';document.getElementById('mCount').textContent=`${done} de ${app.length}`;document.getElementById('mPlanned').textContent=money(p);document.getElementById('mCommitted').textContent=money(c);document.getElementById('mPaid').textContent=money(paid);const be=document.getElementById('mBalance');be.textContent=(bal<0?'- ':'')+money(Math.abs(bal));be.style.color=bal<0?'var(--red)':'var(--green)';document.getElementById('mLate').textContent=late;document.getElementById('progressLabel').textContent=pct+'%';document.getElementById('progressFill').style.width=pct+'%';
}
function openItemModal(id=null){
  editingId=id;const i=id?data.find(x=>x.id===id):{name:'',category:'',phase:'P1',kind:'Essencial',applicable:true,qty:1,min:'',max:'',planned:'',responsible:'',status:'Não iniciado',notes:'',warrantyMonths:''};
  document.getElementById('modalTitle').textContent=id?'Editar item':'Adicionar item';
  for(const [el,k] of [['fName','name'],['fCategory','category'],['fPhase','phase'],['fKind','kind'],['fQty','qty'],['fMin','min'],['fMax','max'],['fPlanned','planned'],['fResponsible','responsible'],['fStatus','status'],['fNotes','notes'],['fWarrantyMonths','warrantyMonths']])document.getElementById(el).value=i[k]??'';
  document.getElementById('fApplicable').value=String(i.applicable);document.getElementById('fStatus').innerHTML=STATUSES.map(x=>`<option>${x}</option>`).join('');document.getElementById('fStatus').value=i.status;document.getElementById('categoryList').innerHTML=[...new Set(data.map(x=>x.category))].sort().map(x=>`<option value="${esc(x)}">`).join('');document.getElementById('itemModal').classList.add('show');document.getElementById('fName').focus();
}
function closeModal(){document.getElementById('itemModal').classList.remove('show');editingId=null}
function saveItemModal(){
  const g=id=>document.getElementById(id),name=g('fName').value.trim(),category=g('fCategory').value.trim(),qty=num(g('fQty').value),min=num(g('fMin').value),max=num(g('fMax').value);
  [g('fName'),g('fCategory'),g('fQty')].forEach(x=>x.classList.remove('error'));if(!name){g('fName').classList.add('error');toast('Informe o nome do item');return}if(!category){g('fCategory').classList.add('error');toast('Informe a categoria');return}if(qty<=0){g('fQty').classList.add('error');toast('A quantidade deve ser maior que zero');return}if(max&&min>max){toast('A estimativa mínima não pode superar a máxima');return}
  const values={name,category,phase:g('fPhase').value,kind:g('fKind').value,applicable:g('fApplicable').value==='true',qty,min,max,planned:g('fPlanned').value,responsible:g('fResponsible').value.trim(),status:g('fStatus').value,notes:g('fNotes').value.trim(),warrantyMonths:g('fWarrantyMonths').value};
  if(!values.applicable)values.status='Não se aplica';
  if(editingId){const current=data.find(x=>x.id===editingId);Object.assign(current,values);if(current.purchaseDate&&num(current.warrantyMonths)>0)current.warrantyEnd=addMonthsISO(current.purchaseDate,num(current.warrantyMonths));}
  else data.push(normalizeItem({id:'c'+Date.now(),unitPrice:'',freight:'',installation:'',supplier:'',order:'',purchaseDate:'',expectedDelivery:'',actualDelivery:'',expectedInstall:'',actualInstall:'',warrantyMonths:'',warrantyEnd:'',payment:'',installments:'',paidInstallments:'',firstDueDate:'',url:'',invoiceUrl:'',custom:true,createdAt:new Date().toISOString(),...values},data.length));
  closeModal();persist(editingId?'Item atualizado':'Item adicionado');render();
}
function removeItem(id){const i=data.find(x=>x.id===id);if(confirm(`Excluir “${i.name}”?`)){data=data.filter(x=>x.id!==id);persist('Item excluído');render()}}
function clearFilters(){
  document.getElementById('search').value='';document.getElementById('phaseFilter').value='all';document.getElementById('categoryFilter').value='all';document.getElementById('statusFilter').value='all';document.getElementById('responsibleFilter').value='all';document.getElementById('kindFilter').value='all';render();
}
function validUrl(s){try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)}catch(e){return false}}function localISO(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}function todayISO(){return localISO(new Date())}function formatDate(s){return s?new Date(s+'T00:00:00').toLocaleDateString('pt-BR'):''}
function exportJSON(){const blob=new Blob([JSON.stringify({app:'Gerenciador do Apartamento',version:VERSION,exportedAt:new Date().toISOString(),items:data},null,2)],{type:'application/json'});download(blob,'backup-gerenciador-apartamento.json')}
function exportCSV(){const cols=['Fase','Categoria','Item','Classificação','Aplicável','Situação','Quantidade','Planejado','Valor unitário','Frete','Instalação','Total','Fornecedor','Pedido','Compra','Entrega prevista','Entrega real','Instalação prevista','Instalação real','Garantia (meses)','Garantia até','Pagamento','Parcelas','Parcelas pagas','1º vencimento','Responsável','Link','Nota fiscal','Observação'];const lines=[cols,...data.map(i=>[i.phase,i.category,i.name,i.kind,i.applicable?'Sim':'Não',i.status,i.qty,planned(i),i.unitPrice,i.freight,i.installation,total(i),i.supplier,i.order,i.purchaseDate,i.expectedDelivery,i.actualDelivery,i.expectedInstall,i.actualInstall,i.warrantyMonths,i.warrantyEnd,i.payment,i.installments,i.paidInstallments,i.firstDueDate,i.responsible,i.url,i.invoiceUrl,i.notes])].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');download(new Blob(['\ufeff'+lines],{type:'text/csv;charset=utf-8'}),'gerenciador-apartamento.csv')}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function parseBackup(text){
  const p=JSON.parse(text);
  if(!p||!Array.isArray(p.items))throw new Error('Formato inválido');
  if(Number(p.version||2)>VERSION)throw new Error('Backup criado por uma versão mais nova do aplicativo');
  if(p.items.length>5000)throw new Error('Backup grande demais');
  return normalizeItems(p.items);
}
document.getElementById('importJson').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  if(f.size>5*1024*1024){alert('O backup excede o limite de 5 MB.');e.target.value='';return}
  const r=new FileReader();
  r.onload=()=>{try{const items=parseBackup(r.result);if(!confirm(`Importar ${items.length} itens e substituir os dados atuais?`))return;data=items;persist('Backup importado');render()}catch(err){alert('Backup inválido: '+(err.message||'arquivo não reconhecido'))}finally{e.target.value=''}};
  r.readAsText(f);
});
function resetAll(){if(confirm('Restaurar a lista padrão? Todos os registros, valores, links e itens personalizados serão apagados. Exporte um backup antes, se necessário.')){data=defaults();persist('Lista padrão restaurada');render()}}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window._toast);window._toast=setTimeout(()=>t.classList.remove('show'),1400)}
document.getElementById('itemModal').addEventListener('click',e=>{if(e.target.id==='itemModal')closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});['search','phaseFilter','categoryFilter','statusFilter','responsibleFilter','kindFilter'].forEach(id=>document.getElementById(id).addEventListener(id==='search'?'input':'change',render));document.getElementById('today').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});render();