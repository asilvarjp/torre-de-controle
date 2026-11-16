/* =========================================================================
   TORRE DE CONTROLE — inventário, estoque, locação, compras, licenças,
   transporte, impressoras e acessos TeamViewer das unidades Wish Hotels &
   Resorts (Wish / Prodigy).
   Dados no Supabase (Postgres); acesso exige login (ver README).
   ========================================================================= */

const UNITS = [
  {code:'MTZ-CORP', label:'Matriz / Corporativo'},
  {code:'MARUPIARA', label:'Prodigy Marupiara'},
  {code:'WNATAL', label:'Wish Natal'},
  {code:'WBAHIA', label:'Wish Bahia'},
  {code:'WSERRANO', label:'Wish Serrano'},
  {code:'WFOZ', label:'Wish Foz do Iguaçu'},
  {code:'PGRAMADO', label:'Prodigy Gramado'},
  {code:'PSDU', label:'Wish Santos Dumont'},
  {code:'LGALEAO', label:'Wish Linx Galeão'},
  {code:'LCONFINS', label:'Wish Confins'},
  {code:'MAKAIRA', label:'Makaira Beach Resort'},
];
const unitLabel = (code) => (UNITS.find(u=>u.code===code)||{}).label || code || '—';

const ICONS = {
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>',
  inventario:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/></svg>',
  estoque:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
  locados:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14-5"/><path d="M20 12a8 8 0 0 1-14 5"/><path d="M17 4v3h-3"/><path d="M7 20v-3h3"/></svg>',
  compras:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 8H6"/></svg>',
  licencas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="7.5" r="4.5"/><line x1="10.8" y1="10.8" x2="20" y2="20"/><line x1="15.5" y1="15.5" x2="18.5" y2="12.5"/><line x1="17.5" y1="17.5" x2="20.5" y2="14.5"/></svg>',
  transporte:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="12" height="9" rx="1"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="6.5" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
  impressoras:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V4h12v5"/><rect x="4" y="9" width="16" height="7" rx="1.2"/><path d="M7 16h10v5H7z"/></svg>',
  teamviewer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/><path d="M9.5 7.5l4 2.7-1.6.6 1.6 2.4-1.1.7-1.6-2.4-1.3 1.3z" fill="currentColor" stroke="none"/></svg>',
  depreciacao:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5v14h16"/><polyline points="6,8 10,13 13,10 19,17"/><polyline points="14,17 19,17 19,12"/></svg>',
  linhas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 10.8c1.8 3.6 4.6 6.4 8.2 8.2l2.4-2.4a1.2 1.2 0 0 1 1.3-.3c1.3.4 2.7.6 4.2.6a1.3 1.3 0 0 1 1.3 1.3V22a1.3 1.3 0 0 1-1.3 1.3C11.6 23.3.7 12.4.7 2.3A1.3 1.3 0 0 1 2 1h3.8A1.3 1.3 0 0 1 7 2.3c0 1.5.2 2.9.6 4.2a1.2 1.2 0 0 1-.3 1.3z"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeoff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M9.5 9.6a3 3 0 0 0 4.2 4.2"/><path d="M6.6 6.7C4.2 8.2 2 12 2 12s4 7 10 7c1.5 0 2.9-.4 4.1-1"/><path d="M10.6 5.1c.5-.1 .9-.1 1.4-.1 6 0 10 7 10 7a17 17 0 0 1-2.7 3.5"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="1.5"/><path d="M5 15V4a1 1 0 0 1 1-1h11"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.3" y1="15.3" x2="21" y2="21"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,13 10,18 19,7"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 3.9L2.4 18.5A1.5 1.5 0 0 0 3.7 21h16.6a1.5 1.5 0 0 0 1.3-2.5L13.4 3.9a1.5 1.5 0 0 0-2.8 0z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><circle cx="12" cy="16.5" r=".2" fill="currentColor" stroke-width="2.2"/></svg>',
  logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  usuarios:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/></svg>',
  historico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15.5,14"/></svg>',
  undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h11a5 5 0 0 1 0 10H8"/><polyline points="8,5 4,9 8,13"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
};
const ic = (name)=> ICONS[name] || '';

/* -------------------------- Módulos / schema -------------------------- */
const CATEGORIAS_EQUIP = ['Notebook','Desktop','All-in-One','Monitor','Servidor','Impressora','Rede / Wi-Fi','Outro'];

