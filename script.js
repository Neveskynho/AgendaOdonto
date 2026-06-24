// ─── CONFIG ───────────────────────────────────────────────────────────────────
let sb = null;

function initClient(url, key) {
  sb = window.supabase.createClient(url, key);
}
let currentUser = null;
const TIPOS = ["Consulta","Limpeza","Restauração","Extração","Canal","Avaliação Ortodôntica","Manutenção","Outro"];
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
let agFiltros = { data:"", dent:"", status:"" };

async function agenda() {
  pageLoading();
  try {
    const { data: dents } = await sb.from("dentistas").select("nome").order("nome");
    renderAgenda(dents || []);
    await fetchAgenda();
  } catch (e) {
    $("content").innerHTML = `<div style="color:var(--coral);padding:20px;">Erro: ${e.message}</div>`;
  }
}

function renderAgenda(dents) {
  const _perfil = currentUser.perfil;
  $("content").innerHTML = `
    <div class="toolbar">
      <input type="date" id="f-data" value="${agFiltros.data}" onchange="agFiltros.data=this.value;fetchAgenda()" style="width:160px;"/>
      <select id="f-dent" onchange="agFiltros.dent=this.value;fetchAgenda()">
        <option value="">Todos os dentistas</option>
        ${dents.map(d=>`<option value="${d.nome}" ${agFiltros.dent===d.nome?"selected":""}>${d.nome}</option>`).join("")}
      </select>
      <select id="f-status" onchange="agFiltros.status=this.value;fetchAgenda()">
        <option value="">Todos os status</option>
        <option value="Confirmado" ${agFiltros.status==="Confirmado"?"selected":""}>Confirmado</option>
        <option value="Agendado"   ${agFiltros.status==="Agendado"?"selected":""}>Agendado</option>
      </select>
      <button class="btn-secondary" style="font-size:12px;" onclick="agFiltros={data:'',dent:'',status:''};agenda()">Limpar</button>
      <div class="toolbar-right"><button class="btn-primary" onclick="novoAgendamento()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Novo Agendamento</button></div>
    </div>
    <div class="table-wrap" id="agenda-wrap">
      <div class="table-header"><span class="table-title">Agendamentos</span><span id="ag-count" style="color:var(--ink60);font-size:12px;"></span></div>
      <div id="agenda-table-body"></div>
    </div>`;
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

  const perfil   = currentUser.perfil;
  const isAdmin  = perfil === "Administrador";
  const isAtend  = perfil === "Atendente";
  const isDent   = perfil === "Dentista";
  // Dentistas e Admins têm controle total; Atendentes podem tudo exceto excluir
  const podeAcao = isAdmin || isAtend || isDent;
  const podeExcluir = isAdmin || isDent;

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
          <td>
            ${podeAcao ? `<button class="btn-sm" onclick="toggleAgStatus('${a.id}','${a.status}')">${a.status==="Agendado"?"Confirmar":"Reabrir"}</button>` : ""}
            ${podeAcao ? `<button class="btn-sm" onclick="editarAgendamento('${a.id}')">Editar</button>` : ""}
            ${podeExcluir ? `<button class="btn-danger-sm" onclick="excluirAgendamento('${a.id}')">Excluir</button>` : ""}
          </td>
        </tr>`).join("")}
    </tbody></table>`;
}

async function toggleAgStatus(id, current) {
  const ciclo = {
    "Agendado":       "Confirmado",
    "Confirmado":     "Em Atendimento",
    "Em Atendimento": "Concluído",
    "Concluído":      "Agendado",
    "Falta":          "Agendado",
    "Cancelado":      "Agendado",
  };
  const novoStatus = ciclo[current] || "Agendado";
  const { error } = await sb.from("agendamentos").update({ status: novoStatus }).eq("id", id);
  if (error) { toast("Erro ao atualizar status.", "error"); return; }
  toast(`Status → ${novoStatus}`, "ok");
  await fetchAgenda();
}

async function marcarStatus(id, status) {
  if (!confirm(`Marcar como "${status}"?`)) return;
  const { error } = await sb.from("agendamentos").update({ status }).eq("id", id);
  if (error) { toast("Erro: " + error.message, "error"); return; }
  toast(`Marcado como ${status}.`, "ok");
  await fetchAgenda();
}

