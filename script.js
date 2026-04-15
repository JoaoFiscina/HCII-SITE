const STORAGE_KEY = "atlas-cirurgico-de-bolso:v1";

const appState = {
  procedures: [],
  selectedProcedureId: null,
  mode: "study",
  searchTerm: "",
  selectedCategory: "all",
  progress: {},
  dataStatus: "loading"
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  procedureCountBadge: document.querySelector("#procedureCountBadge"),
  procedureList: document.querySelector("#procedureList"),
  loadMessage: document.querySelector("#loadMessage"),
  manualImportButton: document.querySelector("#manualImportButton"),
  jsonFileInput: document.querySelector("#jsonFileInput"),
  clearSavedProgressButton: document.querySelector("#clearSavedProgressButton"),
  emptyState: document.querySelector("#emptyState"),
  procedureView: document.querySelector("#procedureView"),
  selectedCategory: document.querySelector("#selectedCategory"),
  selectedStepSummary: document.querySelector("#selectedStepSummary"),
  selectedProcedureName: document.querySelector("#selectedProcedureName"),
  selectedProcedureDescription: document.querySelector("#selectedProcedureDescription"),
  heroImageWrapper: document.querySelector("#heroImageWrapper"),
  heroImage: document.querySelector("#heroImage"),
  studyModeButton: document.querySelector("#studyModeButton"),
  sequenceModeButton: document.querySelector("#sequenceModeButton"),
  backToStartButton: document.querySelector("#backToStartButton"),
  overviewCards: document.querySelector("#overviewCards"),
  detailsContainer: document.querySelector("#detailsContainer"),
  checklistProgressText: document.querySelector("#checklistProgressText"),
  studyStepsList: document.querySelector("#studyStepsList"),
  clearChecklistButton: document.querySelector("#clearChecklistButton"),
  studyView: document.querySelector("#studyView"),
  sequenceSection: document.querySelector("#sequenceSection"),
  previousStepButton: document.querySelector("#previousStepButton"),
  nextStepButton: document.querySelector("#nextStepButton"),
  restartSequenceButton: document.querySelector("#restartSequenceButton"),
  sequenceCounter: document.querySelector("#sequenceCounter"),
  sequenceProgressBar: document.querySelector("#sequenceProgressBar"),
  sequenceIntro: document.querySelector("#sequenceIntro"),
  sequenceStepsList: document.querySelector("#sequenceStepsList")
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  restoreState();
  bindEvents();
  render();
  await loadProcedures();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    appState.searchTerm = event.target.value.trim().toLowerCase();
    renderProcedureList();
    persistState();
  });

  elements.categoryFilter.addEventListener("change", (event) => {
    appState.selectedCategory = event.target.value;
    renderProcedureList();
    persistState();
  });

  elements.manualImportButton.addEventListener("click", () => {
    elements.jsonFileInput.click();
  });

  elements.jsonFileInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      applyLoadedData(data);
      showMessage(`Arquivo importado com sucesso: ${file.name}.`, "warning");
    } catch (error) {
      showMessage(`Não foi possível importar o JSON: ${error.message}`, "error");
    } finally {
      elements.jsonFileInput.value = "";
    }
  });

  elements.clearSavedProgressButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Limpar o progresso salvo removerá checklist, sequência e o último procedimento aberto. Deseja continuar?"
    );

    if (!confirmed) {
      return;
    }

    appState.progress = {};
    appState.selectedProcedureId = null;
    appState.mode = "study";
    persistState();
    render();
    showMessage("Progresso salvo removido.", "warning");
  });

  elements.studyModeButton.addEventListener("click", () => {
    appState.mode = "study";
    persistState();
    renderMode();
  });

  elements.sequenceModeButton.addEventListener("click", () => {
    appState.mode = "sequence";
    persistState();
    renderMode();
  });

  elements.backToStartButton.addEventListener("click", () => {
    const procedure = getSelectedProcedure();

    if (procedure) {
      ensureProcedureProgress(procedure.id).sequenceIndex = 0;
    }

    appState.selectedProcedureId = null;
    persistState();
    render();
  });

  elements.clearChecklistButton.addEventListener("click", () => {
    const procedure = getSelectedProcedure();

    if (!procedure) {
      return;
    }

    ensureProcedureProgress(procedure.id).checklist = [];
    persistState();
    renderStudyView(procedure);
  });

  elements.previousStepButton.addEventListener("click", () => {
    updateSequenceBy(-1);
  });

  elements.nextStepButton.addEventListener("click", () => {
    updateSequenceBy(1);
  });

  elements.restartSequenceButton.addEventListener("click", () => {
    const procedure = getSelectedProcedure();

    if (!procedure) {
      return;
    }

    ensureProcedureProgress(procedure.id).sequenceIndex = 0;
    persistState();
    renderSequenceView(procedure);
  });

  elements.procedureList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-procedure-id]");

    if (!card) {
      return;
    }

    selectProcedure(card.dataset.procedureId);
  });

  elements.studyStepsList.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-step-number]");

    if (!checkbox) {
      return;
    }

    const procedure = getSelectedProcedure();

    if (!procedure) {
      return;
    }

    toggleChecklistStep(procedure.id, Number(checkbox.dataset.stepNumber), checkbox.checked);
  });
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

    appState.selectedProcedureId = saved.selectedProcedureId || null;
    appState.mode = saved.mode === "sequence" ? "sequence" : "study";
    appState.searchTerm = typeof saved.searchTerm === "string" ? saved.searchTerm : "";
    appState.selectedCategory = typeof saved.selectedCategory === "string" ? saved.selectedCategory : "all";
    appState.progress = saved.progress && typeof saved.progress === "object" ? saved.progress : {};
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }

  elements.searchInput.value = appState.searchTerm;
}