const MODULES = {
  inventario:{
    label:'Inventário', icon:'inventario', collection:'inventario',
    title:'Inventário de equipamentos', sub:'Ativos de TI por unidade — hostname, patrimônio e configuração',
    unitField:'unidade', statusField:'status',
    searchFields:['patrimonio','hostname','marca','modelo','usuario','numero_serie'],
    columns:['patrimonio','hostname','unidade','categoria','usuario','status'],
    fields:[
      {key:'patrimonio', label:'Patrimônio', type:'text', required:true, mono:true},
      {key:'hostname', label:'Hostname', type:'text', mono:true},
      {key:'unidade', label:'Unidade', type:'unidade', required:true},
      {key:'categoria', label:'Categoria', type:'select', options:CATEGORIAS_EQUIP},
      {key:'marca', label:'Marca', type:'text'},
      {key:'modelo', label:'Modelo', type:'text'},
      {key:'numero_serie', label:'Nº de série / Service Tag', type:'text', mono:true},
      {key:'cpu', label:'Processador (CPU)', type:'text'},
      {key:'ram', label:'Memória (RAM)', type:'text'},
      {key:'so', label:'Sistema operacional', type:'text'},
      {key:'serial_so', label:'Serial do S.O.', type:'text', mono:true},
      {key:'office', label:'Licença Office', type:'text'},
      {key:'serial_office', label:'Serial do Office', type:'text', mono:true},
      {key:'pacote_adobe', label:'Pacote Adobe', type:'text'},
      {key:'usuario', label:'Usuário / colaborador', type:'text'},
      {key:'status', label:'Status', type:'select', options:['Em uso','Em estoque','Manutenção','Baixado'], badge:true},
      {key:'observacao', label:'Observação', type:'textarea', full:true},
    ],
  },
  estoque:{
    label:'Estoque', icon:'estoque', collection:'estoque',
    title:'Estoque central', sub:'Equipamentos disponíveis, ainda não alocados a uma unidade',
    statusField:'status',
    searchFields:['equipamento','marca','modelo','patrimonio'],
    columns:['equipamento','marca','modelo','patrimonio','quantidade','status'],
    fields:[
      {key:'equipamento', label:'Equipamento', type:'text', required:true},
      {key:'marca', label:'Marca', type:'text'},
      {key:'modelo', label:'Modelo', type:'text'},
      {key:'patrimonio', label:'Patrimônio', type:'text', mono:true},
      {key:'quantidade', label:'Quantidade', type:'number', default:1},
      {key:'status', label:'Status', type:'select', options:['Disponível','Reservado','Em uso'], badge:true},
      {key:'descricao', label:'Descrição', type:'textarea', full:true},
    ],
  },
  locados:{
    label:'Locados', icon:'locados', collection:'locados',
    title:'Equipamentos locados', sub:'Locação para colaboradores — entrega, devolução e valores',
    unitField:'unidade', statusField:'status',
    searchFields:['equipamento','patrimonio','proposta','colaborador'],
    columns:['equipamento','unidade','colaborador','data_entrega','status','valor'],
    fields:[
      {key:'equipamento', label:'Equipamento', type:'text', required:true},
      {key:'marca', label:'Marca', type:'text'},
      {key:'patrimonio', label:'Patrimônio', type:'text', mono:true},
      {key:'proposta', label:'Proposta', type:'text', mono:true},
      {key:'unidade', label:'Unidade', type:'unidade', required:true},
      {key:'centro_custo', label:'Centro de custo', type:'text'},
      {key:'departamento', label:'Departamento', type:'text'},
      {key:'colaborador', label:'Colaborador(a)', type:'text'},
      {key:'data_entrega', label:'Data de entrega', type:'date'},
      {key:'data_devolucao', label:'Data de devolução', type:'date'},
      {key:'valor', label:'Valor (R$)', type:'number', currency:true},
      {key:'status', label:'Status', type:'select', options:['Ativo','Devolvido','Atrasado'], badge:true},
      {key:'observacao', label:'Observação', type:'textarea', full:true},
    ],
  },
  compras:{
    label:'Compras', icon:'compras', collection:'compras',
    title:'Compras', sub:'Solicitações de compra — SCI, ordem de compra e status',
    unitField:'unidade', statusField:'status_sci',
    searchFields:['descricao_item','sci','oc','solicitante','comprador'],
    columns:['descricao_item','sci','oc','unidade','data_pedido','valor','status_sci'],
    fields:[
      {key:'descricao_item', label:'Descrição do item', type:'text', required:true, full:true},
      {key:'sci', label:'SCI', type:'text', mono:true},
      {key:'oc', label:'OC', type:'text', mono:true},
      {key:'qtde', label:'Quantidade', type:'number', default:1},
      {key:'unidade', label:'Unidade', type:'unidade'},
      {key:'centro_custo', label:'Centro de custo', type:'text'},
      {key:'data_pedido', label:'Data do pedido', type:'date'},
      {key:'valor', label:'Valor (R$)', type:'number', currency:true},
      {key:'solicitante', label:'Solicitante', type:'text'},
      {key:'comprador', label:'Comprador', type:'text'},
      {key:'status_sci', label:'Status da SCI', type:'select', options:['Solicitado','Aprovado','Comprado','Entregue','Cancelado'], badge:true},
    ],
  },
  licencas:{
    label:'Licenças', icon:'licencas', collection:'licencas',
    title:'Licenças de software', sub:'Office, sistema operacional, Adobe e outras licenças por equipamento',
    unitField:'unidade', statusField:'status',
    searchFields:['licenca','hostname','numero_serie','patrimonio'],
    columns:['tipo','licenca','hostname','unidade','status','numero_serie'],
    fields:[
      {key:'tipo', label:'Tipo de licença', type:'select', options:['Microsoft Office','Sistema Operacional','Adobe','Antivírus','Outro'], required:true},
      {key:'licenca', label:'Licença / produto', type:'text', required:true},
      {key:'versao', label:'Versão', type:'text'},
      {key:'numero_serie', label:'Número de série', type:'text', mono:true},
      {key:'hostname', label:'Hostname', type:'text', mono:true},
      {key:'patrimonio', label:'Patrimônio', type:'text', mono:true},
      {key:'unidade', label:'Unidade', type:'unidade'},
      {key:'colaborador', label:'Colaborador', type:'text'},
      {key:'nf', label:'NF', type:'text', mono:true},
      {key:'sci', label:'SCI', type:'text', mono:true},
      {key:'oc', label:'OC', type:'text', mono:true},
      {key:'status', label:'Status', type:'select', options:['Ativa','Vencida','Não instalada','Transferida'], badge:true},
    ],
  },
  transporte:{
    label:'Transporte', icon:'transporte', collection:'transporte',
    title:'Transporte e envios', sub:'Envio de equipamentos entre unidades — Correios e transportadoras',
    unitField:'unidade', statusField:'status',
    searchFields:['descricao_envio','origem','destino','codigo_rastreio'],
    columns:['descricao_envio','origem','destino','codigo_rastreio','status','data_envio'],
    fields:[
      {key:'descricao_envio', label:'Descrição do envio', type:'text', required:true, full:true},
      {key:'origem', label:'Origem', type:'text'},
      {key:'destino', label:'Destino', type:'text'},
      {key:'unidade', label:'Unidade relacionada', type:'unidade'},
      {key:'centro_custo', label:'Centro de custo', type:'text'},
      {key:'transportadora', label:'Transportadora', type:'select', options:['Correios','Motoboy','Transportadora própria','Outro']},
      {key:'codigo_rastreio', label:'Código de rastreio', type:'text', mono:true},
      {key:'data_envio', label:'Data de envio', type:'date'},
      {key:'data_entrega', label:'Data de entrega', type:'date'},
      {key:'status', label:'Status', type:'select', options:['Postado','Em trânsito','Entregue','Extraviado'], badge:true},
    ],
  },
  impressoras:{
    label:'Impressoras', icon:'impressoras', collection:'impressoras',
    title:'Impressoras e serviços', sub:'Parque, custos de locação e consumo de impressão por hotel',
    unitField:'unidade', statusField:'status',
    searchFields:['impressora','serie','patrimonio','ip'],
    columns:['impressora','unidade','patrimonio','serie','contrato','ip','status'],
    fields:[
      {key:'unidade', label:'Unidade', type:'unidade', required:true},
      {key:'impressora', label:'Modelo da impressora', type:'text', required:true},
      {key:'patrimonio', label:'Patrimônio', type:'text', mono:true},
      {key:'serie', label:'Série', type:'text', mono:true},
      {key:'tipo_equipamento', label:'Tipo de equipamento', type:'select', options:['Impressora','Fragmentadora','Outro']},
      {key:'contrato', label:'Contrato', type:'text'},
      {key:'cnpj', label:'CNPJ', type:'text', mono:true},
      {key:'endereco', label:'Endereço', type:'text', full:true},
      {key:'ip', label:'Endereço IP', type:'text', mono:true},
      {key:'contador_mono', label:'Contador A4 mono', type:'number'},
      {key:'contador_color', label:'Contador A4 color', type:'number'},
      {key:'status', label:'Status', type:'select', options:['Ativa','Manutenção','Inativa'], badge:true},
      {key:'observacao', label:'Observação (ex.: BACKUP)', type:'text', full:true},
    ],
  },
  teamviewer:{
    label:'TeamViewer', icon:'teamviewer', collection:'teamviewer',
    title:'Acessos TeamViewer', sub:'ID e senha de acesso remoto por máquina — senha oculta por padrão',
    unitField:'unidade',
    searchFields:['hostname','id_teamviewer'],
    columns:['unidade','hostname','id_teamviewer','senha'],
    fields:[
      {key:'unidade', label:'Unidade', type:'unidade', required:true},
      {key:'hostname', label:'Hostname', type:'text', required:true, mono:true},
      {key:'id_teamviewer', label:'ID TeamViewer', type:'text', mono:true},
      {key:'senha', label:'Senha', type:'password'},
      {key:'observacao', label:'Observação', type:'textarea', full:true},
    ],
  },
  depreciacao:{
    label:'Depreciação', icon:'depreciacao', collection:'depreciacao',
    title:'Depreciação de ativos', sub:'Vida útil, valor residual e recomendação de substituição por equipamento',
    unitField:'unidade',
    searchFields:['identificador','modelo'],
    columns:['identificador','unidade','ano_aquisicao','anos_uso','valor_residual','recomendar_substituicao','prioridade'],
    fields:[
      {key:'identificador', label:'Identificador', type:'text', required:true, mono:true},
      {key:'unidade', label:'Unidade', type:'unidade', required:true},
      {key:'modelo', label:'Modelo', type:'text'},
      {key:'processador', label:'Processador', type:'text'},
      {key:'ano_aquisicao', label:'Ano de Aquisição', type:'number', default:new Date().getFullYear()},
      {key:'valor_aquisicao', label:'Valor de Aquisição (R$)', type:'number', currency:true},
      {key:'vida_util_anos', label:'Vida Útil (anos)', type:'number', default:5},
      {key:'anos_uso', label:'Anos de Uso', type:'number'},
      {key:'deprec_anual', label:'Depreciação Anual (R$)', type:'number', currency:true},
      {key:'deprec_acumulada', label:'Depreciação Acumulada (R$)', type:'number', currency:true},
      {key:'valor_residual', label:'Valor Residual (R$)', type:'number', currency:true},
      {key:'recomendar_substituicao', label:'Recomendar Substituição', type:'select', options:['Sim','Não'], badge:true},
      {key:'prioridade', label:'Prioridade', type:'select', options:['Baixa','Média','Alta'], badge:true},
    ],
  },
  linhas:{
    label:'Linhas Wish', icon:'linhas', collection:'linhas',
    title:'Linhas telefônicas', sub:'Linhas corporativas — Corporativo/Hotéis e Exclusive Guest',
    unitField:'unidade', statusField:'status',
    searchFields:['numero','usuario','depto','conta'],
    columns:['tipo_linha','unidade','numero','usuario','depto','status','valor'],
    fields:[
      {key:'tipo_linha', label:'Linha', type:'select', options:['Corporativo e Hotéis','Exclusive Guest'], required:true, badge:true},
      {key:'numero', label:'Número', type:'text', required:true, mono:true},
      {key:'ddd', label:'DDD', type:'text', mono:true},
      {key:'empresa', label:'Empresa', type:'text'},
      {key:'unidade', label:'Unidade', type:'unidade'},
      {key:'usuario', label:'Usuário', type:'text'},
      {key:'funcao', label:'Função', type:'text'},
      {key:'depto', label:'Departamento', type:'text'},
      {key:'conta', label:'Conta', type:'text', mono:true},
      {key:'plano', label:'Plano', type:'text'},
      {key:'cnpj', label:'CNPJ', type:'text', mono:true},
      {key:'valor', label:'Valor (R$)', type:'number', currency:true},
      {key:'valor_gasto', label:'Valor Gasto (R$)', type:'number', currency:true},
      {key:'status', label:'Status', type:'select', options:['Ativa','Suspensa','Cancelada'], badge:true},
    ],
  },
};
const MODULE_ORDER = ['inventario','estoque','locados','compras','licencas','transporte','impressoras','teamviewer','depreciacao','linhas'];

// Telas de administração (só aparecem para o perfil "admin").
const SPECIAL_VIEWS = {
  usuarios:{label:'Usuários', icon:'usuarios', title:'Usuários e permissões', sub:'Defina o que cada pessoa pode fazer no sistema'},
  atividades:{label:'Atividades', icon:'historico', title:'Registro de atividades', sub:'Quem acessou e quem cadastrou, editou, excluiu ou restaurou cada item'},
  lixeira:{label:'Lixeira', icon:'trash', title:'Lixeira', sub:'Itens excluídos — restaure se a exclusão foi um engano'},
};