async function excluirAgendamento(id) {
  if (!confirm("Excluir este agendamento? Esta ação não pode ser desfeita.")) return;
  const { error } = await sb.from("agendamentos").delete().eq("id", id);
  if (error) { toast("Erro ao excluir: " + error.message, "error"); return; }
  toast("Agendamento excluído.", "ok");
  await fetchAgenda();
}

async function novoAgendamento() {
  const [{ data: pacs }, { data: dents }] = await Promise.all([
    sb.from("pacientes").select("id,nome").order("nome"),
    sb.from("dentistas").select("id,nome").order("nome"),
  ]);

  openModal("Novo Agendamento", `
    <div class="form-group"><label>Paciente *</label>
      <select id="ag-pac"><option value="">Selecione o paciente</option>
        ${(pacs||[]).map(p=>`<option value="${p.id}|${p.nome}">${p.nome}</option>`).join("")}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Nº Convênio</label><input type="text" id="ag-conv"/></div>
      <div class="form-group"><label>Telefone</label><input type="text" id="ag-tel"/></div>
    </div>
    <div class="form-group"><label>Dentista *</label>
      <select id="ag-dent"><option value="">Selecione o dentista</option>
        ${(dents||[]).map(d=>`<option value="${d.id}|${d.nome}">${d.nome}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label>Tipo de Atendimento</label>
      <select id="ag-tipo">${TIPOS.map(t=>`<option>${t}</option>`).join("")}</select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Data *</label><input type="date" id="ag-data"/></div>
      <div class="form-group"><label>Horário *</label><input type="time" id="ag-hora"/></div>
    </div>
    <div class="form-group"><label>Status</label>
      <select id="ag-status"><option>Agendado</option><option>Confirmado</option></select>
    </div>`, async () => {
      const pacVal  = $("ag-pac").value;
      const dentVal = $("ag-dent").value;
      const data    = $("ag-data").value;
      const hora    = $("ag-hora").value;

      if (!pacVal || !dentVal || !data || !hora) { toast("Preencha os campos obrigatórios.", "error"); return; }

      const [pacId, pacNome]   = pacVal.split("|");
      const [dentId, dentNome] = dentVal.split("|");

      // Verificar conflito (RN-01)
      const { data: conflito } = await sb.from("agendamentos")
        .select("id").eq("dentista_id", dentId).eq("data", data).eq("hora", hora).limit(1);
      if (conflito?.length) { toast("Conflito! Dentista já tem consulta neste horário.", "error"); return; }

      const { error } = await sb.from("agendamentos").insert({
        paciente_id: pacId, paciente_nome: pacNome,
        dentista_id: dentId, dentista_nome: dentNome,
        tipo: $("ag-tipo").value, data, hora: hora + ":00",
        status: $("ag-status").value,
        convenio: $("ag-conv").value, telefone: $("ag-tel").value,
      });

      if (error) { toast("Erro ao salvar: " + error.message, "error"); return; }
      toast("Agendamento criado!", "success");
      closeModal();
      await fetchAgenda();
  }, "Agendar");
}

// ─── PACIENTES ───────────────────────────────────────────────────────────────
let pacBusca = "";

// ─── PACIENTES ───────────────────────────────────────────────────────────────
// pacBusca já declarado

async function pacientes() {
  pageLoading();
  await renderPacientes();
}

let _pacTimer;
function debouncePac() { clearTimeout(_pacTimer); _pacTimer = setTimeout(loadPacientes, 300); }

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

async function excluirPaciente(id, nome) {
  if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
  const { error } = await sb.from("pacientes").delete().eq("id", id);
  if (error) { toast("Erro: " + error.message, "error"); return; }
  toast("Paciente excluído.", "ok");
  await renderPacientes();
}

// ─── DENTISTAS ───────────────────────────────────────────────────────────────
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

async function excluirDentista(id, nome) {
  if (!confirm(`Excluir "${nome}"?`)) return;
  const { error } = await sb.from("dentistas").delete().eq("id", id);
  if (error) { toast("Erro: " + error.message, "error"); return; }
  toast("Dentista excluído.", "success");
  await dentistas();
}

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

async function toggleUsuario(id, current) {
  if (id === currentUser.id) { toast("Você não pode alterar seu próprio status.", "error"); return; }
  const novoStatus = current === "Ativo" ? "Inativo" : "Ativo";
  const { error } = await sb.from("usuarios").update({ status: novoStatus }).eq("id", id);
  if (error) { toast("Erro: " + error.message, "error"); return; }
  toast(`Usuário ${novoStatus.toLowerCase()}.`, "success");
  await usuarios();
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

function clicarDente(num, modo) {
  const dados = modo === "exame" ? _odontExame : _odontTrat;
  if (dados[num] === _statusSel) {
    delete dados[num]; // toggle off
  } else {
    dados[num] = _statusSel;
  }
  renderOdontograma(modo === "exame" ? "odont-exame" : "odont-trat", dados, modo);
}

async function verProntuarioPaciente(pacienteId) {
  pageLoading();
  _pacIdAtual = pacienteId;

  const [{ data: p }, { data: pront }, { data: hist }] = await Promise.all([
    sb.from("pacientes").select("*").eq("id", pacienteId).single(),
    sb.from("prontuarios").select("*").eq("paciente_id", pacienteId).maybeSingle(),
    sb.from("agendamentos").select("*").eq("paciente_id", pacienteId).order("data", { ascending: false }),
  ]);

  const an = pront || {};
  _odontExame = an.odontograma_exame     || {};
  _odontTrat  = an.odontograma_tratamento || {};

  // Documento completo
  $("content").innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary" onclick="fichaPaciente('${pacienteId}')" style="padding:6px 12px;font-size:13px;">← Voltar</button>
      <h2>📋 Prontuário</h2>
      <div style="margin-left:auto;display:flex;gap:8px;">
        <button class="btn btn-secondary" style="padding:6px 14px;font-size:13px;" onclick="imprimirProntuario('${pacienteId}')">🖨️ Imprimir</button>
        <button class="btn btn-primary"   style="padding:6px 14px;font-size:13px;" onclick="salvarProntuario('${pacienteId}')">💾 Salvar</button>
      </div>
    </div>

    <!-- DADOS DO PACIENTE -->
    <div class="ficha-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div class="ficha-sec" style="margin:0;">Dados do Paciente</div>
        <div style="font-size:13px;color:var(--ink60);">Prontuário Nº <strong>${esc(p.num_prontuario||"—")}</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 20px;">
        <div style="grid-column:1/-1;"><div class="ficha-label">Paciente</div><div class="ficha-value" style="font-size:16px;font-weight:700;">${esc(p.nome)}</div></div>
        <div><div class="ficha-label">FUSEx Nº</div><input class="pront-input" id="pr-fusex" value="${esc(p.fusex_num||"")}" placeholder="—"/></div>
        <div><div class="ficha-label">OM</div><input class="pront-input" id="pr-om" value="${esc(p.om||"")}" placeholder="—"/></div>
        <div><div class="ficha-label">Sit. Militar</div><input class="pront-input" id="pr-sitmil" value="${esc(p.sit_militar||"")}" placeholder="—"/></div>
        <div><div class="ficha-label">Nascimento</div><div class="ficha-value">${fmtDate(p.nascimento)}</div></div>
        <div><div class="ficha-label">Naturalidade</div><input class="pront-input" id="pr-nat" value="${esc(p.naturalidade||"")}" placeholder="—"/></div>
        <div><div class="ficha-label">Grupo</div><div class="ficha-value"><span class="chip">${esc(p.grupo||"—")}</span></div></div>
        <div><div class="ficha-label">Filiação (Pai)</div><input class="pront-input" id="pr-pai" value="${esc(p.filiacao_pai||"")}" placeholder="—"/></div>
        <div><div class="ficha-label">Filiação (Mãe)</div><input class="pront-input" id="pr-mae" value="${esc(p.filiacao_mae||"")}" placeholder="—"/></div>
        <div></div>
        <div><div class="ficha-label">Titular</div><input class="pront-input" id="pr-titular" value="${esc(p.titular||"")}" placeholder="—"/></div>
        <div><div class="ficha-label">Posto/Grad</div><input class="pront-input" id="pr-posto" value="${esc(p.posto_grad||"")}" placeholder="—"/></div>
        <div></div>
        <div style="grid-column:1/3;"><div class="ficha-label">Endereço</div><div class="ficha-value">${esc(p.endereco||"—")}</div></div>
        <div><div class="ficha-label">Contato</div><div class="ficha-value">${esc(p.telefone||"—")}</div></div>
      </div>
    </div>

    <!-- ANAMNESE -->
    <div class="ficha-card">
      <div class="ficha-sec">Anamnese</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group" style="margin:0;"><label>Alergias</label><input type="text" id="an-alergias" value="${esc(an.alergias||"")}" placeholder="Ex: Penicilina, látex"/></div>
        <div class="form-group" style="margin:0;"><label>Medicamentos em Uso</label><input type="text" id="an-medic" value="${esc(an.medicamentos||"")}" placeholder="Ex: Losartana 50mg"/></div>
        <div class="form-group" style="margin:0;"><label>Doenças / Condições</label><input type="text" id="an-doencas" value="${esc(an.doencas||"")}" placeholder="Ex: Hipertensão, Diabetes"/></div>
        <div class="form-group" style="margin:0;"><label>Histórico Odontológico</label><input type="text" id="an-hist" value="${esc(an.historico_odonto||"")}" placeholder="Ex: Canal em 2023"/></div>
        <div class="form-group" style="margin:0;grid-column:1/-1;"><label>Observações Gerais</label><textarea id="an-obs" style="min-height:60px;">${esc(an.observacoes||"")}</textarea></div>
      </div>
    </div>

    <!-- ODONTOGRAMA -->
    <div class="ficha-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div class="ficha-sec" style="margin:0;">Odontograma</div>
        <div style="display:flex;gap:6px;">
          <button onclick="setModoOdont('exame')"    id="btn-exame" class="btn btn-primary"   style="padding:5px 14px;font-size:12px;">Exame</button>
          <button onclick="setModoOdont('tratamento')" id="btn-trat" class="btn btn-secondary" style="padding:5px 14px;font-size:12px;">Tratamento</button>
        </div>
      </div>

      <!-- Legenda / seletor de status -->
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;" id="legenda-odont">
        ${Object.entries(STATUS_DENTE).map(([k,v]) => `
          <button onclick="setStatusDente('${k}')" id="st-${k}"
            style="border:2px solid ${v.cor};background:${v.fundo};color:${v.cor};border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;">
            ${k} — ${v.label}
          </button>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--ink60);margin-bottom:12px;">
        Clique em um status acima para selecioná-lo, depois clique no dente. Clique no mesmo dente novamente para limpar.
      </div>

      <!-- Tabs Exame / Tratamento -->
      <div id="odont-exame" style="display:block;"></div>
      <div id="odont-trat"  style="display:none;"></div>
    </div>

    <!-- HISTÓRICO DE CONSULTAS -->
    <div class="table-wrap" style="margin-bottom:28px;">
      <div class="table-header"><span class="table-title">Histórico de Consultas</span><span class="table-count">${(hist||[]).length} registro${(hist||[]).length!==1?"s":""}</span></div>
      <table>
        <thead><tr><th>Data</th><th>Dentista</th><th>Tipo</th><th>Procedimento</th><th>Observações</th><th>Status</th></tr></thead>
        <tbody>
          ${(hist||[]).length===0
            ? `<tr class="empty-row"><td colspan="6">Sem consultas registradas.</td></tr>`
            : (hist||[]).map(a=>`<tr>
                <td>${fmtDate(a.data)} <span style="color:var(--ink60);font-size:11px;">${(a.hora||"").slice(0,5)}</span></td>
                <td>${esc(a.dentista_nome)}</td>
                <td>${esc(a.tipo)}</td>
                <td>${esc(a.procedimento_realizado||"—")}</td>
                <td style="max-width:200px;white-space:pre-wrap;font-size:12px;">${esc(a.observacao_consulta||"—")}</td>
                <td>${badge(a.status)}</td>
              </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  // Renderiza odontogramas
  setStatusDente('C');
  renderOdontograma("odont-exame", _odontExame, "exame");
  renderOdontograma("odont-trat",  _odontTrat,  "tratamento");
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

function imprimirProntuario(pacienteId) {
  // Salva antes de imprimir
  salvarProntuario(pacienteId).then(() => {
    window.print();
  });
}