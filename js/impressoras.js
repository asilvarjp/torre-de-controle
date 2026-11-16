/* ===========================================================================
   IMPRESSORAS — gestão do contrato de outsourcing de impressão

   Visões: Dashboard executivo · Por hotel · Inventário · Histórico mensal ·
   Pendências (qualidade dos dados) · Cadastro geral (parque antigo).

   Regras que valem em todo o módulo:
   · Nada é estimado. Só aparecem valores que vieram do descritivo do
     fornecedor; o que não existe vira pendência ("não informado").
   · O descritivo traz UM valor de excedente para PB e UM para colorido (R$),
     que a planilha ratea por participação nas páginas. Não há tarifa por
     página nem franquia: por isso "custo por página" aqui é sempre derivado.
   · Locação e impressão nunca se misturam: custo total = locação + excedentes.
   · Importar uma nova competência não altera as anteriores.

   Fórmulas (todas auditáveis, ver painel "Como é calculado"):
     % PB_i        = páginas PB_i ÷ Σ páginas PB da competência
     Excedente PB_i = % PB_i × excedente PB cobrado (R$)      (idem colorido)
     Custo_i       = locação_i + excedente PB_i + excedente colorido_i
   =========================================================================== */

const IMP = {
  tab: 'dashboard',
  comp: null,
  competencias: [],
  equip: [],
  eqById: new Map(),
  header: null, prevHeader: null,
  calc: null, prevCalc: null,
  hist: null,
  hotel: '',
  missing: false,
  loaded: false,
  filtros: {unidade:'', modelo:'', busca:'', backup:false, semcad:false, semimp:false},
};
const IMP_TABS = [
  ['dashboard','Dashboard executivo'], ['hoteis','Por hotel'], ['inventario','Inventário'],
  ['historico','Histórico mensal'], ['pendencias','Pendências'], ['legado','Cadastro geral'],
];
const IMP_FABRICANTES = ['RICOH','EPSON','SAMSUNG','OKIDATA','HP','KYOCERA','BROTHER','CANON','XEROX','LEXMARK'];

/* ----------------------------- utilidades ----------------------------- */
const impN = v => (v===null || v===undefined || v==='') ? 0 : (Number(v)||0);
const impHas = v => !(v===null || v===undefined || v==='');
const impInt = n => Math.round(Number(n)||0).toLocaleString('pt-BR');
const impPct = (n, d=1) => (Number(n)*100).toLocaleString('pt-BR',{minimumFractionDigits:d, maximumFractionDigits:d})+'%';
const impMoney4 = n => 'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:4, maximumFractionDigits:4});
const impNorm = s => String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const impCompLabel = c => { const m = String(c||'').match(/^(\d{4})-(\d{2})/); return m ? MONTH_NAMES_PT[+m[2]-1]+'/'+m[1] : (c||'—'); };
const impCompShort = c => { const m = String(c||'').match(/^(\d{4})-(\d{2})/); return m ? m[2]+'/'+m[1] : (c||'—'); };
const impPlaceholderPat = p => !p || /^NOVA/.test(impNorm(p));
const impSerieValida = s => !!s && /\d/.test(s);
const impFabricante = modelo => { const t = impNorm(String(modelo||'').split(/\s+/)[0]); return IMP_FABRICANTES.includes(t) ? t : 'NÃO INFORMADO'; };
const impMediana = arr => { const a = arr.slice().sort((x,y)=>x-y); if(!a.length) return 0; const m = Math.floor(a.length/2); return a.length%2 ? a[m] : (a[m-1]+a[m])/2; };

function impDelta(cur, prev, kind){
  if(prev===null || prev===undefined) return '';
  const abs = cur - prev;
  if(Math.abs(abs) < 1e-9) return '<div class="imp-delta flat">sem variação vs mês anterior</div>';
  const up = abs > 0;
  const tone = kind==='cost' ? (up?'bad':'good') : 'flat';
  const absTxt = kind==='int' ? impInt(Math.abs(abs)) : fmtCurrency(Math.abs(abs));
  const pct = prev !== 0 ? ' ('+(up?'+':'−')+impPct(Math.abs(abs/prev))+')' : ' (mês anterior era zero)';
  return '<div class="imp-delta '+tone+'">'+(up?'▲ +':'▼ −')+absTxt+pct+' vs mês anterior</div>';
}