/* -------------------------- Custo de substituição de ativos -------------------------- */
// Menor preço por item entre os fornecedores do Mapa de Cotação (MINI DESKTOP MAIS
// SERVIÇOS): Desktop já cotado com garantia estendida (Concórdia, 3 anos) + Monitor
// (Scansource) + Licença Office (Scansource) + Device CAL (Scansource). Atualize aqui
// quando cotar de novo.
const REPLACEMENT_COST = {
  desktop:   {valor:6579.00, fornecedor:'Concórdia', desc:'Desktop Dell Pro Micro i5 16GB 512GB Win 11 Pro c/ garantia estendida 3 anos'},
  monitor:   {valor: 830.00, fornecedor:'Scansource', desc:'Monitor Dell E2225HSM 21.5" c/ ajuste de cabo HDMI'},
  office:    {valor:1269.00, fornecedor:'Scansource', desc:'Office Home and Business 2024 ESD Perpétua'},
  deviceCal: {valor: 353.90, fornecedor:'Scansource', desc:'Windows Server 2025 — 1 Device CAL'},
};
const REPLACEMENT_UNIT_TOTAL = REPLACEMENT_COST.desktop.valor + REPLACEMENT_COST.monitor.valor + REPLACEMENT_COST.office.valor + REPLACEMENT_COST.deviceCal.valor;

/* -------------------------- Formatação -------------------------- */
const fmtCurrency = (v)=> new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
function fmtDate(v){
  if(!v) return '—';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[3]+'/'+m[2]+'/'+m[1];
  return v;
}
function statusTone(status){
  const s = (status||'').toLowerCase();
  if(['vencida','vencido','atrasado','extraviado','cancelado','baixado','inativo','inativa','não instalada','nao instalada','alta'].some(x=>s.includes(x))) return 'crit';
  if(['manutenção','manutencao','reservado','solicitado','aprovado','média','media'].some(x=>s.includes(x))) return 'warn';
  if(['ativo','ativa','disponível','disponivel','em uso','entregue','postado','em trânsito','em transito','ok','baixa'].some(x=>s.includes(x))) return 'ok';
  return 'neutral';
}
function esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* -------------------------- Supabase -------------------------- */
let supabaseClient = null;
let currentUser = null;

/* -------------------------- Perfis de acesso -------------------------- */
// admin: tudo · editor: consulta, cadastra e edita (não exclui) · leitor: só consulta.
// A regra de verdade está no banco (RLS, ver supabase/schema.sql); aqui só
// escondemos os botões que o perfil não pode usar.
let currentRole = 'leitor';
const ROLE_LABEL = {admin:'Administrador', editor:'Editor', leitor:'Leitor'};
const canWrite  = ()=> currentRole==='admin' || currentRole==='editor';
const canDelete = ()=> currentRole==='admin';
const isAdmin   = ()=> currentRole==='admin';

async function loadMyRole(uid){
  const { data, error } = await supabaseClient.from('perfis').select('papel').eq('id', uid).maybeSingle();
  if(error){
    // Tabela "perfis" ainda não existe (schema.sql atualizado não foi rodado):
    // o banco ainda aceita tudo, então mantém o comportamento antigo.
    const missing = error.code==='42P01' || error.code==='PGRST205' || /perfis/i.test(error.message||'');
    if(missing) return 'admin';
    console.error(error);
    return 'leitor';
  }
  return (data && data.papel) || 'leitor';
}

// Traduz os erros de permissão do banco para uma frase clara.
function friendlyError(e, acao){
  if(e && e.code==='23503') return 'este item tem histórico vinculado (por exemplo, meses já importados) e não pode ser removido.';
  if(e && (e.code==='42501' || /row-level security/i.test(e.message||'')))
    return 'Seu perfil ('+ROLE_LABEL[currentRole]+') não tem permissão para '+acao+'.';
  return (e && e.message) ? e.message : 'erro desconhecido';
}

function configIsPlaceholder(){
  const c = window.SUPABASE_CONFIG || {};
  return !c.url || !c.anonKey || c.url.includes('SEU-PROJETO') || c.anonKey.includes('COLE_AQUI');
}

function initSupabase(){
  const c = window.SUPABASE_CONFIG;
  supabaseClient = window.supabase.createClient(c.url, c.anonKey);
}

const Store = {
  subscribe(table, cb){
    let cancelled = false;
    const reload = ()=>{
      supabaseClient.from(table).select('*').order('created_at', {ascending:false}).then(({data, error})=>{
        if(cancelled) return;
        if(error){ console.error(error); toast('Erro ao carregar "'+table+'".', true); return; }
        cb(data || []);
      });
    };
    reload();
    const channel = supabaseClient
      .channel('rt-'+table)
      .on('postgres_changes', {event:'*', schema:'public', table}, reload)
      .subscribe();
    return ()=>{ cancelled = true; supabaseClient.removeChannel(channel); };
  },
  async add(table, data){
    const { data: row, error } = await supabaseClient.from(table).insert(data).select().single();
    if(error) throw error;
    return row.id;
  },
  async update(table, id, data){
    const { data: rows, error } = await supabaseClient.from(table).update(data).eq('id', id).select('id');
    if(error) throw error;
    // Quando a regra de segurança bloqueia, o banco não dá erro: só afeta 0 linhas.
    if(!rows || rows.length===0) throw {code:'42501', message:'row-level security: nenhuma linha alterada'};
  },
  async remove(table, id){
    const { data: rows, error } = await supabaseClient.from(table).delete().eq('id', id).select('id');
    if(error) throw error;
    if(!rows || rows.length===0) throw {code:'42501', message:'row-level security: nenhuma linha excluída'};
  },
};

/* -------------------------- Estado -------------------------- */
const state = {
  moduleKey:'dashboard',
  unidadeFilter:'',
  search:'',
  rows:[],
  unsub:null,
  revealed:{},
  onlyRecommend:false,
  itemFilter:'',
};
const moduleCounts = {};

/* -------------------------- Sidebar / navegação -------------------------- */
function renderSidebar(){
  const nav = document.getElementById('navList');
  let html = '<button class="nav-btn '+(state.moduleKey==='dashboard'?'active':'')+'" data-mod="dashboard"><span class="icon">'+ic('dashboard')+'</span><span class="lbl-full">Painel geral</span></button>';
  html += '<div class="nav-section-label">Módulos</div>';
  MODULE_ORDER.forEach(key=>{
    const m = MODULES[key];
    const count = moduleCounts[key] || 0;
    html += '<button class="nav-btn '+(state.moduleKey===key?'active':'')+'" data-mod="'+key+'"><span class="icon">'+ic(m.icon)+'</span><span class="lbl-full">'+esc(m.label)+'</span>'+(count?('<span class="count">'+count+'</span>'):'')+'</button>';
  });
  if(isAdmin()){
    html += '<div class="nav-section-label">Administração</div>';
    Object.keys(SPECIAL_VIEWS).forEach(key=>{
      const v = SPECIAL_VIEWS[key];
      html += '<button class="nav-btn '+(state.moduleKey===key?'active':'')+'" data-mod="'+key+'"><span class="icon">'+ic(v.icon)+'</span><span class="lbl-full">'+esc(v.label)+'</span></button>';
    });
  }
  nav.innerHTML = html;
  nav.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> switchModule(btn.dataset.mod));
  });
  const userChip = document.getElementById('syncStatus');
  userChip.innerHTML = '<span class="dot"></span><span class="user-email" title="'+esc(currentUser?currentUser.email:'')+'">'+esc(currentUser?currentUser.email:'')+'</span>'+
    '<span class="role-badge" title="Seu perfil de acesso">'+esc(ROLE_LABEL[currentRole]||currentRole)+'</span>'+
    '<button class="icon-btn" id="logoutBtn" title="Sair"><span class="icon">'+ic('logout')+'</span></button>';
  const lb = document.getElementById('logoutBtn');
  if(lb) lb.addEventListener('click', async ()=>{ await supabaseClient.auth.signOut(); });
}

function switchModule(key){
  state.moduleKey = key;
  state.search = '';
  state.itemFilter = '';
  if(typeof state.unsub === 'function'){ state.unsub(); state.unsub = null; }
  renderSidebar();
  renderTopbar();
  if(key === 'dashboard'){ renderDashboard(); }
  else if(key === 'usuarios'){ renderUsuarios(); }
  else if(key === 'atividades'){ renderAtividades(); }
  else if(key === 'lixeira'){ renderLixeira(); }
  else if(key === 'impressoras' && typeof impOpen === 'function'){ impOpen(); }
  else { subscribeModule(key); }
}

function subscribeModule(key){
  const mod = MODULES[key];
  document.getElementById('content').innerHTML = '<div class="table-wrap"><div class="table-empty">Carregando…</div></div>';
  state.unsub = Store.subscribe(mod.collection, (rows)=>{
    state.rows = rows;
    moduleCounts[key] = rows.length;
    if(mod.collection==='compras') refreshItemFilterSelect();
    renderModuleTable(key);
    updateNavCounts();
  });
}
function updateNavCounts(){
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    const k = btn.dataset.mod;
    if(k==='dashboard') return;
    const c = moduleCounts[k];
    let countEl = btn.querySelector('.count');
    if(c){
      if(!countEl){ countEl = document.createElement('span'); countEl.className='count'; btn.appendChild(countEl); }
      countEl.textContent = c;
    } else if(countEl){ countEl.remove(); }
  });
}

