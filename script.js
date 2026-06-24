// ─── CONFIG ───────────────────────────────────────────────────────────────────
let sb = null;

function initClient(url, key) {
  sb = window.supabase.createClient(url, key);
}
let currentUser = null;
const TIPOS = [
  "Consulta","Avaliação","Manutenção","Encaixe",
  "Cirurgia","Endo",
  "Limpeza","Restauração","Extração","Canal","Outro"
];

const DURACAO_TIPO = {
  "Consulta":  30, "Avaliação": 30, "Manutenção": 30, "Encaixe": 30,
  "Cirurgia":  60, "Endo": 60,
};
const DURACAO_DEFAULT = 30;

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_PT  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const ESPECIALIDADES = ["Endodontia","Geral","Implantodontia","Ortodontia","Periodontia"];
const PAGE_META = {
  dashboard:{ title:"Painel Geral",  sub:"Resumo do dia" },
  agenda:   { title:"Agenda",        sub:"Gerencie consultas" },
  pacientes:{ title:"Pacientes",     sub:"Cadastro de pacientes" },
  dentistas:{ title:"Dentistas",     sub:"Equipe clínica" },
  usuarios: { title:"Usuários",      sub:"Controle de acesso" },
};

const $ = id => document.getElementById(id);
const fmtDate = d => d ? d.split("-").reverse().join("/") : "—";
const esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function badge(val) {
  const k = (val||"").toLowerCase().replace(/\s+/g,"");
  return `<span class="badge badge-${k}">${val}</span>`;
}

// ─── INIT ────────────────────────────────────────────────────────────────────

function abrirSidebar() {
  $("sb-av").textContent     = currentUser.nome[0];
  $("sb-nome").textContent   = currentUser.nome.split(" ")[0];
  $("sb-perfil").textContent = currentUser.perfil;
  $("tb-user").textContent   = currentUser.nome;
  const b = $("tb-badge"); b.textContent = currentUser.perfil; b.className = `badge badge-${currentUser.perfil.toLowerCase()}`;
  $("nav-usuarios").style.display = currentUser.perfil === "Administrador" ? "flex" : "none";
}

window.onload = () => {
  initClient("https://ytjjtzryuoomrmmsprrg.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0amp0enJ5dW9vbXJtbXNwcnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNjAyODAsImV4cCI6MjA5NzYzNjI4MH0._OTc9MPNb8QPra-MQyPl0W3l4GJUV1AodE5Bn37NZtA");
  const sessao = localStorage.getItem("oa_sessao");
  if (sessao) {
    try {
      currentUser = JSON.parse(sessao);
      abrirSidebar();
      showScreen("app");
      goTo("dashboard");
      return;
    } catch(e) { localStorage.removeItem("oa_sessao"); }
  }
  showScreen("login");
};

function showScreen(name) {
  ["setup","login","app"].forEach(s => {
    const el = $(`screen-${s}`);
    if (el) el.style.display = s === name ? "flex" : "none";
  });
}

// ─── SETUP ───────────────────────────────────────────────────────────────────

// ─── AUTH ────────────────────────────────────────────────────────────────────
async function doLogin() {
  const email = $("l-email").value.trim();
  const senha = $("l-senha").value;
  const errEl = $("l-err");
  errEl.classList.remove("show");

  if (!email || !senha) { errEl.textContent = "Preencha e-mail e senha."; errEl.classList.add("show"); return; }

  const btn = $("btn-login");
  btn.disabled = true; btn.textContent = "Entrando…";

  try {
    const { data, error } = await sb.from("usuarios").select("*").eq("email", email).maybeSingle();
    if (error || !data) { errEl.textContent = "E-mail ou senha incorretos."; errEl.classList.add("show"); return; }
    if (data.senha !== senha) { errEl.textContent = "E-mail ou senha incorretos."; errEl.classList.add("show"); return; }
    if (data.status !== "Ativo") { errEl.textContent = "Usuário inativo. Contate o administrador."; errEl.classList.add("show"); return; }
    currentUser = data;
    localStorage.setItem("oa_sessao", JSON.stringify(data));
    $("sb-av").textContent = data.nome[0];
    $("sb-nome").textContent   = data.nome.split(" ")[0];
    $("sb-perfil").textContent   = data.perfil;
    $("tb-user").textContent   = data.nome;
    const b = $("tb-badge"); b.textContent = data.perfil; b.className = `badge badge-${data.perfil.toLowerCase()}`;
    $("nav-usuarios").style.display = data.perfil === "Administrador" ? "flex" : "none";
    showScreen("app");
    goTo("dashboard");
  } catch (e) {
    errEl.textContent = "Erro de conexão. Tente novamente."; errEl.classList.add("show");
  } finally {
    btn.disabled = false; btn.textContent = "Entrar";
  }
}

function doLogout() {
  currentUser = null;
  localStorage.removeItem("oa_sessao");
  showScreen("login");
  $("l-senha").value = "";
  $("l-err").classList.remove("show");
}

$("l-senha")?.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

// ─── NAV ─────────────────────────────────────────────────────────────────────
function goTo(page) {
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  const meta = PAGE_META[page] || {};
  $("tb-titulo").textContent = meta.titulo || page;
  $("tb-sub").textContent   = meta.sub   || "";
  $("content").innerHTML    = "";
  const renders = { dashboard, agenda, pacientes, dentistas, usuarios, relatorios };
  if (renders[page]) renders[page]();
}

// ─── LOADING / TOAST ─────────────────────────────────────────────────────────
function pageLoading() {
  $("content").innerHTML = `<div id="page-loading" style="display:flex;"><div class="spinner"></div><span style="color:var(--ink60);font-size:13px;">Carregando…</span></div>`;
}

function toast(msg, type = "success") {
  const t = $("toast");
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  setTimeout(() => t.className = "toast", 3000);
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, onSave, saveLabel = "Salvar") {
  $("modal-titulo").textContent = title;
  $("modal-corpo").innerHTML    = bodyHTML;
  $("modal-footer").innerHTML  = `
    <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary"   onclick="modalSave()">${saveLabel}</button>`;
  $("overlay").classList.add("open");
  window._modalSave = onSave;
}

function closeModal() { $("overlay").classList.remove("open"); }
function handleOverlayClick(e) { if (e.target === $("overlay")) closeModal(); }
function modalSave() { if (window._modalSave) window._modalSave(); }

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

async function dashboard() {
  pageLoading();
  try {
    const hoje = new Date().toISOString().split("T")[0];
    const [{ data: agHoje }, { count: totalPac }, { data: dents }, { data: proximas }] = await Promise.all([
      sb.from("agendamentos").select("*").eq("data", hoje).order("hora"),
      sb.from("pacientes").select("*", { count:"exact", head:true }),
      sb.from("dentistas").select("*").order("nome"),
      sb.from("agendamentos").select("*").gt("data", hoje).order("data").order("hora").limit(5),
    ]);

    const conf = (agHoje||[]).filter(a => a.status === "Confirmado").length;
    const pend = (agHoje||[]).filter(a => a.status === "Agendado").length;

    $("content").innerHTML = `
      <div class="stats-row">
        <div class="stat-card" style="border-top:3px solid #1B6B77;"><div class="stat-num">${(agHoje||[]).length}</div><div class="stat-label">Consultas Hoje</div></div>
        <div class="stat-card" style="border-top:3px solid #2E9E6E;"><div class="stat-num">${conf}</div><div class="stat-label">Confirmadas</div></div>
        <div class="stat-card" style="border-top:3px solid #E8614A;"><div class="stat-num">${pend}</div><div class="stat-label">Pendentes</div></div>
        <div class="stat-card" style="border-top:3px solid #2A9BAB;"><div class="stat-num">${totalPac||0}</div><div class="stat-label">Pacientes Cadastrados</div></div>
      </div>
      <div class="table-wrap">
        <div class="table-header"><span class="table-title">Agenda de Hoje — ${fmtDate(hoje)}</span><span style="color:var(--ink60);font-size:12px;">${(agHoje||[]).length} consulta${(agHoje||[]).length!==1?"s":""}</span></div>
        <table><thead><tr><th>Horário</th><th>Paciente</th><th>Dentista</th><th>Tipo</th><th>Status</th></tr></thead>
        <tbody>${(agHoje||[]).length===0
          ? `<tr class="empty-row"><td colspan="5">Nenhuma consulta hoje.</td></tr>`
          : (agHoje||[]).map(a=>`<tr>
              <td><strong>${a.hora?.slice(0,5)||"—"}</strong></td>
              <td>${a.paciente_nome}</td><td>${a.dentista_nome}</td><td>${a.tipo}</td>
              <td>${badge(a.status)}</td>
            </tr>`).join("")}</tbody></table>
      </div>
      <div class="dash-grid">
        <div class="ficha-card">
          <div class="ficha-section-title">Dentistas Cadastrados</div>
          ${(dents||[]).map(d=>`
            <div class="dash-list-item">
              <div class="dash-av">${d.nome.replace(/^(Dr\.|Dra\.)\s*/i,"").split(" ").map(x=>x[0]).slice(0,2).join("")}</div>
              <div><div style="font-weight:600;font-size:13px;">${d.nome}</div><div style="font-size:11px;color:var(--ink60);">${(d.especialidades||[]).join(", ")}</div></div>
            </div>`).join("")}
        </div>
        <div class="ficha-card">
          <div class="ficha-section-title">Próximas Consultas</div>
          ${(proximas||[]).length===0
            ? `<div style="color:var(--ink60);font-size:13px;">Nenhuma consulta agendada.</div>`
            : (proximas||[]).map(a=>`
              <div class="dash-list-item" style="justify-content:space-between;">
                <div>
                  <div style="font-weight:600;font-size:13px;">${a.paciente_nome}</div>
                  <div style="font-size:11px;color:var(--ink60);">${fmtDate(a.data)} ${a.hora?.slice(0,5)||""} · ${a.dentista_nome}</div>
                </div>
                ${badge(a.status)}
              </div>`).join("")}
        </div>
      </div>`;
  } catch (e) {
    $("content").innerHTML = `<div style="color:var(--coral);padding:20px;">Erro ao carregar dados: ${e.message}</div>`;
  }
}

// ─── AGENDA ──────────────────────────────────────────────────────────────────
let agFiltros = { data:"", dataInicio:"", dataFim:"", dent:"", status:"", modo:"dia" };

// ─── CALENDÁRIO ──────────────────────────────────────────────────────────────
let calMes    = new Date().getMonth();
let calView   = 'month'; // month | week | day
let calAno    = new Date().getFullYear();
let calDiaSel = null;
let _diasEsp  = {};
let _agCount  = {};
let _dentsCache = [];

async function agenda() {
  pageLoading();
  try {
    const { data: dents } = await sb.from("dentistas").select("nome,especialidades").order("nome");
    _dentsCache = dents || [];
    await carregarMesCalendario();
    renderAgendaPage();
    await fetchAgenda();
  } catch(e) {
    $("content").innerHTML = `<div style="color:var(--coral);padding:20px;">Erro: ${e.message}</div>`;
  }
}

async function carregarMesCalendario() {
  const inicio = new Date(calAno, calMes, 1).toISOString().slice(0,10);
  const fim    = new Date(calAno, calMes+1, 0).toISOString().slice(0,10);
  const [{ data: dias }, { data: ags }] = await Promise.all([
    sb.from("dias_especiais").select("*").gte("data", inicio).lte("data", fim),
    sb.from("agendamentos").select("data").gte("data", inicio).lte("data", fim),
  ]);
  _diasEsp = {};
  (dias||[]).forEach(d => { _diasEsp[d.data] = d; });
  _agCount = {};
  (ags||[]).forEach(a => { _agCount[a.data] = (_agCount[a.data]||0) + 1; });
}