function persistState() {
  // Guarda apenas o minimo necessario para restaurar a sessao do estudante.
  const payload = {
    selectedProcedureId: appState.selectedProcedureId,
    mode: appState.mode,
    searchTerm: appState.searchTerm,
    selectedCategory: appState.selectedCategory,
    progress: appState.progress
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

async function loadProcedures() {
  try {
    const response = await fetch("procedimentos.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    applyLoadedData(data);
  } catch (error) {
    appState.dataStatus = "error";
    appState.procedures = [];
    appState.selectedProcedureId = null;
    render();

    // Alguns navegadores bloqueiam fetch local em file://, entao oferecemos importacao manual.
    if (window.location.protocol === "file:") {
      showMessage(
        "O navegador bloqueou a leitura automática do JSON local. Abra por um servidor simples ou use o botão Importar JSON.",
        "warning"
      );
      return;
    }

    showMessage(`Não foi possível carregar procedimentos.json: ${error.message}`, "error");
  }
}

function applyLoadedData(data) {
  const procedures = normalizeProcedures(data);

  appState.procedures = procedures;
  appState.dataStatus = procedures.length ? "ready" : "empty";
  populateCategoryFilter();

  if (!procedures.length) {
    appState.selectedProcedureId = null;
    render();
    showMessage("O JSON foi carregado, mas ainda não há procedimentos cadastrados.", "warning");
    return;
  }

  const restoredProcedure = procedures.find((item) => item.id === appState.selectedProcedureId);
  appState.selectedProcedureId = restoredProcedure ? restoredProcedure.id : null;

  clampProgress();
  persistState();
  render();
  showMessage("", "");
}

function normalizeProcedures(data) {
  if (!data || !Array.isArray(data.procedimentos)) {
    throw new Error("Estrutura inválida. Esperado um objeto com a chave procedimentos.");
  }

  return data.procedimentos
    .map((procedure) => {
      const steps = Array.isArray(procedure.passos)
        ? procedure.passos
            .map((step, index) => ({
              numero: Number.isFinite(Number(step.numero)) ? Number(step.numero) : index + 1,
              titulo: String(step.titulo || `Passo ${index + 1}`),
              descricao: String(step.descricao || ""),
              critico: Boolean(step.critico),
              alerta: String(step.alerta || ""),
              imagem: String(step.imagem || "")
            }))
            .sort((a, b) => a.numero - b.numero)
        : [];

      return {
        id: String(procedure.id || createFallbackId(procedure.nome, Math.random())),
        nome: String(procedure.nome || "Procedimento sem nome"),
        categoria: String(procedure.categoria || "Sem categoria"),
        descricao_curta: String(procedure.descricao_curta || "Sem descrição resumida."),
        indicacoes: sanitizeStringArray(procedure.indicacoes),
        contraindicacoes: sanitizeStringArray(procedure.contraindicacoes),
        preparo: sanitizeStringArray(procedure.preparo),
        materiais: sanitizeStringArray(procedure.materiais),
        acoes_iniciais: sanitizeStringArray(procedure.acoes_iniciais),
        passos: steps,
        observacoes_finais: sanitizeStringArray(procedure.observacoes_finais),
        referencias: sanitizeStringArray(procedure.referencias),
        imagem_capa: String(procedure.imagem_capa || "")
      };
    })
    .filter((procedure) => procedure.id && procedure.nome);
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function clampProgress() {
  appState.procedures.forEach((procedure) => {
    const entry = ensureProcedureProgress(procedure.id);
    const validStepNumbers = new Set(procedure.passos.map((step) => step.numero));

    entry.checklist = entry.checklist.filter((stepNumber) => validStepNumbers.has(stepNumber));
    entry.sequenceIndex = Math.max(0, Math.min(entry.sequenceIndex, procedure.passos.length));
  });
}

function populateCategoryFilter() {
  const categories = [...new Set(appState.procedures.map((item) => item.categoria))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  elements.categoryFilter.innerHTML = `
    <option value="all">Todas as categorias</option>
    ${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
  `;

  if (!categories.includes(appState.selectedCategory)) {
    appState.selectedCategory = "all";
  }

  elements.categoryFilter.value = appState.selectedCategory;
}

function render() {
  renderProcedureList();
  renderSelectedProcedure();
  renderMode();
}

function renderProcedureList() {
  const procedures = getFilteredProcedures();
  const total = appState.procedures.length;

  elements.procedureCountBadge.textContent = `${procedures.length} / ${total}`;

  if (!appState.procedures.length) {
    elements.procedureList.innerHTML = `
      <div class="empty-procedures">
        Nenhum procedimento disponível no momento.
      </div>
    `;
    return;
  }

  if (!procedures.length) {
    elements.procedureList.innerHTML = `
      <div class="empty-procedures">
        Nenhum procedimento corresponde aos filtros atuais.
      </div>
    `;
    return;
  }

  elements.procedureList.innerHTML = procedures
    .map((procedure) => {
      const progress = ensureProcedureProgress(procedure.id);
      const checkedCount = progress.checklist.length;
      const totalSteps = procedure.passos.length;

      return `
        <article class="procedure-card ${procedure.id === appState.selectedProcedureId ? "is-active" : ""}" data-procedure-id="${escapeHtml(procedure.id)}">
          <span class="badge muted">${escapeHtml(procedure.categoria)}</span>
          <h3>${escapeHtml(procedure.nome)}</h3>
          <p>${escapeHtml(procedure.descricao_curta)}</p>
          <div class="procedure-card-footer">
            <span>${totalSteps} passos</span>
            <span>${checkedCount} marcados</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSelectedProcedure() {
  const procedure = getSelectedProcedure();

  if (!procedure) {
    elements.emptyState.classList.remove("hidden");
    elements.procedureView.classList.add("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.procedureView.classList.remove("hidden");

  elements.selectedCategory.textContent = procedure.categoria;
  elements.selectedStepSummary.textContent = `${procedure.passos.length} passos`;
  elements.selectedProcedureName.textContent = procedure.nome;
  elements.selectedProcedureDescription.textContent = procedure.descricao_curta;

  if (procedure.imagem_capa) {
    elements.heroImageWrapper.classList.remove("hidden");
    elements.heroImage.src = procedure.imagem_capa;
    elements.heroImage.alt = `Imagem ilustrativa de ${procedure.nome}`;
  } else {
    elements.heroImageWrapper.classList.add("hidden");
    elements.heroImage.removeAttribute("src");
    elements.heroImage.alt = "";
  }

  renderStudyView(procedure);
  renderSequenceView(procedure);
}

function renderStudyView(procedure) {
  const progress = ensureProcedureProgress(procedure.id);
  const checklistCount = progress.checklist.length;

  elements.overviewCards.innerHTML = [
    createOverviewCard("Ações iniciais", procedure.acoes_iniciais),
    createOverviewCard("Indicações", procedure.indicacoes),
    createOverviewCard("Contraindicações", procedure.contraindicacoes),
    createOverviewCard("Materiais", procedure.materiais)
  ].join("");

  elements.detailsContainer.innerHTML = [
    createDetailPanel("Indicações", procedure.indicacoes, true),
    createDetailPanel("Contraindicações", procedure.contraindicacoes, false),
    createDetailPanel("Preparo", procedure.preparo, true),
    createDetailPanel("Materiais", procedure.materiais, false),
    createDetailPanel("Ações iniciais", procedure.acoes_iniciais, true),
    createDetailPanel("Observações finais", procedure.observacoes_finais, false),
    createDetailPanel("Referências", procedure.referencias, false)
  ]
    .filter(Boolean)
    .join("");

  elements.checklistProgressText.textContent = `${checklistCount} de ${procedure.passos.length} passos marcados como concluídos.`;

  elements.studyStepsList.innerHTML = procedure.passos
    .map((step) => {
      const checked = progress.checklist.includes(step.numero);

      return `
        <article class="step-card ${checked ? "is-checked" : ""} ${step.critico ? "is-critical" : ""}">
          <div class="step-topline">
            <div class="step-title-group">
              <span class="step-number">${step.numero}</span>
              <div class="step-meta">
                <h4>${escapeHtml(step.titulo)}</h4>
                <div class="step-badges">
                  ${step.critico ? '<span class="badge critical-badge">Etapa crítica</span>' : ""}
                  ${checked ? '<span class="badge checked-badge">Concluído</span>' : ""}
                </div>
              </div>
            </div>
          </div>

          <p class="step-description">${escapeHtml(step.descricao)}</p>
          ${step.alerta ? `<div class="step-alert">${escapeHtml(step.alerta)}</div>` : ""}
          ${step.imagem ? createImageBlock(step.imagem, `Imagem do passo ${step.numero}: ${step.titulo}`) : ""}

          <div class="step-actions">
            <label class="step-check">
              <input type="checkbox" data-step-number="${step.numero}" ${checked ? "checked" : ""} />
              <span>Marcar como concluído</span>
            </label>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSequenceView(procedure) {
  const progress = ensureProcedureProgress(procedure.id);
  const totalSteps = procedure.passos.length;
  // Revela a sequencia de forma cumulativa para manter o treino mental da ordem correta.
  const revealedSteps = procedure.passos.slice(0, progress.sequenceIndex);
  const percentage = totalSteps ? (progress.sequenceIndex / totalSteps) * 100 : 0;

  elements.sequenceCounter.textContent = `${progress.sequenceIndex} / ${totalSteps}`;
  elements.sequenceProgressBar.style.width = `${percentage}%`;
  elements.previousStepButton.disabled = progress.sequenceIndex === 0;
  elements.nextStepButton.disabled = progress.sequenceIndex >= totalSteps;
  elements.restartSequenceButton.disabled = progress.sequenceIndex === 0;
  elements.sequenceIntro.classList.toggle("hidden", revealedSteps.length > 0);

  if (!revealedSteps.length) {
    elements.sequenceStepsList.innerHTML = "";
    return;
  }

  elements.sequenceStepsList.innerHTML = revealedSteps
    .map(
      (step, index) => `
        <article class="step-card ${step.critico ? "is-critical" : ""}">
          <div class="step-topline">
            <div class="step-title-group">
              <span class="step-number">${step.numero}</span>
              <div class="step-meta">
                <h4>${escapeHtml(step.titulo)}</h4>
                <div class="step-badges">
                  ${step.critico ? '<span class="badge critical-badge">Etapa crítica</span>' : ""}
                  ${index === revealedSteps.length - 1 ? '<span class="badge checked-badge">Passo atual</span>' : ""}
                </div>
              </div>
            </div>
          </div>

          <p class="step-description">${escapeHtml(step.descricao)}</p>
          ${step.alerta ? `<div class="step-alert">${escapeHtml(step.alerta)}</div>` : ""}
          ${step.imagem ? createImageBlock(step.imagem, `Imagem do passo ${step.numero}: ${step.titulo}`) : ""}
        </article>
      `
    )
    .join("");
}

function renderMode() {
  const procedure = getSelectedProcedure();
  const isSequence = appState.mode === "sequence";

  elements.studyView.classList.toggle("hidden", isSequence);
  elements.sequenceSection.classList.toggle("hidden", !isSequence);
  elements.studyModeButton.classList.toggle("button-primary", !isSequence);
  elements.studyModeButton.classList.toggle("button-secondary", isSequence);
  elements.sequenceModeButton.classList.toggle("button-primary", isSequence);
  elements.sequenceModeButton.classList.toggle("button-secondary", !isSequence);
  elements.studyModeButton.setAttribute("aria-pressed", String(!isSequence));
  elements.sequenceModeButton.setAttribute("aria-pressed", String(isSequence));

  if (procedure && isSequence) {
    renderSequenceView(procedure);
  }
}

function createOverviewCard(title, items) {
  if (!items.length) {
    return `
      <article class="overview-card">
        <h3>${escapeHtml(title)}</h3>
        <p class="sidebar-copy">Sem itens cadastrados.</p>
      </article>
    `;
  }

  return `
    <article class="overview-card">
      <h3>${escapeHtml(title)}</h3>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function createDetailPanel(title, items, openByDefault) {
  if (!items.length) {
    return "";
  }

  return `
    <details class="detail-panel" ${openByDefault ? "open" : ""}>
      <summary>${escapeHtml(title)}</summary>
      <div class="detail-content">
        <ul class="detail-list">
          ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
    </details>
  `;
}

function createImageBlock(src, alt) {
  return `
    <div class="step-image">
      <img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy" />
    </div>
  `;
}

function getFilteredProcedures() {
  return appState.procedures.filter((procedure) => {
    const matchesSearch = !appState.searchTerm || procedure.nome.toLowerCase().includes(appState.searchTerm);
    const matchesCategory =
      appState.selectedCategory === "all" || procedure.categoria === appState.selectedCategory;

    return matchesSearch && matchesCategory;
  });
}

function getSelectedProcedure() {
  return appState.procedures.find((procedure) => procedure.id === appState.selectedProcedureId) || null;
}

function ensureProcedureProgress(procedureId) {
  if (!appState.progress[procedureId]) {
    appState.progress[procedureId] = {
      checklist: [],
      sequenceIndex: 0
    };
  }

  return appState.progress[procedureId];
}

function selectProcedure(procedureId) {
  if (!appState.procedures.find((procedure) => procedure.id === procedureId)) {
    return;
  }

  appState.selectedProcedureId = procedureId;
  persistState();
  render();
}

function toggleChecklistStep(procedureId, stepNumber, checked) {
  const entry = ensureProcedureProgress(procedureId);
  const nextChecklist = new Set(entry.checklist);

  if (checked) {
    nextChecklist.add(stepNumber);
  } else {
    nextChecklist.delete(stepNumber);
  }

  entry.checklist = [...nextChecklist].sort((a, b) => a - b);
  persistState();

  const procedure = getSelectedProcedure();

  if (procedure) {
    renderStudyView(procedure);
  }
}

function updateSequenceBy(amount) {
  const procedure = getSelectedProcedure();

  if (!procedure) {
    return;
  }

  const entry = ensureProcedureProgress(procedure.id);
  entry.sequenceIndex = Math.max(0, Math.min(entry.sequenceIndex + amount, procedure.passos.length));

  persistState();
  renderSequenceView(procedure);
}

function showMessage(text, variant) {
  if (!text) {
    elements.loadMessage.textContent = "";
    elements.loadMessage.className = "message hidden";
    return;
  }

  elements.loadMessage.textContent = text;
  elements.loadMessage.className = `message ${variant || ""}`.trim();
}

function createFallbackId(name, seed) {
  return `${String(name || "procedimento")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")}_${String(seed).replace(/\W+/g, "")}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