/* -------------------------- Topbar -------------------------- */
function renderTopbar(){
  const special = SPECIAL_VIEWS[state.moduleKey];
  const mod = (state.moduleKey==='dashboard' || special) ? null : MODULES[state.moduleKey];
  const head = special || mod;
  document.getElementById('topbarIcon').innerHTML = ic(head?head.icon:'dashboard');
  document.getElementById('topbarTitle').textContent = head?head.title:'Painel geral';
  document.getElementById('topbarSub').textContent = head?head.sub:'Visão consolidada de todas as unidades Wish Hotels & Resorts';

  const ctrls = document.getElementById('topbarControls');
  if(state.moduleKey==='usuarios'){
    ctrls.innerHTML = '<button class="btn btn-primary" id="btnAddUser"><span class="icon">'+ic('plus')+'</span>Adicionar usuário</button>';
    document.getElementById('btnAddUser').addEventListener('click', openConviteForm);
    return;
  }
  if(!mod){ ctrls.innerHTML=''; return; }
  // Impressoras: as abas de análise têm seus próprios filtros dentro da tela.
  if(mod.collection==='impressoras' && typeof impTopbarHidden==='function' && impTopbarHidden()){ ctrls.innerHTML=''; return; }

  let html = '';
  if(mod.unitField){
    html += '<select id="unidadeFilterSel" class="field-select">';
    html += '<option value="">Todas as unidades</option>';
    UNITS.forEach(u=> html += '<option value="'+u.code+'" '+(state.unidadeFilter===u.code?'selected':'')+'>'+esc(u.label)+'</option>');
    html += '</select>';
  }
  if(mod.collection==='depreciacao'){
    html += '<label class="check-filter"><input type="checkbox" id="onlyRecommendChk" '+(state.onlyRecommend?'checked':'')+'/> Só substituição recomendada</label>';
  }
  if(mod.collection==='compras'){
    html += '<select id="itemFilterSel" class="field-select"><option value="">Todos os itens</option>'+itemFilterOptionsHtml()+'</select>';
  }
  html += '<div class="search-box"><span class="icon">'+ic('search')+'</span><input id="searchInput" type="text" placeholder="Buscar…" value="'+esc(state.search)+'"/></div>';
  if(canWrite()){
    html += '<button class="btn btn-primary" id="btnNew"><span class="icon">'+ic('plus')+'</span>Novo</button>';
  }
  ctrls.innerHTML = html;

  const selEl = document.getElementById('unidadeFilterSel');
  if(selEl) selEl.addEventListener('change', e=>{ state.unidadeFilter = e.target.value; renderModuleTable(state.moduleKey); });
  const onlyRecEl = document.getElementById('onlyRecommendChk');
  if(onlyRecEl) onlyRecEl.addEventListener('change', e=>{ state.onlyRecommend = e.target.checked; renderModuleTable(state.moduleKey); });
  const itemEl = document.getElementById('itemFilterSel');
  if(itemEl) itemEl.addEventListener('change', e=>{ state.itemFilter = e.target.value; renderModuleTable(state.moduleKey); });
  document.getElementById('searchInput').addEventListener('input', e=>{ state.search = e.target.value; renderModuleTable(state.moduleKey); });
  const newBtn = document.getElementById('btnNew');
  if(newBtn) newBtn.addEventListener('click', ()=> openForm(state.moduleKey, null));
}

// Opções (itens distintos comprados) para o filtro do módulo Compras.
function itemFilterOptionsHtml(){
  const items = Array.from(new Set(state.rows.map(r=> (r.descricao_item||'').trim()).filter(Boolean))).sort((a,b)=> a.localeCompare(b,'pt-BR'));
  return items.map(v=> '<option value="'+esc(v)+'" '+(state.itemFilter===v?'selected':'')+'>'+esc(v)+'</option>').join('');
}
function refreshItemFilterSelect(){
  const sel = document.getElementById('itemFilterSel');
  if(!sel) return;
  sel.innerHTML = '<option value="">Todos os itens</option>'+itemFilterOptionsHtml();
}

/* -------------------------- Tabela de módulo -------------------------- */
function filteredRows(mod){
  let rows = state.rows.slice();
  if(mod.unitField && state.unidadeFilter){
    rows = rows.filter(r=> r[mod.unitField]===state.unidadeFilter);
  }
  if(mod.collection==='depreciacao' && state.onlyRecommend){
    rows = rows.filter(r=> r.recomendar_substituicao==='Sim');
  }
  if(mod.collection==='compras' && state.itemFilter){
    rows = rows.filter(r=> (r.descricao_item||'').trim()===state.itemFilter);
  }
  const q = state.search.trim().toLowerCase();
  if(q){
    rows = rows.filter(r=> (mod.searchFields||[]).some(f=> String(r[f]||'').toLowerCase().includes(q)));
  }
  return rows;
}

function columnLabel(mod, colKey){
  const f = mod.fields.find(f=>f.key===colKey);
  return f ? f.label : colKey;
}

function renderCell(mod, colKey, row){
  const f = mod.fields.find(f=>f.key===colKey);
  const val = row[colKey];
  if(colKey==='recomendar_substituicao'){
    const isSim = (val||'').toLowerCase()==='sim';
    return '<td><span class="badge '+(isSim?'crit':'ok')+'">'+esc(val||'—')+'</span></td>';
  }
  if(colKey==='senha'){
    const shown = !!state.revealed[row.id];
    const display = shown ? esc(val||'—') : '••••••••';
    return '<td><div class="pass-cell"><span class="mono dots">'+display+'</span>'+
      '<button class="icon-btn reveal-btn" data-id="'+row.id+'" title="'+(shown?'Ocultar':'Mostrar')+'"><span class="icon">'+ic(shown?'eyeoff':'eye')+'</span></button>'+
      (shown?'<button class="icon-btn copy-btn" data-copy="'+esc(val||'')+'" title="Copiar"><span class="icon">'+ic('copy')+'</span></button>':'')+
      '</div></td>';
  }
  if(colKey==='unidade' || (mod.unitField===colKey)){ return '<td>'+esc(unitLabel(val))+'</td>'; }
  if(f && f.badge){ return '<td><span class="badge '+statusTone(val)+'">'+esc(val||'—')+'</span></td>'; }
  if(f && f.type==='date'){ return '<td class="cell-mono">'+fmtDate(val)+'</td>'; }
  if(f && f.currency){ return '<td class="num-cell cell-mono">'+fmtCurrency(val)+'</td>'; }
  if(f && f.type==='number'){ return '<td class="num-cell">'+(val==null||val===''?'—':val)+'</td>'; }
  if(f && f.mono){ return '<td class="cell-mono">'+esc(val||'—')+'</td>'; }
  return '<td>'+esc(val || '—')+'</td>';
}

function renderInvestmentPanel(){
  // Baseado no filtro de unidade atual (ignora busca e o toggle "só recomendadas",
  // para sempre refletir o investimento de TODAS as máquinas recomendadas na unidade em foco).
  let base = state.rows.slice();
  if(state.unidadeFilter){ base = base.filter(r=> r.unidade===state.unidadeFilter); }
  const recRows = base.filter(r=> r.recomendar_substituicao==='Sim');

  const byUnit = {};
  recRows.forEach(r=>{ const k = r.unidade || '—'; byUnit[k] = (byUnit[k]||0) + 1; });
  const unitKeys = Object.keys(byUnit).sort((a,b)=> byUnit[b]-byUnit[a]);

  const rowsHtml = unitKeys.length
    ? unitKeys.map(k=> '<div class="bar-row"><div class="bl">'+esc(unitLabel(k))+'</div><div class="bv mono">'+byUnit[k]+' máq.</div><div class="bv mono" style="width:auto;min-width:110px;">'+fmtCurrency(byUnit[k]*REPLACEMENT_UNIT_TOTAL)+'</div></div>').join('')
    : '<div class="empty-note">Nenhuma máquina recomendada para substituição'+(state.unidadeFilter?' nesta unidade':'')+'.</div>';

  return '<div class="panel invest-panel">'+
    '<h2>Investimento estimado para substituição</h2>'+
    '<div class="panel-sub">'+recRows.length+' máquina'+(recRows.length===1?'':'s')+' recomendada'+(recRows.length===1?'':'s')+' × '+fmtCurrency(REPLACEMENT_UNIT_TOTAL)+'/máquina — desktop c/ garantia estendida + monitor + licença Office + Device CAL (menor cotação por item)</div>'+
    rowsHtml+
    (unitKeys.length ? '<div class="invest-total">Total estimado: <b>'+fmtCurrency(recRows.length*REPLACEMENT_UNIT_TOTAL)+'</b></div>' : '')+
    '</div>';
}