function setModoFiltro(modo) {
  agFiltros.modo = modo;
  // Reset filtros de data ao trocar modo
  agFiltros.data        = "";
  agFiltros.dataInicio  = "";
  agFiltros.dataFim     = "";
  calDiaSel = null;

  // Atualiza visual dos botões
  const btnDia    = $("btn-modo-dia");
  const btnPeriodo= $("btn-modo-periodo");
  if (btnDia) {
    btnDia.style.background    = modo === "dia"     ? "var(--teal700)" : "transparent";
    btnDia.style.color         = modo === "dia"     ? "white"          : "var(--ink60)";
    btnPeriodo.style.background= modo === "periodo" ? "var(--teal700)" : "transparent";
    btnPeriodo.style.color     = modo === "periodo" ? "white"          : "var(--ink60)";
  }

  // Mostra/esconde campos de filtro
  const filtroDia     = $("filtro-dia");
  const filtroPeriodo = $("filtro-periodo");
  if (filtroDia)     filtroDia.style.display     = modo === "dia"     ? "flex" : "none";
  if (filtroPeriodo) filtroPeriodo.style.display  = modo === "periodo" ? "flex" : "none";

  renderCalendarioEl();
  fetchAgenda();
}

function limparFiltros() {
  agFiltros = { data:"", dataInicio:"", dataFim:"", dent:"", status:"", modo: agFiltros.modo };
  calDiaSel = null;
  const fData = $("f-data"); if (fData) fData.value = "";
  const fIni  = $("f-inicio"); if (fIni) fIni.value = "";
  const fFim  = $("f-fim");   if (fFim) fFim.value = "";
  const fDent = $("f-dent");  if (fDent) fDent.value = "";
  const fStat = $("f-status");if (fStat) fStat.value = "";
  renderCalendarioEl();
  fetchAgenda();
}

function renderAgendaPage() {
  const podeAcao = ["Administrador","Atendente","Dentista"].includes(currentUser.perfil);
  $("content").innerHTML = `
    <div id="cal-wrap"></div>
    <div style="background:white;border:1px solid var(--ink30);border-radius:12px;padding:14px 16px;margin-top:12px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">

        <!-- Toggle modo filtro -->
        <div style="display:flex;background:var(--ink10);border-radius:8px;padding:3px;gap:2px;">
          <button id="btn-modo-dia"
            onclick="setModoFiltro('dia')"
            style="border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;background:${agFiltros.modo==='dia'?'var(--teal700)':'transparent'};color:${agFiltros.modo==='dia'?'white':'var(--ink60)'};">
            📅 Dia
          </button>
          <button id="btn-modo-periodo"
            onclick="setModoFiltro('periodo')"
            style="border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;background:${agFiltros.modo==='periodo'?'var(--teal700)':'transparent'};color:${agFiltros.modo==='periodo'?'white':'var(--ink60)'};">
            📆 Período
          </button>
        </div>

        <!-- Filtro por dia -->
        <div id="filtro-dia" style="display:${agFiltros.modo==='dia'?'flex':'none'};align-items:center;gap:8px;">
          <input type="date" id="f-data" value="${agFiltros.data}"
            onchange="agFiltros.data=this.value;calDiaSel=this.value;renderCalendarioEl();fetchAgenda()"
            style="width:160px;"/>
        </div>

        <!-- Filtro por período -->
        <div id="filtro-periodo" style="display:${agFiltros.modo==='periodo'?'flex':'none'};align-items:center;gap:8px;">
          <input type="date" id="f-inicio" value="${agFiltros.dataInicio}"
            onchange="agFiltros.dataInicio=this.value;fetchAgenda()"
            style="width:150px;"/>
          <span style="color:var(--ink60);font-size:13px;font-weight:600;">até</span>
          <input type="date" id="f-fim" value="${agFiltros.dataFim}"
            onchange="agFiltros.dataFim=this.value;fetchAgenda()"
            style="width:150px;"/>
        </div>

        <!-- Dentista e Status -->
        <select id="f-dent" onchange="agFiltros.dent=this.value;fetchAgenda()">
          <option value="">Todos os dentistas</option>
          ${_dentsCache.map(d=>`<option value="${esc(d.nome)}" ${agFiltros.dent===d.nome?"selected":""}>${esc(d.nome)}</option>`).join("")}
        </select>
        <select id="f-status" onchange="agFiltros.status=this.value;fetchAgenda()">
          <option value="">Todos os status</option>
          <option value="Agendado"       ${agFiltros.status==="Agendado"?"selected":""}>Agendado</option>
          <option value="Confirmado"     ${agFiltros.status==="Confirmado"?"selected":""}>Confirmado</option>
          <option value="Em Atendimento" ${agFiltros.status==="Em Atendimento"?"selected":""}>Em Atendimento</option>
          <option value="Concluído"      ${agFiltros.status==="Concluído"?"selected":""}>Concluído</option>
          <option value="Falta"          ${agFiltros.status==="Falta"?"selected":""}>Falta</option>
          <option value="Cancelado"      ${agFiltros.status==="Cancelado"?"selected":""}>Cancelado</option>
        </select>

        <button class="btn btn-secondary" style="font-size:12px;padding:7px 12px;"
          onclick="limparFiltros()">Limpar</button>

        <div style="margin-left:auto;">
          <button class="btn btn-primary" onclick="novoAgendamento(calDiaSel)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Novo Agendamento
          </button>
        </div>
      </div>
    </div>
    <div class="table-wrap"><div class="table-header"><span class="table-title">Agendamentos</span><span class="table-count" id="ag-count"></span></div><div id="agenda-table-body"></div></div>
  `;
  renderCalendarioEl();
}