async function impFetchAll(build){
  let all = [], from = 0;
  for(;;){
    const { data, error } = await build().range(from, from+999);
    if(error) throw error;
    all = all.concat(data||[]);
    if(!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

/* ----------------------------- carga de dados ----------------------------- */
function impJoin(rows){
  return rows.map(m=>{
    const e = IMP.eqById.get(m.impressora_id) || {};
    const modelo = (e.impressora||'').trim();
    const obs = ((m.observacao||'')+' '+(e.observacao||'')).trim();
    return {
      id:m.id, impressora_id:m.impressora_id, unidade: m.unidade || e.unidade || null,
      patrimonio:(e.patrimonio||'').trim(), serie:(e.serie||'').trim(), modelo,
      tipo: e.tipo_equipamento || (/fragment/i.test(modelo) ? 'Fragmentadora' : 'Impressora'),
      obs, backup:/backup/i.test(obs), cnpj:(e.cnpj||'').trim(), endereco:(e.endereco||'').trim(),
      loc: impHas(m.valor_locacao) ? Number(m.valor_locacao) : null,
      pb: impN(m.paginas_pb), co: impN(m.paginas_color), linha:m.linha_origem,
    };
  });
}

async function impLoadBase(){
  IMP.missing = false;
  try{
    const comps = await impFetchAll(()=> supabaseClient.from('impressoras_competencias').select('*').order('competencia',{ascending:false}));
    const equip = await impFetchAll(()=> supabaseClient.from('impressoras').select('*').eq('contrato','SKYINK').order('id'));
    IMP.competencias = comps;
    IMP.equip = equip;
    IMP.eqById = new Map(equip.map(e=>[e.id, e]));
  }catch(e){
    if(e && (e.code==='42P01' || e.code==='PGRST205' || /impressoras_competencias|schema cache/i.test(e.message||''))){ IMP.missing = true; IMP.loaded = true; return; }
    throw e;
  }
  if(!IMP.comp || !IMP.competencias.some(c=>c.competencia===IMP.comp)) IMP.comp = IMP.competencias.length ? IMP.competencias[0].competencia : null;
  await impLoadComp();
  IMP.loaded = true;
}

async function impLoadComp(){
  const idx = IMP.competencias.findIndex(c=>c.competencia===IMP.comp);
  IMP.header = idx>=0 ? IMP.competencias[idx] : null;
  IMP.prevHeader = idx>=0 ? (IMP.competencias[idx+1] || null) : null;
  const cur = IMP.header ? await impFetchAll(()=> supabaseClient.from('impressoras_mensal').select('*').eq('competencia', IMP.comp).order('id')) : [];
  const prev = IMP.prevHeader ? await impFetchAll(()=> supabaseClient.from('impressoras_mensal').select('*').eq('competencia', IMP.prevHeader.competencia).order('id')) : [];
  IMP.calc = impCalc(IMP.header, impJoin(cur));
  IMP.prevCalc = IMP.prevHeader ? impCalc(IMP.prevHeader, impJoin(prev)) : null;
  IMP.hist = null;
}

async function impLoadHist(){
  const rows = await impFetchAll(()=> supabaseClient.from('impressoras_mensal').select('competencia,impressora_id,unidade,valor_locacao,paginas_pb,paginas_color,observacao').order('competencia'));
  const by = {};
  rows.forEach(r=>{ (by[r.competencia] = by[r.competencia] || []).push(r); });
  IMP.hist = IMP.competencias.slice().reverse().map(h => ({ header:h, calc: impCalc(h, impJoin(by[h.competencia]||[])) }));
}

/* ----------------------------- motor de cálculo ----------------------------- */
function impAgg(list, label, unidade){
  const a = {unidade, label, n:list.length, nImpr:0, modelos:{}, fab:{}, backup:0, semPat:0, semSerie:0, semCad:0,
             semImp:0, semImpNB:0, semImpLoc:0, semLoc:0, loc:0, pb:0, co:0, xPB:0, xCO:0, custo:0};
  list.forEach(l=>{
    if(l.tipo==='Impressora') a.nImpr++;
    a.modelos[l.modelo||'—'] = (a.modelos[l.modelo||'—']||0) + 1;
    const f = impFabricante(l.modelo); a.fab[f] = (a.fab[f]||0) + 1;
    if(l.backup) a.backup++;
    const semPat = impPlaceholderPat(l.patrimonio), semSerie = !impSerieValida(l.serie);
    if(semPat) a.semPat++; if(semSerie) a.semSerie++; if(semPat || semSerie) a.semCad++;
    if(l.pb + l.co === 0){ a.semImp++; if(!l.backup) a.semImpNB++; a.semImpLoc += (l.loc||0); }
    if(l.loc===null) a.semLoc++;
    a.loc += (l.loc||0); a.pb += l.pb; a.co += l.co; a.xPB += l.xPB; a.xCO += l.xCO; a.custo += l.custo;
  });
  a.ex = a.xPB + a.xCO; a.pag = a.pb + a.co;
  a.custoEquip = a.n ? a.custo / a.n : null;
  a.custoPag = a.pag > 0 ? a.custo / a.pag : null;
  a.exPagPB = a.pb > 0 ? a.xPB / a.pb : null;
  a.exPagCO = a.co > 0 ? a.xCO / a.co : null;
  return a;
}

function impCalc(header, rows){
  const h = header || {};
  const exPB = impN(h.excedente_pb), exCO = impN(h.excedente_color);
  let sPB = 0, sCO = 0;
  rows.forEach(r=>{ sPB += r.pb; sCO += r.co; });
  const linhas = rows.map(r=>{
    const pctPB = sPB > 0 ? r.pb / sPB : 0, pctCO = sCO > 0 ? r.co / sCO : 0;
    const xPB = pctPB * exPB, xCO = pctCO * exCO;
    return Object.assign({}, r, {pctPB, pctCO, xPB, xCO, custo:(r.loc||0) + xPB + xCO, pag:r.pb + r.co});
  });
  const porUnid = {};
  linhas.forEach(l=>{ const k = l.unidade || '(sem hotel)'; (porUnid[k] = porUnid[k] || []).push(l); });
  const hoteis = Object.keys(porUnid).map(k=> impAgg(porUnid[k], k==='(sem hotel)' ? k : unitLabel(k), k)).sort((a,b)=> b.custo - a.custo);
  const corp = impAgg(linhas, 'Corporativo', null);
  hoteis.forEach(x=>{ x.share = corp.custo > 0 ? x.custo / corp.custo : 0; });
  corp.nHoteis = hoteis.length;
  corp.custoHotel = hoteis.length ? corp.custo / hoteis.length : null;
  corp.corCusto = corp.custo > 0 ? corp.xCO / corp.custo : null;
  corp.corPag = corp.pag > 0 ? corp.co / corp.pag : null;
  corp.backupPct = corp.n ? corp.backup / corp.n : null;
  // Valor faturado (ND): o descritivo informa o TOTAL ND; se não vier, é referência − desconto.
  const desconto = impN(h.desconto);
  const faturadoInformado = impHas(h.total_nd);
  const faturado = faturadoInformado ? Number(h.total_nd) : corp.custo - desconto;
  return { header:h, linhas, hoteis, corp, sPB, sCO, exPB, exCO, desconto, faturado, faturadoInformado,
           naoRateado: { pb: sPB===0 ? exPB : 0, co: sCO===0 ? exCO : 0 } };
}

/* ----------------------------- validações ----------------------------- */
function impLabel(l){
  return (l.unidade ? unitLabel(l.unidade) : '(sem hotel)')+' · '+(l.modelo||'—')+' · pat. '+(l.patrimonio||'s/ patrimônio')+' · série '+(l.serie||'s/ série');
}
const impCnpjOk = c => /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(c);

function impValidar(calc, header, ctx){
  ctx = ctx || {};
  const out = [], conf = [];
  const L = calc.linhas;
  const add = (sev, cod, titulo, detalhe, itens) => { if(!itens || itens.length) out.push({sev, cod, titulo, detalhe, itens: itens||[]}); };

  // duplicidades
  const dup = (keyFn) => { const m = {}; L.forEach(l=>{ const k = keyFn(l); if(k) (m[k] = m[k]||[]).push(l); }); return Object.values(m).filter(g=>g.length>1); };
  const dS = dup(l=> impSerieValida(l.serie) ? impNorm(l.serie) : '');
  add('alta','dup-serie','Número de série duplicado','O mesmo número de série aparece em mais de uma linha — possível equipamento contado duas vezes.', dS.map(g=> g.map(impLabel).join('  ⟷  ')));
  const dP = dup(l=> impPlaceholderPat(l.patrimonio) ? '' : impNorm(l.patrimonio));
  add('alta','dup-pat','Patrimônio duplicado','O mesmo patrimônio aparece em mais de uma linha.', dP.map(g=> g.map(impLabel).join('  ⟷  ')));

  // cadastro
  add('media','sem-pat','Patrimônio ausente ou provisório ("nova", "nova/set")','Sem patrimônio definitivo o equipamento não é rastreável no inventário.', L.filter(l=>impPlaceholderPat(l.patrimonio)).map(impLabel));
  add('alta','sem-serie','Número de série ausente','Sem série não há como confirmar a identidade do equipamento entre competências.', L.filter(l=>!l.serie).map(impLabel));
  add('media','serie-suspeita','Número de série suspeito (sem números)','O campo parece conter texto livre, não um número de série.', L.filter(l=>l.serie && !impSerieValida(l.serie)).map(impLabel));
  add('alta','sem-hotel','Equipamento sem hotel associado','', L.filter(l=>!l.unidade).map(impLabel));
  add('alta','sem-loc','Valor de locação ausente','Sem o valor mensal de locação o custo do equipamento fica incompleto.', L.filter(l=>l.loc===null).map(l=> impLabel(l)+(l.backup?' (backup)':'')+(l.pag>0?' — imprimiu '+impInt(l.pag)+' páginas':'')));
  add('info','sem-imp','Equipamento sem registro de impressão na competência','Pode ser backup, equipamento recém-instalado ou ocioso — avaliar com o hotel antes de qualquer decisão.', L.filter(l=>l.pag===0).map(l=> impLabel(l)+(l.backup?' (backup)':'')+(l.loc?' — locação '+fmtCurrency(l.loc):'')));
  add('media','hotel-sem-leitura','Hotel sem nenhuma leitura de contador na competência','Todos os equipamentos do hotel estão sem páginas — pode ser leitura não coletada pelo fornecedor, e não ociosidade. Confirmar antes de analisar.', calc.hoteis.filter(h=>h.n>0 && h.pag===0).map(h=> h.label+' — '+h.n+' equipamento(s), locação '+fmtCurrency(h.loc)));
  add('media','nao-impressora','Equipamento que não é impressora na base de impressoras','Itens como fragmentadora entram no custo de locação mas não são impressoras.', L.filter(l=>l.tipo!=='Impressora').map(l=> impLabel(l)+' — locação '+fmtCurrency(l.loc||0)));
  add('info','backup-imprime','Equipamento marcado como BACKUP com volume de impressão','Pode indicar que o backup está em uso regular — confirmar a classificação.', L.filter(l=>l.backup && l.pag>0).map(l=> impLabel(l)+' — '+impInt(l.pb)+' PB / '+impInt(l.co)+' colorido'));

  // cadastro de hotel
  add('media','sem-cnpj','CNPJ ausente','', L.filter(l=>!l.cnpj).map(impLabel));
  add('info','cnpj-formato','CNPJ fora do padrão 00.000.000/0000-00','Provável erro de digitação (ponto no lugar da barra).', Array.from(new Set(L.filter(l=>l.cnpj && !impCnpjOk(l.cnpj)).map(l=> (l.unidade?unitLabel(l.unidade):'(sem hotel)')+' — '+l.cnpj))));
  const porHotel = {};
  L.forEach(l=>{ if(l.unidade) (porHotel[l.unidade] = porHotel[l.unidade] || []).push(l); });
  const incons = [];
  Object.keys(porHotel).forEach(u=>{
    const cnpjs = Array.from(new Set(porHotel[u].map(l=>l.cnpj.replace(/\s/g,'')).filter(Boolean)));
    const ends = Array.from(new Set(porHotel[u].map(l=>impNorm(l.endereco)).filter(Boolean)));
    if(cnpjs.length>1) incons.push(unitLabel(u)+' — CNPJs diferentes: '+cnpjs.join(' / '));
    if(ends.length>1) incons.push(unitLabel(u)+' — '+ends.length+' endereços diferentes entre as linhas do mesmo hotel');
  });
  add('media','hotel-inconsistente','Dados cadastrais inconsistentes dentro do mesmo hotel','', incons);

  // conferências de totais
  const hdr = header || {};
  const okPB = !impHas(hdr.total_pb) || Math.abs(impN(hdr.total_pb) - calc.sPB) < 0.5;
  const okCO = !impHas(hdr.total_color) || Math.abs(impN(hdr.total_color) - calc.sCO) < 0.5;
  conf.push({ok: okPB, texto: 'Total de páginas PB informado ('+(impHas(hdr.total_pb)?impInt(hdr.total_pb):'—')+') = soma das linhas ('+impInt(calc.sPB)+')'});
  conf.push({ok: okCO, texto: 'Total de páginas coloridas informado ('+(impHas(hdr.total_color)?impInt(hdr.total_color):'—')+') = soma das linhas ('+impInt(calc.sCO)+')'});
  if(!okPB) add('alta','tot-pb','Total de páginas PB não confere','O total informado no cabeçalho difere da soma das linhas.', ['Informado: '+impInt(hdr.total_pb)+' · Soma das linhas: '+impInt(calc.sPB)]);
  if(!okCO) add('alta','tot-co','Total de páginas coloridas não confere','O total informado no cabeçalho difere da soma das linhas.', ['Informado: '+impInt(hdr.total_color)+' · Soma das linhas: '+impInt(calc.sCO)]);
  const somaHot = calc.hoteis.reduce((s,h)=>s+h.custo,0);
  const okHot = Math.abs(somaHot - calc.corp.custo) < 0.01;
  conf.push({ok: okHot, texto: 'Soma dos custos dos hotéis ('+fmtCurrency(somaHot)+') = consolidado corporativo ('+fmtCurrency(calc.corp.custo)+')'});
  const rateado = calc.corp.xPB + calc.corp.xCO;
  const okRat = Math.abs(rateado - (calc.exPB + calc.exCO - calc.naoRateado.pb - calc.naoRateado.co)) < 0.01;
  conf.push({ok: okRat, texto: 'Excedente rateado entre os equipamentos ('+fmtCurrency(rateado)+') = excedente cobrado ('+fmtCurrency(calc.exPB+calc.exCO)+')'});
  if(impHas(hdr.total_nd)){
    const esperado = calc.corp.custo - impN(hdr.desconto);
    const okNd = Math.abs(esperado - Number(hdr.total_nd)) < 0.01;
    conf.push({ok: okNd, texto: 'Valor faturado (ND) informado ('+fmtCurrency(hdr.total_nd)+') = custo de referência − desconto ('+fmtCurrency(esperado)+')'});
    if(!okNd) add('alta','nd','Valor faturado (ND) não confere','O TOTAL ND informado difere de custo de referência − desconto por renovação antecipada.', ['Informado: '+fmtCurrency(hdr.total_nd)+' · Esperado: '+fmtCurrency(esperado)]);
  }
  if(calc.naoRateado.pb>0 || calc.naoRateado.co>0) add('alta','nao-rateado','Excedente sem páginas para ratear','Há excedente cobrado, mas nenhuma página registrada na categoria.', ['PB: '+fmtCurrency(calc.naoRateado.pb)+' · Colorido: '+fmtCurrency(calc.naoRateado.co)]);

  // checagens vindas do arquivo importado
  (ctx.extras || []).forEach(x=> add(x.sev, x.cod, x.titulo, x.detalhe, x.itens));

  // comparação com o mês anterior
  if(ctx.prevCalc){
    const prevBy = new Map(ctx.prevCalc.linhas.map(l=>[l.impressora_id, l]));
    const moved = [], novos = [];
    L.forEach(l=>{ const p = prevBy.get(l.impressora_id); if(!p) novos.push(l); else if((p.unidade||'') !== (l.unidade||'')) moved.push(impLabel(l)+' — era em '+(p.unidade?unitLabel(p.unidade):'(sem hotel)')); });
    add('info','mudou-hotel','Equipamento mudou de hotel em relação ao mês anterior','Confirmar se a mudança é real; o custo acompanha o hotel de cada competência.', moved);
    const curIds = new Set(L.map(l=>l.impressora_id));
    const saiu = ctx.prevCalc.linhas.filter(p=>!curIds.has(p.impressora_id)).map(impLabel);
    add('info','saiu','Equipamento do mês anterior que não consta nesta competência','', saiu);
    add('info','novo','Equipamento novo em relação ao mês anterior','', novos.map(impLabel));

    // quebra na série de leitura dos contadores, por hotel
    const prevH = new Map(ctx.prevCalc.hoteis.map(h=>[h.unidade, h]));
    const ruptura = [], salto = [];
    calc.hoteis.forEach(h=>{
      const p = prevH.get(h.unidade); if(!p) return;
      if((p.pag === 0) !== (h.pag === 0)) ruptura.push(h.label+': '+impInt(p.pag)+' → '+impInt(h.pag)+' páginas');
      else if(p.pag > 0 && Math.abs(h.pag/p.pag - 1) > 0.5) salto.push(h.label+': '+impInt(p.pag)+' → '+impInt(h.pag)+' páginas ('+(h.pag>p.pag?'+':'−')+impPct(Math.abs(h.pag/p.pag-1),0)+')');
    });
    add('media','leitura-ruptura','Hotel que passou de/para zero páginas em relação ao mês anterior','Pode ser leitura de contador não coletada e depois recuperada de uma vez (volume acumulado) — confirmar com o fornecedor antes de comparar meses.', ruptura);
    add('info','salto-volume','Volume do hotel variou mais de 50% em relação ao mês anterior','', salto);
  }

  // pendências de contrato (informações que o fornecedor precisa enviar)
  const contrato = [];
  if(!impHas(hdr.franquia_pb)) contrato.push('Franquia contratada de páginas PB (por hotel/equipamento)');
  if(!impHas(hdr.franquia_color)) contrato.push('Franquia contratada de páginas coloridas (por hotel/equipamento)');
  contrato.push('Tarifa unitária por página excedente (PB e colorido) — o descritivo traz só o total em R$');
  contrato.push('Volume de páginas excedentes por categoria e por hotel');
  if(!impHas(hdr.desconto)){
    const pd = (ctx.prevHeader && impHas(ctx.prevHeader.desconto)) ? ' (em '+impCompLabel(ctx.prevHeader.competencia)+' foi de '+fmtCurrency(ctx.prevHeader.desconto)+')' : '';
    contrato.push('Desconto por renovação antecipada — sem valor informado nesta competência'+pd+'; confirmar se o desconto terminou ou não foi lançado');
  }
  contrato.push('Critério de rateio do excedente entre equipamentos (o descritivo usa participação em páginas)');
  add('contrato','contrato','Informações a solicitar ao fornecedor','Sem elas, franquia, % de utilização e excedente por categoria não podem ser calculados.', contrato);

  const peso = {alta:0, media:1, info:2, contrato:3};
  out.sort((a,b)=> peso[a.sev]-peso[b.sev]);
  return { itens: out, conferencias: conf };
}

/* ----------------------------- componentes visuais ----------------------------- */
function impBadge(txt, tone){ return '<span class="badge '+(tone||'neutral')+'">'+esc(txt)+'</span>'; }

function impStack(items, fmt){
  const max = Math.max(1, ...items.map(i=> i.parts.reduce((s,p)=>s+p.v,0)));
  return '<div class="stack">'+items.map(i=>{
    const tot = i.parts.reduce((s,p)=>s+p.v,0);
    return '<div class="stack-row"><div class="bl" title="'+esc(i.label)+'">'+esc(i.label)+'</div><div class="stack-track">'+
      i.parts.map(p=> p.v>0 ? '<span class="seg '+p.cls+'" style="width:'+(p.v/max*100).toFixed(2)+'%" title="'+esc(p.nome+': '+fmt(p.v))+'"></span>' : '').join('')+
      '</div><div class="bv mono">'+fmt(tot)+'</div></div>';
  }).join('')+'</div>';
}
function impLegend(entries){ return '<div class="imp-legend">'+entries.map(e=>'<span><i class="seg '+e[0]+'"></i>'+esc(e[1])+'</span>').join('')+'</div>'; }

function impRank(items, fmt, empty){
  if(!items.length) return '<div class="empty-note">'+esc(empty||'Sem dados.')+'</div>';
  const max = Math.max(...items.map(i=>i.v), 1e-9);
  return items.map((i,ix)=>'<div class="bar-row"><div class="bl rk" title="'+esc(i.label)+'"><span class="rk-n">'+(ix+1)+'</span>'+esc(i.label)+'</div>'+
    '<div class="bar-track"><div class="bar-fill" style="width:'+(i.v/max*100).toFixed(1)+'%"></div></div><div class="bv mono rk-v">'+fmt(i.v)+'</div></div>').join('');
}

function impSpark(values){
  if(values.length < 2) return '<span class="empty-note">—</span>';
  const W = 96, H = 26, min = Math.min(...values), max = Math.max(...values), rng = (max-min) || 1;
  const pts = values.map((v,i)=> [(i/(values.length-1))*(W-6)+3, H-3-((v-min)/rng)*(H-6)]);
  const last = pts[pts.length-1];
  return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><polyline fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round" points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'"/><circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="2.4" fill="var(--accent)"/></svg>';
}

function impLineChart(labels, series){
  const W = 680, H = 250, pl = 64, pr = 18, pt = 16, pb = 34;
  const all = series.flatMap(s=>s.values);
  const max = Math.max(...all, 1) * 1.08;
  const x = i => labels.length > 1 ? pl + (i/(labels.length-1))*(W-pl-pr) : pl + (W-pl-pr)/2;
  const y = v => pt + (1 - v/max) * (H-pt-pb);
  let g = '';
  for(let t=0; t<=4; t++){
    const v = max/4*t, yy = y(v);
    g += '<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" class="grid"/><text x="'+(pl-8)+'" y="'+(yy+4)+'" text-anchor="end" class="chart-text">'+esc(Number(v).toLocaleString('pt-BR',{maximumFractionDigits:0}))+'</text>';
  }
  labels.forEach((l,i)=>{ g += '<text x="'+x(i)+'" y="'+(H-10)+'" text-anchor="middle" class="chart-text">'+esc(l)+'</text>'; });
  series.forEach(s=>{
    g += '<polyline fill="none" stroke="'+s.color+'" stroke-width="2" stroke-linejoin="round" points="'+s.values.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ')+'"/>';
    s.values.forEach((v,i)=>{ g += '<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="'+(i===s.values.length-1?4.2:2.8)+'" fill="'+s.color+'"><title>'+esc(s.nome+' · '+labels[i]+': '+fmtCurrency(v))+'</title></circle>'; });
  });
  return '<svg class="line-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Evolução mensal">'+g+'</svg>'+
    '<div class="imp-legend">'+series.map(s=>'<span><i class="seg" style="background:'+s.color+'"></i>'+esc(s.nome)+'</span>').join('')+'</div>';
}

function impKpi(icon, num, label, sub, delta){
  return '<div class="kpi"><span class="icon">'+ic(icon)+'</span><div class="num mono kpi-sm">'+num+'</div><div class="lbl">'+esc(label)+'</div>'+(sub?'<div class="kpi-sub">'+sub+'</div>':'')+(delta||'')+'</div>';
}

function impNaoInfo(txt){ return '<span class="imp-na" title="Indicador não calculável: '+esc(txt)+'">não informado</span>'; }

/* ----------------------------- abas / navegação ----------------------------- */
function impTopbarHidden(){ return IMP.tab !== 'legado'; }

function impTabsHtml(){
  const comps = IMP.competencias;
  let html = '<div class="imp-tabs" role="tablist">'+IMP_TABS.map(t=>'<button class="imp-tab '+(IMP.tab===t[0]?'active':'')+'" data-imptab="'+t[0]+'" role="tab">'+esc(t[1])+'</button>').join('');
  html += '<span class="imp-tabs-spacer"></span>';
  if(IMP.tab !== 'legado' && comps.length){
    html += '<label class="imp-comp">Competência <select id="impCompSel" class="field-select">'+comps.map(c=>'<option value="'+c.competencia+'" '+(c.competencia===IMP.comp?'selected':'')+'>'+esc(impCompLabel(c.competencia))+'</option>').join('')+'</select></label>';
  }
  if(canWrite() && IMP.tab !== 'legado') html += '<button class="btn" id="impImportBtn"><span class="icon">'+ic('plus')+'</span>Importar competência</button>';
  return html+'</div>';
}

function impWireTabs(){
  document.querySelectorAll('.imp-tab').forEach(b=> b.addEventListener('click', ()=>{ IMP.tab = b.dataset.imptab; impOpen(); }));
  const sel = document.getElementById('impCompSel');
  if(sel) sel.addEventListener('change', async e=>{ IMP.comp = e.target.value; await impLoadComp(); impRender(); });
  const ib = document.getElementById('impImportBtn');
  if(ib) ib.addEventListener('click', impOpenImporter);
}

async function impOpen(){
  if(typeof state.unsub === 'function'){ state.unsub(); state.unsub = null; }
  state.moduleKey = 'impressoras';
  renderTopbar();
  if(IMP.tab === 'legado'){ subscribeModule('impressoras'); return; }
  const content = document.getElementById('content');
  content.innerHTML = impTabsHtml()+'<div class="table-wrap"><div class="table-empty">Carregando…</div></div>';
  impWireTabs();
  try{
    if(!IMP.loaded) await impLoadBase();
  }catch(e){
    console.error(e);
    if(state.moduleKey !== 'impressoras') return;
    content.innerHTML = impTabsHtml()+'<div class="table-wrap"><div class="table-empty"><b>Não foi possível carregar o módulo</b>'+esc(e.message||String(e))+'</div></div>';
    impWireTabs();
    return;
  }
  if(state.moduleKey !== 'impressoras' || IMP.tab === 'legado') return;
  impRender();
}

async function impAfterSave(){
  if(IMP.tab === 'legado') return;
  IMP.loaded = false;
  await impOpen();
}

function impRender(){
  if(state.moduleKey !== 'impressoras' || IMP.tab === 'legado') return;
  const content = document.getElementById('content');
  let body;
  if(IMP.missing) body = impViewSetup();
  else if(!IMP.competencias.length) body = impViewVazio();
  else if(IMP.tab === 'dashboard') body = impViewDashboard();
  else if(IMP.tab === 'hoteis') body = impViewHoteis();
  else if(IMP.tab === 'inventario') body = impViewInventario();
  else if(IMP.tab === 'historico'){
    if(!IMP.hist){
      content.innerHTML = impTabsHtml()+'<div class="table-wrap"><div class="table-empty">Carregando histórico…</div></div>'; impWireTabs();
      impLoadHist().then(()=>{ impRender(); }).catch(e=>{ content.innerHTML = impTabsHtml()+'<div class="table-wrap"><div class="table-empty"><b>Não foi possível carregar o histórico</b>'+esc(e.message||String(e))+'</div></div>'; impWireTabs(); });
      return;
    }
    body = impViewHistorico();
  }
  else if(IMP.tab === 'pendencias') body = impViewPendencias();
  content.innerHTML = impTabsHtml()+body;
  impWireTabs();
  impWireView();
}

function impViewSetup(){
  return '<div class="panel"><h2>Falta preparar o banco de dados</h2><div class="panel-sub">As tabelas do histórico mensal ainda não existem.</div>'+
    '<p class="imp-p">Rode o <code>schema.sql</code> atualizado no SQL Editor do Supabase e recarregue esta página.</p></div>';
}
function impViewVazio(){
  return '<div class="panel"><h2>Nenhuma competência importada ainda</h2><div class="panel-sub">Importe o descritivo mensal do fornecedor para ver os indicadores.</div>'+
    '<p class="imp-p">'+(canWrite() ? 'Use o botão <b>Importar competência</b> acima (planilha .xlsx do descritivo) ou rode o SQL de importação da competência.' : 'Peça a um editor ou administrador para importar a primeira competência.')+'</p></div>';
}

/* ----------------------------- Dashboard executivo ----------------------------- */
function impMetodologia(){
  return '<details class="panel imp-met"><summary><b>Como é calculado</b> — fórmulas auditáveis</summary><div class="imp-met-body">'+
    '<p>O descritivo do fornecedor traz <b>um valor de excedente para PB e um para colorido (R$)</b> e a planilha o distribui entre os equipamentos pela participação em páginas. Não há tarifa por página nem franquia no arquivo.</p>'+
    '<ul>'+
    '<li><b>% PB do equipamento</b> = páginas PB do equipamento ÷ soma das páginas PB da competência (idem colorido)</li>'+
    '<li><b>Excedente PB do equipamento</b> = % PB × excedente PB cobrado (R$); <b>Excedente colorido</b> = % colorido × excedente colorido cobrado (R$)</li>'+
    '<li><b>Custo do equipamento</b> = locação + excedente PB + excedente colorido</li>'+
    '<li><b>Custo de referência do serviço</b> = Σ custo dos equipamentos (locação + excedentes) — é o "valor de referência para rateio" do descritivo</li>'+
    '<li><b>Valor faturado (ND)</b> = TOTAL ND informado no descritivo; confere com custo de referência − desconto por renovação antecipada</li>'+
    '<li><b>Custo por página</b> = custo total ÷ (páginas PB + coloridas) — valor <i>derivado</i>, não é tarifa contratual</li>'+
    '<li><b>Excedente médio por página</b> = excedente rateado ÷ páginas da categoria — também derivado</li>'+
    '<li><b>Participação do colorido no custo</b> = excedente colorido ÷ custo total do serviço</li>'+
    '<li><b>Locação sem impressão</b> = soma da locação dos equipamentos com 0 página (PB + colorido) na competência</li>'+
    '</ul><p>Esta tela recalcula o rateio a partir das páginas de cada linha, então ele sempre fecha com o excedente cobrado — mesmo se a planilha de origem tiver uma referência de fórmula errada.</p></div></details>';
}

function impOportunidades(c){
  const itens = [];
  const corp = c.corp;
  const total = corp.custo;
  if(corp.loc > 0 && total > 0) itens.push('<b>'+impPct(corp.loc/total)+'</b> do custo do serviço é <b>locação fixa</b> ('+fmtCurrency(corp.loc)+'); o excedente variável soma '+fmtCurrency(corp.ex)+'. A negociação do valor de locação por equipamento tem mais impacto do que o controle de volume.');
  const ph = IMP.prevHeader, pc = IMP.prevCalc;
  if(ph && pc && impN(ph.desconto) > 0 && !(c.desconto > 0)){
    itens.push('Em <b>'+impCompLabel(ph.competencia)+'</b> o desconto por renovação antecipada foi de <b>'+fmtCurrency(ph.desconto)+'</b>'+(pc.corp.ex>0 ? ' ('+impPct(ph.desconto/pc.corp.ex,0)+' dos excedentes)' : '')+'. Nesta competência não há desconto informado e o valor faturado ficou em <b>'+fmtCurrency(c.faturado)+'</b> (mês anterior: '+fmtCurrency(pc.faturado)+'). Confirmar com o fornecedor se o desconto terminou ou não foi lançado.');
  }
  if(corp.semImpLoc > 0) itens.push('<b>'+corp.semImp+' equipamentos</b> ('+(corp.semImp-corp.semImpNB)+' deles marcados como backup) não registraram nenhuma impressão e somam <b>'+fmtCurrency(corp.semImpLoc)+'/mês</b> de locação ('+impPct(corp.semImpLoc/Math.max(corp.loc,1e-9))+' da locação). Avaliar com cada hotel necessidade operacional, localização e criticidade antes de qualquer decisão — baixo volume não significa equipamento dispensável.');
  const semLeitura = c.hoteis.filter(h=>h.n>0 && h.pag===0);
  if(semLeitura.length) itens.push('<b>'+semLeitura.map(h=>esc(h.label)).join(' e ')+'</b> não têm nenhuma página registrada em nenhum equipamento ('+fmtCurrency(semLeitura.reduce((s,h)=>s+h.loc,0))+'/mês de locação). Antes de tratar como ociosidade, confirmar com o fornecedor se a leitura dos contadores foi coletada.');
  const hOciosos = c.hoteis.filter(h=>h.semImpNB>0 && h.pag>0).sort((a,b)=> b.semImpNB/b.n - a.semImpNB/a.n).slice(0,3);
  if(hOciosos.length) itens.push('Hotéis com maior proporção de equipamentos sem impressão: '+hOciosos.map(h=>'<b>'+esc(h.label)+'</b> ('+h.semImpNB+' de '+h.n+')').join(', ')+'. Há espaço para <b>redistribuir</b> equipamentos de hotéis com sobra para hotéis com alto volume por equipamento.');
  const volEquip = c.hoteis.filter(h=>h.n>0 && h.pag>0).map(h=>({h, v:h.pag/h.n})).sort((a,b)=>b.v-a.v).slice(0,3);
  if(volEquip.length) itens.push('Maior volume médio por equipamento: '+volEquip.map(x=>'<b>'+esc(x.h.label)+'</b> ('+impInt(x.v)+' pág./equip.)').join(', ')+'.');
  const locs = c.linhas.map(l=>l.loc).filter(v=>v!==null && v>0);
  const med = impMediana(locs);
  const caros = c.linhas.filter(l=>l.loc!==null && med>0 && l.loc > 2*med).sort((a,b)=>b.loc-a.loc);
  if(caros.length) itens.push('Equipamentos com locação acima de 2× a mediana ('+fmtCurrency(med)+'): '+caros.slice(0,4).map(l=>esc(l.modelo)+' em '+esc(l.unidade?unitLabel(l.unidade):'—')+' ('+fmtCurrency(l.loc)+')').join('; ')+(caros.length>4?' e mais '+(caros.length-4):'')+'. Vale revisar se o modelo e o contrato se justificam.');
  const epson = c.linhas.filter(l=>/EPSON/.test(impNorm(l.modelo)) && l.tipo==='Impressora');
  const epsonSemCor = epson.filter(l=>l.co===0);
  if(epson.length && epsonSemCor.length) itens.push('Dos <b>'+epson.length+'</b> equipamentos Epson (modelos de maior locação), <b>'+epsonSemCor.length+'</b> não imprimiram nada colorido nesta competência. Avaliar o mix de modelos — sem presumir que sejam dispensáveis (podem atender picos).');
  itens.push('<b>Revisão de franquias</b> e <b>excedente por categoria</b> não podem ser calculados: o descritivo não informa franquia nem tarifa. Solicitar ao fornecedor (ver aba Pendências).');
  return '<div class="panel"><h2>Oportunidades de otimização</h2><div class="panel-sub">Pontos para análise — nenhum equipamento deve ser retirado só com base no volume</div><ul class="imp-ul">'+itens.map(i=>'<li>'+i+'</li>').join('')+'</ul></div>';
}

function impViewDashboard(){
  const c = IMP.calc, p = IMP.prevCalc, k = c.corp, pk = p ? p.corp : null;
  const val = impValidar(c, IMP.header, {prevCalc:p, prevHeader:IMP.prevHeader});
  const cont = {alta:0, media:0, info:0, contrato:0};
  val.itens.forEach(i=>{ cont[i.sev] += 1; });
  const outros = k.n - k.nImpr;

  let html = '<div class="imp-head"><b>'+esc(impCompLabel(IMP.comp))+'</b> · '+(IMP.header.arquivo_origem ? 'origem: '+esc(IMP.header.arquivo_origem) : 'sem arquivo de origem registrado')+
    ' · <a href="#" id="impGoPend">'+(cont.alta+cont.media)+' pendência(s) de dados a validar</a></div>';

  html += '<div class="kpi-grid">'+
    impKpi('impressoras', impInt(k.n), 'Equipamentos locados', impInt(k.nImpr)+' impressoras'+(outros?' + '+outros+' outros':'')+' · '+k.backup+' backup ('+(k.backupPct!==null?impPct(k.backupPct):'—')+')', impDelta(k.n, pk?pk.n:null,'int'))+
    impKpi('compras', fmtCurrency(c.faturado), 'Valor faturado (ND)', (c.desconto>0 ? 'após desconto por renovação antecipada de '+fmtCurrency(c.desconto) : 'sem desconto informado')+(c.faturadoInformado?' · TOTAL ND do descritivo':''), impDelta(c.faturado, p?p.faturado:null,'cost'))+
    impKpi('compras', fmtCurrency(k.custo), 'Custo de referência do serviço', 'locação + excedentes (base de rateio entre hotéis)', impDelta(k.custo, pk?pk.custo:null,'cost'))+
    impKpi('locados', fmtCurrency(k.loc), 'Custo mensal de locação', k.semLoc ? k.semLoc+' equip. sem valor informado' : '', impDelta(k.loc, pk?pk.loc:null,'cost'))+
    impKpi('depreciacao', fmtCurrency(k.ex), 'Custo mensal de impressões (excedentes)', 'PB '+fmtCurrency(k.xPB)+' · colorido '+fmtCurrency(k.xCO)+(c.desconto>0 && k.ex>0 ? ' · desconto cobre '+impPct(Math.min(c.desconto/k.ex,9.99),0) : ''), impDelta(k.ex, pk?pk.ex:null,'cost'))+
    impKpi('inventario', impInt(k.pb), 'Páginas PB', '', impDelta(k.pb, pk?pk.pb:null,'int'))+
    impKpi('inventario', impInt(k.co), 'Páginas coloridas', k.corPag!==null ? impPct(k.corPag)+' das páginas' : '', impDelta(k.co, pk?pk.co:null,'int'))+
    impKpi('compras', k.corCusto!==null ? impPct(k.corCusto) : '—', 'Participação do colorido no custo', 'excedente colorido ÷ custo total')+
    impKpi('dashboard', k.custoHotel!==null ? fmtCurrency(k.custoHotel) : '—', 'Custo médio por hotel', k.nHoteis+' hotéis/unidades')+
    impKpi('impressoras', k.custoEquip!==null ? fmtCurrency(k.custoEquip) : '—', 'Custo médio por equipamento')+
    impKpi('compras', k.custoPag!==null ? impMoney4(k.custoPag) : impNaoInfo('sem páginas'), 'Custo médio por página', 'derivado: custo total ÷ páginas')+
    '</div>';

  const ordenado = c.hoteis.slice().sort((a,b)=>b.custo-a.custo);
  html += '<div class="imp-grid-2">'+
    '<div class="panel"><h2>Custo total por hotel</h2><div class="panel-sub">Locação + excedentes, em R$</div>'+
      impStack(ordenado.map(h=>({label:h.label, parts:[{v:h.loc,cls:'seg-loc',nome:'Locação'},{v:h.xPB,cls:'seg-pb',nome:'Excedente PB'},{v:h.xCO,cls:'seg-co',nome:'Excedente colorido'}]})), fmtCurrency)+
      impLegend([['seg-loc','Locação'],['seg-pb','Excedente PB'],['seg-co','Excedente colorido']])+'</div>'+
    '<div class="panel"><h2>Composição do custo</h2><div class="panel-sub">Locação separada de impressão</div>'+
      impStack([{label:'Corporativo', parts:[{v:k.loc,cls:'seg-loc',nome:'Locação'},{v:k.xPB,cls:'seg-pb',nome:'Excedente PB'},{v:k.xCO,cls:'seg-co',nome:'Excedente colorido'}]}], fmtCurrency)+
      '<table class="imp-mini"><tbody><tr><td><i class="seg seg-loc"></i>Locação</td><td class="num-cell">'+fmtCurrency(k.loc)+'</td><td class="num-cell">'+impPct(k.custo?k.loc/k.custo:0)+'</td></tr>'+
      '<tr><td><i class="seg seg-pb"></i>Excedente PB</td><td class="num-cell">'+fmtCurrency(k.xPB)+'</td><td class="num-cell">'+impPct(k.custo?k.xPB/k.custo:0)+'</td></tr>'+
      '<tr><td><i class="seg seg-co"></i>Excedente colorido</td><td class="num-cell">'+fmtCurrency(k.xCO)+'</td><td class="num-cell">'+impPct(k.custo?k.xCO/k.custo:0)+'</td></tr></tbody></table>'+
      '<div class="panel-sub" style="margin:14px 0 8px;">Excedentes por hotel (PB × colorido)</div>'+
      impStack(c.hoteis.slice().sort((a,b)=>b.ex-a.ex).map(h=>({label:h.label, parts:[{v:h.xPB,cls:'seg-pb',nome:'Excedente PB'},{v:h.xCO,cls:'seg-co',nome:'Excedente colorido'}]})), fmtCurrency)+'</div>'+
    '</div>';

  const top = (arr, fn, n) => arr.slice().sort((a,b)=>fn(b)-fn(a)).filter(x=>fn(x)>0).slice(0,n||5).map(x=>({label:x.label, v:fn(x)}));
  const eqs = c.linhas.slice();
  const eqLabel = l => (l.unidade?unitLabel(l.unidade):'—')+' · '+(l.modelo||'—')+' · '+(l.patrimonio||l.serie||'s/ id');
  const comVol = eqs.filter(l=>l.pag>0 && !l.backup);
  const q = comVol.map(l=>l.pag).sort((a,b)=>a-b);
  const lim = q.length ? q[Math.floor(q.length*0.25)] : 0;
  const baixo = comVol.filter(l=>l.pag <= lim).sort((a,b)=>a.pag-b.pag).slice(0,6);
  const semImp = eqs.filter(l=>l.pag===0 && l.loc>0).sort((a,b)=>b.loc-a.loc);
  const backups = eqs.filter(l=>l.backup);

  html += '<h3 class="imp-h3">Rankings</h3><div class="imp-grid-3">'+
    '<div class="panel"><h2>Maior custo total</h2><div class="panel-sub">hotéis</div>'+impRank(top(c.hoteis,h=>h.custo,5), fmtCurrency)+'</div>'+
    '<div class="panel"><h2>Maior volume PB</h2><div class="panel-sub">páginas por hotel</div>'+impRank(top(c.hoteis,h=>h.pb,5), impInt)+'</div>'+
    '<div class="panel"><h2>Maior volume colorido</h2><div class="panel-sub">páginas por hotel</div>'+impRank(top(c.hoteis,h=>h.co,5), impInt, 'Nenhuma página colorida.')+'</div>'+
    '<div class="panel"><h2>Maior custo médio por equipamento</h2><div class="panel-sub">hotéis</div>'+impRank(top(c.hoteis,h=>h.custoEquip||0,5), fmtCurrency)+'</div>'+
    '<div class="panel"><h2>Maior custo por página</h2><div class="panel-sub">custo total ÷ páginas (derivado)</div>'+impRank(top(c.hoteis,h=>h.custoPag||0,5), impMoney4)+'</div>'+
    '<div class="panel"><h2>Equipamentos com maior volume</h2><div class="panel-sub">páginas PB + coloridas</div>'+impRank(eqs.slice().sort((a,b)=>b.pag-a.pag).filter(l=>l.pag>0).slice(0,5).map(l=>({label:eqLabel(l), v:l.pag})), impInt)+'</div>'+
    '</div>';

  html += '<div class="imp-grid-3">'+
    '<div class="panel"><h2>Baixa utilização</h2><div class="panel-sub">25% de menor volume entre os que imprimiram (exclui backup) — até '+impInt(lim)+' páginas</div>'+impRank(baixo.map(l=>({label:eqLabel(l), v:l.pag})), impInt, 'Sem dados.')+'<div class="imp-fine">Indicador de atenção, não recomendação de retirada.</div></div>'+
    '<div class="panel"><h2>Locação sem registro de impressão</h2><div class="panel-sub">'+semImp.length+' equipamento(s) · '+fmtCurrency(semImp.reduce((s,l)=>s+l.loc,0))+'/mês</div>'+impRank(semImp.slice(0,6).map(l=>({label:eqLabel(l)+(l.backup?' (backup)':''), v:l.loc})), fmtCurrency, 'Nenhum.')+(semImp.length>6?'<div class="imp-fine">+ '+(semImp.length-6)+' equipamentos (ver Inventário → filtro "Sem impressão")</div>':'')+'</div>'+
    '<div class="panel"><h2>Equipamentos de backup</h2><div class="panel-sub">'+backups.length+' marcado(s) — não são, por definição, ociosos</div>'+(backups.length?backups.map(l=>'<div class="bar-row"><div class="bl rk" style="width:auto;flex:1">'+esc(eqLabel(l))+'</div><div class="bv mono" style="width:auto">'+impInt(l.pag)+' pág.</div></div>').join(''):'<div class="empty-note">Nenhum.</div>')+'</div>'+
    '</div>';

  const fab = {}; c.linhas.forEach(l=>{ const f = impFabricante(l.modelo); const m = l.modelo||'—'; fab[f] = fab[f]||{n:0,m:{}}; fab[f].n++; fab[f].m[m] = (fab[f].m[m]||0)+1; });
  html += '<div class="panel"><h2>Equipamentos por fabricante e modelo</h2><div class="table-scroll"><table class="imp-mini"><thead><tr><th>Fabricante</th><th>Modelo</th><th class="num-cell">Qtde</th></tr></thead><tbody>'+
    Object.keys(fab).sort((a,b)=>fab[b].n-fab[a].n).map(f=> Object.keys(fab[f].m).sort((a,b)=>fab[f].m[b]-fab[f].m[a]).map((m,ix)=>'<tr><td>'+(ix===0?'<b>'+esc(f)+'</b> ('+fab[f].n+')':'')+'</td><td>'+esc(m)+'</td><td class="num-cell">'+fab[f].m[m]+'</td></tr>').join('')).join('')+
    '</tbody></table></div></div>';

  html += impOportunidades(c) + impMetodologia();
  return html;
}

/* ----------------------------- Por hotel ----------------------------- */
function impViewHoteis(){
  const c = IMP.calc, k = c.corp;
  const th = t => '<th class="num-cell">'+t+'</th>';
  let html = '<div class="panel"><h2>Visão por hotel — '+esc(impCompLabel(IMP.comp))+'</h2><div class="panel-sub">Uma linha por hotel. Clique na linha para ver a composição de custos e os equipamentos.</div>'+
    '<div class="table-scroll"><table class="imp-wide"><thead><tr><th>Hotel</th>'+th('Equip.')+th('Backup')+th('Sem pat./série')+th('Locação')+th('Pág. PB')+th('Pág. cor')+th('Exced. PB')+th('Exced. cor')+th('Excedentes')+th('Custo total')+th('% do total')+th('Custo/equip.')+th('Custo/pág.')+th('Exc./pág. PB')+th('Exc./pág. cor')+'</tr></thead><tbody>';
  c.hoteis.forEach(h=>{
    html += '<tr class="imp-hrow '+(IMP.hotel===h.unidade?'sel':'')+'" data-hotel="'+esc(h.unidade)+'"><td><b>'+esc(h.label)+'</b></td>'+
      '<td class="num-cell">'+h.n+'</td><td class="num-cell">'+h.backup+'</td><td class="num-cell">'+h.semCad+'</td>'+
      '<td class="num-cell">'+fmtCurrency(h.loc)+'</td><td class="num-cell">'+impInt(h.pb)+'</td><td class="num-cell">'+impInt(h.co)+'</td>'+
      '<td class="num-cell">'+fmtCurrency(h.xPB)+'</td><td class="num-cell">'+fmtCurrency(h.xCO)+'</td><td class="num-cell">'+fmtCurrency(h.ex)+'</td>'+
      '<td class="num-cell"><b>'+fmtCurrency(h.custo)+'</b></td><td class="num-cell">'+impPct(h.share)+'</td><td class="num-cell">'+(h.custoEquip!==null?fmtCurrency(h.custoEquip):'—')+'</td>'+
      '<td class="num-cell">'+(h.custoPag!==null?impMoney4(h.custoPag):'—')+'</td><td class="num-cell">'+(h.exPagPB!==null?impMoney4(h.exPagPB):'—')+'</td><td class="num-cell">'+(h.exPagCO!==null?impMoney4(h.exPagCO):'—')+'</td></tr>';
  });
  html += '</tbody><tfoot><tr><td><b>Corporativo</b></td><td class="num-cell">'+k.n+'</td><td class="num-cell">'+k.backup+'</td><td class="num-cell">'+k.semCad+'</td><td class="num-cell">'+fmtCurrency(k.loc)+'</td><td class="num-cell">'+impInt(k.pb)+'</td><td class="num-cell">'+impInt(k.co)+'</td><td class="num-cell">'+fmtCurrency(k.xPB)+'</td><td class="num-cell">'+fmtCurrency(k.xCO)+'</td><td class="num-cell">'+fmtCurrency(k.ex)+'</td><td class="num-cell"><b>'+fmtCurrency(k.custo)+'</b></td><td class="num-cell">100,0%</td><td class="num-cell">'+(k.custoEquip!==null?fmtCurrency(k.custoEquip):'—')+'</td><td class="num-cell">'+(k.custoPag!==null?impMoney4(k.custoPag):'—')+'</td><td class="num-cell">'+(k.exPagPB!==null?impMoney4(k.exPagPB):'—')+'</td><td class="num-cell">'+(k.exPagCO!==null?impMoney4(k.exPagCO):'—')+'</td></tr></tfoot></table></div>'+
    '<div class="imp-fine">"Exc./pág." = excedente rateado ÷ páginas da categoria (derivado; o descritivo não traz tarifa por página). "Sem pat./série" = equipamentos sem patrimônio definitivo ou sem número de série válido.</div></div>';

  const h = c.hoteis.find(x=>x.unidade===IMP.hotel);
  if(h){
    const linhas = c.linhas.filter(l=>l.unidade===h.unidade).sort((a,b)=>b.custo-a.custo);
    const locs = linhas.map(l=>l.loc).filter(v=>v!==null);
    html += '<div class="panel"><h2>'+esc(h.label)+' — composição dos custos</h2><div class="panel-sub">'+h.n+' equipamento(s) · '+impPct(h.share)+' do custo corporativo</div>'+
      '<div class="imp-grid-3">'+
      '<div class="imp-blk"><h4>A · Locação</h4><div class="imp-big">'+fmtCurrency(h.loc)+'</div>'+
        '<div>'+h.n+' equipamentos locados</div><div>Valor individual: '+(locs.length ? (Math.min(...locs)===Math.max(...locs) ? fmtCurrency(locs[0]) : fmtCurrency(Math.min(...locs))+' a '+fmtCurrency(Math.max(...locs))) : impNaoInfo('sem valores'))+'</div>'+(h.semLoc?'<div class="imp-warn">'+h.semLoc+' sem valor de locação informado</div>':'')+'</div>'+
      '<div class="imp-blk"><h4>B · Impressões</h4><div class="imp-big">'+fmtCurrency(h.ex)+'</div>'+
        '<div>PB: '+impInt(h.pb)+' pág. · '+fmtCurrency(h.xPB)+'</div><div>Colorido: '+impInt(h.co)+' pág. · '+fmtCurrency(h.xCO)+'</div>'+
        '<div>Valor unitário por página: '+impNaoInfo('tarifa não consta no descritivo')+'</div><div class="imp-fine">Valor = excedente rateado (único valor variável do descritivo).</div></div>'+
      '<div class="imp-blk"><h4>C · Excedentes</h4><div class="imp-big">'+fmtCurrency(h.ex)+'</div>'+
        '<div>Franquia PB: '+(impHas(IMP.header.franquia_pb)?impInt(IMP.header.franquia_pb):impNaoInfo('franquia não informada'))+'</div><div>Franquia colorido: '+(impHas(IMP.header.franquia_color)?impInt(IMP.header.franquia_color):impNaoInfo('franquia não informada'))+'</div>'+
        '<div>Volume excedente / % de utilização: '+impNaoInfo('depende da franquia')+'</div><div class="imp-fine">Mesmo valor do bloco B: o descritivo não separa impressão de excedente (não somar duas vezes).</div></div>'+
      '</div>'+
      '<div class="panel-sub" style="margin:16px 0 6px;">Modelos</div><div>'+Object.keys(h.modelos).sort((a,b)=>h.modelos[b]-h.modelos[a]).map(m=>impBadge(m+' × '+h.modelos[m],'neutral')).join(' ')+'</div></div>'+
      '<div class="panel"><h2>Equipamentos — '+esc(h.label)+'</h2>'+impEquipTable(linhas, false)+'</div>';
  } else {
    html += '<div class="empty-note" style="padding:6px 2px;">Selecione um hotel na tabela para ver o detalhamento.</div>';
  }
  return html;
}

/* ----------------------------- Inventário ----------------------------- */
function impFlags(l){
  const f = [];
  if(l.backup) f.push(impBadge('Backup','neutral'));
  if(impPlaceholderPat(l.patrimonio)) f.push(impBadge('Sem patrimônio','warn'));
  if(!l.serie) f.push(impBadge('Sem série','crit')); else if(!impSerieValida(l.serie)) f.push(impBadge('Série suspeita','warn'));
  if(l.pag===0) f.push(impBadge('Sem impressão','neutral'));
  if(l.loc===null) f.push(impBadge('Sem locação','crit'));
  if(l.tipo!=='Impressora') f.push(impBadge(l.tipo,'warn'));
  return f.join(' ');
}

function impEquipTable(linhas, comAcoes){
  if(!linhas.length) return '<div class="table-empty">Nenhum equipamento neste filtro.</div>';
  let h = '<div class="table-scroll"><table class="imp-wide"><thead><tr><th>Hotel</th><th>Patrimônio</th><th>Série</th><th>Modelo</th><th class="num-cell">Locação</th><th class="num-cell">Pág. PB</th><th class="num-cell">Pág. cor</th><th class="num-cell">Exced. rateado</th><th class="num-cell">Custo total</th><th>Situação</th>'+(comAcoes?'<th></th>':'')+'</tr></thead><tbody>';
  linhas.forEach(l=>{
    h += '<tr><td>'+esc(l.unidade?unitLabel(l.unidade):'—')+'</td><td class="cell-mono">'+esc(l.patrimonio||'—')+'</td><td class="cell-mono">'+esc(l.serie||'—')+'</td><td>'+esc(l.modelo||'—')+'</td>'+
      '<td class="num-cell">'+(l.loc!==null?fmtCurrency(l.loc):'—')+'</td><td class="num-cell">'+impInt(l.pb)+'</td><td class="num-cell">'+impInt(l.co)+'</td><td class="num-cell">'+fmtCurrency(l.xPB+l.xCO)+'</td><td class="num-cell"><b>'+fmtCurrency(l.custo)+'</b></td><td>'+impFlags(l)+'</td>'+
      (comAcoes ? '<td><div class="cell-actions">'+(canWrite()?'<button class="icon-btn imp-edit" data-eq="'+l.impressora_id+'" title="Editar cadastro do equipamento"><span class="icon">'+ic('edit')+'</span></button>':'')+'</div></td>' : '')+'</tr>';
  });
  return h+'</tbody></table></div>';
}

function impFiltrar(linhas){
  const f = IMP.filtros, q = impNorm(f.busca);
  return linhas.filter(l=>{
    if(f.unidade && l.unidade !== f.unidade) return false;
    if(f.modelo && l.modelo !== f.modelo) return false;
    if(f.backup && !l.backup) return false;
    if(f.semcad && !(impPlaceholderPat(l.patrimonio) || !impSerieValida(l.serie))) return false;
    if(f.semimp && l.pag !== 0) return false;
    if(q && !impNorm([l.patrimonio,l.serie,l.modelo,l.obs,l.unidade?unitLabel(l.unidade):''].join(' ')).includes(q)) return false;
    return true;
  }).sort((a,b)=> (a.unidade||'').localeCompare(b.unidade||'') || (b.custo-a.custo));
}

function impViewInventario(){
  const c = IMP.calc, f = IMP.filtros;
  const modelos = Array.from(new Set(c.linhas.map(l=>l.modelo).filter(Boolean))).sort();
  const lista = impFiltrar(c.linhas);
  const tot = lista.reduce((s,l)=>s+l.custo,0);
  return '<div class="panel"><h2>Inventário de impressoras — '+esc(impCompLabel(IMP.comp))+'</h2><div class="panel-sub">Equipamentos, modelos, patrimônio, localização, locação e consumo da competência</div>'+
    '<div class="imp-filtros">'+
    '<select id="impFUni" class="field-select"><option value="">Todos os hotéis</option>'+UNITS.filter(u=>c.linhas.some(l=>l.unidade===u.code)).map(u=>'<option value="'+u.code+'" '+(f.unidade===u.code?'selected':'')+'>'+esc(u.label)+'</option>').join('')+'</select>'+
    '<select id="impFMod" class="field-select"><option value="">Todos os modelos</option>'+modelos.map(m=>'<option '+(f.modelo===m?'selected':'')+'>'+esc(m)+'</option>').join('')+'</select>'+
    '<div class="search-box"><span class="icon">'+ic('search')+'</span><input id="impFBusca" type="text" placeholder="Patrimônio, série, modelo…" value="'+esc(f.busca)+'"/></div>'+
    '<label class="check-filter"><input type="checkbox" id="impFBackup" '+(f.backup?'checked':'')+'/> Só backup</label>'+
    '<label class="check-filter"><input type="checkbox" id="impFCad" '+(f.semcad?'checked':'')+'/> Sem patrimônio/série</label>'+
    '<label class="check-filter"><input type="checkbox" id="impFImp" '+(f.semimp?'checked':'')+'/> Sem impressão</label>'+
    '<button class="btn btn-sm" id="impCsv">Exportar CSV</button></div>'+
    '<div class="result-count" style="padding:0 0 8px;">'+lista.length+' de '+c.linhas.length+' equipamentos · custo total '+fmtCurrency(tot)+'</div>'+
    impEquipTable(lista, true)+'</div>';
}

function impExportCsv(lista){
  const cols = ['Hotel','Patrimônio','Série','Modelo','Locação (R$)','Páginas PB','Páginas colorido','Excedente PB rateado (R$)','Excedente colorido rateado (R$)','Custo total (R$)','Observação'];
  const num = v => (v===null||v===undefined) ? '' : String(Number(v).toFixed(2)).replace('.',',');
  const lines = [cols.join(';')].concat(lista.map(l=>[ l.unidade?unitLabel(l.unidade):'', l.patrimonio, l.serie, l.modelo, num(l.loc), l.pb, l.co, num(l.xPB), num(l.xCO), num(l.custo), l.obs ].map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(';')));
  const blob = new Blob(['﻿'+lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'impressoras_'+impCompShort(IMP.comp).replace('/','-')+'.csv';
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ----------------------------- Histórico mensal ----------------------------- */
function impViewHistorico(){
  const H = IMP.hist;
  if(!H || !H.length) return impViewVazio();
  const last = H[H.length-1], prev = H.length>1 ? H[H.length-2] : null;
  const sel = H.find(x=>x.header.competencia===IMP.comp) || last;
  const selIdx = H.indexOf(sel), selPrev = selIdx>0 ? H[selIdx-1] : null;
  let html = '';
  if(H.length < 2) html += '<div class="panel"><div class="panel-sub" style="margin:0">Há apenas 1 competência ('+esc(impCompLabel(H[0].header.competencia))+'). A comparação mensal aparece assim que a próxima competência for importada.</div></div>';

  // comparação mês atual x anterior
  const rowsCmp = [
    ['Custo de locação', c=>c.corp.loc, 'money'], ['Volume PB (páginas)', c=>c.corp.pb, 'int'], ['Volume colorido (páginas)', c=>c.corp.co, 'int'],
    ['Gasto com PB (excedente)', c=>c.corp.xPB, 'money'], ['Gasto com colorido (excedente)', c=>c.corp.xCO, 'money'], ['Excedentes (total)', c=>c.corp.ex, 'money'], ['Custo de referência (locação + excedentes)', c=>c.corp.custo, 'money'],
    ['Desconto por renovação antecipada', c=>c.desconto, 'desc'], ['Valor faturado (ND)', c=>c.faturado, 'money'],
  ];
  const f = (v,k)=> k==='int' ? impInt(v) : fmtCurrency(v);
  html += '<div class="panel"><h2>'+esc(impCompLabel(sel.header.competencia))+' × '+(selPrev?esc(impCompLabel(selPrev.header.competencia)):'mês anterior')+'</h2>'+
    (selPrev ? '<div class="table-scroll"><table class="imp-mini"><thead><tr><th>Indicador</th><th class="num-cell">Anterior</th><th class="num-cell">Atual</th><th class="num-cell">Variação</th><th class="num-cell">%</th></tr></thead><tbody>'+
      rowsCmp.map(r=>{ const a = r[1](selPrev.calc), b = r[1](sel.calc), d = b-a; const tone = r[2]==='money' ? (d>0?'bad':(d<0?'good':'flat')) : 'flat';
        return '<tr><td>'+r[0]+'</td><td class="num-cell">'+f(a,r[2])+'</td><td class="num-cell">'+f(b,r[2])+'</td><td class="num-cell imp-delta '+tone+'">'+(d>0?'+':(d<0?'−':''))+f(Math.abs(d),r[2])+'</td><td class="num-cell imp-delta '+tone+'">'+(a!==0 ? (d>0?'+':(d<0?'−':''))+impPct(Math.abs(d/a)) : '—')+'</td></tr>'; }).join('')+'</tbody></table></div>'
      : '<div class="empty-note">Sem competência anterior para comparar.</div>')+'</div>';

  // evolução
  html += '<div class="panel"><h2>Evolução mensal</h2><div class="panel-sub">R$ por competência</div>'+
    impLineChart(H.map(x=>impCompShort(x.header.competencia)), [
      {nome:'Valor faturado (ND)', color:'var(--ink)', values:H.map(x=>x.calc.faturado)},
      {nome:'Custo de referência', color:'var(--accent)', values:H.map(x=>x.calc.corp.custo)},
      {nome:'Locação', color:'var(--series-3)', values:H.map(x=>x.calc.corp.loc)},
      {nome:'Excedentes', color:'var(--brass)', values:H.map(x=>x.calc.corp.ex)},
    ])+'</div>';

  // tabela por competência (a variação é sobre o valor faturado: o que efetivamente foi pago)
  html += '<div class="panel"><h2>Competências</h2><div class="table-scroll"><table class="imp-wide"><thead><tr><th>Competência</th><th class="num-cell">Equip.</th><th class="num-cell">Locação</th><th class="num-cell">Pág. PB</th><th class="num-cell">Pág. cor</th><th class="num-cell">Exced. PB</th><th class="num-cell">Exced. cor</th><th class="num-cell">Referência</th><th class="num-cell">Desconto</th><th class="num-cell">Faturado (ND)</th><th class="num-cell">Var. faturado R$</th><th class="num-cell">Var. %</th></tr></thead><tbody>'+
    H.slice().reverse().map((x,ix,arr)=>{ const p = arr[ix+1]; const k = x.calc.corp; const d = p ? x.calc.faturado - p.calc.faturado : null;
      const tone = d>0?'bad':(d<0?'good':'flat');
      return '<tr><td><b>'+esc(impCompLabel(x.header.competencia))+'</b></td><td class="num-cell">'+k.n+'</td><td class="num-cell">'+fmtCurrency(k.loc)+'</td><td class="num-cell">'+impInt(k.pb)+'</td><td class="num-cell">'+impInt(k.co)+'</td><td class="num-cell">'+fmtCurrency(k.xPB)+'</td><td class="num-cell">'+fmtCurrency(k.xCO)+'</td><td class="num-cell">'+fmtCurrency(k.custo)+'</td><td class="num-cell">'+(x.calc.desconto>0?fmtCurrency(x.calc.desconto):'—')+'</td><td class="num-cell"><b>'+fmtCurrency(x.calc.faturado)+'</b></td>'+
        '<td class="num-cell imp-delta '+tone+'">'+(d===null?'—':(d>0?'+':(d<0?'−':''))+fmtCurrency(Math.abs(d)))+'</td><td class="num-cell imp-delta '+tone+'">'+(d===null||p.calc.faturado===0?'—':(d>0?'+':(d<0?'−':''))+impPct(Math.abs(d/p.calc.faturado)))+'</td></tr>'; }).join('')+'</tbody></table></div>'+
    '<div class="imp-fine">Referência = locação + excedentes (base de rateio entre hotéis). Faturado (ND) = TOTAL ND do descritivo = referência − desconto por renovação antecipada.</div></div>';

  // custo por hotel ao longo do tempo
  const hot = new Set(); H.forEach(x=>x.calc.hoteis.forEach(h=>hot.add(h.unidade)));
  const ordem = Array.from(hot).sort((a,b)=> ((last.calc.hoteis.find(h=>h.unidade===b)||{custo:0}).custo) - ((last.calc.hoteis.find(h=>h.unidade===a)||{custo:0}).custo));
  html += '<div class="panel"><h2>Evolução do custo total por hotel</h2><div class="table-scroll"><table class="imp-wide"><thead><tr><th>Hotel</th>'+H.map(x=>'<th class="num-cell">'+impCompShort(x.header.competencia)+'</th>').join('')+'<th>Tendência</th><th class="num-cell">Var. último mês</th></tr></thead><tbody>'+
    ordem.map(u=>{ const vals = H.map(x=>{ const h = x.calc.hoteis.find(y=>y.unidade===u); return h ? h.custo : null; });
      const ult = vals[vals.length-1], ant = vals.length>1 ? vals[vals.length-2] : null; const d = (ult!==null && ant!==null) ? ult-ant : null;
      return '<tr><td><b>'+esc(u==='(sem hotel)'?u:unitLabel(u))+'</b></td>'+vals.map(v=>'<td class="num-cell">'+(v===null?'—':fmtCurrency(v))+'</td>').join('')+'<td>'+impSpark(vals.filter(v=>v!==null))+'</td>'+
        '<td class="num-cell imp-delta '+(d>0?'bad':(d<0?'good':'flat'))+'">'+(d===null?'—':(d>0?'+':(d<0?'−':''))+fmtCurrency(Math.abs(d))+(ant? ' ('+(d>0?'+':(d<0?'−':''))+impPct(Math.abs(d/ant))+')':''))+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  return html;
}

/* ----------------------------- Pendências ----------------------------- */
const IMP_SEV = {alta:['Alta','crit'], media:['Média','warn'], info:['Informativa','neutral'], contrato:['Contrato / fornecedor','neutral']};
function impViewPendencias(){
  const v = impValidar(IMP.calc, IMP.header, {prevCalc:IMP.prevCalc, prevHeader:IMP.prevHeader});
  const cont = {alta:0, media:0, info:0, contrato:0};
  v.itens.forEach(i=>{ cont[i.sev]++; });
  let html = '<div class="panel"><h2>Qualidade e consistência dos dados — '+esc(impCompLabel(IMP.comp))+'</h2><div class="panel-sub">Nada é completado por estimativa: o que falta fica listado aqui para validação.</div>'+
    '<div class="imp-chips">'+Object.keys(IMP_SEV).map(k=>'<span>'+impBadge(IMP_SEV[k][0],IMP_SEV[k][1])+' '+cont[k]+'</span>').join('')+'</div></div>';
  html += '<div class="panel"><h2>Conferências de totais</h2><ul class="imp-ul">'+v.conferencias.map(c=>'<li>'+(c.ok?'<span class="imp-ok">✓</span>':'<span class="imp-bad">✗</span>')+' '+esc(c.texto)+'</li>').join('')+'</ul></div>';
  if(!v.itens.length) html += '<div class="panel"><div class="empty-note">Nenhuma pendência encontrada.</div></div>';
  v.itens.forEach(i=>{
    html += '<div class="panel imp-pend"><div class="imp-pend-h">'+impBadge(IMP_SEV[i.sev][0],IMP_SEV[i.sev][1])+'<b>'+esc(i.titulo)+'</b><span class="imp-pend-n">'+i.itens.length+' item(ns)</span></div>'+
      (i.detalhe?'<div class="panel-sub" style="margin:4px 0 8px;">'+esc(i.detalhe)+'</div>':'')+
      '<details'+(i.itens.length<=4?' open':'')+'><summary>Ver itens</summary><ul class="imp-ul">'+i.itens.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></details></div>';
  });
  return html;
}

/* ----------------------------- eventos das telas ----------------------------- */
function impWireView(){
  const go = document.getElementById('impGoPend');
  if(go) go.addEventListener('click', e=>{ e.preventDefault(); IMP.tab = 'pendencias'; impRender(); });
  document.querySelectorAll('.imp-hrow').forEach(r=> r.addEventListener('click', ()=>{ IMP.hotel = (IMP.hotel===r.dataset.hotel) ? '' : r.dataset.hotel; impRender(); }));
  const re = () => impRender();
  const u = document.getElementById('impFUni'); if(u) u.addEventListener('change', e=>{ IMP.filtros.unidade = e.target.value; re(); });
  const m = document.getElementById('impFMod'); if(m) m.addEventListener('change', e=>{ IMP.filtros.modelo = e.target.value; re(); });
  const b = document.getElementById('impFBusca');
  if(b){ let t = null; b.addEventListener('input', e=>{ IMP.filtros.busca = e.target.value; clearTimeout(t); t = setTimeout(()=>{ re(); const nb = document.getElementById('impFBusca'); if(nb){ nb.focus(); nb.setSelectionRange(nb.value.length, nb.value.length); } }, 250); }); }
  [['impFBackup','backup'],['impFCad','semcad'],['impFImp','semimp']].forEach(([id,k])=>{ const el = document.getElementById(id); if(el) el.addEventListener('change', e=>{ IMP.filtros[k] = e.target.checked; re(); }); });
  const csv = document.getElementById('impCsv'); if(csv) csv.addEventListener('click', ()=> impExportCsv(impFiltrar(IMP.calc.linhas)));
  document.querySelectorAll('.imp-edit').forEach(btn=> btn.addEventListener('click', ()=>{
    const eq = IMP.eqById.get(btn.dataset.eq);
    if(eq) openForm('impressoras', eq);
  }));
}

/* ===========================================================================
   IMPORTAÇÃO MENSAL (planilha .xlsx do descritivo do fornecedor)
   · Lê a aba "WISH" (ou a primeira aba visível), valida e mostra uma prévia.
   · Só grava depois da confirmação. Não altera outras competências.
   · Equipamentos já cadastrados NÃO têm dados sobrescritos (só campos vazios
     são preenchidos); divergências são listadas.
   =========================================================================== */
function impLoadSheetJS(){
  return new Promise((res, rej)=>{
    if(window.XLSX) return res();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = ()=> res();
    s.onerror = ()=> rej(new Error('Não foi possível carregar o leitor de planilhas (cdnjs indisponível).'));
    document.head.appendChild(s);
  });
}

const IMP_MESES = {JANEIRO:1,FEVEREIRO:2,MARCO:3,ABRIL:4,MAIO:5,JUNHO:6,JULHO:7,AGOSTO:8,SETEMBRO:9,OUTUBRO:10,NOVEMBRO:11,DEZEMBRO:12};
// Nome do hotel na planilha (antigo, com variações) -> código. Usa o normalizador central do app.js.
function impUnidadeDoNome(nome){ return unitCodeFromName(nome); }
const impClean = s => { if(s===null||s===undefined) return null; const t = String(s).trim().replace(/\s+/g,' '); return t===''?null:t; };
function impChave(r, seq){
  if(impSerieValida(r.serie)) return 'SKYINK:'+impNorm(r.serie);
  const prefix = 'SKYINK:SEMSERIE:'+(r.unidade||'SEMHOTEL')+':'+impNorm(r.modelo)+':'+(r.patrimonio?impNorm(r.patrimonio):'SP');
  seq[prefix] = (seq[prefix]||0) + 1;
  return prefix+':'+seq[prefix];
}

function impParseSheet(ws){
  const aoa = XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:null});
  const cell = (r,c) => (aoa[r] && aoa[r][c] !== undefined) ? aoa[r][c] : null;
  let hr = -1;
  for(let i=0;i<Math.min(aoa.length,40);i++){
    const a = impNorm(cell(i,0)), rowTxt = (aoa[i]||[]).map(impNorm).join('|');
    if(a.startsWith('PATRIM') && rowTxt.includes('SERIE')){ hr = i; break; }
  }
  if(hr < 0) throw new Error('Não encontrei a linha de títulos (PATRIMÔNIO / NÚMERO DE SÉRIE) na aba.');
  const cols = {}, head = aoa[hr] || [];
  head.forEach((h,i)=>{
    const raw = String(h==null?'':h).toUpperCase().replace(/\s+/g,' ').trim(), n = impNorm(h);
    if(n.startsWith('PATRIM')) cols.pat = i; else if(n.includes('SERIE')) cols.serie = i; else if(n==='MODELO') cols.modelo = i;
    else if(n==='NOMELOCAL' || n==='LOCAL' || n==='HOTEL') cols.local = i; else if(n==='LOJADE' || n==='ENDERECO') cols.end = i;
    else if(n==='CNPJ') cols.cnpj = i; else if(n.startsWith('OBSERV')) cols.obs = i; else if(n==='VALOR') cols.valor = i;
    else if(n==='PAGINASPB') cols.pb = i; else if(n==='PAGINASCOLOR') cols.co = i;
    else if(raw==='$ PB') cols.xpb = i; else if(raw==='$ COLOR') cols.xco = i; else if(n==='TOTAL') cols.tot = i;
    else if(raw==='% PB') cols.ppb = i; else if(raw==='% COLOR') cols.pco = i;
  });
  ['pat','serie','modelo','local','valor','pb','co'].forEach(k=>{ if(cols[k]===undefined) throw new Error('Coluna obrigatória não encontrada na aba: '+k.toUpperCase()); });

  // cabeçalho: totais, excedentes, mês e ano
  const hdr = {total_pb:null, total_color:null, excedente_pb:null, excedente_color:null};
  let mes = null, ano = null;
  for(let i=0;i<hr;i++){
    (aoa[i]||[]).forEach((v,j)=>{
      if(v===null||v===undefined||v==='') return;
      const n = impNorm(v);
      const right = () => { for(let k=j+1;k<(aoa[i]||[]).length;k++){ const x = aoa[i][k]; if(typeof x==='number') return x; } return null; };
      if(typeof v==='string'){
        if(n.includes('TOTALIMPRESSOESPB')) hdr.total_pb = right();
        else if(n.includes('TOTALIMPRESSOESCOLOR')) hdr.total_color = right();
        else if(n.includes('EXCEDENTESPB')) hdr.excedente_pb = right();
        else if(n.includes('EXCEDENTESCOLOR')) hdr.excedente_color = right();
        else if(IMP_MESES[n]) mes = IMP_MESES[n];
      }
      if(typeof v==='number' && v>=2000 && v<=2100 && ano===null) ano = v;
    });
  }

  // resumo à direita da tabela: desconto por renovação antecipada e TOTAL ND (valor faturado)
  hdr.desconto = null; hdr.total_nd = null;
  for(let i=0;i<aoa.length;i++){
    (aoa[i]||[]).forEach((v,j)=>{
      if(typeof v !== 'string') return;
      const n = impNorm(v);
      const right = () => { const r = aoa[i]||[]; for(let k=j+1;k<r.length;k++){ if(typeof r[k]==='number') return r[k]; } return null; };
      const r2 = x => x === null ? null : Math.round(x*100)/100;
      if(n.includes('DESCONTOPORRENOVACAO')) hdr.desconto = r2(right());
      else if(n === 'TOTALND') hdr.total_nd = r2(right());
    });
  }

  const rows = [], seq = {};
  for(let i=hr+1;i<aoa.length;i++){
    const modelo = impClean(cell(i,cols.modelo)), local = impClean(cell(i,cols.local));
    if(!modelo && !local) break;
    const r = { linha:i+1, patrimonio:impClean(cell(i,cols.pat)), serie:impClean(cell(i,cols.serie)), modelo, local,
      endereco: cols.end!==undefined ? impClean(cell(i,cols.end)) : null, cnpj: cols.cnpj!==undefined ? impClean(cell(i,cols.cnpj)) : null,
      obs: cols.obs!==undefined ? impClean(cell(i,cols.obs)) : null,
      valor: typeof cell(i,cols.valor)==='number' ? cell(i,cols.valor) : null,
      pb: typeof cell(i,cols.pb)==='number' ? cell(i,cols.pb) : null, co: typeof cell(i,cols.co)==='number' ? cell(i,cols.co) : null,
      xpb: cols.xpb!==undefined ? cell(i,cols.xpb) : null, xco: cols.xco!==undefined ? cell(i,cols.xco) : null, tot: cols.tot!==undefined ? cell(i,cols.tot) : null };
    r.unidade = impUnidadeDoNome(local);
    r.chave = impChave(r, seq);
    rows.push(r);
  }
  return { hdr, mes, ano, rows, hr, cols };
}

// referências de fórmula que apontam para outra linha (ex.: =I35/$O$3 na linha 36)
function impChecarFormulas(ws, parsed){
  const itens = [];
  const colL = i => XLSX.utils.encode_col(i);
  parsed.rows.forEach(r=>{
    ['ppb','pco','xpb','xco','tot'].forEach(k=>{
      const ci = parsed.cols[k]; if(ci===undefined) return;
      const c = ws[colL(ci)+r.linha]; const f = c && c.f;
      if(!f) return;
      const re = /(\$?)([A-Z]{1,2})(\$?)(\d+)/g; let m;
      while((m = re.exec(f))){
        if(m[3]==='$') continue;
        if(parseInt(m[4],10) !== r.linha){ itens.push('Linha '+r.linha+' ('+(r.unidade?unitLabel(r.unidade):r.local)+', pat. '+(r.patrimonio||'s/ pat.')+'): fórmula "='+f+'" referencia a linha '+m[4]); break; }
      }
    });
  });
  return itens;
}

function impComparaPlan3(wb, parsed){
  const nome = wb.SheetNames.find(n=>impNorm(n)==='PLAN3');
  if(!nome) return null;
  let p3; try{ p3 = impParseSheet(wb.Sheets[nome]); }catch(e){ return {erro:e.message}; }
  const bySerie = new Map(parsed.rows.filter(r=>impSerieValida(r.serie)).map(r=>[impNorm(r.serie), r]));
  const itens = [];
  p3.rows.forEach(p=>{
    const label = 'Plan3 linha '+p.linha+' (pat. '+(p.patrimonio||'s/ pat.')+', série '+(p.serie||'s/ série')+')';
    if(!impSerieValida(p.serie)){ itens.push(label+': sem série — não dá para comparar com a aba principal'); return; }
    const w = bySerie.get(impNorm(p.serie));
    if(!w){ itens.push(label+': equipamento não existe na aba principal'); return; }
    const dif = [];
    if(p.unidade !== w.unidade) dif.push('hotel: '+(p.unidade||'—')+' × '+(w.unidade||'—'));
    if((p.valor||0) !== (w.valor||0)) dif.push('locação: '+fmtCurrency(p.valor||0)+' × '+fmtCurrency(w.valor||0));
    if((p.pb||0) !== (w.pb||0)) dif.push('páginas PB: '+impInt(p.pb||0)+' × '+impInt(w.pb||0));
    if((p.co||0) !== (w.co||0)) dif.push('páginas cor: '+impInt(p.co||0)+' × '+impInt(w.co||0));
    if(dif.length) itens.push(label+' — '+dif.join('; '));
  });
  return { nome, itens, n:p3.rows.length };
}

async function impOpenImporter(){
  if(!canWrite()){ toast('Seu perfil não permite importar.', true); return; }
  const root = document.getElementById('modalRoot');
  root.innerHTML = '<div class="modal-overlay" id="impOv"><div class="modal imp-modal"><div class="modal-head"><h2>Importar competência</h2><button class="icon-btn" id="impMClose"><span class="icon">'+ic('close')+'</span></button></div>'+
    '<div class="modal-body" id="impMBody"><p class="imp-p">Selecione a planilha do descritivo mensal do fornecedor (<code>.xlsx</code>, aba <b>WISH</b>). Nada é gravado antes da sua confirmação, e as competências anteriores não são alteradas.</p>'+
    '<input type="file" id="impFile" accept=".xlsx,.xlsm"/></div><div class="modal-foot" id="impMFoot"><button class="btn" id="impMCancel">Cancelar</button></div></div></div>';
  const close = ()=>{ root.innerHTML = ''; };
  document.getElementById('impMClose').addEventListener('click', close);
  document.getElementById('impMCancel').addEventListener('click', close);
  document.getElementById('impOv').addEventListener('click', e=>{ if(e.target.id==='impOv') close(); });
  document.getElementById('impFile').addEventListener('change', async e=>{
    const file = e.target.files[0]; if(!file) return;
    const body = document.getElementById('impMBody');
    body.innerHTML = '<div class="table-empty">Lendo a planilha…</div>';
    try{
      await impLoadSheetJS();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, {type:'array', cellFormula:true});
      const meta = (wb.Workbook && wb.Workbook.Sheets) || [];
      let nome = wb.SheetNames.find(n=>impNorm(n)==='WISH');
      if(!nome) nome = wb.SheetNames.find((n,i)=> !(meta[i] && meta[i].Hidden));
      const parsed = impParseSheet(wb.Sheets[nome]);
      parsed.arquivo = file.name; parsed.aba = nome;
      parsed.formulas = impChecarFormulas(wb.Sheets[nome], parsed);
      parsed.plan3 = impComparaPlan3(wb, parsed);
      impPreview(parsed, close);
    }catch(err){
      console.error(err);
      body.innerHTML = '<div class="auth-error">'+esc(err.message||String(err))+'</div><p class="imp-p">Escolha outro arquivo.</p><input type="file" id="impFile2" accept=".xlsx,.xlsm"/>';
      const f2 = document.getElementById('impFile2'); if(f2) f2.addEventListener('change', ev=>{ document.getElementById('impFile').files = ev.target.files; document.getElementById('impFile').dispatchEvent(new Event('change')); });
    }
  });
}

function impPreview(P, close){
  // monta as linhas no mesmo formato do banco para reutilizar o motor de cálculo
  const hoje = new Date();
  const mesIni = P.mes || (hoje.getMonth()+1), anoIni = P.ano || hoje.getFullYear();
  const body = document.getElementById('impMBody'), foot = document.getElementById('impMFoot');
  const eqByChave = new Map(IMP.equip.map(e=>[e.chave_origem, e]));
  const eqBySerie = new Map(IMP.equip.filter(e=>impSerieValida(e.serie)).map(e=>[impNorm(e.serie), e]));
  P.rows.forEach(r=>{ r.existente = eqByChave.get(r.chave) || (impSerieValida(r.serie) ? eqBySerie.get(impNorm(r.serie)) : null) || null; });
  const novos = P.rows.filter(r=>!r.existente), exist = P.rows.length - novos.length;

  const virt = P.rows.map((r,ix)=> ({ id:'p'+ix, impressora_id: r.existente ? r.existente.id : 'novo'+ix, unidade:r.unidade,
    patrimonio: r.existente && r.existente.patrimonio ? r.existente.patrimonio : (r.patrimonio||''), serie: r.existente && r.existente.serie ? r.existente.serie : (r.serie||''),
    modelo:r.modelo||'', tipo: /fragment/i.test(r.modelo||'') ? 'Fragmentadora' : 'Impressora', obs:r.obs||'', backup:/backup/i.test(r.obs||''),
    cnpj:r.cnpj||'', endereco:r.endereco||'', loc:r.valor, pb:impN(r.pb), co:impN(r.co), linha:r.linha }));
  const headerVirt = { total_pb:P.hdr.total_pb, total_color:P.hdr.total_color, excedente_pb:P.hdr.excedente_pb, excedente_color:P.hdr.excedente_color, franquia_pb:null, franquia_color:null, desconto:P.hdr.desconto, total_nd:P.hdr.total_nd };
  const calc = impCalc(headerVirt, virt);

  // divergências de rateio da planilha de origem x recálculo
  const diverg = [];
  calc.linhas.forEach((l,ix)=>{ const r = P.rows[ix];
    if(r.xpb!==null && typeof r.xpb==='number' && Math.abs(r.xpb - l.xPB) > 0.005) diverg.push('Linha '+r.linha+' ('+(r.unidade?unitLabel(r.unidade):r.local)+', pat. '+(r.patrimonio||'s/ pat.')+'): excedente PB na planilha '+fmtCurrency(r.xpb)+' × recalculado '+fmtCurrency(l.xPB));
    if(r.xco!==null && typeof r.xco==='number' && Math.abs(r.xco - l.xCO) > 0.005) diverg.push('Linha '+r.linha+' ('+(r.unidade?unitLabel(r.unidade):r.local)+', pat. '+(r.patrimonio||'s/ pat.')+'): excedente colorido na planilha '+fmtCurrency(r.xco)+' × recalculado '+fmtCurrency(l.xCO));
  });
  const extras = [];
  if(diverg.length) extras.push({sev:'alta', cod:'rateio-origem', titulo:'Rateio da planilha de origem diverge do recálculo', detalhe:'O app recalcula o rateio pelas páginas de cada linha. A diferença indica referência de fórmula incorreta na planilha (o total do hotel pode não mudar, mas o custo por equipamento sim).', itens:diverg});
  if(P.formulas.length) extras.push({sev:'alta', cod:'formula', titulo:'Fórmulas que referenciam outra linha', detalhe:'Referência relativa apontando para linha diferente da própria.', itens:P.formulas});
  if(P.plan3 && P.plan3.itens && P.plan3.itens.length) extras.push({sev:'media', cod:'plan3', titulo:'Divergências entre as abas WISH e '+P.plan3.nome, detalhe:'A aba '+P.plan3.nome+' tem '+P.plan3.n+' equipamento(s); estes pontos não batem com a aba principal. Ela NÃO é importada.', itens:P.plan3.itens});
  const naoMapeados = Array.from(new Set(P.rows.filter(r=>!r.unidade).map(r=>r.local||'(vazio)')));
  if(naoMapeados.length) extras.push({sev:'alta', cod:'hotel-nao-mapeado', titulo:'Hotel não reconhecido', detalhe:'Nome do hotel que não corresponde a nenhuma unidade cadastrada.', itens:naoMapeados});
  const dif = [];
  P.rows.forEach(r=>{ const e = r.existente; if(!e) return;
    if(e.patrimonio && r.patrimonio && impNorm(e.patrimonio)!==impNorm(r.patrimonio)) dif.push('Série '+(r.serie||'—')+': patrimônio no cadastro "'+e.patrimonio+'" × planilha "'+r.patrimonio+'" (mantido o do cadastro)');
    if(e.unidade && r.unidade && e.unidade!==r.unidade) dif.push('Série '+(r.serie||'—')+': cadastro em '+unitLabel(e.unidade)+' × planilha em '+unitLabel(r.unidade)+' (o hotel desta competência segue a planilha)'); });
  if(dif.length) extras.push({sev:'info', cod:'cad-diverge', titulo:'Divergências com o cadastro existente', detalhe:'O cadastro não é sobrescrito.', itens:dif});
  const val = impValidar(calc, headerVirt, {extras, prevCalc: null});
  const cont = {alta:0, media:0, info:0, contrato:0}; val.itens.forEach(i=>{ cont[i.sev]++; });

  const compStr = ()=> document.getElementById('impAno').value+'-'+String(document.getElementById('impMes').value).padStart(2,'0')+'-01';
  body.innerHTML =
    '<div class="imp-prev-grid">'+
    '<div><label class="imp-lb">Competência</label><div class="imp-comp-pick"><select id="impMes" class="field-select">'+MONTH_NAMES_PT.map((m,i)=>'<option value="'+(i+1)+'" '+((i+1)===mesIni?'selected':'')+'>'+m+'</option>').join('')+'</select><input id="impAno" type="number" class="field-select" value="'+anoIni+'" min="2020" max="2100" style="width:90px"/></div>'+
      '<div class="imp-fine">'+(P.mes&&P.ano?'Detectada no arquivo — confira.':'Não detectei no arquivo — informe.')+'</div></div>'+
    '<div><label class="imp-lb">Arquivo</label><div>'+esc(P.arquivo)+' · aba <b>'+esc(P.aba)+'</b></div></div></div>'+
    '<table class="imp-mini"><tbody>'+
    '<tr><td>Linhas lidas</td><td class="num-cell">'+P.rows.length+'</td></tr>'+
    '<tr><td>Equipamentos já cadastrados / novos</td><td class="num-cell">'+exist+' / '+novos.length+'</td></tr>'+
    '<tr><td>Soma da locação</td><td class="num-cell">'+fmtCurrency(calc.corp.loc)+'</td></tr>'+
    '<tr><td>Páginas PB (informado × soma das linhas)</td><td class="num-cell">'+(impHas(P.hdr.total_pb)?impInt(P.hdr.total_pb):'—')+' × '+impInt(calc.sPB)+'</td></tr>'+
    '<tr><td>Páginas coloridas (informado × soma das linhas)</td><td class="num-cell">'+(impHas(P.hdr.total_color)?impInt(P.hdr.total_color):'—')+' × '+impInt(calc.sCO)+'</td></tr>'+
    '<tr><td>Excedente PB / colorido cobrado</td><td class="num-cell">'+(impHas(P.hdr.excedente_pb)?fmtCurrency(P.hdr.excedente_pb):'—')+' / '+(impHas(P.hdr.excedente_color)?fmtCurrency(P.hdr.excedente_color):'—')+'</td></tr>'+
    '<tr><td><b>Custo de referência (locação + excedentes, recalculado)</b></td><td class="num-cell"><b>'+fmtCurrency(calc.corp.custo)+'</b></td></tr>'+
    '<tr><td>Desconto por renovação antecipada</td><td class="num-cell">'+(impHas(P.hdr.desconto)?fmtCurrency(P.hdr.desconto):'não informado')+'</td></tr>'+
    '<tr><td><b>Valor faturado (TOTAL ND)</b></td><td class="num-cell"><b>'+(impHas(P.hdr.total_nd)?fmtCurrency(P.hdr.total_nd):'não informado')+'</b></td></tr></tbody></table>'+
    '<div class="imp-chips" style="margin:12px 0 4px;">'+Object.keys(IMP_SEV).map(k=>'<span>'+impBadge(IMP_SEV[k][0],IMP_SEV[k][1])+' '+cont[k]+'</span>').join('')+'</div>'+
    '<ul class="imp-ul">'+val.conferencias.map(c=>'<li>'+(c.ok?'<span class="imp-ok">✓</span>':'<span class="imp-bad">✗</span>')+' '+esc(c.texto)+'</li>').join('')+'</ul>'+
    val.itens.filter(i=>i.sev==='alta' || i.sev==='media').map(i=>'<details class="imp-pv"><summary>'+impBadge(IMP_SEV[i.sev][0],IMP_SEV[i.sev][1])+' <b>'+esc(i.titulo)+'</b> ('+i.itens.length+')</summary><ul class="imp-ul">'+i.itens.slice(0,40).map(t=>'<li>'+esc(t)+'</li>').join('')+(i.itens.length>40?'<li>… e mais '+(i.itens.length-40)+'</li>':'')+'</ul></details>').join('')+
    '<div class="imp-fine">Pendências informativas e de contrato ficam na aba Pendências depois da importação.</div>'+
    '<div id="impExistWarn"></div>'+
    '<label class="check-filter imp-ack"><input type="checkbox" id="impAck"/> Estou ciente das pendências e quero importar assim mesmo</label><div id="impProg" class="imp-fine"></div>';
  foot.innerHTML = '<button class="btn" id="impMCancel2">Cancelar</button><button class="btn btn-primary" id="impDo" disabled><span class="icon">'+ic('check')+'</span>Importar</button>';
  document.getElementById('impMCancel2').addEventListener('click', close);

  const refreshExist = ()=>{
    const c = compStr(); const ex = IMP.competencias.find(x=>x.competencia===c);
    document.getElementById('impExistWarn').innerHTML = ex ? '<div class="auth-error" style="margin-top:10px;">A competência <b>'+esc(impCompLabel(c))+'</b> já existe. Importar de novo <b>atualiza os valores desta competência</b> (mesmos equipamentos) e não toca nas demais. Marque a ciência abaixo para continuar.</div>' : '';
  };
  ['impMes','impAno'].forEach(id=> document.getElementById(id).addEventListener('change', refreshExist));
  refreshExist();
  document.getElementById('impAck').addEventListener('change', e=>{ document.getElementById('impDo').disabled = !e.target.checked; });
  document.getElementById('impDo').addEventListener('click', ()=> impCommit(P, compStr(), headerVirt, close));
}

async function impCommit(P, comp, hdr, close){
  const btn = document.getElementById('impDo'), prog = document.getElementById('impProg');
  btn.disabled = true;
  const say = t => { prog.textContent = t; };
  try{
    say('Gravando totais da competência…');
    const { error: e1 } = await supabaseClient.from('impressoras_competencias').upsert({
      competencia: comp, total_pb: hdr.total_pb, total_color: hdr.total_color, excedente_pb: hdr.excedente_pb, excedente_color: hdr.excedente_color,
      desconto: hdr.desconto, total_nd: hdr.total_nd, arquivo_origem: P.arquivo }, {onConflict:'competencia'});
    if(e1) throw e1;

    const eqByChave = new Map(IMP.equip.map(e=>[e.chave_origem, e]));
    const eqBySerie = new Map(IMP.equip.filter(e=>impSerieValida(e.serie)).map(e=>[impNorm(e.serie), e]));
    const novos = [], idPorLinha = new Map();
    P.rows.forEach(r=>{
      const ex = eqByChave.get(r.chave) || (impSerieValida(r.serie) ? eqBySerie.get(impNorm(r.serie)) : null);
      if(ex){ idPorLinha.set(r.linha, ex.id); return; }
      const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{ const v = Math.random()*16|0; return (c==='x'?v:(v&3|8)).toString(16); });
      idPorLinha.set(r.linha, id);
      novos.push({ id, unidade:r.unidade, impressora:r.modelo, patrimonio:r.patrimonio, serie:r.serie, cnpj:r.cnpj, endereco:r.endereco, observacao:r.obs,
        tipo_equipamento: /fragment/i.test(r.modelo||'') ? 'Fragmentadora' : 'Impressora', contrato:'SKYINK', chave_origem:r.chave, status:'Ativa' });
    });
    for(let i=0;i<novos.length;i+=100){
      say('Cadastrando equipamentos novos… '+Math.min(i+100,novos.length)+'/'+novos.length);
      const { error } = await supabaseClient.from('impressoras').insert(novos.slice(i,i+100));
      if(error) throw error;
    }
    // completa só campos vazios de equipamentos já cadastrados
    let completados = 0;
    for(const r of P.rows){
      const ex = r.existente; if(!ex) continue;
      const patch = {};
      if(!ex.patrimonio && r.patrimonio) patch.patrimonio = r.patrimonio;
      if(!ex.cnpj && r.cnpj) patch.cnpj = r.cnpj;
      if(!ex.endereco && r.endereco) patch.endereco = r.endereco;
      if(Object.keys(patch).length){ const { error } = await supabaseClient.from('impressoras').update(patch).eq('id', ex.id); if(error) throw error; completados++; }
    }
    const mensais = P.rows.map(r=>({ competencia:comp, impressora_id:idPorLinha.get(r.linha), unidade:r.unidade, valor_locacao:r.valor, paginas_pb:r.pb, paginas_color:r.co, observacao:r.obs, linha_origem:r.linha }));
    for(let i=0;i<mensais.length;i+=100){
      say('Gravando valores do mês… '+Math.min(i+100,mensais.length)+'/'+mensais.length);
      const { error } = await supabaseClient.from('impressoras_mensal').upsert(mensais.slice(i,i+100), {onConflict:'competencia,impressora_id'});
      if(error) throw error;
    }
    close();
    toast('Competência '+impCompLabel(comp)+' importada: '+mensais.length+' linhas ('+novos.length+' equipamentos novos'+(completados?', '+completados+' cadastros completados':'')+').');
    IMP.comp = comp; IMP.loaded = false; IMP.hist = null;
    await impOpen();
  }catch(err){
    console.error(err);
    say('');
    toast('Não foi possível importar: '+friendlyError(err,'importar dados de impressoras'), true);
    btn.disabled = false;
  }
}