const MONTH_NAMES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function renderComprasSummaryPanel(){
  // Respeita os filtros de unidade e de item (não a busca livre), para sempre
  // mostrar o total investido no recorte que o usuário selecionou.
  let base = state.rows.slice();
  if(state.unidadeFilter){ base = base.filter(r=> r.unidade===state.unidadeFilter); }
  if(state.itemFilter){ base = base.filter(r=> (r.descricao_item||'').trim()===state.itemFilter); }

  const byMonth = {};
  let semData = 0, semValor = 0;
  base.forEach(r=>{
    const m = String(r.data_pedido||'').match(/^(\d{4})-(\d{2})/);
    if(!m){ semData++; return; }
    const key = m[1]+'-'+m[2];
    if(!byMonth[key]) byMonth[key] = {qtd:0, total:0};
    byMonth[key].qtd++;
    byMonth[key].total += Number(r.valor||0);
    if(r.valor==null || r.valor==='') semValor++;
  });
  const keys = Object.keys(byMonth).sort().reverse();
  const grandTotal = base.reduce((s,r)=> s + Number(r.valor||0), 0);

  const rowsHtml = keys.length
    ? keys.map(k=>{
        const [y,mo] = k.split('-');
        const label = MONTH_NAMES_PT[Number(mo)-1]+' '+y;
        const d = byMonth[k];
        return '<div class="bar-row"><div class="bl">'+esc(label)+'</div><div class="bv mono">'+d.qtd+' pedido'+(d.qtd===1?'':'s')+'</div><div class="bv mono" style="width:auto;min-width:110px;">'+fmtCurrency(d.total)+'</div></div>';
      }).join('')
    : '<div class="empty-note">Nenhum pedido com data cadastrada'+(state.unidadeFilter||state.itemFilter?' neste filtro':'')+'.</div>';

  let note = '';
  if(semValor>0) note = '<div class="empty-note">'+semValor+' pedido'+(semValor===1?'':'s')+' sem valor preenchido (não entra'+(semValor===1?'':'m')+' no total).</div>';
  if(semData>0) note += '<div class="empty-note">'+semData+' pedido'+(semData===1?'':'s')+' sem data — não aparece'+(semData===1?'':'m')+' no agrupamento por mês.</div>';

  return '<div class="panel invest-panel">'+
    '<h2>Valor investido por mês</h2>'+
    '<div class="panel-sub">'+base.length+' pedido'+(base.length===1?'':'s')+(state.itemFilter?' de "'+esc(state.itemFilter)+'"':'')+(state.unidadeFilter?' em '+esc(unitLabel(state.unidadeFilter)):'')+'</div>'+
    rowsHtml+ note +
    (keys.length ? '<div class="invest-total">Total no período: <b>'+fmtCurrency(grandTotal)+'</b></div>' : '')+
    '</div>';
}