function renderCalendarioEl() {
  const wrap = $("cal-wrap");
  if (!wrap) return;
  if (calView === 'week') { renderCalendarioSemanal(); return; }
  if (calView === 'day')  { renderCalendarioDiario();  return; }

  const hoje  = new Date().toISOString().slice(0,10);
  const primeiro = new Date(calAno, calMes, 1);
  const ultimoDia = new Date(calAno, calMes+1, 0).getDate();
  const inicioSemana = primeiro.getDay();

  let cells = "";
  // Células vazias antes do dia 1
  for (let i = 0; i < inicioSemana; i++) cells += `<div></div>`;

  for (let d = 1; d <= ultimoDia; d++) {
    const dataStr = `${calAno}-${String(calMes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const isHoje    = dataStr === hoje;
    const isSel     = dataStr === calDiaSel;
    const isTriage  = _diasEsp[dataStr]?.is_triagem;
    const qtd       = _agCount[dataStr] || 0;

    let bg = "white";
    let border = "1px solid var(--ink30)";
    let color = "var(--ink)";

    if (isTriage)    { bg = "#FEE2E2"; border = "1.5px solid #DC2626"; }
    if (isHoje)      { border = "2px solid var(--teal700)"; }
    if (isSel)       { bg = isTriage ? "#FCA5A5" : "var(--teal100)"; border = "2px solid var(--teal700)"; }

    cells += `
      <div style="border-radius:10px;border:${border};background:${bg};padding:6px;cursor:pointer;min-height:64px;position:relative;transition:all .15s;"
           onclick="selecionarDia('${dataStr}')"
           onmouseover="this.querySelector('.triagem-check').style.display='block'"
           onmouseout="this.querySelector('.triagem-check').style.display='none'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <span style="font-weight:${isHoje?"800":"600"};font-size:14px;color:${isTriage?"#DC2626":color};">${d}</span>
          ${qtd > 0 ? `<span style="background:var(--teal700);color:white;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700;">${qtd}</span>` : ""}
        </div>
        ${isTriage ? `<div style="font-size:9px;color:#DC2626;font-weight:700;margin-top:2px;">🔴 TRIAGEM</div>` : ""}
        <div class="triagem-check" style="display:none;position:absolute;bottom:4px;left:4px;right:4px;">
          <label style="font-size:9px;color:${isTriage?"#DC2626":"var(--ink60)"};display:flex;align-items:center;gap:3px;cursor:pointer;" onclick="event.stopPropagation()">
            <input type="checkbox" ${isTriage?"checked":""} onchange="toggleTriagem('${dataStr}',this.checked)" style="width:12px;height:12px;"/>
            Triagem
          </label>
        </div>
      </div>`;
  }

  wrap.innerHTML = `
    <div style="background:white;border:1px solid var(--ink30);border-radius:12px;padding:16px;margin-bottom:4px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:10px;">
        <button class="btn btn-secondary" style="padding:5px 12px;font-size:13px;" onclick="navCal(-1)">‹</button>
        <div style="font-weight:700;font-size:16px;" id="cal-titulo">${MESES_PT[calMes]} ${calAno}</div>
        <button class="btn btn-secondary" style="padding:5px 12px;font-size:13px;" onclick="navCal(1)">›</button>
        <div style="margin-left:auto;display:flex;background:var(--ink10);border-radius:8px;padding:3px;gap:2px;">
          <button onclick="setCalView('month')" id="btn-view-month"
            style="border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;background:${calView==='month'?'var(--teal700)':'transparent'};color:${calView==='month'?'white':'var(--ink60)'};">
            Mês
          </button>
          <button onclick="setCalView('week')" id="btn-view-week"
            style="border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;background:${calView==='week'?'var(--teal700)':'transparent'};color:${calView==='week'?'white':'var(--ink60)'};">
            Semana
          </button>
          <button onclick="setCalView('day')" id="btn-view-day"
            style="border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;background:${calView==='day'?'var(--teal700)':'transparent'};color:${calView==='day'?'white':'var(--ink60)'};">
            Dia
          </button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">
        ${DIAS_PT.map(d=>`<div style="text-align:center;font-size:11px;font-weight:700;color:var(--ink60);padding:4px;">${d}</div>`).join("")}
        ${cells}
      </div>
      <div style="display:flex;gap:14px;margin-top:10px;padding-top:10px;border-top:1px solid var(--ink10);flex-wrap:wrap;">
        <span style="font-size:11px;color:var(--ink60);display:flex;align-items:center;gap:5px;"><span style="width:12px;height:12px;border-radius:3px;background:var(--teal100);border:1px solid var(--teal700);display:inline-block;"></span>Dia selecionado</span>
        <span style="font-size:11px;color:var(--ink60);display:flex;align-items:center;gap:5px;"><span style="width:12px;height:12px;border-radius:3px;background:#FEE2E2;border:1px solid #DC2626;display:inline-block;"></span>Dia de Triagem</span>
        <span style="font-size:11px;color:var(--ink60);display:flex;align-items:center;gap:5px;"><span style="width:12px;height:12px;border-radius:3px;background:var(--teal700);display:inline-block;"></span>Qtd. de consultas</span>
        <span style="font-size:11px;color:var(--ink60);">💡 Passe o mouse sobre o dia para marcar Triagem</span>
      </div>
    </div>`;
}

async function selecionarDia(data) {
  // Muda para modo "dia" e aplica o filtro
  agFiltros.modo       = "dia";
  agFiltros.data       = data;
  agFiltros.dataInicio = "";
  agFiltros.dataFim    = "";
  calDiaSel = data;

  // Atualiza input se estiver visível
  const fData = $("f-data");
  if (fData) fData.value = data;

  // Garante que a seção correta está visível
  const filtroDia     = $("filtro-dia");
  const filtroPeriodo = $("filtro-periodo");
  if (filtroDia)     filtroDia.style.display     = "flex";
  if (filtroPeriodo) filtroPeriodo.style.display  = "none";

  renderCalendarioEl();
  await fetchAgenda();
}

async function navCal(dir) {
  if (calView === 'month') {
    calMes += dir;
    if (calMes > 11) { calMes = 0; calAno++; }
    if (calMes < 0)  { calMes = 11; calAno--; }
    await carregarMesCalendario();
  } else if (calView === 'week') {
    calDiaSel = calDiaSel || new Date().toISOString().slice(0,10);
    const d = new Date(calDiaSel + 'T12:00:00');
    d.setDate(d.getDate() + dir * 7);
    calDiaSel = d.toISOString().slice(0,10);
    calMes = d.getMonth(); calAno = d.getFullYear();
    await carregarMesCalendario();
  } else if (calView === 'day') {
    calDiaSel = calDiaSel || new Date().toISOString().slice(0,10);
    const d = new Date(calDiaSel + 'T12:00:00');
    d.setDate(d.getDate() + dir);
    calDiaSel = d.toISOString().slice(0,10);
    agFiltros.data = calDiaSel;
  }
  renderCalendarioEl();
  await fetchAgenda();
}

async function setCalView(view) {
  calView = view;
  if (view === 'day' && !calDiaSel) calDiaSel = new Date().toISOString().slice(0,10);
  if (view !== 'day') agFiltros.data = '';
  else { agFiltros.data = calDiaSel; }
  await carregarMesCalendario();
  renderCalendarioEl();
  await fetchAgenda();
}

async function toggleTriagem(data, checked) {
  const atual = _diasEsp[data];
  if (checked) {
    if (atual) {
      await sb.from("dias_especiais").update({ is_triagem: true }).eq("id", atual.id);
      _diasEsp[data] = { ..._diasEsp[data], is_triagem: true };
    } else {
      const { data: novo } = await sb.from("dias_especiais").insert({ data, is_triagem: true, triagem_config: {} }).select().single();
      if (novo) _diasEsp[data] = novo;
    }
    _agCount[data] = _agCount[data] || 0;
    renderCalendarioEl();
    abrirModalTriagem(data);
  } else {
    if (atual) {
      await sb.from("dias_especiais").update({ is_triagem: false, triagem_config: {} }).eq("id", atual.id);
      _diasEsp[data] = { ..._diasEsp[data], is_triagem: false };
    }
    renderCalendarioEl();
    toast("Triagem removida.", "ok");
  }
}

function abrirModalTriagem(data) {
  const atual = _diasEsp[data];
  const cfg   = atual?.triagem_config || {};

  // Especialidades fixas da clínica
  const esps = ["Manutenção", "Cirurgia", "Endo", "Consulta", "Avaliação", "Encaixe"];

  openModal(`🔴 Triagem — ${fmtDate(data)}`, `
    <p style="color:var(--ink60);font-size:13px;margin-bottom:16px;">
      Selecione qual dentista ficará responsável por cada especialidade neste dia de triagem.
    </p>
    ${esps.map(esp => `
      <div class="form-group">
        <label>${esc(esp)}</label>
        <select id="triagem-${esp.replace(/[^a-zA-Z0-9]/g,'_')}">
          <option value="">— Nenhum —</option>
          ${_dentsCache.map(d => `
            <option value="${esc(d.nome)}" ${cfg[esp] === d.nome ? "selected" : ""}>
              ${esc(d.nome)}
            </option>`).join("")}
        </select>
      </div>`).join("")}
    <div class="info-box" style="margin-top:8px;">
      Clique em Salvar para confirmar a configuração de triagem.
    </div>
  `, async () => {
    const novoCfg = {};
    esps.forEach(esp => {
      const sel = document.getElementById(`triagem-${esp.replace(/[^a-zA-Z0-9]/g,'_')}`);
      if (sel?.value) novoCfg[esp] = sel.value;
    });

    const atual2 = _diasEsp[data];
    if (atual2?.id) {
      await sb.from("dias_especiais").update({ triagem_config: novoCfg }).eq("id", atual2.id);
      _diasEsp[data] = { ..._diasEsp[data], triagem_config: novoCfg };
    }
    toast("Triagem configurada!", "ok");
    closeModal();
    renderCalendarioEl();
  }, "Salvar Triagem");
}

// ─── VISÃO SEMANAL ────────────────────────────────────────────────────────────
async function renderCalendarioSemanal() {
  const wrap = $("cal-wrap");
  if (!wrap) return;

  const base = calDiaSel ? new Date(calDiaSel + 'T12:00:00') : new Date();
  const dow  = base.getDay();
  const inicio = new Date(base); inicio.setDate(base.getDate() - dow);
  const hoje = new Date().toISOString().slice(0,10);

  // Monta os 7 dias da semana
  const dias = Array.from({length:7}, (_,i) => {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i);
    return d.toISOString().slice(0,10);
  });

  // Carrega agendamentos da semana
  const { data: ags } = await sb.from("agendamentos").select("*")
    .gte("data", dias[0]).lte("data", dias[6]).order("hora");

  const agPorDia = {};
  dias.forEach(d => agPorDia[d] = []);
  (ags||[]).forEach(a => { if (agPorDia[a.data]) agPorDia[a.data].push(a); });

  const titulo = `${DIAS_PT[0]} ${fmtDate(dias[0])} — ${DIAS_PT[6]} ${fmtDate(dias[6])}`;
  const tituloEl = $("cal-titulo"); if (tituloEl) tituloEl.textContent = titulo;

  wrap.innerHTML = `
    <div style="background:white;border:1px solid var(--ink30);border-radius:12px;overflow:hidden;margin-bottom:4px;">
      ${/* Header nav já existe no renderCalendarioEl */ ''}
      <div style="display:grid;grid-template-columns:repeat(7,1fr);border-top:1px solid var(--ink10);">
        ${dias.map((data, i) => {
          const isHoje = data === hoje;
          const isSel  = data === calDiaSel;
          const isTriage = _diasEsp[data]?.is_triagem;
          const ags_dia = agPorDia[data] || [];
          return `
            <div style="border-right:1px solid var(--ink10);${i===6?'border-right:none;':''}min-height:180px;">
              <div onclick="selecionarDiaView('${data}')"
                style="padding:8px;text-align:center;cursor:pointer;border-bottom:1px solid var(--ink10);
                  background:${isHoje?'var(--teal700)':isTriage?'#FEE2E2':isSel?'var(--teal50)':'var(--ink10)'};
                  color:${isHoje?'white':isTriage?'#DC2626':'var(--ink)'};">
                <div style="font-size:10px;font-weight:600;opacity:.7;">${DIAS_PT[i]}</div>
                <div style="font-size:16px;font-weight:700;">${parseInt(data.slice(8))}</div>
                ${isTriage?'<div style="font-size:9px;font-weight:700;">🔴 TRIAGEM</div>':''}
              </div>
              <div style="padding:4px;">
                ${ags_dia.length === 0
                  ? `<div style="padding:8px 4px;color:var(--ink30);font-size:11px;text-align:center;">—</div>`
                  : ags_dia.map(a => `
                    <div onclick="verDetalhesAg('${a.id}')"
                      style="margin-bottom:3px;padding:4px 6px;border-radius:6px;border-left:3px solid ${statusCor(a.status)};
                        background:${statusBg(a.status)};cursor:pointer;font-size:11px;"
                      title="${esc(a.paciente_nome)} — ${esc(a.tipo)}">
                      <div style="font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(a.hora||'').slice(0,5)} ${esc(a.paciente_nome)}</div>
                      <div style="color:var(--ink60);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(a.tipo)} · ${esc(a.dentista_nome)}</div>
                    </div>`).join('')}
                <div onclick="novoAgendamento('${data}')"
                  style="margin-top:4px;padding:3px;text-align:center;color:var(--teal700);font-size:11px;font-weight:600;cursor:pointer;border:1px dashed var(--teal200);border-radius:5px;">
                  + Agendar
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ─── VISÃO DIÁRIA ─────────────────────────────────────────────────────────────
async function renderCalendarioDiario() {
  const wrap = $("cal-wrap");
  if (!wrap) return;

  const data = calDiaSel || new Date().toISOString().slice(0,10);
  const { data: ags } = await sb.from("agendamentos").select("*").eq("data", data).order("hora");

  const titulo = `${DIAS_PT[new Date(data+'T12:00:00').getDay()]} — ${fmtDate(data)}`;
  const tituloEl = $("cal-titulo"); if (tituloEl) tituloEl.textContent = titulo;

  const isTriage = _diasEsp[data]?.is_triagem;
  const cfg      = _diasEsp[data]?.triagem_config || {};

  // Slots de 30 min das 07:00 às 18:00
  const slots = [];
  for (let h = 7; h < 18; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`);
    slots.push(`${String(h).padStart(2,'0')}:30`);
  }

  const agPorHora = {};
  (ags||[]).forEach(a => {
    const h = (a.hora||'').slice(0,5);
    if (!agPorHora[h]) agPorHora[h] = [];
    agPorHora[h].push(a);
  });

  wrap.innerHTML = `
    <div style="background:white;border:1px solid var(--ink30);border-radius:12px;overflow:hidden;margin-bottom:4px;">
      ${isTriage ? `
        <div style="background:#FEE2E2;border-bottom:1px solid #FECACA;padding:8px 16px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:13px;font-weight:700;color:#DC2626;">🔴 DIA DE TRIAGEM</span>
          ${Object.entries(cfg).map(([esp,dent]) => `
            <span style="background:#DC2626;color:white;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;">${esc(esp)}: ${esc(dent)}</span>
          `).join('')}
        </div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--ink10);">
        <div style="font-size:14px;font-weight:700;">${(ags||[]).length} consulta${(ags||[]).length!==1?'s':''} agendada${(ags||[]).length!==1?'s':''}</div>
        <button class="btn btn-primary" style="padding:6px 12px;font-size:12px;" onclick="novoAgendamento('${data}')">+ Agendar</button>
      </div>
      <div style="max-height:400px;overflow-y:auto;">
        ${slots.map(slot => {
          const ags_slot = agPorHora[slot] || [];
          const isHalf   = slot.endsWith(':30');
          return `
            <div style="display:flex;border-bottom:1px solid ${isHalf?'var(--ink10)':'var(--ink30)'};min-height:${ags_slot.length > 0 ? 'auto' : '36px'};">
              <div style="width:52px;padding:6px 8px;color:var(--ink60);font-size:11px;font-weight:${isHalf?'400':'600'};border-right:1px solid var(--ink10);flex-shrink:0;text-align:right;">${slot}</div>
              <div style="flex:1;padding:3px 8px;">
                ${ags_slot.length === 0 ? '' : ags_slot.map(a => `
                  <div onclick="verDetalhesAg('${a.id}')"
                    style="margin:2px 0;padding:6px 10px;border-radius:8px;border-left:4px solid ${statusCor(a.status)};background:${statusBg(a.status)};cursor:pointer;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                      <div>
                        <span style="font-weight:700;font-size:13px;">${esc(a.paciente_nome)}</span>
                        <span style="color:var(--ink60);font-size:12px;margin-left:8px;">${esc(a.tipo)}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:6px;">
                        <span style="color:var(--ink60);font-size:11px;">${esc(a.dentista_nome)}</span>
                        ${badge(a.status)}
                      </div>
                    </div>
                    ${a.observacao_consulta ? `<div style="font-size:11px;color:var(--ink60);margin-top:3px;">${esc(a.observacao_consulta)}</div>` : ''}
                  </div>`).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ── Helpers de cor por status ──────────────────────────────────────────────────
function statusCor(s) {
  const m = { "Agendado":"#4F46E5","Confirmado":"#2E9E6E","Em Atendimento":"#C2570B","Concluído":"#2E9E6E","Falta":"#E8614A","Cancelado":"#6B7A8D" };
  return m[s] || "#6B7A8D";
}
function statusBg(s) {
  const m = { "Agendado":"#EEF2FF","Confirmado":"#EDF7F3","Em Atendimento":"#FFF7ED","Concluído":"#EDF7F3","Falta":"#FDF1EF","Cancelado":"#F4F6F8" };
  return m[s] || "#F4F6F8";
}

function selecionarDiaView(data) {
  calDiaSel = data; calView = 'day';
  agFiltros.data = data;
  renderCalendarioEl();
  fetchAgenda();
}

async function verDetalhesAg(id) {
  const { data: a } = await sb.from("agendamentos").select("*").eq("id",id).single();
  if (!a) return;
  openModal(`📋 ${a.paciente_nome}`, `
    <div class="ficha-grid" style="margin-bottom:12px;">
      <div><div class="ficha-label">Data</div><div class="ficha-value">${fmtDate(a.data)} ${(a.hora||'').slice(0,5)}</div></div>
      <div><div class="ficha-label">Status</div><div class="ficha-value">${badge(a.status)}</div></div>
      <div><div class="ficha-label">Dentista</div><div class="ficha-value">${esc(a.dentista_nome)}</div></div>
      <div><div class="ficha-label">Tipo</div><div class="ficha-value">${esc(a.tipo)}</div></div>
      ${a.procedimento_realizado ? `<div style="grid-column:1/-1;"><div class="ficha-label">Procedimento</div><div class="ficha-value">${esc(a.procedimento_realizado)}</div></div>` : ''}
      ${a.observacao_consulta    ? `<div style="grid-column:1/-1;"><div class="ficha-label">Observações</div><div class="ficha-value">${esc(a.observacao_consulta)}</div></div>` : ''}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn-sm" onclick="closeModal();verProntuarioConsulta('${id}')">📋 Prontuário</button>
      ${currentUser.perfil!=='Atendente'?`<button class="btn-sm" onclick="closeModal();editarAgendamento('${id}')">Editar</button>`:''}
      <button class="btn-sm" onclick="closeModal();toggleAgStatus('${id}','${a.status}')">
        ${a.status==='Agendado'?'✓ Confirmar':a.status==='Confirmado'?'▶ Iniciar':a.status==='Em Atendimento'?'✔ Concluir':'↺ Reabrir'}
      </button>
      ${(a.status==='Agendado'||a.status==='Confirmado')?`
        <button class="btn-sm" style="background:#FFF7ED;color:#C2570B;" onclick="closeModal();marcarStatus('${id}','Falta')">Falta</button>
        <button class="btn-sm" style="background:var(--coralBg);color:var(--coral);" onclick="closeModal();marcarStatus('${id}','Cancelado')">Cancelar</button>
      `:''}
    </div>
  `, () => {}, "Fechar");
}

async function fetchAgenda() {
  const body = $("agenda-table-body");
  if (!body) return;
  body.innerHTML = `<div style="padding:24px;text-align:center;"><div class="spinner" style="margin:auto;"></div></div>`;

  let q = sb.from("agendamentos").select("*").order("data").order("hora");
  if (agFiltros.data)   q = q.eq("data", agFiltros.data);
  if (agFiltros.dent)   q = q.eq("dentista_nome", agFiltros.dent);
  if (agFiltros.status) q = q.eq("status", agFiltros.status);

  const { data, error } = await q;
  if (error) { body.innerHTML = `<div style="padding:20px;color:var(--coral);">${error.message}</div>`; return; }

  const isDentista = currentUser.perfil === "Dentista";
  $("ag-count").textContent = `${data.length} registro${data.length!==1?"s":""}`;
  body.innerHTML = `
    <table><thead><tr><th>Data/Hora</th><th>Paciente</th><th>Dentista</th><th>Tipo</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>
    ${data.length===0
      ? `<tr class="empty-row"><td colspan="6">Nenhum agendamento encontrado.</td></tr>`
      : data.map(a=>`<tr>
          <td><strong>${fmtDate(a.data)}</strong> ${a.hora?.slice(0,5)||""}</td>
          <td>${a.paciente_nome}</td><td>${a.dentista_nome}</td><td>${a.tipo}</td>
          <td>${badge(a.status)}</td>
          <td>${!isDentista?`<button class="btn-sm" onclick="toggleAgStatus('${a.id}','${a.status}')">${a.status==="Agendado"?"Confirmar":"Reabrir"}</button>`:"—"}</td>
        </tr>`).join("")}
    </tbody></table>`;
}

async function toggleAgStatus(id, current) {
  const novoStatus = current === "Agendado" ? "Confirmado" : "Agendado";
  const { error } = await sb.from("agendamentos").update({ status: novoStatus }).eq("id", id);
  if (error) { toast("Erro ao atualizar status.", "error"); return; }
  toast(`Status → ${novoStatus}`, "success");
  await fetchAgenda();
}

async function novoAgendamento(dataPre) {
  const { data: dents } = await sb.from("dentistas").select("id,nome").order("nome");

  openModal("Novo Agendamento", `
    <!-- ── BUSCA DE PACIENTE ── -->
    <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--ink10);">
      <label style="display:block;font-size:11px;font-weight:600;color:var(--ink60);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">Paciente *</label>

      <div style="position:relative;">
        <input type="text" id="ag-pac-search" placeholder="🔍 Buscar por nome, CPF, PREC-CP ou matrícula…"
          oninput="buscarPacienteAg(this.value)"
          autocomplete="off"
          style="width:100%;border:1.5px solid var(--teal500);border-radius:8px;padding:9px 12px;font-size:13px;"/>
        <div id="ag-pac-results" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--ink30);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:200;max-height:200px;overflow-y:auto;margin-top:4px;"></div>
      </div>

      <!-- Info do paciente selecionado -->
      <div id="ag-pac-info" style="display:none;margin-top:8px;background:var(--teal50);border-radius:8px;padding:10px 14px;font-size:13px;">
        <div style="font-weight:700;color:var(--ink);" id="ag-pac-nome-show"></div>
        <div style="color:var(--ink60);margin-top:3px;display:flex;gap:16px;flex-wrap:wrap;" id="ag-pac-detalhes"></div>
        <button onclick="limparPacienteAg()" style="background:none;border:none;color:var(--coral);font-size:11px;cursor:pointer;margin-top:4px;">✕ Trocar paciente</button>
      </div>

      <!-- Cadastrar novo -->
      <div style="margin-top:8px;">
        <button type="button" onclick="toggleNovoPacAg()"
          style="background:none;border:none;color:var(--teal700);font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;">
          + Paciente não cadastrado? Cadastrar agora
        </button>
      </div>

      <!-- Form novo paciente inline -->
      <div id="novo-pac-ag" style="display:none;margin-top:12px;background:var(--ink10);border-radius:10px;padding:14px;">
        <div style="font-size:12px;font-weight:700;color:var(--ink60);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Novo Paciente</div>
        <div class="form-group"><label>Grupo *</label>
          <select id="np-grupo" onchange="onGrupoChangeAg()">
            <option value="">Selecione…</option>
            <option value="PASS">PASS</option>
            <option value="Ex-Combatente">Ex-Combatente</option>
            <option value="FUSEx">FUSEx</option>
            <option value="Fator Custo">Fator Custo</option>
          </select>
        </div>
        <div class="form-group"><label>Nome Completo *</label><input type="text" id="np-nome" placeholder="Nome completo"/></div>
        <div class="form-row">
          <div class="form-group" id="np-wrap-cpf"><label id="np-lbl-cpf">CPF</label><input type="text" id="np-cpf" placeholder="000.000.000-00"/></div>
          <div class="form-group" id="np-wrap-prec" style="display:none;"><label>PREC-CP *</label><input type="text" id="np-prec"/></div>
          <div class="form-group" id="np-wrap-mat"  style="display:none;"><label>Matrícula *</label><input type="text" id="np-mat"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Telefone</label><input type="text" id="np-tel" placeholder="(00) 00000-0000"/></div>
          <div class="form-group"><label>Nascimento</label><input type="date" id="np-nasc"/></div>
        </div>
      </div>
    </div>

    <input type="hidden" id="ag-pac-id" value=""/>
    <div class="form-group"><label>Dentista *</label>
      <select id="ag-dent">
        <option value="">Selecione o dentista</option>
        ${(dents||[]).map(d=>`<option value="${d.id}|${esc(d.nome)}">${esc(d.nome)}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label>Tipo de Atendimento</label>
      <select id="ag-tipo" onchange="updateDuracao()">
        ${TIPOS.map(t=>`<option>${t}</option>`).join("")}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Data *</label><input type="date" id="ag-data" value="${dataPre||""}"/></div>
      <div class="form-group"><label>Horário *</label><input type="time" id="ag-hora"/></div>
    </div>
    <div class="form-group">
      <label>Duração estimada</label>
      <div id="ag-dur-info" style="background:var(--teal50);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--teal700);font-weight:600;">⏱ 30 minutos</div>
    </div>
    <div class="form-group"><label>Status</label>
      <select id="ag-status"><option>Agendado</option><option>Confirmado</option><option>Cancelado</option></select>
    </div>
  `, async () => {
    // ── Verifica se tem paciente selecionado ou vai cadastrar novo ──
    let pacId   = $("ag-pac-id").value;
    let pacNome = $("ag-pac-nome-show")?.textContent || "";

    const novoPacVis = $("novo-pac-ag")?.style.display !== "none";

    if (!pacId && novoPacVis) {
      // Cadastra novo paciente primeiro
      const grupo = $("np-grupo").value;
      const nome  = $("np-nome").value.trim();
      const cpf   = $("np-cpf").value.trim();
      const prec  = ($("np-prec")||{}).value||"";
      const mat   = ($("np-mat")||{}).value||"";

      if (!grupo) { toast("Selecione o grupo do paciente.","error"); return; }
      if (!nome)  { toast("Nome do paciente é obrigatório.","error"); return; }
      if (grupo==="Fator Custo"&&!cpf)                           { toast("CPF obrigatório para Fator Custo.","error"); return; }
      if ((grupo==="Ex-Combatente"||grupo==="FUSEx")&&!prec)     { toast("PREC-CP obrigatório.","error"); return; }
      if (grupo==="PASS"&&!mat)                                  { toast("Matrícula obrigatória para PASS.","error"); return; }

      const { data: novoPac, error: ePac } = await sb.from("pacientes").insert({
        nome, grupo, cpf, prec_cp:prec, matricula:mat,
        telefone:$("np-tel")?.value||"",
        nascimento:$("np-nasc")?.value||null,
      }).select().single();

      if (ePac) { toast("Erro ao cadastrar paciente: "+ePac.message,"error"); return; }
      pacId   = novoPac.id;
      pacNome = novoPac.nome;
      toast("Paciente cadastrado!","ok");
    }

    if (!pacId) { toast("Selecione ou cadastre um paciente.","error"); return; }

    const dentVal = $("ag-dent").value;
    const data    = $("ag-data").value;
    const hora    = $("ag-hora").value;
    const tipo    = $("ag-tipo").value;

    if (!dentVal||!data||!hora) { toast("Preencha dentista, data e horário.","error"); return; }

    const [dentId, dentNome] = dentVal.split("|");
    const duracao = DURACAO_TIPO[tipo] || DURACAO_DEFAULT;

    // Verifica intervalo
    const { data: ags } = await sb.from("agendamentos")
      .select("hora,tipo").eq("dentista_id",dentId).eq("data",data)
      .not("status","in","(Cancelado,Falta)");

    const horaMin = timeToMin(hora);
    const conflito = (ags||[]).find(a => {
      const aMin = timeToMin(a.hora);
      const aDur = DURACAO_TIPO[a.tipo] || DURACAO_DEFAULT;
      return Math.abs(horaMin - aMin) < Math.max(duracao, aDur);
    });

    if (conflito) {
      toast(`Conflito! Já existe ${conflito.tipo} às ${conflito.hora?.slice(0,5)} (intervalo mín: ${Math.max(duracao, DURACAO_TIPO[conflito.tipo]||DURACAO_DEFAULT)} min).`,"error");
      return;
    }

    const { error } = await sb.from("agendamentos").insert({
      paciente_id:pacId, paciente_nome:pacNome,
      dentista_id:dentId, dentista_nome:dentNome,
      tipo, data, hora:hora+":00",
      status:$("ag-status").value,
      
    });

    if (error) { toast("Erro: "+error.message,"error"); return; }
    toast("Agendamento criado!","ok");
    closeModal();
    _agCount[data] = (_agCount[data]||0) + 1;
    renderCalendarioEl();
    await fetchAgenda();
  }, "Agendar");
}

// ── Funções auxiliares do modal de agendamento ────────────────────────────────
let _pacSearchTimer;
async function buscarPacienteAg(q) {
  clearTimeout(_pacSearchTimer);
  const results = $("ag-pac-results");
  if (!q || q.length < 2) { if(results) results.style.display="none"; return; }

  _pacSearchTimer = setTimeout(async () => {
    const { data } = await sb.from("pacientes").select("id,nome,cpf,prec_cp,matricula,telefone,grupo")
      .or(`nome.ilike.%${q}%,cpf.ilike.%${q}%,prec_cp.ilike.%${q}%,matricula.ilike.%${q}%`)
      .order("nome").limit(10);

    const results = $("ag-pac-results");
    if (!results) return;

    if (!data || data.length === 0) {
      results.innerHTML = `<div style="padding:12px 16px;color:var(--ink60);font-size:13px;">Nenhum paciente encontrado.</div>`;
      results.style.display = "block";
      return;
    }

    results.innerHTML = data.map(p => `
      <div onclick="selecionarPacienteAg('${p.id}','${esc(p.nome).replace(/'/g,"\\'")}','${esc(p.grupo||"")}','${esc(p.cpf||p.prec_cp||p.matricula||"")}','${esc(p.telefone||"")}')"
        style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--ink10);transition:background .1s;"
        onmouseover="this.style.background='var(--teal50)'" onmouseout="this.style.background='white'">
        <div style="font-weight:600;font-size:13px;">${esc(p.nome)}</div>
        <div style="font-size:11px;color:var(--ink60);">${esc(p.grupo||"")} ${p.cpf||p.prec_cp||p.matricula ? "· "+esc(p.cpf||p.prec_cp||p.matricula) : ""} ${p.telefone ? "· "+esc(p.telefone) : ""}</div>
      </div>`).join("");
    results.style.display = "block";
  }, 300);
}

function selecionarPacienteAg(id, nome, grupo, doc, tel) {
  $("ag-pac-id").value = id;
  $("ag-pac-nome-show").textContent = nome;
  $("ag-pac-detalhes").innerHTML = `
    ${grupo ? `<span><strong>Grupo:</strong> ${esc(grupo)}</span>` : ""}
    ${doc    ? `<span><strong>Doc:</strong> ${esc(doc)}</span>`    : ""}
    ${tel    ? `<span><strong>Tel:</strong> ${esc(tel)}</span>`    : ""}
  `;
  $("ag-pac-info").style.display   = "block";
  $("ag-pac-search").style.display = "none";
  $("ag-pac-results").style.display= "none";
  // Esconde form de novo paciente se estava aberto
  const novoPacDiv = $("novo-pac-ag");
  if (novoPacDiv) novoPacDiv.style.display = "none";
}

function limparPacienteAg() {
  $("ag-pac-id").value = "";
  $("ag-pac-info").style.display   = "none";
  $("ag-pac-search").style.display = "block";
  $("ag-pac-search").value = "";
  $("ag-pac-results").style.display = "none";
  $("ag-pac-search").focus();
}

function toggleNovoPacAg() {
  const div = $("novo-pac-ag");
  if (!div) return;
  const show = div.style.display === "none";
  div.style.display = show ? "block" : "none";
  if (show) {
    // Se abriu o form, limpa seleção de paciente
    limparPacienteAg();
  }
}

function onGrupoChangeAg() {
  const g  = $("np-grupo")?.value || "";
  const wc = $("np-wrap-cpf"), wp = $("np-wrap-prec"), wm = $("np-wrap-mat"), lc = $("np-lbl-cpf");
  if (!wc) return;
  wp.style.display = wm.style.display = "none"; lc.textContent = "CPF";
  if (g==="Ex-Combatente"||g==="FUSEx") { lc.textContent="CPF (opcional)"; wp.style.display="block"; }
  else if (g==="PASS")                  { lc.textContent="CPF (opcional)"; wm.style.display="block"; }
  else if (g==="Fator Custo")           { lc.textContent="CPF *"; }
}

async function editarAgendamento(id) {
  const [{ data: ag }, { data: pacs }, { data: dents }] = await Promise.all([
    sb.from("agendamentos").select("*").eq("id", id).single(),
    sb.from("pacientes").select("id,nome").order("nome"),
    sb.from("dentistas").select("id,nome").order("nome"),
  ]);

  openModal("Editar Agendamento", `
    <div class="form-group"><label>Paciente *</label>
      <select id="ag-pac">
        <option value="">Selecione o paciente</option>
        ${(pacs||[]).map(p=>`<option value="${p.id}|${esc(p.nome)}" ${ag.paciente_id===p.id?"selected":""}>${esc(p.nome)}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label>Dentista *</label>
      <select id="ag-dent">
        <option value="">Selecione o dentista</option>
        ${(dents||[]).map(d=>`<option value="${d.id}|${esc(d.nome)}" ${ag.dentista_id===d.id?"selected":""}>${esc(d.nome)}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label>Tipo de Atendimento</label>
      <select id="ag-tipo">${TIPOS.map(t=>`<option ${ag.tipo===t?"selected":""}>${t}</option>`).join("")}</select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Data *</label><input type="date" id="ag-data" value="${ag.data||""}"/></div>
      <div class="form-group"><label>Horário *</label><input type="time" id="ag-hora" value="${(ag.hora||"").slice(0,5)}"/></div>
    </div>
    <div class="form-group"><label>Status</label>
      <select id="ag-status">
        ${["Agendado","Confirmado","Em Atendimento","Concluído","Falta","Cancelado"].map(s=>`<option ${ag.status===s?"selected":""}>${s}</option>`).join("")}
      </select>
    </div>
  `, async () => {
    const pacVal  = $("ag-pac").value;
    const dentVal = $("ag-dent").value;
    const data    = $("ag-data").value;
    const hora    = $("ag-hora").value;
    if (!pacVal||!dentVal||!data||!hora) { toast("Preencha os campos obrigatórios.","error"); return; }
    const [pacId, pacNome]   = pacVal.split("|");
    const [dentId, dentNome] = dentVal.split("|");
    const { error } = await sb.from("agendamentos").update({
      paciente_id:pacId, paciente_nome:pacNome,
      dentista_id:dentId, dentista_nome:dentNome,
      tipo:$("ag-tipo").value, data, hora:hora+":00",
      status:$("ag-status").value,
    }).eq("id", id);
    if (error) { toast("Erro: "+error.message,"error"); return; }
    toast("Agendamento atualizado!","ok");
    closeModal();
    await fetchAgenda();
  }, "Salvar");
}

async function marcarStatus(id, status) {
  if (!confirm(`Marcar como "${status}"?`)) return;
  const { error } = await sb.from("agendamentos").update({ status }).eq("id", id);
  if (error) { toast("Erro: "+error.message,"error"); return; }
  toast(`Marcado como ${status}.`,"ok");
  await fetchAgenda();
}

async function excluirAgendamento(id) {
  if (!confirm("Excluir este agendamento? Esta ação não pode ser desfeita.")) return;
  const { error } = await sb.from("agendamentos").delete().eq("id", id);
  if (error) { toast("Erro ao excluir: "+error.message,"error"); return; }
  toast("Agendamento excluído.","ok");
  const data = Object.keys(_agCount).find(d => _agCount[d] > 0);
  await carregarMesCalendario();
  renderCalendarioEl();
  await fetchAgenda();
}

function timeToMin(t) {
  if (!t) return 0;
  const [h,m] = (t||"00:00").split(":").map(Number);
  return h*60+m;
}

function updateDuracao() {
  const tipo = $("ag-tipo")?.value;
  const dur  = DURACAO_TIPO[tipo] || DURACAO_DEFAULT;
  const el   = $("ag-dur-info");
  if (el) el.textContent = `⏱ ${dur < 60 ? dur+" minutos" : (dur/60)+" hora"}`;
}

function renderAgenda(dents) {
  // Compatibilidade — chama a nova versão
  renderAgendaPage();
}


function clicarDente(num, modo) {
  const dados = modo === "exame" ? _odontExame : _odontTrat;
  if (dados[num] === _statusSel) {
    delete dados[num]; // toggle off
  } else {
    dados[num] = _statusSel;
  }
  renderOdontograma(modo === "exame" ? "odont-exame" : "odont-trat", dados, modo);
}


function debouncePac() { clearTimeout(_pacTimer); _pacTimer = setTimeout(loadPacientes, 300); }


function dentForm(d = {}) {
  return `
    <div class="form-group"><label>Nome *</label><input type="text" id="df-nome" value="${d.nome||""}"/></div>
    <div class="form-row">
      <div class="form-group"><label>CRO *</label><input type="text" id="df-cro" placeholder="CRO-SP 00000" value="${d.cro||""}"/></div>
      <div class="form-group"><label>E-mail</label><input type="email" id="df-email" value="${d.email||""}"/></div>
    </div>
    <div class="form-group">
      <label>Especialidades</label>
      <div class="esp-wrap">${ESPECIALIDADES.map(e=>`<button type="button" class="esp-btn ${(d.especialidades||[]).includes(e)?"selected":""}" onclick="this.classList.toggle('selected')">${e}</button>`).join("")}</div>
    </div>`;
}


// ─── USUÁRIOS ────────────────────────────────────────────────────────────────

async function dentistas() {
  pageLoading();
  const { data, error } = await sb.from("dentistas").select("*").order("nome");
  if (error) { $("content").innerHTML = `<div style="color:var(--coral);padding:20px;">${error.message}</div>`; return; }

  $("content").innerHTML = `
    <div class="toolbar">
      <div class="toolbar-right"><button class="btn-primary" onclick="novoDentista()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Novo Dentista
      </button></div>
    </div>
    <div class="table-wrap">
      <div class="table-header"><span class="table-title">Dentistas</span><span style="color:var(--ink60);font-size:12px;">${data.length} cadastrado${data.length!==1?"s":""}</span></div>
      <table><thead><tr><th>Nome</th><th>CRO</th><th>E-mail</th><th>Especialidades</th><th>Ações</th></tr></thead>
      <tbody>
      ${data.length===0
        ? `<tr class="empty-row"><td colspan="5">Nenhum dentista cadastrado.</td></tr>`
        : data.map(d=>`<tr>
            <td><strong>${d.nome}</strong></td>
            <td>${d.cro}</td><td>${d.email||"—"}</td>
            <td>${(d.especialidades||[]).map(e=>`<span class="chip">${e}</span>`).join("")}</td>
            <td>
              <button class="btn-sm" onclick="fichaDentista('${d.id}')">Ver ficha</button>
              <button class="btn-sm" onclick="editarDentista('${d.id}')">Editar</button>
              <button class="btn-danger-sm" onclick="excluirDentista('${d.id}','${d.nome.replace(/'/g,"\\'")}')">Excluir</button>
            </td>
          </tr>`).join("")}
      </tbody></table>
    </div>`;
}


async function editarDentista(id) {
  const { data: d } = await sb.from("dentistas").select("*").eq("id", id).single();
  openModal("Editar Dentista", dentForm(d), async () => {
    const nome = $("df-nome").value.trim();
    const cro  = $("df-cro").value.trim();
    if (!nome || !cro) { toast("Nome e CRO são obrigatórios.", "error"); return; }
    const esp = [...document.querySelectorAll(".esp-btn.selected")].map(b => b.textContent);
    const { error } = await sb.from("dentistas").update({ nome, cro, email:$("df-email").value, especialidades:esp }).eq("id", id);
    if (error) { toast("Erro: " + error.message, "error"); return; }
    toast("Dentista atualizado!", "success");
    closeModal(); await dentistas();
  }, "Salvar");
}


async function editarPaciente(id) {
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).single();
  openModal("Editar Paciente", pacForm(p), async () => {
    const grupo = $("pf-grupo").value;
    const nome  = $("pf-nome").value.trim();
    const cpf   = $("pf-cpf").value.trim();
    const prec  = $("pf-prec")?.value.trim() || "";
    const mat   = $("pf-mat")?.value.trim()  || "";

    if (!grupo) { toast("Selecione o grupo.", "error"); return; }
    if (!nome)  { toast("Nome é obrigatório.", "error"); return; }
    if (grupo === "Fator Custo" && !cpf)  { toast("CPF é obrigatório para Fator Custo.", "error"); return; }
    if ((grupo === "Ex-Combatente" || grupo === "FUSEx") && !prec) { toast("PREC-CP é obrigatório.", "error"); return; }
    if (grupo === "PASS" && !mat) { toast("Matrícula é obrigatória para PASS.", "error"); return; }

    const { error } = await sb.from("pacientes").update({
      nome, grupo, cpf,
      prec_cp:    prec,
      matricula:  mat,
      telefone:   $("pf-tel").value,
      email:      $("pf-email").value,
      nascimento: $("pf-nasc").value || null,
      endereco:   $("pf-end").value,
      obs:        $("pf-obs").value,
    }).eq("id", id);
    if (error) { toast("Erro: " + error.message, "error"); return; }
    toast("Paciente atualizado!", "ok");
    closeModal();
    await renderPacientes();
  }, "Salvar");
}


async function editarUsuario(id) {
  const { data: u } = await sb.from("usuarios").select("*").eq("id", id).single();
  openModal("Editar Usuário", usuForm(u), async () => {
    const nome  = $("uf-nome").value.trim();
    const email = $("uf-email").value.trim();
    if (!nome || !email) { toast("Nome e e-mail são obrigatórios.", "error"); return; }
    const upd = { nome, email, perfil:$("uf-perfil").value, status:$("uf-status").value };
    if ($("uf-senha").value) upd.senha = $("uf-senha").value;
    const { error } = await sb.from("usuarios").update(upd).eq("id", id);
    if (error) { toast("Erro: " + error.message, "error"); return; }
    toast("Usuário atualizado!", "success");
    closeModal(); await usuarios();
  }, "Salvar");
}


async function excluirDentista(id, nome) {
  if (!confirm(`Excluir "${nome}"?`)) return;
  const { error } = await sb.from("dentistas").delete().eq("id", id);
  if (error) { toast("Erro: " + error.message, "error"); return; }
  toast("Dentista excluído.", "success");
  await dentistas();
}


async function excluirPaciente(id, nome) {
  if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
  const { error } = await sb.from("pacientes").delete().eq("id", id);
  if (error) { toast("Erro: " + error.message, "error"); return; }
  toast("Paciente excluído.", "ok");
  await renderPacientes();
}

// ─── DENTISTAS ───────────────────────────────────────────────────────────────

async function fichaDentista(id) {
  const { data: d } = await sb.from("dentistas").select("*").eq("id", id).single();
  const { data: hist } = await sb.from("agendamentos").select("*").eq("dentista_id", id).order("data","desc");

  $("content").innerHTML = `
    <button class="btn-secondary" style="margin-bottom:16px;" onclick="dentistas()">← Voltar</button>
    <div style="font-weight:800;font-size:18px;margin-bottom:16px;">${d.nome}</div>
    <div class="ficha-card">
      <div class="ficha-section-title">Dados Profissionais</div>
      <div class="ficha-grid">
        <div><div class="ficha-label">CRO</div><div class="ficha-value">${d.cro}</div></div>
        <div><div class="ficha-label">E-mail</div><div class="ficha-value">${d.email||"—"}</div></div>
        <div style="grid-column:1/-1;"><div class="ficha-label">Especialidades</div><div style="margin-top:6px;">${(d.especialidades||[]).map(e=>`<span class="chip">${e}</span>`).join("")||"—"}</div></div>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-header"><span class="table-title">Histórico de Atendimentos</span></div>
      <table><thead><tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Status</th></tr></thead>
      <tbody>
      ${(hist||[]).length===0
        ? `<tr class="empty-row"><td colspan="4">Sem atendimentos.</td></tr>`
        : (hist||[]).map(a=>`<tr>
            <td>${fmtDate(a.data)} ${a.hora?.slice(0,5)||""}</td>
            <td>${a.paciente_nome}</td><td>${a.tipo}</td><td>${badge(a.status)}</td>
          </tr>`).join("")}
      </tbody></table>
    </div>`;
}


async function fichaPaciente(id) {
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).single();
  const { data: hist } = await sb.from("agendamentos").select("*").eq("paciente_id", id).order("data", { ascending: false });

  $("content").innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary" onclick="pacientes()" style="padding:6px 12px;font-size:13px;">← Voltar</button>
      <h2>${esc(p.nome)}</h2>
      ${currentUser.perfil !== 'Atendente' ? `<button class="btn btn-primary" style="padding:6px 12px;font-size:13px;margin-left:auto;" onclick="editarPaciente('${p.id}')">Editar</button>` : ''}
    </div>
    <div class="ficha-card">
      <div class="ficha-sec">Dados Cadastrais</div>
      <div class="ficha-grid">
        <div><div class="ficha-label">Grupo</div><div class="ficha-value">${esc(p.grupo||"—")}</div></div>
        <div><div class="ficha-label">CPF</div><div class="ficha-value">${esc(p.cpf||"—")}</div></div>
        ${p.prec_cp   ? `<div><div class="ficha-label">PREC-CP</div><div class="ficha-value">${esc(p.prec_cp)}</div></div>` : ""}
        ${p.matricula ? `<div><div class="ficha-label">Matrícula</div><div class="ficha-value">${esc(p.matricula)}</div></div>` : ""}
        <div><div class="ficha-label">Telefone</div><div class="ficha-value">${esc(p.telefone||"—")}</div></div>
        <div><div class="ficha-label">Nascimento</div><div class="ficha-value">${fmtDate(p.nascimento)}</div></div>
        <div><div class="ficha-label">E-mail</div><div class="ficha-value">${esc(p.email||"—")}</div></div>
        <div style="grid-column:1/-1;"><div class="ficha-label">Endereço</div><div class="ficha-value">${esc(p.endereco||"—")}</div></div>
        ${p.obs ? `<div style="grid-column:1/-1;"><div class="ficha-label">Observações</div><div class="ficha-value">${esc(p.obs)}</div></div>` : ""}
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-header"><span class="table-title">Histórico de Atendimentos</span><span class="table-count">${(hist||[]).length} consulta${(hist||[]).length!==1?"s":""}</span></div>
      <table><thead><tr><th>Data</th><th>Horário</th><th>Dentista</th><th>Tipo</th><th>Status</th></tr></thead>
      <tbody>
        ${(hist||[]).length === 0
          ? `<tr class="empty-row"><td colspan="5">Sem atendimentos registrados.</td></tr>`
          : (hist||[]).map(a => `<tr>
              <td>${fmtDate(a.data)}</td>
              <td>${(a.hora||"").slice(0,5)}</td>
              <td>${esc(a.dentista_nome)}</td>
              <td>${esc(a.tipo)}</td>
              <td>${badge(a.status)}</td>
            </tr>`).join("")}
      </tbody></table>
    </div>`;
}


function imprimirProntuario(pacienteId) {
  // Salva antes de imprimir
  salvarProntuario(pacienteId).then(() => {
    window.print();
  });
}

async function loadPacientes() {
  const tbody = $("pac-tbody");
  if (!tbody) return;
  tbody.innerHTML = `<div style="padding:24px;text-align:center;"><div class="spinner" style="margin:auto;"></div></div>`;

  let q = sb.from("pacientes").select("*").order("nome");
  if (pacBusca) q = q.or(`nome.ilike.%${pacBusca}%,cpf.ilike.%${pacBusca}%,prec_cp.ilike.%${pacBusca}%,matricula.ilike.%${pacBusca}%`);

  const { data, error } = await q;
  if (error) { tbody.innerHTML = `<div style="padding:20px;color:var(--coral);">${error.message}</div>`; return; }

  const cnt = $("pac-count"); if (cnt) cnt.textContent = `${data.length} registro${data.length!==1?"s":""}`;
  tbody.innerHTML = `
    <table>
      <thead><tr><th>Nome</th><th>Grupo</th><th>CPF / Doc.</th><th>Telefone</th><th>Ações</th></tr></thead>
      <tbody>
        ${data.length === 0
          ? `<tr class="empty-row"><td colspan="5">Nenhum paciente encontrado.</td></tr>`
          : data.map(p => `<tr>
              <td><strong>${esc(p.nome)}</strong></td>
              <td><span class="chip">${esc(p.grupo||"—")}</span></td>
              <td>${esc(p.cpf||p.prec_cp||p.matricula||"—")}</td>
              <td>${esc(p.telefone||"—")}</td>
              <td>
                <button class="btn-sm" onclick="fichaPaciente('${p.id}')">Ver ficha</button>
                ${currentUser.perfil !== 'Atendente' ? `<button class="btn-sm" onclick="editarPaciente('${p.id}')">Editar</button>` : ''}
                ${currentUser.perfil !== 'Atendente' ? `<button class="btn-danger-sm" onclick="excluirPaciente('${p.id}','${esc(p.nome)}')">Excluir</button>` : ''}
              </td>
            </tr>`).join("")}
      </tbody>
    </table>`;
}


function novoDentista() {
  openModal("Novo Dentista", dentForm(), async () => {
    const nome = $("df-nome").value.trim();
    const cro  = $("df-cro").value.trim();
    if (!nome || !cro) { toast("Nome e CRO são obrigatórios.", "error"); return; }
    const esp = [...document.querySelectorAll(".esp-btn.selected")].map(b => b.textContent);
    const { error } = await sb.from("dentistas").insert({ nome, cro, email:$("df-email").value, especialidades:esp });
    if (error) { toast("Erro: " + error.message, "error"); return; }
    toast("Dentista cadastrado!", "success");
    closeModal(); await dentistas();
  }, "Salvar Dentista");
}


function novoPaciente() {
  openModal("Novo Paciente", pacForm(), async () => {
    const grupo = $("pf-grupo").value;
    const nome  = $("pf-nome").value.trim();
    const cpf   = $("pf-cpf").value.trim();
    const prec  = $("pf-prec")?.value.trim() || "";
    const mat   = $("pf-mat")?.value.trim()  || "";

    if (!grupo) { toast("Selecione o grupo.", "error"); return; }
    if (!nome)  { toast("Nome é obrigatório.", "error"); return; }
    if (grupo === "Fator Custo" && !cpf)  { toast("CPF é obrigatório para Fator Custo.", "error"); return; }
    if ((grupo === "Ex-Combatente" || grupo === "FUSEx") && !prec) { toast("PREC-CP é obrigatório.", "error"); return; }
    if (grupo === "PASS" && !mat) { toast("Matrícula é obrigatória para PASS.", "error"); return; }

    const { error } = await sb.from("pacientes").insert({
      nome, grupo, cpf,
      prec_cp:    prec,
      matricula:  mat,
      telefone:   $("pf-tel").value,
      email:      $("pf-email").value,
      nascimento: $("pf-nasc").value || null,
      endereco:   $("pf-end").value,
      obs:        $("pf-obs").value,
    });
    if (error) { toast("Erro: " + error.message, "error"); return; }
    toast("Paciente cadastrado!", "ok");
    closeModal();
    await renderPacientes();
  }, "Salvar Paciente");
}


function novoUsuario() {
  openModal("Novo Usuário", usuForm(), async () => {
    const nome  = $("uf-nome").value.trim();
    const email = $("uf-email").value.trim();
    const senha = $("uf-senha").value;
    if (!nome || !email || !senha) { toast("Preencha todos os campos.", "error"); return; }
    const { error } = await sb.from("usuarios").insert({ nome, email, senha, perfil:$("uf-perfil").value, status:$("uf-status").value });
    if (error) { toast("Erro: " + error.message, "error"); return; }
    toast("Usuário criado!", "success");
    closeModal(); await usuarios();
  }, "Criar Usuário");
}


function onGrupoChange() {
  const grupo   = $("pf-grupo")?.value || "";
  const wrapCpf = $("wrap-cpf");
  const wrapPre = $("wrap-prec");
  const wrapMat = $("wrap-mat");
  const lblCpf  = $("lbl-cpf");
  if (!wrapCpf) return;
  wrapPre.style.display = "none";
  wrapMat.style.display = "none";
  lblCpf.textContent    = "CPF";
  if (grupo === "Ex-Combatente" || grupo === "FUSEx") {
    lblCpf.textContent = "CPF (opcional)";
    wrapPre.style.display = "block";
  } else if (grupo === "PASS") {
    lblCpf.textContent = "CPF (opcional)";
    wrapMat.style.display = "block";
  } else if (grupo === "Fator Custo") {
    lblCpf.textContent = "CPF *";
  }
}


function pacForm(p = {}) {
  const g = p.grupo || "";
  return `
    <div class="form-group">
      <label>Grupo *</label>
      <select id="pf-grupo" onchange="onGrupoChange()">
        <option value="">Selecione o grupo…</option>
        <option value="PASS"          ${g==="PASS"?"selected":""}>PASS</option>
        <option value="Ex-Combatente" ${g==="Ex-Combatente"?"selected":""}>Ex-Combatente</option>
        <option value="FUSEx"         ${g==="FUSEx"?"selected":""}>FUSEx</option>
        <option value="Fator Custo"   ${g==="Fator Custo"?"selected":""}>Fator Custo</option>
      </select>
    </div>
    <div class="form-group"><label>Nome Completo *</label><input type="text" id="pf-nome" value="${esc(p.nome||"")}"/></div>
    <div class="form-row">
      <div class="form-group" id="wrap-cpf">
        <label id="lbl-cpf">CPF</label>
        <input type="text" id="pf-cpf" placeholder="000.000.000-00" value="${esc(p.cpf||"")}"/>
      </div>
      <div class="form-group" id="wrap-prec" style="display:none;">
        <label>PREC-CP *</label>
        <input type="text" id="pf-prec" value="${esc(p.prec_cp||"")}"/>
      </div>
      <div class="form-group" id="wrap-mat" style="display:none;">
        <label>Matrícula *</label>
        <input type="text" id="pf-mat" value="${esc(p.matricula||"")}"/>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Telefone</label><input type="text" id="pf-tel" placeholder="(00) 00000-0000" value="${esc(p.telefone||"")}"/></div>
      <div class="form-group"><label>Nascimento</label><input type="date" id="pf-nasc" value="${p.nascimento||""}"/></div>
    </div>
    <div class="form-group"><label>E-mail</label><input type="email" id="pf-email" value="${esc(p.email||"")}"/></div>
    <div class="form-group"><label>Endereço</label><input type="text" id="pf-end" value="${esc(p.endereco||"")}"/></div>
    <div class="form-group"><label>Observações Clínicas</label><textarea id="pf-obs">${esc(p.obs||"")}</textarea></div>`;
}


async function pacientes() {
  pageLoading();
  await renderPacientes();
}

let _pacTimer;

async function relatorios() {
  pageLoading();
  const hoje    = new Date();
  const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10);
  const mesFim    = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10);

  const [{ data: agMes }, { data: agTodos }, { data: dents }] = await Promise.all([
    sb.from("agendamentos").select("*").gte("data", mesInicio).lte("data", mesFim),
    sb.from("agendamentos").select("status, dentista_nome, data"),
    sb.from("dentistas").select("nome"),
  ]);

  const mes  = agMes  || [];
  const todos = agTodos || [];

  // Contagens do mês
  const porStatus = {};
  ["Agendado","Confirmado","Em Atendimento","Concluído","Falta","Cancelado"].forEach(s => {
    porStatus[s] = mes.filter(a => a.status === s).length;
  });

  // Produção por dentista no mês
  const porDentista = {};
  (dents||[]).forEach(d => { porDentista[d.nome] = { total:0, concluido:0, falta:0 }; });
  mes.forEach(a => {
    if (!porDentista[a.dentista_nome]) porDentista[a.dentista_nome] = { total:0, concluido:0, falta:0 };
    porDentista[a.dentista_nome].total++;
    if (a.status === "Concluído") porDentista[a.dentista_nome].concluido++;
    if (a.status === "Falta")     porDentista[a.dentista_nome].falta++;
  });

  // Por grupo de paciente
  const { data: pacs } = await sb.from("pacientes").select("grupo");
  const porGrupo = {};
  (pacs||[]).forEach(p => {
    const g = p.grupo || "Sem grupo";
    porGrupo[g] = (porGrupo[g]||0) + 1;
  });

  const mesNome = hoje.toLocaleString("pt-BR", { month:"long", year:"numeric" });

  $("content").innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div style="font-size:16px;font-weight:700;">Mês de referência: ${mesNome}</div>
    </div>

    <!-- Cards de status -->
    <div class="stats-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px;">
      <div class="stat-card" style="border-top:3px solid #2A9BAB;"><div class="stat-num">${mes.length}</div><div class="stat-label">Total no Mês</div></div>
      <div class="stat-card" style="border-top:3px solid #2E9E6E;"><div class="stat-num">${porStatus["Concluído"]||0}</div><div class="stat-label">Concluídos</div></div>
      <div class="stat-card" style="border-top:3px solid #E8614A;"><div class="stat-num">${porStatus["Falta"]||0}</div><div class="stat-label">Faltas</div></div>
    </div>
    <div class="stats-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px;">
      <div class="stat-card" style="border-top:3px solid #1B6B77;"><div class="stat-num">${porStatus["Agendado"]||0}</div><div class="stat-label">Agendados</div></div>
      <div class="stat-card" style="border-top:3px solid #4F46E5;"><div class="stat-num">${porStatus["Confirmado"]||0}</div><div class="stat-label">Confirmados</div></div>
      <div class="stat-card" style="border-top:3px solid #C2570B;"><div class="stat-num">${porStatus["Cancelado"]||0}</div><div class="stat-label">Cancelados</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

      <!-- Produção por dentista -->
      <div class="table-wrap">
        <div class="table-header"><span class="table-title">Produção por Dentista — ${mesNome}</span></div>
        <table>
          <thead><tr><th>Dentista</th><th>Total</th><th>Concluídos</th><th>Faltas</th></tr></thead>
          <tbody>
            ${Object.entries(porDentista).length === 0
              ? `<tr class="empty-row"><td colspan="4">Sem dados.</td></tr>`
              : Object.entries(porDentista).map(([nome, v]) => `<tr>
                  <td><strong>${esc(nome)}</strong></td>
                  <td>${v.total}</td>
                  <td><span class="badge b-concluído">${v.concluido}</span></td>
                  <td><span class="badge b-falta">${v.falta}</span></td>
                </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <!-- Pacientes por grupo -->
      <div class="table-wrap">
        <div class="table-header"><span class="table-title">Pacientes por Grupo</span></div>
        <table>
          <thead><tr><th>Grupo</th><th>Qtd</th></tr></thead>
          <tbody>
            ${Object.entries(porGrupo).map(([g,n]) => `<tr>
                <td><span class="chip">${esc(g)}</span></td>
                <td><strong>${n}</strong></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── ODONTOGRAMA ─────────────────────────────────────────────────────────────

const DENTES_SUPERIOR = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const DENTES_INFERIOR = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
const DENTES_SUP_DEC  = [55,54,53,52,51,61,62,63,64,65];
const DENTES_INF_DEC  = [85,84,83,82,81,71,72,73,74,75];

const STATUS_DENTE = {
  "H":  { label:"Hígido",              cor:"#2E9E6E", fundo:"#EDF7F3" },
  "C":  { label:"Cariado",             cor:"#E8614A", fundo:"#FDF1EF" },
  "R":  { label:"Restaurado",          cor:"#4F46E5", fundo:"#EEF2FF" },
  "EI": { label:"Extração Indicada",   cor:"#C2570B", fundo:"#FFF7ED" },
  "A":  { label:"Ausente",             cor:"#6B7A8D", fundo:"#F4F6F8" },
  "CA": { label:"Canal",               cor:"#2A9BAB", fundo:"#EDF8FA" },
  "PR": { label:"Prótese",             cor:"#7C3AED", fundo:"#F5F3FF" },
  "IM": { label:"Implante",            cor:"#0891B2", fundo:"#ECFEFF" },
  "PP": { label:"Prótese Parcial",     cor:"#9333EA", fundo:"#FAF5FF" },
  "PT": { label:"Prótese Total",       cor:"#6D28D9", fundo:"#EDE9FE" },
  "SE": { label:"Selante",             cor:"#059669", fundo:"#ECFDF5" },
  "FC": { label:"Fratura/Trinca",      cor:"#DC2626", fundo:"#FEF2F2" },
  "MO": { label:"Mobilidade",          cor:"#D97706", fundo:"#FFFBEB" },
  "NE": { label:"Necrose",             cor:"#1F2937", fundo:"#F9FAFB" },
  "HI": { label:"Hipersensível",       cor:"#0284C7", fundo:"#F0F9FF" },
  "ER": { label:"Erosão",              cor:"#B45309", fundo:"#FEFCE8" },
  "AT": { label:"Atrição/Abrasão",     cor:"#92400E", fundo:"#FFF7ED" },
  "GE": { label:"Geminação",           cor:"#BE185D", fundo:"#FDF2F8" },
  "IN": { label:"Incluso/Impactado",   cor:"#0F766E", fundo:"#F0FDFA" },
  "SP": { label:"Supranumerário",      cor:"#7E22CE", fundo:"#F5F3FF" },
};

let _odontExame = {};
let _odontTrat  = {};
let _modoOdont  = "exame"; // "exame" ou "tratamento"
let _statusSel  = "C";
let _pacIdAtual = null;


function renderOdontograma(containerId, dados, modo) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const renderFileira = (dentes, label) => {
    return `
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;color:var(--ink60);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${label}</div>
        <div style="display:flex;gap:3px;flex-wrap:nowrap;overflow-x:auto;">
          ${dentes.map(n => {
            const st = dados[n] || null;
            const info = st ? STATUS_DENTE[st] : null;
            return `<div
              onclick="clicarDente(${n},'${modo}')"
              title="${n}${info ? ' — '+info.label : ''}"
              style="
                width:36px;height:44px;flex-shrink:0;border-radius:6px;
                border:2px solid ${info ? info.cor : 'var(--ink30)'};
                background:${info ? info.fundo : 'white'};
                cursor:pointer;display:flex;flex-direction:column;
                align-items:center;justify-content:center;gap:2px;
                transition:all .15s;font-size:9px;font-weight:700;
                color:${info ? info.cor : 'var(--ink60)'};
              "
              onmouseover="this.style.transform='scale(1.1)'"
              onmouseout="this.style.transform='scale(1)'"
            >
              <span style="font-size:8px;color:var(--ink60);">${n}</span>
              <span>${info ? st : '○'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  };

  el.innerHTML = `
    <div style="overflow-x:auto;">
      ${renderFileira(DENTES_SUPERIOR, "Superior Permanente")}
      ${renderFileira(DENTES_INFERIOR, "Inferior Permanente")}
      ${renderFileira(DENTES_SUP_DEC, "Superior Decíduo")}
      ${renderFileira(DENTES_INF_DEC, "Inferior Decíduo")}
    </div>`;
}


async function renderPacientes() {
  $("content").innerHTML = `
    <div class="toolbar">
      <div class="search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="pac-busca" placeholder="Buscar por nome, CPF, PREC-CP ou matrícula…" value="${esc(pacBusca)}" oninput="pacBusca=this.value;debouncePac()"/>
      </div>
      <div class="toolbar-right">
        <button class="btn-primary" onclick="novoPaciente()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Novo Paciente
        </button>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-header"><span class="table-title">Pacientes</span><span class="table-count" id="pac-count"></span></div>
      <div id="pac-tbody"></div>
    </div>`;
  await loadPacientes();
}


async function salvarProntuario(pacienteId) {
  const btn = document.querySelector('[onclick*="salvarProntuario"]');
  if (btn) { btn.disabled = true; btn.textContent = "Salvando…"; }

  // Salva campos militares no paciente
  const { error: e1 } = await sb.from("pacientes").update({
    fusex_num:    $("pr-fusex")?.value   || "",
    om:           $("pr-om")?.value      || "",
    sit_militar:  $("pr-sitmil")?.value  || "",
    naturalidade: $("pr-nat")?.value     || "",
    filiacao_pai: $("pr-pai")?.value     || "",
    filiacao_mae: $("pr-mae")?.value     || "",
    titular:      $("pr-titular")?.value || "",
    posto_grad:   $("pr-posto")?.value   || "",
  }).eq("id", pacienteId);

  // Salva prontuário
  const payload = {
    paciente_id:            pacienteId,
    alergias:               $("an-alergias")?.value || "",
    medicamentos:           $("an-medic")?.value    || "",
    doencas:                $("an-doencas")?.value  || "",
    historico_odonto:       $("an-hist")?.value     || "",
    observacoes:            $("an-obs")?.value      || "",
    odontograma_exame:      _odontExame,
    odontograma_tratamento: _odontTrat,
    atualizado_por:         currentUser.nome,
    atualizado_em:          new Date().toISOString(),
  };

  const { data: pront } = await sb.from("prontuarios").select("id").eq("paciente_id", pacienteId).maybeSingle();
  const { error: e2 } = pront
    ? await sb.from("prontuarios").update(payload).eq("id", pront.id)
    : await sb.from("prontuarios").insert(payload);

  if (e1 || e2) { toast("Erro ao salvar: " + (e1||e2).message, "error"); }
  else { toast("Prontuário salvo com sucesso!", "ok"); }

  if (btn) { btn.disabled = false; btn.textContent = "💾 Salvar"; }
}


function setModoOdont(modo) {
  _modoOdont = modo;
  $("odont-exame").style.display = modo === "exame" ? "block" : "none";
  $("odont-trat").style.display  = modo === "tratamento" ? "block" : "none";
  $("btn-exame").className = modo === "exame" ? "btn btn-primary" : "btn btn-secondary";
  $("btn-exame").style.cssText = "padding:5px 14px;font-size:12px;";
  $("btn-trat").className  = modo === "tratamento" ? "btn btn-primary" : "btn btn-secondary";
  $("btn-trat").style.cssText  = "padding:5px 14px;font-size:12px;";
}


function setStatusDente(codigo) {
  _statusSel = codigo;
  Object.keys(STATUS_DENTE).forEach(k => {
    const btn = $(`st-${k}`);
    if (!btn) return;
    const v = STATUS_DENTE[k];
    btn.style.border    = `2px solid ${v.cor}`;
    btn.style.background = k === codigo ? v.cor : v.fundo;
    btn.style.color     = k === codigo ? "white" : v.cor;
    btn.style.transform = k === codigo ? "scale(1.08)" : "scale(1)";
  });
}


async function toggleUsuario(id, current) {
  if (id === currentUser.id) { toast("Você não pode alterar seu próprio status.", "error"); return; }
  const novoStatus = current === "Ativo" ? "Inativo" : "Ativo";
  const { error } = await sb.from("usuarios").update({ status: novoStatus }).eq("id", id);
  if (error) { toast("Erro: " + error.message, "error"); return; }
  toast(`Usuário ${novoStatus.toLowerCase()}.`, "success");
  await usuarios();
}


function usuForm(u = {}) {
  return `
    <div class="form-group"><label>Nome *</label><input type="text" id="uf-nome" value="${u.nome||""}"/></div>
    <div class="form-group"><label>E-mail *</label><input type="email" id="uf-email" value="${u.email||""}"/></div>
    <div class="form-group"><label>${u.id?"Nova Senha (deixe em branco para manter)":"Senha *"}</label><input type="password" id="uf-senha" placeholder="••••••••"/></div>
    <div class="form-row">
      <div class="form-group"><label>Perfil</label>
        <select id="uf-perfil">
          <option ${(u.perfil||"Atendente")==="Atendente"?"selected":""}>Atendente</option>
          <option ${u.perfil==="Dentista"?"selected":""}>Dentista</option>
          <option ${u.perfil==="Administrador"?"selected":""}>Administrador</option>
        </select>
      </div>
      <div class="form-group"><label>Status</label>
        <select id="uf-status">
          <option ${(u.status||"Ativo")==="Ativo"?"selected":""}>Ativo</option>
          <option ${u.status==="Inativo"?"selected":""}>Inativo</option>
        </select>
      </div>
    </div>
    ${!u.id?`<div class="info-box">A senha será atribuída manualmente. Em produção, use o Supabase Auth para envio automático de e-mail.</div>`:""}`;
}


async function usuarios() {
  pageLoading();
  const { data, error } = await sb.from("usuarios").select("*").order("nome");
  if (error) { $("content").innerHTML = `<div style="color:var(--coral);padding:20px;">${error.message}</div>`; return; }

  $("content").innerHTML = `
    <div class="toolbar">
      <div class="toolbar-right"><button class="btn-primary" onclick="novoUsuario()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Novo Usuário
      </button></div>
    </div>
    <div class="table-wrap">
      <div class="table-header"><span class="table-title">Usuários do Sistema</span><span style="color:var(--ink60);font-size:12px;">${data.length} usuário${data.length!==1?"s":""}</span></div>
      <table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>
      ${data.map(u=>`<tr>
          <td><strong>${u.nome}</strong></td>
          <td>${u.email}</td>
          <td>${badge(u.perfil)}</td>
          <td>${badge(u.status)}</td>
          <td>
            <button class="btn-sm" onclick="editarUsuario('${u.id}')">${u.id===currentUser.id?"Minha conta":"Editar"}</button>
            <button class="${u.status==="Ativo"?"btn-danger-sm":"btn-sm"}" onclick="toggleUsuario('${u.id}','${u.status}')">${u.status==="Ativo"?"Inativar":"Ativar"}</button>
          </td>
        </tr>`).join("")}
      </tbody></table>
    </div>`;
}


async function verProntuarioConsulta(agendamentoId) {
  const { data: ag } = await sb.from("agendamentos").select("*").eq("id", agendamentoId).single();
  if (!ag) { toast("Agendamento não encontrado.", "error"); return; }

  openModal(`📋 Prontuário — ${ag.paciente_nome}`, `
    <div style="background:var(--teal50);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;">
      <strong>${ag.paciente_nome}</strong> · ${ag.dentista_nome} · ${fmtDate(ag.data)} ${(ag.hora||"").slice(0,5)}<br/>
      <span style="color:var(--ink60);">${ag.tipo}</span> · ${badge(ag.status)}
    </div>
    <div class="form-group">
      <label>Procedimento Realizado</label>
      <input type="text" id="pr-proc" value="${esc(ag.procedimento_realizado||"")}" placeholder="Ex: Extração do dente 38"/>
    </div>
    <div class="form-group">
      <label>Observações da Consulta</label>
      <textarea id="pr-obs" style="min-height:80px;">${esc(ag.observacao_consulta||"")}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Hora de Início</label>
        <input type="time" id="pr-inicio" value="${ag.hora_inicio||""}"/>
      </div>
      <div class="form-group">
        <label>Hora de Fim</label>
        <input type="time" id="pr-fim" value="${ag.hora_fim||""}"/>
      </div>
    </div>
    <hr style="border:none;border-top:1px solid var(--ink10);margin:16px 0;"/>
    <div style="font-weight:700;font-size:13px;margin-bottom:12px;color:var(--ink60);">ANAMNESE DO PACIENTE</div>
    <div id="anamnese-area"><div class="spinner" style="margin:auto;display:block;"></div></div>
  `, async () => {
    // Salva prontuário da consulta
    const { error: e1 } = await sb.from("agendamentos").update({
      procedimento_realizado: $("pr-proc").value,
      observacao_consulta:    $("pr-obs").value,
      hora_inicio:            $("pr-inicio").value || null,
      hora_fim:               $("pr-fim").value    || null,
    }).eq("id", agendamentoId);

    // Salva anamnese do paciente
    const alergias    = $("an-alergias")?.value    || "";
    const medicamentos= $("an-medic")?.value        || "";
    const doencas     = $("an-doencas")?.value      || "";
    const hist_odonto = $("an-hist")?.value         || "";
    const obs         = $("an-obs")?.value          || "";

    const { data: pront } = await sb.from("prontuarios").select("id").eq("paciente_id", ag.paciente_id).maybeSingle();
    if (pront) {
      await sb.from("prontuarios").update({ alergias, medicamentos, doencas, historico_odonto: hist_odonto, observacoes: obs, atualizado_por: currentUser.nome, atualizado_em: new Date().toISOString() }).eq("id", pront.id);
    } else {
      await sb.from("prontuarios").insert({ paciente_id: ag.paciente_id, alergias, medicamentos, doencas, historico_odonto: hist_odonto, observacoes: obs, atualizado_por: currentUser.nome });
    }

    if (e1) { toast("Erro ao salvar: " + e1.message, "error"); return; }
    toast("Prontuário salvo!", "ok");
    closeModal();
    await fetchAgenda();
  }, "💾 Salvar Prontuário");

  // Carrega anamnese do paciente em paralelo
  setTimeout(async () => {
    const area = $("anamnese-area");
    if (!area) return;
    const { data: pront } = await sb.from("prontuarios").select("*").eq("paciente_id", ag.paciente_id).maybeSingle();
    const p = pront || {};
    area.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label>Alergias</label>
          <input type="text" id="an-alergias" value="${esc(p.alergias||"")}" placeholder="Ex: Penicilina, látex"/>
        </div>
        <div class="form-group">
          <label>Medicamentos em Uso</label>
          <input type="text" id="an-medic" value="${esc(p.medicamentos||"")}" placeholder="Ex: Losartana 50mg"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Doenças / Condições</label>
          <input type="text" id="an-doencas" value="${esc(p.doencas||"")}" placeholder="Ex: Hipertensão, Diabetes"/>
        </div>
        <div class="form-group">
          <label>Histórico Odontológico</label>
          <input type="text" id="an-hist" value="${esc(p.historico_odonto||"")}" placeholder="Ex: Tratamento de canal em 2023"/>
        </div>
      </div>
      <div class="form-group">
        <label>Observações Gerais</label>
        <textarea id="an-obs" style="min-height:60px;">${esc(p.observacoes||"")}</textarea>
      </div>
      ${p.atualizado_em ? `<div style="font-size:11px;color:var(--ink60);margin-top:4px;">Última atualização: ${new Date(p.atualizado_em).toLocaleString("pt-BR")} por ${esc(p.atualizado_por)}</div>` : ""}
    `;
  }, 300);
}


async function verProntuarioPaciente(pacienteId) {
  const { data: p } = await sb.from("pacientes").select("*").eq("id", pacienteId).single();
  const { data: pront } = await sb.from("prontuarios").select("*").eq("paciente_id", pacienteId).maybeSingle();
  const { data: hist } = await sb.from("agendamentos").select("*").eq("paciente_id", pacienteId).not("observacao_consulta","eq","").order("data", { ascending: false });
  const an = pront || {};

  $("content").innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary" onclick="fichaPaciente('${pacienteId}')" style="padding:6px 12px;font-size:13px;">← Voltar</button>
      <h2>📋 Prontuário — ${esc(p.nome)}</h2>
    </div>

    <div class="ficha-card">
      <div class="ficha-sec">Anamnese</div>
      <div class="ficha-grid">
        <div><div class="ficha-label">Alergias</div><div class="ficha-value">${esc(an.alergias)||"—"}</div></div>
        <div><div class="ficha-label">Medicamentos</div><div class="ficha-value">${esc(an.medicamentos)||"—"}</div></div>
        <div><div class="ficha-label">Doenças</div><div class="ficha-value">${esc(an.doencas)||"—"}</div></div>
        <div><div class="ficha-label">Hist. Odontológico</div><div class="ficha-value">${esc(an.historico_odonto)||"—"}</div></div>
        ${an.observacoes ? `<div style="grid-column:1/-1;"><div class="ficha-label">Observações</div><div class="ficha-value">${esc(an.observacoes)}</div></div>` : ""}
      </div>
      ${an.atualizado_em ? `<div style="font-size:11px;color:var(--ink60);margin-top:12px;">Atualizado em ${new Date(an.atualizado_em).toLocaleString("pt-BR")} por ${esc(an.atualizado_por)}</div>` : ""}
    </div>

    <div class="table-wrap">
      <div class="table-header">
        <span class="table-title">Histórico de Consultas com Anotações</span>
        <span class="table-count">${(hist||[]).length} registro${(hist||[]).length!==1?"s":""}</span>
      </div>
      <table>
        <thead><tr><th>Data</th><th>Dentista</th><th>Procedimento</th><th>Observações</th><th>Status</th></tr></thead>
        <tbody>
          ${(hist||[]).length===0
            ? `<tr class="empty-row"><td colspan="5">Nenhuma anotação registrada ainda.</td></tr>`
            : (hist||[]).map(a=>`<tr>
                <td>${fmtDate(a.data)} ${(a.hora||"").slice(0,5)}</td>
                <td>${esc(a.dentista_nome)}</td>
                <td>${esc(a.procedimento_realizado||"—")}</td>
                <td style="max-width:300px;white-space:pre-wrap;">${esc(a.observacao_consulta||"—")}</td>
                <td>${badge(a.status)}</td>
              </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

// ─── RELATÓRIOS ──────────────────────────────────────────────────────────────