function renderModuleTable(key){
  if(key !== state.moduleKey) return;
  const mod = MODULES[key];
  const rows = filteredRows(mod);
  const content = document.getElementById('content');

  let html = '';
  if(mod.collection==='depreciacao') html = renderInvestmentPanel();
  else if(mod.collection==='compras') html = renderComprasSummaryPanel();
  else if(mod.collection==='impressoras' && typeof impTabsHtml==='function') html = impTabsHtml();
  html += '<div class="table-wrap">';
  if(rows.length === 0){
    html += '<div class="table-empty"><span class="icon">'+ic(mod.icon)+'</span><b>Nenhum registro encontrado</b>'+
      (state.search||state.unidadeFilter||state.itemFilter ? 'Ajuste os filtros ou a busca.' : (canWrite() ? 'Clique em "Novo" para cadastrar o primeiro registro.' : 'Ainda não há registros neste módulo.'))+'</div>';
  } else {
    html += '<div class="result-count">'+rows.length+' registro'+(rows.length===1?'':'s')+'</div>';
    html += '<div class="table-scroll"><table><thead><tr>';
    mod.columns.forEach(c=> html += '<th>'+esc(columnLabel(mod,c))+'</th>');
    html += '<th></th></tr></thead><tbody>';
    rows.forEach(row=>{
      html += '<tr data-id="'+row.id+'">';
      mod.columns.forEach(c=> html += renderCell(mod, c, row));
      html += '<td><div class="cell-actions">'+
        (canWrite() ? '<button class="icon-btn edit-btn" data-id="'+row.id+'" title="Editar"><span class="icon">'+ic('edit')+'</span></button>' : '')+
        (canDelete() ? '<button class="icon-btn danger del-btn" data-id="'+row.id+'" title="Excluir"><span class="icon">'+ic('trash')+'</span></button>' : '')+
        '</div></td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';
  content.innerHTML = html;
  if(mod.collection==='impressoras' && typeof impWireTabs==='function') impWireTabs();

  content.querySelectorAll('.edit-btn').forEach(b=> b.addEventListener('click', ()=>{
    const row = state.rows.find(r=>r.id===b.dataset.id);
    openForm(key, row);
  }));
  content.querySelectorAll('.del-btn').forEach(b=> b.addEventListener('click', async ()=>{
    const row = state.rows.find(r=>r.id===b.dataset.id);
    const label = row[mod.searchFields[0]] || row.id;
    const ok = await confirmDialog('Excluir o registro "'+label+'"? Ele vai para a Lixeira e um administrador pode restaurá-lo depois.');
    if(!ok) return;
    try{ await Store.remove(mod.collection, row.id); toast('Registro excluído. Dá para restaurar pela Lixeira.'); }
    catch(e){ console.error(e); toast('Não foi possível excluir: '+friendlyError(e,'excluir registros'), true); }
  }));
  content.querySelectorAll('.reveal-btn').forEach(b=> b.addEventListener('click', ()=>{
    state.revealed[b.dataset.id] = !state.revealed[b.dataset.id];
    renderModuleTable(key);
  }));
  content.querySelectorAll('.copy-btn').forEach(b=> b.addEventListener('click', async ()=>{
    try{ await navigator.clipboard.writeText(b.dataset.copy); toast('Senha copiada.'); }
    catch(e){ toast('Não foi possível copiar.', true); }
  }));
}

/* -------------------------- Formulário (modal) -------------------------- */
function openForm(key, existing){
  if(!canWrite()){ toast('Seu perfil ('+ROLE_LABEL[currentRole]+') só permite consultar.', true); return; }
  const mod = MODULES[key];
  const root = document.getElementById('modalRoot');
  let fieldsHtml = '';
  mod.fields.forEach(f=>{
    const val = existing ? (existing[f.key] ?? '') : (f.default ?? '');
    fieldsHtml += '<div class="form-field '+(f.full?'full':'')+'">';
    fieldsHtml += '<label for="f_'+f.key+'">'+esc(f.label)+(f.required?' *':'')+'</label>';
    if(f.type==='select'){
      fieldsHtml += '<select id="f_'+f.key+'" name="'+f.key+'">';
      fieldsHtml += '<option value="">Selecione…</option>';
      f.options.forEach(o=> fieldsHtml += '<option value="'+esc(o)+'" '+(val===o?'selected':'')+'>'+esc(o)+'</option>');
      fieldsHtml += '</select>';
    } else if(f.type==='unidade'){
      fieldsHtml += '<select id="f_'+f.key+'" name="'+f.key+'">';
      fieldsHtml += '<option value="">Selecione…</option>';
      UNITS.forEach(u=> fieldsHtml += '<option value="'+u.code+'" '+(val===u.code?'selected':'')+'>'+esc(u.label)+'</option>');
      fieldsHtml += '</select>';
    } else if(f.type==='textarea'){
      fieldsHtml += '<textarea id="f_'+f.key+'" name="'+f.key+'">'+esc(val)+'</textarea>';
    } else if(f.type==='password'){
      fieldsHtml += '<div class="pass-input-row"><input type="password" id="f_'+f.key+'" name="'+f.key+'" value="'+esc(val)+'" autocomplete="new-password"/>'+
        '<button type="button" class="icon-btn" id="togglePassField" title="Mostrar/ocultar"><span class="icon">'+ic('eye')+'</span></button></div>';
    } else if(f.type==='date'){
      fieldsHtml += '<input type="date" id="f_'+f.key+'" name="'+f.key+'" value="'+esc(val)+'"/>';
    } else if(f.type==='number'){
      fieldsHtml += '<input type="number" id="f_'+f.key+'" name="'+f.key+'" value="'+esc(val)+'" step="any"/>';
    } else {
      fieldsHtml += '<input type="text" id="f_'+f.key+'" name="'+f.key+'" value="'+esc(val)+'" class="'+(f.mono?'mono':'')+'"/>';
    }
    fieldsHtml += '</div>';
  });

  root.innerHTML = '<div class="modal-overlay" id="formOverlay"><div class="modal">'+
    '<div class="modal-head"><h2>'+(existing?'Editar':'Novo')+' — '+esc(mod.label)+'</h2>'+
    '<button class="icon-btn" id="formClose"><span class="icon">'+ic('close')+'</span></button></div>'+
    '<div class="modal-body"><form id="entityForm"><div class="form-grid">'+fieldsHtml+'</div></form></div>'+
    '<div class="modal-foot"><button class="btn" id="formCancel">Cancelar</button>'+
    '<button class="btn btn-primary" id="formSave"><span class="icon">'+ic('check')+'</span>Salvar</button></div>'+
    '</div></div>';

  const overlay = document.getElementById('formOverlay');
  const close = ()=> root.innerHTML = '';
  document.getElementById('formClose').addEventListener('click', close);
  document.getElementById('formCancel').addEventListener('click', close);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
  document.addEventListener('keydown', function escHandler(e){ if(e.key==='Escape'){ close(); document.removeEventListener('keydown', escHandler); } });

  const toggleBtn = document.getElementById('togglePassField');
  if(toggleBtn){
    toggleBtn.addEventListener('click', ()=>{
      const inp = document.querySelector('#entityForm [name=senha]');
      if(!inp) return;
      const showing = inp.type === 'text';
      inp.type = showing ? 'password' : 'text';
      toggleBtn.innerHTML = '<span class="icon">'+ic(showing?'eye':'eyeoff')+'</span>';
    });
  }

  document.getElementById('formSave').addEventListener('click', async ()=>{
    const data = {};
    mod.fields.forEach(f=>{
      const el = document.getElementById('f_'+f.key);
      let v = el.value;
      if(f.type==='number') v = v===''? null : Number(v);
      if(f.type==='date') v = v===''? null : v;
      data[f.key] = v;
    });
    const reqField = mod.fields.find(f=>f.required);
    if(reqField && !data[reqField.key]){
      toast('Preencha o campo "'+reqField.label+'".', true);
      return;
    }
    try{
      if(existing){ await Store.update(mod.collection, existing.id, data); toast('Registro atualizado.'); }
      else { await Store.add(mod.collection, data); toast('Registro criado.'); }
      close();
      if(mod.collection==='impressoras' && typeof impAfterSave==='function') impAfterSave();
    }catch(e){
      console.error(e);
      toast('Não foi possível salvar o registro: '+friendlyError(e,'cadastrar ou editar registros'), true);
    }
  });
}

/* -------------------------- Confirmação -------------------------- */
function confirmDialog(message){
  return new Promise(resolve=>{
    const root = document.getElementById('modalRoot');
    root.innerHTML = '<div class="modal-overlay" id="confirmOverlay"><div class="modal small">'+
      '<div class="modal-head"><h2>Confirmar exclusão</h2></div>'+
      '<div class="modal-body">'+esc(message)+'</div>'+
      '<div class="modal-foot"><button class="btn" id="cAbort">Cancelar</button>'+
      '<button class="btn btn-primary" id="cOk" style="background:var(--crit);border-color:var(--crit);color:#fff;">Excluir</button></div>'+
      '</div></div>';
    const close = (val)=>{ root.innerHTML=''; resolve(val); };
    document.getElementById('cAbort').addEventListener('click', ()=>close(false));
    document.getElementById('cOk').addEventListener('click', ()=>close(true));
    document.getElementById('confirmOverlay').addEventListener('click', e=>{ if(e.target.id==='confirmOverlay') close(false); });
  });
}

/* -------------------------- Toast -------------------------- */
function toast(msg, isErr){
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast'+(isErr?' err':'');
  el.innerHTML = '<span class="icon">'+ic(isErr?'alert':'check')+'</span><span>'+esc(msg)+'</span>';
  stack.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .25s'; setTimeout(()=>el.remove(),260); }, 3200);
}

/* -------------------------- Dashboard -------------------------- */
async function loadDashboard(){
  const cols = ['inventario','estoque','locados','compras','licencas','transporte','impressoras','teamviewer','depreciacao','linhas'];
  const results = {};
  await Promise.all(cols.map(async c=>{
    const { data, error } = await supabaseClient.from(c).select('*');
    if(error){ console.error(error); results[c] = []; return; }
    results[c] = data || [];
  }));
  cols.forEach(c=>{
    const key = MODULE_ORDER.find(k=>MODULES[k].collection===c);
    if(key) moduleCounts[key] = results[c].length;
  });
  updateNavCounts();
  return results;
}

function renderDashboard(){
  const content = document.getElementById('content');
  content.innerHTML = '<div class="kpi-grid" id="kpiGrid"></div><div class="dash-grid">'+
    '<div class="panel"><h2>Ativos por unidade</h2><div class="panel-sub">Equipamentos cadastrados no inventário</div><div id="unitBars"></div></div>'+
    '<div class="panel"><h2>Pontos de atenção</h2><div class="panel-sub">Itens que podem exigir uma ação</div><div class="alert-list" id="alertList"></div></div>'+
    '</div>';

  loadDashboard().then(data=>{
    // se a pessoa já trocou de tela enquanto carregava, não desenha por cima
    if(state.moduleKey !== 'dashboard' || !document.getElementById('kpiGrid')) return;
    const inv = data.inventario || [];
    const locados = data.locados || [];
    const licencas = data.licencas || [];
    const compras = data.compras || [];
    const transporte = data.transporte || [];
    const impressoras = data.impressoras || [];
    const depreciacao = data.depreciacao || [];
    const linhas = data.linhas || [];

    const kpis = [
      {icon:'inventario', num:inv.length, lbl:'Ativos cadastrados'},
      {icon:'locados', num:locados.filter(r=>r.status==='Ativo').length, lbl:'Locações ativas'},
      {icon:'licencas', num:licencas.filter(r=>r.status==='Vencida'||r.status==='Não instalada').length, lbl:'Licenças a regularizar'},
      {icon:'compras', num:compras.filter(r=>r.status_sci==='Solicitado'||r.status_sci==='Aprovado').length, lbl:'Compras em aberto'},
      {icon:'transporte', num:transporte.filter(r=>r.status==='Postado'||r.status==='Em trânsito').length, lbl:'Envios em trânsito'},
      {icon:'impressoras', num:impressoras.filter(r=>r.status==='Ativa').length, lbl:'Impressoras ativas'},
      {icon:'depreciacao', num:depreciacao.filter(r=>r.recomendar_substituicao==='Sim').length, lbl:'Substituição recomendada'},
      {icon:'linhas', num:linhas.filter(r=>(r.status||'').toLowerCase().startsWith('ativa')).length, lbl:'Linhas ativas'},
    ];
    document.getElementById('kpiGrid').innerHTML = kpis.map(k=>
      '<div class="kpi"><span class="icon">'+ic(k.icon)+'</span><div class="num mono">'+k.num+'</div><div class="lbl">'+esc(k.lbl)+'</div></div>'
    ).join('');

    const byUnit = {};
    UNITS.forEach(u=> byUnit[u.code]=0);
    inv.forEach(r=>{ byUnit[r.unidade]=(byUnit[r.unidade]||0)+1; });
    const maxCount = Math.max(1, ...Object.values(byUnit));
    const barsHtml = UNITS.map(u=>{
      const c = byUnit[u.code]||0;
      const pct = Math.round((c/maxCount)*100);
      return '<div class="bar-row"><div class="bl">'+esc(u.label)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div><div class="bv mono">'+c+'</div></div>';
    }).join('');
    document.getElementById('unitBars').innerHTML = inv.length ? barsHtml : '<div class="empty-note">Nenhum ativo cadastrado ainda.</div>';

    const alerts = [];
    licencas.filter(r=>r.status==='Vencida').slice(0,4).forEach(r=> alerts.push('Licença <b>'+esc(r.licenca||r.tipo||'—')+'</b> vencida ('+esc(unitLabel(r.unidade))+')'));
    locados.filter(r=>r.status==='Atrasado').slice(0,4).forEach(r=> alerts.push('Devolução em atraso: <b>'+esc(r.equipamento||'—')+'</b> — '+esc(r.colaborador||'—')));
    transporte.filter(r=>r.status==='Extraviado').slice(0,3).forEach(r=> alerts.push('Envio extraviado: <b>'+esc(r.descricao_envio||'—')+'</b>'));
    depreciacao.filter(r=>r.recomendar_substituicao==='Sim').slice(0,4).forEach(r=> alerts.push('Substituição recomendada: <b>'+esc(r.identificador||r.modelo||'—')+'</b>'));
    const alertList = document.getElementById('alertList');
    alertList.innerHTML = alerts.length
      ? alerts.slice(0,8).map(a=>'<div class="alert-item"><span class="icon">'+ic('alert')+'</span><span>'+a+'</span></div>').join('')
      : '<div class="empty-note">Nenhum ponto de atenção no momento.</div>';
  });
}

/* -------------------------- Administração: usuários -------------------------- */
async function renderUsuarios(){
  if(!isAdmin()) return;
  const content = document.getElementById('content');
  content.innerHTML = '<div class="table-wrap"><div class="table-empty">Carregando…</div></div>';
  const { data, error } = await supabaseClient.from('perfis').select('*').order('created_at', {ascending:true});
  if(state.moduleKey!=='usuarios') return;
  if(error){
    content.innerHTML = '<div class="table-wrap"><div class="table-empty"><b>Não foi possível carregar os usuários</b>'+esc(error.message)+'</div></div>';
    return;
  }
  let html = '<div class="panel perm-legend"><h2>O que cada perfil pode fazer</h2>'+
    '<div class="panel-sub">Quem é convidado entra como Leitor até um administrador mudar o perfil aqui.</div>'+
    '<div class="perm-grid">'+
      '<div><span class="badge ok">Administrador</span><p>Tudo: cadastra, edita, exclui, restaura itens da Lixeira e gerencia usuários.</p></div>'+
      '<div><span class="badge warn">Editor</span><p>Consulta, cadastra e edita. Não consegue excluir.</p></div>'+
      '<div><span class="badge neutral">Leitor</span><p>Somente consulta.</p></div>'+
    '</div></div>';
  html += '<div class="table-wrap"><div class="table-scroll"><table><thead><tr><th>E-mail</th><th>Perfil</th><th>Desde</th><th></th></tr></thead><tbody>';
  (data||[]).forEach(p=>{
    const self = currentUser && p.id===currentUser.id;
    html += '<tr><td>'+esc(p.email||'—')+(self?' <span class="badge neutral">você</span>':'')+'</td><td>'+
      '<select class="role-sel field-select" data-id="'+p.id+'" '+(self?'disabled title="Você não pode alterar o próprio perfil"':'')+'>'+
      ['admin','editor','leitor'].map(r=>'<option value="'+r+'" '+(p.papel===r?'selected':'')+'>'+ROLE_LABEL[r]+'</option>').join('')+
      '</select></td><td class="cell-mono">'+fmtDate(p.created_at)+'</td>'+
      '<td><div class="cell-actions">'+(self?'':'<button class="btn btn-sm reset-btn" data-email="'+esc(p.email||'')+'" title="Envia um e-mail para a pessoa criar uma nova senha">Enviar link de senha</button>')+'</div></td></tr>';
  });
  html += '</tbody></table></div></div>';
  content.innerHTML = html;
  content.querySelectorAll('.reset-btn').forEach(btn=> btn.addEventListener('click', async ()=>{
    btn.disabled = true;
    const { error: err } = await supabaseClient.auth.resetPasswordForEmail(btn.dataset.email, { redirectTo: window.location.href.split('#')[0] });
    btn.disabled = false;
    if(err){ toast('Não foi possível enviar: '+err.message, true); return; }
    toast('Link de senha enviado para '+btn.dataset.email+'.');
  }));
  content.querySelectorAll('.role-sel').forEach(sel=> sel.addEventListener('change', async ()=>{
    const { data: upd, error: err } = await supabaseClient.from('perfis').update({papel: sel.value}).eq('id', sel.dataset.id).select('id');
    if(err || !upd || !upd.length){
      toast('Não foi possível alterar o perfil.'+(err?' ('+err.message+')':''), true);
      renderUsuarios();
      return;
    }
    toast('Perfil atualizado.');
  }));
}

function openConviteForm(){
  if(!isAdmin()) return;
  const root = document.getElementById('modalRoot');
  root.innerHTML = '<div class="modal-overlay" id="conviteOverlay"><div class="modal small">'+
    '<div class="modal-head"><h2>Adicionar usuário</h2><button class="icon-btn" id="conviteClose"><span class="icon">'+ic('close')+'</span></button></div>'+
    '<div class="modal-body"><div class="form-grid" style="grid-template-columns:1fr;">'+
      '<div class="form-field"><label for="conviteEmail">E-mail *</label><input type="email" id="conviteEmail" placeholder="nome@empresa.com" autocomplete="off"/></div>'+
      '<div class="form-field"><label for="convitePapel">Perfil</label><select id="convitePapel">'+
        ['leitor','editor','admin'].map(r=>'<option value="'+r+'">'+ROLE_LABEL[r]+'</option>').join('')+
      '</select></div>'+
      '<p class="perm-hint">A pessoa recebe um e-mail com um link para criar a própria senha. Leitor: só consulta · Editor: consulta, cadastra e edita · Administrador: tudo.</p>'+
    '</div></div>'+
    '<div class="modal-foot"><button class="btn" id="conviteCancel">Cancelar</button>'+
    '<button class="btn btn-primary" id="conviteSend"><span class="icon">'+ic('check')+'</span>Enviar convite</button></div>'+
    '</div></div>';
  const close = ()=>{ root.innerHTML=''; };
  document.getElementById('conviteClose').addEventListener('click', close);
  document.getElementById('conviteCancel').addEventListener('click', close);
  document.getElementById('conviteOverlay').addEventListener('click', e=>{ if(e.target.id==='conviteOverlay') close(); });
  document.getElementById('conviteEmail').focus();

  document.getElementById('conviteSend').addEventListener('click', async ()=>{
    const email = document.getElementById('conviteEmail').value.trim();
    const papel = document.getElementById('convitePapel').value;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ toast('Digite um e-mail válido.', true); return; }
    const btn = document.getElementById('conviteSend');
    btn.disabled = true;
    const { error } = await supabaseClient.functions.invoke('convidar-usuario', {
      body: { email, papel, redirectTo: window.location.href.split('#')[0] },
    });
    if(error){
      let msg = error.message;
      const status = error.context && error.context.status;
      const naoPublicada = 'a função "convidar-usuario" ainda não foi publicada no Supabase (veja o README).';
      if(status===404 || error.name==='FunctionsFetchError'){
        msg = naoPublicada;
      } else if(error.context && typeof error.context.json==='function'){
        try{ const j = await error.context.json(); if(j && j.erro) msg = j.erro; }catch(_){}
      }
      toast('Não foi possível adicionar: '+msg, true);
      btn.disabled = false;
      return;
    }
    close();
    toast('Convite enviado para '+email+'.');
    if(state.moduleKey==='usuarios') renderUsuarios();
  });
}

/* -------------------------- Administração: atividades -------------------------- */
const AT_PAGE = 100;
const ACAO_LABEL = {acessou:'Acessou', criou:'Cadastrou', editou:'Editou', excluiu:'Excluiu', restaurou:'Restaurou'};
const ACAO_TONE  = {acessou:'neutral', criou:'ok', editou:'warn', excluiu:'crit', restaurou:'ok'};
const atFiltro = {acao:'', tabela:'', usuario:''};
let atRows = [];
let atSeq = 0;

function atividadeDetalhe(r){
  const d = r.detalhes;
  if(!d) return '';
  const mod = MODULES[r.tabela];
  const rotulo = k => { const f = mod && mod.fields.find(x=>x.key===k); return f ? f.label : k; };
  const valor = v => (v==null || v==='') ? '(vazio)' : String(v);
  if(r.acao==='editou'){
    return Object.keys(d).map(k=> rotulo(k)+': '+valor(d[k] && d[k].de)+' → '+valor(d[k] && d[k].para)).join(' · ');
  }
  if(r.acao==='acessou') return 'Perfil: '+(ROLE_LABEL[d.perfil]||d.perfil||'—');
  if(d.unidade) return 'Unidade: '+unitLabel(d.unidade);
  return '';
}

function renderAtividades(){
  if(!isAdmin()) return;
  const content = document.getElementById('content');
  content.innerHTML = '<div class="lixeira-bar">'+
    '<select id="atAcao" class="field-select"><option value="">Todas as ações</option>'+
      Object.keys(ACAO_LABEL).map(k=> '<option value="'+k+'" '+(atFiltro.acao===k?'selected':'')+'>'+ACAO_LABEL[k]+'</option>').join('')+'</select>'+
    '<select id="atTabela" class="field-select"><option value="">Todos os módulos</option>'+
      MODULE_ORDER.map(k=> '<option value="'+k+'" '+(atFiltro.tabela===k?'selected':'')+'>'+esc(MODULES[k].label)+'</option>').join('')+'</select>'+
    '<input id="atUsuario" type="text" class="field-select" placeholder="Filtrar por e-mail…" value="'+esc(atFiltro.usuario)+'"/>'+
    '</div><div id="atTable"></div>';
  document.getElementById('atAcao').addEventListener('change', e=>{ atFiltro.acao = e.target.value; carregarAtividades(true); });
  document.getElementById('atTabela').addEventListener('change', e=>{ atFiltro.tabela = e.target.value; carregarAtividades(true); });
  let t = null;
  document.getElementById('atUsuario').addEventListener('input', e=>{
    atFiltro.usuario = e.target.value.trim();
    clearTimeout(t);
    t = setTimeout(()=> carregarAtividades(true), 350);
  });
  carregarAtividades(true);
}

async function carregarAtividades(reset){
  const box = document.getElementById('atTable');
  if(!box) return;
  const seq = ++atSeq;
  if(reset){ atRows = []; box.innerHTML = '<div class="table-wrap"><div class="table-empty">Carregando…</div></div>'; }
  const from = atRows.length;
  let q = supabaseClient.from('auditoria').select('*').order('em', {ascending:false}).range(from, from + AT_PAGE - 1);
  if(atFiltro.acao) q = q.eq('acao', atFiltro.acao);
  if(atFiltro.tabela) q = q.eq('tabela', atFiltro.tabela);
  if(atFiltro.usuario) q = q.ilike('usuario_email', '%'+atFiltro.usuario+'%');
  const { data, error } = await q;
  // descarta resposta antiga (filtro mudou no meio) ou de outra tela
  if(seq !== atSeq || state.moduleKey!=='atividades' || !document.getElementById('atTable')) return;
  if(error){
    box.innerHTML = '<div class="table-wrap"><div class="table-empty"><b>Não foi possível carregar o registro</b>'+esc(error.message)+
      (/auditoria/i.test(error.message)?'<br>Rode o schema.sql atualizado no Supabase.':'')+'</div></div>';
    return;
  }
  const page = data || [];
  atRows = atRows.concat(page);

  let html = '<div class="table-wrap">';
  if(atRows.length===0){
    html += '<div class="table-empty"><span class="icon">'+ic('historico')+'</span><b>Nenhuma atividade encontrada</b>'+
      ((atFiltro.acao||atFiltro.tabela||atFiltro.usuario)?'Ajuste os filtros.':'As ações feitas a partir de agora aparecem aqui.')+'</div>';
  } else {
    html += '<div class="result-count">'+atRows.length+' registro'+(atRows.length===1?'':'s')+' exibido'+(atRows.length===1?'':'s')+', do mais recente para o mais antigo</div>'+
      '<div class="table-scroll"><table><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Módulo</th><th>Item</th><th>Detalhes</th></tr></thead><tbody>';
    atRows.forEach(r=>{
      const mod = MODULES[r.tabela];
      const det = atividadeDetalhe(r);
      html += '<tr><td class="cell-mono" style="white-space:nowrap;">'+esc(new Date(r.em).toLocaleString('pt-BR'))+'</td>'+
        '<td>'+esc(r.usuario_email||'—')+'</td>'+
        '<td><span class="badge '+(ACAO_TONE[r.acao]||'neutral')+'">'+esc(ACAO_LABEL[r.acao]||r.acao)+'</span></td>'+
        '<td>'+esc(mod?mod.label:(r.tabela||'—'))+'</td>'+
        '<td>'+esc(r.rotulo||'—')+'</td>'+
        '<td class="at-detail" title="'+esc(det)+'">'+esc(det)+'</td></tr>';
    });
    html += '</tbody></table></div>';
    if(page.length===AT_PAGE) html += '<div style="padding:12px 14px;"><button class="btn" id="atMais">Carregar mais</button></div>';
  }
  html += '</div>';
  box.innerHTML = html;
  const more = document.getElementById('atMais');
  if(more) more.addEventListener('click', ()=>{ more.disabled = true; carregarAtividades(false); });
}

/* -------------------------- Administração: lixeira -------------------------- */
let lixeiraFiltro = '';
function lixeiraItemLabel(r){
  const d = r.dados || {};
  const mod = MODULES[r.tabela];
  const keys = mod ? mod.searchFields.concat(mod.columns) : Object.keys(d);
  for(const k of keys){ if(d[k] && typeof d[k]==='string') return d[k]; }
  return r.registro_id || '—';
}

async function renderLixeira(){
  if(!isAdmin()) return;
  const content = document.getElementById('content');
  content.innerHTML = '<div class="table-wrap"><div class="table-empty">Carregando…</div></div>';
  const { data, error } = await supabaseClient.from('lixeira').select('*')
    .is('restaurado_em', null).order('excluido_em', {ascending:false}).limit(500);
  if(state.moduleKey!=='lixeira') return;
  if(error){
    content.innerHTML = '<div class="table-wrap"><div class="table-empty"><b>Não foi possível carregar a lixeira</b>'+esc(error.message)+'</div></div>';
    return;
  }
  const all = data || [];
  const rows = lixeiraFiltro ? all.filter(r=> r.tabela===lixeiraFiltro) : all;

  let html = '<div class="lixeira-bar"><select id="lixeiraFiltroSel" class="field-select"><option value="">Todos os módulos</option>'+
    MODULE_ORDER.map(k=> '<option value="'+k+'" '+(lixeiraFiltro===k?'selected':'')+'>'+esc(MODULES[k].label)+'</option>').join('')+
    '</select><span class="result-count" style="padding:0;">'+rows.length+' item'+(rows.length===1?'':'ns')+' na lixeira</span></div>';
  html += '<div class="table-wrap">';
  if(rows.length===0){
    html += '<div class="table-empty"><span class="icon">'+ic('trash')+'</span><b>Lixeira vazia</b>Nada excluído'+(lixeiraFiltro?' neste módulo':'')+' para restaurar.</div>';
  } else {
    html += '<div class="table-scroll"><table><thead><tr><th>Módulo</th><th>Item</th><th>Unidade</th><th>Excluído por</th><th>Quando</th><th></th></tr></thead><tbody>';
    rows.forEach(r=>{
      const mod = MODULES[r.tabela];
      html += '<tr><td>'+esc(mod?mod.label:r.tabela)+'</td>'+
        '<td>'+esc(lixeiraItemLabel(r))+'</td>'+
        '<td>'+esc(unitLabel((r.dados||{}).unidade))+'</td>'+
        '<td>'+esc(r.excluido_por_email||'—')+'</td>'+
        '<td class="cell-mono">'+esc(new Date(r.excluido_em).toLocaleString('pt-BR'))+'</td>'+
        '<td><div class="cell-actions"><button class="btn btn-sm restore-btn" data-id="'+r.id+'"><span class="icon">'+ic('undo')+'</span>Restaurar</button></div></td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';
  content.innerHTML = html;

  document.getElementById('lixeiraFiltroSel').addEventListener('change', e=>{ lixeiraFiltro = e.target.value; renderLixeira(); });
  content.querySelectorAll('.restore-btn').forEach(btn=> btn.addEventListener('click', async ()=>{
    btn.disabled = true;
    const { error: err } = await supabaseClient.rpc('restaurar_da_lixeira', {p_id: btn.dataset.id});
    if(err){ toast('Não foi possível restaurar: '+err.message, true); btn.disabled = false; return; }
    toast('Item restaurado no módulo de origem.');
    renderLixeira();
  }));
}

/* -------------------------- Autenticação -------------------------- */
function showScreen(name){
  ['loadingScreen','configScreen','loginScreen','recoveryScreen','app'].forEach(id=>{
    document.getElementById(id).hidden = (id !== name);
  });
}

function wireLoginScreen(){
  const form = document.getElementById('loginForm');
  const errEl = document.getElementById('loginError');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    errEl.hidden = true;
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginSubmit');
    btn.disabled = true;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    if(error){
      errEl.textContent = error.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : error.message;
      errEl.hidden = false;
    }
  });
  document.getElementById('forgotLink').addEventListener('click', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    if(!email){ errEl.textContent = 'Digite seu e-mail acima e clique em "Esqueci minha senha" de novo.'; errEl.hidden=false; return; }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0] });
    errEl.hidden = false;
    errEl.className = error ? 'auth-error' : 'auth-info';
    errEl.textContent = error ? error.message : 'Se este e-mail tiver uma conta, enviamos um link de redefinição de senha.';
  });
}

function wireRecoveryScreen(){
  const form = document.getElementById('recoveryForm');
  const errEl = document.getElementById('recoveryError');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    errEl.hidden = true;
    const p1 = document.getElementById('recoveryPass1').value;
    const p2 = document.getElementById('recoveryPass2').value;
    if(p1.length < 8){ errEl.textContent='A senha precisa ter pelo menos 8 caracteres.'; errEl.hidden=false; return; }
    if(p1 !== p2){ errEl.textContent='As senhas não coincidem.'; errEl.hidden=false; return; }
    const btn = document.getElementById('recoverySubmit');
    btn.disabled = true;
    const { error } = await supabaseClient.auth.updateUser({ password: p1 });
    btn.disabled = false;
    if(error){ errEl.textContent = error.message; errEl.hidden = false; return; }
    toast('Senha definida com sucesso.');
  });
}

let appStartedFor = null;
async function startApp(user){
  // O Supabase reenvia o evento de login ao renovar a sessão / voltar para a aba;
  // nesses casos não reiniciamos a tela.
  if(appStartedFor === user.id){ currentUser = user; return; }
  appStartedFor = user.id;
  currentUser = user;
  currentRole = await loadMyRole(user.id);
  state.moduleKey = 'dashboard';
  showScreen('app');
  renderSidebar();
  renderTopbar();
  renderDashboard();
  // Registra o acesso sem esperar resposta (não atrasa a tela; se falhar, ignora).
  supabaseClient.rpc('registrar_acesso').then(()=>{}, ()=>{});
}

function resetSession(){
  appStartedFor = null;
  currentUser = null;
  currentRole = 'leitor';
  if(typeof state.unsub === 'function'){ state.unsub(); state.unsub = null; }
}

/* -------------------------- Boot -------------------------- */
(function boot(){
  if(configIsPlaceholder()){
    showScreen('configScreen');
    return;
  }
  initSupabase();
  wireLoginScreen();
  wireRecoveryScreen();

  supabaseClient.auth.onAuthStateChange((event, session)=>{
    if(event === 'PASSWORD_RECOVERY'){
      showScreen('recoveryScreen');
      return;
    }
    if(session && session.user){
      // setTimeout: o Supabase recomenda não fazer chamadas ao banco dentro do próprio callback.
      setTimeout(()=> startApp(session.user), 0);
    } else {
      resetSession();
      showScreen('loginScreen');
    }
  });
})();
