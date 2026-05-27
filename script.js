const STORAGE_KEY = "atlas-cirurgico-de-bolso:v2";
const CONFIG_PATH = "config/app-config.json";
const MANIFEST_FILENAME = "procedimentos-manifest.json";
const SUPPORTED_EXTENSIONS = [".json", ".txt"];
const DEBUG_PREFIX = "[Guia LACIR]";
const DEFAULT_APP_CONFIG = {
  github: {
    owner: "JoaoFiscina",
    repo: "HCII-SITE",
    branch: "main",
    proceduresPath: "procedimentos"
  }
};
const LOCAL_EXAMPLE_FILES = [
  "procedimentos/reconstrucao_cutanea_por_enxertia.txt",
  "procedimentos/reconstrucao_cutanea_por_enxertia_importacao1.txt"
];
const SOURCE_PRIORITY = {
  local: 0,
  github: 1,
  manifest: 2,
  example: 3
};

const appState = {
  config: null,
  procedures: [],
  baseProcedures: [],
  localImports: {},
  baseIssues: [],
  mergeIssues: [],
  selectedProcedureId: null,
  mode: "study",
  sequencePanelPinned: true,
  searchTerm: "",
  selectedCategory: "all",
  progress: {},
  primarySource: {
    kind: "none",
    label: "Nenhuma",
    fileCount: 0,
    filesProcessed: 0
  },
  loading: {
    active: false,
    label: "Aguardando",
    current: 0,
    total: 0
  },
  statusDetail: "Aguardando inicialização."
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  procedureCountBadge: document.querySelector("#procedureCountBadge"),
  procedureList: document.querySelector("#procedureList"),
  loadMessage: document.querySelector("#loadMessage"),
  clearSavedProgressButton: document.querySelector("#clearSavedProgressButton"),
  reloadProceduresButton: document.querySelector("#reloadProceduresButton"),
  importSingleButton: document.querySelector("#importSingleButton"),
  importMultipleButton: document.querySelector("#importMultipleButton"),
  clearLocalImportsButton: document.querySelector("#clearLocalImportsButton"),
  singleFileInput: document.querySelector("#singleFileInput"),
  multipleFilesInput: document.querySelector("#multipleFilesInput"),
  emptyState: document.querySelector("#emptyState"),
  emptyStateTitle: document.querySelector("#emptyStateTitle"),
  emptyStateText: document.querySelector("#emptyStateText"),
  quickProcedurePicker: document.querySelector("#quickProcedurePicker"),
  quickProcedureSelect: document.querySelector("#quickProcedureSelect"),
  quickProcedureHint: document.querySelector("#quickProcedureHint"),
  randomProcedureButton: document.querySelector("#randomProcedureButton"),
  procedureView: document.querySelector("#procedureView"),
  selectedCategory: document.querySelector("#selectedCategory"),
  selectedStepSummary: document.querySelector("#selectedStepSummary"),
  selectedSourceBadge: document.querySelector("#selectedSourceBadge"),
  selectedFileLabel: document.querySelector("#selectedFileLabel"),
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
  sequenceSummary: document.querySelector("#sequenceSummary"),
  previousStepButton: document.querySelector("#previousStepButton"),
  nextStepButton: document.querySelector("#nextStepButton"),
  restartSequenceButton: document.querySelector("#restartSequenceButton"),
  toggleSequencePinButton: document.querySelector("#toggleSequencePinButton"),
  mobilePreviousStepButton: document.querySelector("#mobilePreviousStepButton"),
  mobileNextStepButton: document.querySelector("#mobileNextStepButton"),
  mobileRestartSequenceButton: document.querySelector("#mobileRestartSequenceButton"),
  sequenceCounter: document.querySelector("#sequenceCounter"),
  sequenceProgressBar: document.querySelector("#sequenceProgressBar"),
  sequenceIntro: document.querySelector("#sequenceIntro"),
  sequenceStepsList: document.querySelector("#sequenceStepsList"),
  statusMessage: document.querySelector("#statusMessage"),
  loadedProcedureCount: document.querySelector("#loadedProcedureCount"),
  statusProcedureBreakdown: document.querySelector("#statusProcedureBreakdown"),
  dataSourceLabel: document.querySelector("#dataSourceLabel"),
  configSummary: document.querySelector("#configSummary"),
  fileLoadSummary: document.querySelector("#fileLoadSummary"),
  issueSummary: document.querySelector("#issueSummary"),
  loadingLabel: document.querySelector("#loadingLabel"),
  loadingCounter: document.querySelector("#loadingCounter"),
  loadingProgressBar: document.querySelector("#loadingProgressBar"),
  issueCountBadge: document.querySelector("#issueCountBadge"),
  issuesList: document.querySelector("#issuesList")
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  logInfo("Início da inicialização.");

  try {
    restoreState();
    bindEvents();
    initializeLogoMarks();
    render();
    await bootstrapCatalog();
  } catch (error) {
    logError("Falha inesperada na inicialização.", error);
    setStatusDetail("Falha inesperada na inicialização. Você ainda pode usar a importação local.");
    setLoadingState(false, "Falha na inicialização", 0, 0);
    showMessage("A inicialização automática falhou. A importação local continua disponível.", "error");
  }
}

function logInfo(message, details) {
  if (details === undefined) {
    console.info(`${DEBUG_PREFIX} ${message}`);
    return;
  }

  console.info(`${DEBUG_PREFIX} ${message}`, details);
}

function logWarn(message, details) {
  if (details === undefined) {
    console.warn(`${DEBUG_PREFIX} ${message}`);
    return;
  }

  console.warn(`${DEBUG_PREFIX} ${message}`, details);
}

function logError(message, details) {
  if (details === undefined) {
    console.error(`${DEBUG_PREFIX} ${message}`);
    return;
  }

  console.error(`${DEBUG_PREFIX} ${message}`, details);
}

function initializeLogoMarks() {
  document.querySelectorAll("[data-logo-src]").forEach((logoMark) => {
    const image = logoMark.querySelector("img.lacir-logo");
    const fallback = logoMark.querySelector(".lacir-logo-fallback");
    const logoSrc = logoMark.dataset.logoSrc;

    if (!image || !fallback || !logoSrc) {
      return;
    }

    fallback.hidden = false;
    image.hidden = true;

    fetch(logoSrc, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          return;
        }

        image.addEventListener(
          "load",
          () => {
            image.hidden = false;
            fallback.hidden = true;
          },
          { once: true }
        );
        image.addEventListener(
          "error",
          () => {
            image.hidden = true;
            fallback.hidden = false;
          },
          { once: true }
        );
        image.src = logoSrc;
      })
      .catch(() => {
        image.hidden = true;
        fallback.hidden = false;
      });
  });
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    appState.searchTerm = event.target.value.trim().toLowerCase();
    persistState();
    renderProcedureList();
    renderQuickProcedurePicker();
  });

  elements.categoryFilter.addEventListener("change", (event) => {
    appState.selectedCategory = event.target.value;
    persistState();
    renderProcedureList();
    renderQuickProcedurePicker();
  });

  elements.quickProcedureSelect.addEventListener("change", (event) => {
    const procedureId = safeText(event.target.value);

    if (!procedureId) {
      return;
    }

    selectProcedure(procedureId);
  });

  elements.randomProcedureButton.addEventListener("click", () => {
    selectRandomProcedure();
  });

  elements.reloadProceduresButton.addEventListener("click", async () => {
    await reloadPrimaryProcedures();
  });

  elements.importSingleButton.addEventListener("click", () => {
    elements.singleFileInput.click();
  });

  elements.importMultipleButton.addEventListener("click", () => {
    elements.multipleFilesInput.click();
  });

  elements.singleFileInput.addEventListener("change", async (event) => {
    await importLocalFiles(event.target.files);
    elements.singleFileInput.value = "";
  });

  elements.multipleFilesInput.addEventListener("change", async (event) => {
    await importLocalFiles(event.target.files);
    elements.multipleFilesInput.value = "";
  });

  elements.clearLocalImportsButton.addEventListener("click", () => {
    appState.localImports = {};
    rebuildCatalog();
    showMessage("Importações locais temporárias removidas. Mantidos apenas os arquivos da fonte principal.", "success");
  });

  elements.clearSavedProgressButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Limpar o progresso salvo removerá checklist, sequência, filtros persistidos e o último roteiro aberto. Deseja continuar?"
    );

    if (!confirmed) {
      return;
    }

    appState.progress = {};
    appState.selectedProcedureId = null;
    appState.mode = "study";
    appState.searchTerm = "";
    appState.selectedCategory = "all";
    elements.searchInput.value = "";
    elements.categoryFilter.value = "all";
    persistState();
    render();
    showMessage("Progresso local removido com sucesso.", "success");
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
    restartSequence();
  });

  elements.toggleSequencePinButton.addEventListener("click", () => {
    appState.sequencePanelPinned = !appState.sequencePanelPinned;
    persistState();
    renderSequenceSummaryState();
  });

  elements.mobilePreviousStepButton.addEventListener("click", () => {
    updateSequenceBy(-1);
  });

  elements.mobileNextStepButton.addEventListener("click", () => {
    updateSequenceBy(1);
  });

  elements.mobileRestartSequenceButton.addEventListener("click", () => {
    restartSequence();
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

  document.addEventListener("keydown", handleSequenceShortcuts);
  window.addEventListener("scroll", updateSequenceSummaryState, { passive: true });
  window.addEventListener("resize", updateSequenceSummaryState);
}

async function bootstrapCatalog() {
  setLoadingState(true, "Lendo app-config.json", 0, 1);
  setStatusDetail("Lendo configuração...");

  const configResult = await loadAppConfig();

  appState.config = configResult.config;
  appState.baseIssues = configResult.issues;
  setLoadingState(false, "Configuração carregada", 1, 1);
  setStatusDetail(
    configResult.usedDefault
      ? "Falha ao ler config/app-config.json, usando configuração padrão embutida."
      : "Configuração carregada."
  );

  if (configResult.usedDefault) {
    showMessage("Configuração padrão embutida ativada porque app-config.json falhou ou estava inválido.", "warning");
  }

  await reloadPrimaryProcedures();
}

async function reloadPrimaryProcedures() {
  const configIssues = appState.baseIssues.filter((issue) => issue.sourceKind === "config");

  try {
    if (!appState.config) {
      logWarn("Configuração ausente; não foi possível iniciar a leitura automática.");
      setStatusDetail("Nenhuma configuração disponível. Importe um arquivo local para continuar.");
      showMessage("A configuração do app não está disponível. Corrija app-config.json para habilitar a leitura automática.", "error");
      return;
    }

    showMessage("", "");
    logInfo("Iniciando leitura automática de procedimentos.", appState.config.github);

    const githubResult = await loadProceduresFromGitHub(appState.config);

    if (githubResult.ok) {
      appState.primarySource = githubResult.source;
      appState.baseProcedures = githubResult.entries;
      appState.baseIssues = [...configIssues, ...githubResult.issues];
      rebuildCatalog();
      return;
    }

    // The manifest keeps the site usable on GitHub Pages if the public API is unavailable.
    const manifestResult = await loadProceduresFromManifest(appState.config, githubResult.issues);

    if (manifestResult.ok) {
      appState.primarySource = manifestResult.source;
      appState.baseProcedures = manifestResult.entries;
      appState.baseIssues = [...configIssues, ...manifestResult.issues];
      rebuildCatalog();
      showMessage("A leitura direta do GitHub falhou, então o site usou o manifest local como fallback.", "warning");
      return;
    }

    const exampleResult = await loadProceduresFromLocalExamples(appState.config, manifestResult.issues);

    if (exampleResult.ok) {
      appState.primarySource = exampleResult.source;
      appState.baseProcedures = exampleResult.entries;
      appState.baseIssues = [...configIssues, ...exampleResult.issues];
      rebuildCatalog();
      showMessage("Falha ao ler GitHub e manifest. O site carregou exemplos locais para continuar utilizável.", "warning");
      return;
    }

    appState.primarySource = {
      kind: "none",
      label: "Falha no carregamento",
      fileCount: 0,
      filesProcessed: 0
    };
    appState.baseProcedures = [];
    appState.baseIssues = [...configIssues, ...exampleResult.issues];
    setStatusDetail("Nenhum roteiro encontrado. Importe arquivo local para continuar.");
    rebuildCatalog();
    showMessage("Não foi possível carregar a pasta do GitHub nem o manifest local.", "error");
  } catch (error) {
    logError("Falha inesperada ao recarregar procedimentos.", error);
    appState.primarySource = {
      kind: "none",
      label: "Falha no carregamento",
      fileCount: 0,
      filesProcessed: 0
    };
    appState.baseProcedures = [];
    appState.baseIssues = [
      ...configIssues,
      createIssue("error", "github", "Leitura automática", getReadableError(error))
    ];
    setStatusDetail("Falha inesperada na leitura automática. Importe arquivo local para continuar.");
    rebuildCatalog();
    showMessage("A leitura automática falhou inesperadamente. A importação local continua disponível.", "error");
  }
}

async function loadAppConfig() {
  const configUrl = buildAppUrl(CONFIG_PATH);
  logInfo(`Tentando ler configuração em ${configUrl.href}`);

  try {
    const response = await fetch(configUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const config = normalizeAppConfig(data);
    logInfo("Configuração carregada com sucesso.", config.github);

    return { ok: true, config, issues: [], usedDefault: false };
  } catch (error) {
    logWarn("Falha ao ler configuração; usando configuração padrão embutida.", error);

    const config = normalizeAppConfig(DEFAULT_APP_CONFIG);
    const issues = [
      createIssue(
        "warning",
        "config",
        "app-config.json",
        `Não foi possível ler ${CONFIG_PATH}: ${getReadableError(error)}. O sistema passou a usar a configuração padrão embutida.`
      )
    ];

    if (window.location.protocol === "file:") {
      issues.push(
        createIssue(
          "warning",
          "config",
          "file://",
          "Ao abrir o projeto diretamente no navegador, alguns ambientes bloqueiam o fetch local. Prefira GitHub Pages ou um servidor local simples."
        )
      );
    }

    return { ok: true, config, issues, usedDefault: true };
  }
}

function normalizeAppConfig(data) {
  const github = isPlainObject(data) && isPlainObject(data.github) ? data.github : null;

  if (!github) {
    throw new Error("Estrutura inválida. Esperado um objeto com a chave github.");
  }

  const owner = safeText(github.owner);
  const repo = safeText(github.repo);
  const branch = safeText(github.branch || "main");
  const proceduresPath = normalizeRelativePath(safeText(github.proceduresPath || "procedimentos"));

  if (!owner || !repo || !branch || !proceduresPath) {
    throw new Error("Campos obrigatórios ausentes em config/app-config.json.");
  }

  return {
    github: {
      owner,
      repo,
      branch,
      proceduresPath
    }
  };
}

async function loadProceduresFromGitHub(config) {
  const repoInfo = buildRepositoryLabel(config);
  const folderPath = config.github.proceduresPath;
  const listingUrl = buildGitHubContentsUrl(config.github, folderPath);

  setLoadingState(true, "Consultando pasta do GitHub", 0, 1);
  setStatusDetail("Lendo pasta de procedimentos...");
  logInfo(`Consultando a pasta do GitHub em ${listingUrl}`);

  try {
    const response = await fetch(listingUrl, { cache: "no-store" });

    if (!response.ok) {
      throw createGitHubHttpError(response, folderPath);
    }

    const payload = await response.json();

    if (!Array.isArray(payload)) {
      throw new Error("A API retornou um formato inesperado para a pasta de procedimentos.");
    }

    logInfo(`Listagem do GitHub recebida com ${payload.length} item(ns).`, payload.map((item) => item.name));

    const candidateFiles = payload
      .filter((item) => item.type === "file")
      .filter((item) => isProcedureFileName(item.name))
      .filter((item) => item.name !== MANIFEST_FILENAME)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    logInfo(`Pasta listada com sucesso. ${candidateFiles.length} arquivo(s) candidato(s) encontrados.`, candidateFiles.map((item) => item.name));
    setStatusDetail(`${candidateFiles.length} arquivo(s) .txt/.json encontrados na pasta de procedimentos.`);

    if (!candidateFiles.length) {
      setLoadingState(false, "Pasta consultada", 1, 1);
      setStatusDetail("Nenhum arquivo válido encontrado no GitHub. Tentando manifest local.");

      return {
        ok: false,
        entries: [],
        issues: [
          createIssue(
            "warning",
            "github",
            folderPath,
            "A pasta foi encontrada, mas não há arquivos .txt ou .json de roteiros."
          )
        ],
        source: {
          kind: "github",
          label: "GitHub",
          fileCount: 0,
          filesProcessed: 0,
          repositoryLabel: repoInfo
        }
      };
    }

    const aggregate = await loadProcedureFilesSequentially(
      candidateFiles.map((item) => ({
        fileName: item.name,
        filePath: item.path,
        fileUrl: item.download_url || buildRawGitHubUrl(config.github, item.path),
        sourceKind: "github",
        sourceLabel: "GitHub"
      })),
      "Lendo arquivos do GitHub"
    );

    logInfo(`Leitura do GitHub concluída com ${aggregate.entries.length} procedimento(s) válido(s).`);
    setLoadingState(false, "Leitura do GitHub concluída", candidateFiles.length, candidateFiles.length);
    setStatusDetail(`${aggregate.entries.length} roteiro(s) válidos carregados do GitHub.`);

    if (!aggregate.entries.length) {
      return {
        ok: false,
        entries: [],
        issues: [
          ...aggregate.issues,
          createIssue(
            "warning",
            "github",
            folderPath,
            "Os arquivos do GitHub foram lidos, mas nenhum roteiro válido foi encontrado. O sistema tentará o manifest local."
          )
        ],
        source: {
          kind: "github",
          label: "GitHub",
          fileCount: candidateFiles.length,
          filesProcessed: candidateFiles.length,
          repositoryLabel: repoInfo
        }
      };
    }

    return {
      ok: true,
      entries: aggregate.entries,
      issues: aggregate.issues,
      source: {
        kind: "github",
        label: "GitHub",
        fileCount: candidateFiles.length,
        filesProcessed: candidateFiles.length,
        repositoryLabel: repoInfo
      }
    };
  } catch (error) {
    logError("Falha ao listar a pasta de procedimentos no GitHub.", error);
    setLoadingState(false, "Falha ao consultar GitHub", 1, 1);
    setStatusDetail("Falha ao ler GitHub. Tentando manifest local...");

    return {
      ok: false,
      entries: [],
      issues: [
        createIssue(
          "error",
          "github",
          folderPath,
          getReadableError(error)
        )
      ],
      source: {
        kind: "github",
        label: "GitHub indisponível",
        fileCount: 0,
        filesProcessed: 0,
        repositoryLabel: repoInfo
      }
    };
  }
}

async function loadProceduresFromManifest(config, previousIssues) {
  const manifestPath = joinPaths(config.github.proceduresPath, MANIFEST_FILENAME);
  const manifestUrl = buildAppUrl(manifestPath);

  setLoadingState(true, "Tentando manifest local", 0, 1);
  setStatusDetail("Falha ao ler GitHub, usando manifest local.");
  logInfo(`Tentando manifest local em ${manifestUrl.href}`);

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? `Manifest local não encontrado em ${manifestPath}.`
          : `Falha ao ler o manifest local: HTTP ${response.status}.`
      );
    }

    const data = await response.json();
    const files = normalizeManifestEntries(data, config.github.proceduresPath);
    logInfo(`Manifest local lido com sucesso. ${files.length} arquivo(s) listado(s).`, files.map((file) => file.fileName));

    if (!files.length) {
      setLoadingState(false, "Manifest lido", 1, 1);
      setStatusDetail("Manifest lido, mas sem arquivos válidos. Tentando exemplos locais.");

      return {
        ok: false,
        entries: [],
        issues: [
          ...previousIssues,
          createIssue(
            "warning",
            "manifest",
            manifestPath,
            "O manifest local foi lido, mas não contém arquivos de roteiros válidos."
          )
        ],
        source: {
          kind: "manifest",
          label: "Manifest local",
          fileCount: 0,
          filesProcessed: 0,
          repositoryLabel: buildRepositoryLabel(config)
        }
      };
    }

    const aggregate = await loadProcedureFilesSequentially(
      files.map((file) => ({
        fileName: file.fileName,
        filePath: file.filePath,
        fileUrl: buildAppUrl(file.filePath).href,
        sourceKind: "manifest",
        sourceLabel: "Manifest local"
      })),
      "Lendo arquivos do manifest"
    );

    logInfo(`Leitura do manifest concluída com ${aggregate.entries.length} procedimento(s) válido(s).`);
    setLoadingState(false, "Leitura do manifest concluída", files.length, files.length);
    setStatusDetail(`${aggregate.entries.length} roteiro(s) válidos carregados do manifest local.`);

    if (!aggregate.entries.length) {
      return {
        ok: false,
        entries: [],
        issues: [
          ...previousIssues,
          ...aggregate.issues,
          createIssue(
            "warning",
            "manifest",
            manifestPath,
            "O manifest foi lido, mas nenhum roteiro válido foi encontrado. O sistema tentará os exemplos locais."
          )
        ],
        source: {
          kind: "manifest",
          label: "Manifest local",
          fileCount: files.length,
          filesProcessed: files.length,
          repositoryLabel: buildRepositoryLabel(config)
        }
      };
    }

    return {
      ok: true,
      entries: aggregate.entries,
      issues: [
        ...previousIssues,
        createIssue(
          "warning",
          "manifest",
          manifestPath,
          "Manifest local usado como fallback após falha na leitura automática do GitHub."
        ),
        ...aggregate.issues
      ],
      source: {
        kind: "manifest",
        label: "Manifest local",
        fileCount: files.length,
        filesProcessed: files.length,
        repositoryLabel: buildRepositoryLabel(config)
      }
    };
  } catch (error) {
    logError("Falha ao usar o manifest local.", error);
    setLoadingState(false, "Falha no manifest", 1, 1);
    setStatusDetail("Falha ao ler manifest, tentando exemplos locais.");

    return {
      ok: false,
      entries: [],
      issues: [
        ...previousIssues,
        createIssue(
          "error",
          "manifest",
          manifestPath,
          getReadableError(error)
        )
      ],
      source: {
        kind: "manifest",
        label: "Manifest indisponível",
        fileCount: 0,
        filesProcessed: 0,
        repositoryLabel: buildRepositoryLabel(config)
      }
    };
  }
}

async function loadProceduresFromLocalExamples(config, previousIssues) {
  setLoadingState(true, "Tentando exemplos locais", 0, 1);
  setStatusDetail("Falha ao ler manifest, usando exemplos locais.");
  logInfo("Tentando carregar os exemplos locais embutidos.", LOCAL_EXAMPLE_FILES);

  try {
    const files = LOCAL_EXAMPLE_FILES.map((filePath) => ({
      fileName: getFileNameFromPath(filePath),
      filePath,
      fileUrl: buildAppUrl(filePath).href,
      sourceKind: "example",
      sourceLabel: "Exemplos locais"
    }));

    const aggregate = await loadProcedureFilesSequentially(files, "Lendo exemplos locais");
    logInfo(`Leitura dos exemplos locais concluída com ${aggregate.entries.length} procedimento(s) válido(s).`);
    setLoadingState(false, "Leitura dos exemplos concluída", files.length, files.length);
    setStatusDetail(`${aggregate.entries.length} roteiro(s) válidos carregados dos exemplos locais.`);

    if (!aggregate.entries.length) {
      return {
        ok: false,
        entries: [],
        issues: [
          ...previousIssues,
          createIssue(
            "error",
            "example",
            "Exemplos locais",
            "Os exemplos locais foram encontrados, mas nenhum roteiro válido pôde ser carregado."
          ),
          ...aggregate.issues
        ],
        source: {
          kind: "example",
          label: "Exemplos indisponíveis",
          fileCount: files.length,
          filesProcessed: files.length,
          repositoryLabel: buildRepositoryLabel(config)
        }
      };
    }

    return {
      ok: true,
      entries: aggregate.entries,
      issues: [
        ...previousIssues,
        createIssue(
          "warning",
          "example",
          "Exemplos locais",
          "GitHub e manifest falharam. O site passou a usar exemplos locais do projeto para permanecer utilizável."
        ),
        ...aggregate.issues
      ],
      source: {
        kind: "example",
        label: "Exemplos locais",
        fileCount: files.length,
        filesProcessed: files.length,
        repositoryLabel: buildRepositoryLabel(config)
      }
    };
  } catch (error) {
    logError("Falha ao carregar os exemplos locais.", error);
    setLoadingState(false, "Falha nos exemplos locais", 1, 1);
    setStatusDetail("Falha ao ler exemplos locais. A importação manual continua disponível.");

    return {
      ok: false,
      entries: [],
      issues: [
        ...previousIssues,
        createIssue(
          "error",
          "example",
          "Exemplos locais",
          getReadableError(error)
        )
      ],
      source: {
        kind: "example",
        label: "Exemplos indisponíveis",
        fileCount: 0,
        filesProcessed: 0,
        repositoryLabel: buildRepositoryLabel(config)
      }
    };
  }
}

function normalizeManifestEntries(data, proceduresPath) {
  const rawFiles = Array.isArray(data?.files) ? data.files : [];

  return rawFiles
    .map((item) => {
      if (typeof item === "string") {
        const trimmed = normalizeRelativePath(item);

        return trimmed
          ? {
              fileName: getFileNameFromPath(trimmed),
              filePath: trimmed.startsWith(proceduresPath) ? trimmed : joinPaths(proceduresPath, trimmed)
            }
          : null;
      }

      if (isPlainObject(item) && safeText(item.path)) {
        const normalizedPath = normalizeRelativePath(safeText(item.path));

        return {
          fileName: getFileNameFromPath(normalizedPath),
          filePath: normalizedPath.startsWith(proceduresPath)
            ? normalizedPath
            : joinPaths(proceduresPath, normalizedPath)
        };
      }

      return null;
    })
    .filter(Boolean)
    .filter((item) => isProcedureFileName(item.fileName))
    .filter((item) => item.fileName !== MANIFEST_FILENAME)
    .sort((a, b) => a.fileName.localeCompare(b.fileName, "pt-BR"));
}

async function loadProcedureFilesSequentially(files, loadingLabel) {
  const entries = [];
  const issues = [];

  setLoadingState(true, loadingLabel, 0, files.length);

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    setLoadingState(true, loadingLabel, index, files.length);
    setStatusDetail(`Processando arquivo ${file.fileName}...`);
    logInfo(`Processando arquivo ${file.fileName}.`, { source: file.sourceLabel, url: file.fileUrl });

    try {
      const response = await fetch(file.fileUrl, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      logInfo(`Conteúdo de ${file.fileName} lido com ${text.length} caractere(s).`);
      const result = parseProcedureDocument(text, file);

      entries.push(...result.entries);
      issues.push(...result.issues);
      logInfo(`Arquivo ${file.fileName} interpretado com sucesso. ${result.entries.length} procedimento(s) válido(s).`);
    } catch (error) {
      logError(`Falha ao processar o arquivo ${file.fileName}.`, error);
      issues.push(
        createIssue(
          "error",
          file.sourceKind,
          file.fileName,
          `Falha ao baixar ou interpretar o arquivo ${file.filePath}: ${getReadableError(error)}`
        )
      );
    }

    setLoadingState(true, loadingLabel, index + 1, files.length);
  }

  return { entries, issues };
}

function parseProcedureDocument(text, fileInfo) {
  const issues = [];
  const entries = [];

  try {
    const parsedContent = parseProcedureFileContent(text, fileInfo.fileName);
    logInfo(`Parse concluído para ${fileInfo.fileName}. ${parsedContent.procedures.length} item(ns) bruto(s) encontrado(s).`);
    issues.push(...parsedContent.issues);

    parsedContent.procedures.forEach((rawProcedure, index) => {
      const result = normalizeProcedureRecord(rawProcedure, fileInfo, index);

      if (result.ok) {
        entries.push(result.procedure);
      } else {
        issues.push(...result.issues);
      }
    });
  } catch (error) {
    logError(`Falha ao interpretar ${fileInfo.fileName}.`, error);
    issues.push(
      createIssue(
        "error",
        fileInfo.sourceKind,
        fileInfo.fileName,
        `Falha ao interpretar o arquivo: ${getReadableError(error)}`
      )
    );
  }

  return { entries, issues };
}

function parseProcedureFileContent(content, fileName) {
  const normalizedText = normalizeProcedureFileText(content);

  if (!normalizedText) {
    throw new Error("Arquivo vazio ou sem JSON utilizável.");
  }

  const parsed = JSON.parse(normalizedText);
  const issues = [];
  const procedures = extractProcedures(parsed, fileName, issues);

  return { procedures, issues };
}

function normalizeProcedureFileText(content) {
  const asText = String(content ?? "");
  const withoutBom = stripBom(asText);
  const trimmed = withoutBom.trim();

  if (!trimmed) {
    return "";
  }

  return stripJsonCodeFence(trimmed).trim();
}

function stripJsonCodeFence(text) {
  const match = String(text).match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1] : text;
}

function extractProcedures(payload, fileName, issues) {
  if (Array.isArray(payload)) {
    issues.push(
      createIssue(
        "warning",
        "validation",
        fileName,
        "O arquivo usa um array direto na raiz. O sistema aceitou o conteúdo, mas o formato recomendado é um objeto único ou um objeto com a chave procedimentos."
      )
    );

    return payload;
  }

  if (isPlainObject(payload) && Array.isArray(payload.procedimentos)) {
    return payload.procedimentos;
  }

  if (isPlainObject(payload)) {
    return [payload];
  }

  throw new Error("Formato inválido. Use um objeto JSON ou um objeto com a chave procedimentos.");
}

function normalizeProcedureRecord(rawProcedure, fileInfo, index) {
  const issues = [];

  if (!isPlainObject(rawProcedure)) {
    issues.push(
      createIssue(
        "error",
        fileInfo.sourceKind,
        fileInfo.fileName,
        `O item ${index + 1} não é um objeto JSON válido.`
      )
    );

    return { ok: false, issues };
  }

  const id = safeText(rawProcedure.id);
  const nome = safeText(rawProcedure.nome);
  const categoria = safeText(rawProcedure.categoria || "Sem categoria");
  const descricaoCurta = safeText(rawProcedure.descricao_curta || "Sem descrição resumida.");
  const rawPassos = Array.isArray(rawProcedure.passos) ? rawProcedure.passos : null;

  if (!id) {
    issues.push(
      createIssue("error", fileInfo.sourceKind, fileInfo.fileName, `Procedimento ${index + 1} sem o campo obrigatório id.`)
    );
  }

  if (!nome) {
    issues.push(
      createIssue("error", fileInfo.sourceKind, fileInfo.fileName, `Procedimento ${index + 1} sem o campo obrigatório nome.`)
    );
  }

  if (!rawPassos || !rawPassos.length) {
    issues.push(
      createIssue(
        "error",
        fileInfo.sourceKind,
        fileInfo.fileName,
        `Procedimento ${id || `#${index + 1}`} sem o campo obrigatório passos.`
      )
    );
  }

  if (issues.length) {
    return { ok: false, issues };
  }

  const steps = [];

  rawPassos.forEach((rawStep, stepIndex) => {
    if (!isPlainObject(rawStep)) {
      issues.push(
        createIssue(
          "error",
          fileInfo.sourceKind,
          fileInfo.fileName,
          `Procedimento ${id}: o passo ${stepIndex + 1} não é um objeto válido.`
        )
      );
      return;
    }

    const numero = Number(rawStep.numero);
    const titulo = safeText(rawStep.titulo);
    const descricao = safeText(rawStep.descricao);

    if (!Number.isFinite(numero) || !titulo || !descricao) {
      issues.push(
        createIssue(
          "error",
          fileInfo.sourceKind,
          fileInfo.fileName,
          `Procedimento ${id}: cada passo precisa ter numero, titulo e descricao.`
        )
      );
      return;
    }

    steps.push({
      numero,
      titulo,
      descricao,
      critico: Boolean(rawStep.critico),
      alerta: safeText(rawStep.alerta),
      imagem: resolveMediaPath(rawStep.imagem),
      subacoes: normalizeStepSubactions(rawStep.subacoes)
    });
  });

  if (issues.length || !steps.length) {
    return { ok: false, issues };
  }

  const procedure = {
    id,
    nome,
    categoria,
    descricao_curta: descricaoCurta,
    indicacoes: sanitizeStringArray(rawProcedure.indicacoes),
    contraindicacoes: sanitizeStringArray(rawProcedure.contraindicacoes),
    preparo: sanitizeStringArray(rawProcedure.preparo),
    materiais: sanitizeStringArray(rawProcedure.materiais),
    acoes_iniciais: sanitizeStringArray(rawProcedure.acoes_iniciais),
    passos: steps.sort((a, b) => a.numero - b.numero),
    observacoes_finais: sanitizeStringArray(rawProcedure.observacoes_finais),
    referencias: sanitizeStringArray(rawProcedure.referencias),
    imagem_capa: resolveMediaPath(rawProcedure.imagem_capa),
    _meta: {
      sourceKind: fileInfo.sourceKind,
      sourceLabel: fileInfo.sourceLabel,
      fileName: fileInfo.fileName,
      filePath: fileInfo.filePath
    }
  };

  return { ok: true, procedure, issues: [] };
}

function normalizeStepSubactions(rawSubactions) {
  if (!Array.isArray(rawSubactions)) {
    return [];
  }

  return rawSubactions
    .map((item) => {
      if (!isPlainObject(item)) {
        return null;
      }

      const rotulo = safeText(item.rotulo);
      const texto = safeText(item.texto);

      if (!rotulo || !texto) {
        return null;
      }

      return { rotulo, texto };
    })
    .filter(Boolean);
}

async function importLocalFiles(fileList) {
  const files = Array.from(fileList || []).filter(Boolean);

  if (!files.length) {
    return;
  }

  const validFiles = files.filter((file) => isProcedureFileName(file.name));
  const skippedFiles = files.filter((file) => !isProcedureFileName(file.name));

  if (!validFiles.length) {
    showMessage("Nenhum dos arquivos selecionados possui extensão .txt ou .json.", "warning");
    return;
  }

  setLoadingState(true, "Importando arquivos locais", 0, validFiles.length);

  for (let index = 0; index < validFiles.length; index += 1) {
    const file = validFiles[index];
    setLoadingState(true, "Importando arquivos locais", index, validFiles.length);

    try {
      const text = await file.text();
      const result = parseProcedureDocument(text, {
        fileName: file.name,
        filePath: file.name,
        fileUrl: `local://${file.name}`,
        sourceKind: "local",
        sourceLabel: "Importação local"
      });

      appState.localImports[file.name] = {
        entries: result.entries,
        issues: result.issues
      };
    } catch (error) {
      appState.localImports[file.name] = {
        entries: [],
        issues: [
          createIssue(
            "error",
            "local",
            file.name,
            `Falha ao ler o arquivo local: ${getReadableError(error)}`
          )
        ]
      };
    }

    setLoadingState(true, "Importando arquivos locais", index + 1, validFiles.length);
  }

  skippedFiles.forEach((file) => {
    appState.localImports[file.name] = {
      entries: [],
      issues: [
        createIssue(
          "warning",
          "local",
          file.name,
          "Arquivo ignorado porque não possui extensão .txt ou .json."
        )
      ]
    };
  });

  setLoadingState(false, "Importação local concluída", validFiles.length, validFiles.length);
  rebuildCatalog();

  showMessage(
    `Importação local concluída. ${validFiles.length} arquivo(s) processado(s) para pré-visualização temporária.`,
    "success"
  );
}

function rebuildCatalog() {
  const localProcedures = getLocalProcedures();
  const mergeResult = mergeProcedureCollections(localProcedures, appState.baseProcedures);

  appState.procedures = mergeResult.entries.sort(sortProcedures);
  appState.mergeIssues = mergeResult.issues;
  syncSelectionAndProgress();
  populateCategoryFilter();
  persistState();
  render();
  logInfo(`Catálogo reconstruído. ${appState.procedures.length} procedimento(s) final(is) disponível(is).`);

  if (!appState.procedures.length) {
    setStatusDetail("Nenhum roteiro encontrado, importe arquivo local.");
  }
}

function mergeProcedureCollections(localProcedures, baseProcedures) {
  // Local previews win over repository data so the user can test a draft before committing it.
  const candidates = [...localProcedures, ...baseProcedures].sort(compareBySourcePriority);
  const entries = [];
  const issues = [];
  const seen = new Map();

  candidates.forEach((procedure) => {
    const duplicate = seen.get(procedure.id);

    if (!duplicate) {
      seen.set(procedure.id, procedure);
      entries.push(procedure);
      return;
    }

    issues.push(
      createIssue(
        "warning",
        "merge",
        procedure._meta.fileName,
        `ID duplicado "${procedure.id}". Mantido ${duplicate._meta.fileName} (${duplicate._meta.sourceLabel}) e ignorado ${procedure._meta.fileName} (${procedure._meta.sourceLabel}). Regra aplicada: prioridade para importação local e, dentro da mesma origem, ordem alfabética do arquivo.`
      )
    );
  });

  return { entries, issues };
}

function compareBySourcePriority(a, b) {
  const sourceDifference = (SOURCE_PRIORITY[a._meta.sourceKind] ?? 99) - (SOURCE_PRIORITY[b._meta.sourceKind] ?? 99);

  if (sourceDifference !== 0) {
    return sourceDifference;
  }

  const fileDifference = a._meta.fileName.localeCompare(b._meta.fileName, "pt-BR");

  if (fileDifference !== 0) {
    return fileDifference;
  }

  return a.nome.localeCompare(b.nome, "pt-BR");
}

function sortProcedures(a, b) {
  const categoryDifference = a.categoria.localeCompare(b.categoria, "pt-BR");

  if (categoryDifference !== 0) {
    return categoryDifference;
  }

  return a.nome.localeCompare(b.nome, "pt-BR");
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

    appState.selectedProcedureId = safeText(saved.selectedProcedureId) || null;
    appState.mode = saved.mode === "sequence" ? "sequence" : "study";
    appState.sequencePanelPinned = typeof saved.sequencePanelPinned === "boolean" ? saved.sequencePanelPinned : true;
    appState.searchTerm = typeof saved.searchTerm === "string" ? saved.searchTerm : "";
    appState.selectedCategory = typeof saved.selectedCategory === "string" ? saved.selectedCategory : "all";
    appState.progress = isPlainObject(saved.progress) ? saved.progress : {};
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }

  elements.searchInput.value = appState.searchTerm;
}

function persistState() {
  const payload = {
    selectedProcedureId: appState.selectedProcedureId,
    mode: appState.mode,
    sequencePanelPinned: appState.sequencePanelPinned,
    searchTerm: appState.searchTerm,
    selectedCategory: appState.selectedCategory,
    progress: appState.progress
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function syncSelectionAndProgress() {
  const validIds = new Set(appState.procedures.map((procedure) => procedure.id));

  Object.keys(appState.progress).forEach((procedureId) => {
    if (!validIds.has(procedureId)) {
      delete appState.progress[procedureId];
      return;
    }

    const procedure = appState.procedures.find((item) => item.id === procedureId);
    const entry = ensureProcedureProgress(procedureId);
    const validSteps = new Set(procedure.passos.map((step) => step.numero));

    entry.checklist = entry.checklist.filter((stepNumber) => validSteps.has(stepNumber));
    entry.sequenceIndex = Math.max(0, Math.min(entry.sequenceIndex, procedure.passos.length));
  });

  if (appState.selectedProcedureId && !validIds.has(appState.selectedProcedureId)) {
    appState.selectedProcedureId = null;
  }
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
  renderStatusPanel();
  renderIssuesPanel();
  renderQuickProcedurePicker();
  renderProcedureList();
  renderSelectedProcedure();
  renderMode();
}

function renderQuickProcedurePicker() {
  const allProcedures = appState.procedures;
  const filteredProcedures = getFilteredProcedures();

  elements.quickProcedureSelect.disabled = allProcedures.length === 0;
  elements.randomProcedureButton.disabled = filteredProcedures.length === 0;
  elements.randomProcedureButton.title = filteredProcedures.length
    ? "Seleciona aleatoriamente um roteiro visível com os filtros atuais."
    : "Nenhum roteiro visível para sorteio com os filtros atuais.";
  elements.quickProcedureHint.textContent = filteredProcedures.length
    ? `${filteredProcedures.length} roteiro(s) disponíveis para sorteio com os filtros atuais.`
    : "Nenhum roteiro visível com os filtros atuais. Ajuste a busca ou a categoria para sortear.";

  if (!allProcedures.length) {
    elements.quickProcedureHint.textContent = "Nenhum roteiro carregado ainda.";
    elements.quickProcedureSelect.innerHTML = `
      <option value="">Nenhum roteiro carregado</option>
    `;
    return;
  }

  const selectedProcedureExists = allProcedures.some((procedure) => procedure.id === appState.selectedProcedureId);

  elements.quickProcedureSelect.innerHTML = `
    <option value="">Escolha um roteiro...</option>
    ${allProcedures
      .map(
        (procedure) => `
          <option value="${escapeAttribute(procedure.id)}">${escapeHtml(procedure.nome)}</option>
        `
      )
      .join("")}
  `;
  elements.quickProcedureSelect.value = selectedProcedureExists ? appState.selectedProcedureId : "";
}

function renderStatusPanel() {
  const procedures = appState.procedures;
  const issueCount = getAllIssues().length;
  const sourceCounts = countProceduresBySource();
  const localCount = getLocalProcedures().length;

  elements.loadedProcedureCount.textContent = String(procedures.length);
  elements.statusProcedureBreakdown.textContent = buildProcedureBreakdownText(sourceCounts);
  elements.dataSourceLabel.textContent = buildSourceLabel();
  elements.configSummary.textContent = appState.config
    ? `Pasta configurada: /${appState.config.github.proceduresPath}`
    : "Configuração não carregada.";
  elements.fileLoadSummary.textContent = `${appState.primarySource.filesProcessed || 0} / ${appState.primarySource.fileCount || 0}`;
  elements.issueSummary.textContent = issueCount
    ? `${issueCount} erro(s) ou aviso(s) de importação registrados.`
    : "Sem erros de importação.";
  elements.statusMessage.textContent = appState.statusDetail || buildStatusMessage(procedures.length, localCount);
  elements.loadingLabel.textContent = appState.loading.label;
  elements.loadingCounter.textContent = `${appState.loading.current} / ${appState.loading.total}`;
  elements.loadingProgressBar.style.width = `${getLoadingPercentage()}%`;
  elements.clearLocalImportsButton.disabled = !Object.keys(appState.localImports).length;
  elements.reloadProceduresButton.disabled = appState.loading.active;
}

function renderIssuesPanel() {
  const issues = getAllIssues();
  elements.issueCountBadge.textContent = String(issues.length);

  if (!issues.length) {
    elements.issuesList.innerHTML = `
      <div class="issue-empty">
        Nenhum erro ou aviso de importação. A estrutura atual está consistente.
      </div>
    `;
    return;
  }

  elements.issuesList.innerHTML = issues
    .map(
      (issue) => `
        <article class="issue-item ${escapeHtml(issue.severity)}">
          <div class="issue-meta">
            <span class="badge ${issue.severity === "error" ? "error-badge" : "warning-badge"}">
              ${issue.severity === "error" ? "Erro" : "Aviso"}
            </span>
            <span class="badge muted">${escapeHtml(issue.sourceLabel)}</span>
          </div>
          <p class="issue-title">${escapeHtml(issue.fileName)}</p>
          <p class="issue-copy">${escapeHtml(issue.message)}</p>
        </article>
      `
    )
    .join("");
}

function renderProcedureList() {
  const procedures = getFilteredProcedures();
  const total = appState.procedures.length;

  elements.procedureCountBadge.textContent = `${procedures.length} / ${total}`;

  if (!appState.procedures.length) {
    elements.procedureList.innerHTML = `
      <div class="empty-procedures">
        Nenhum roteiro válido carregado ainda. Verifique o painel de erros ou importe um arquivo local para pré-visualizar.
      </div>
    `;
    return;
  }

  if (!procedures.length) {
    elements.procedureList.innerHTML = `
      <div class="empty-procedures">
        Nenhum roteiro corresponde aos filtros atuais.
      </div>
    `;
    return;
  }

  elements.procedureList.innerHTML = procedures
    .map((procedure) => {
      const totalSteps = procedure.passos.length;

      return `
        <article class="procedure-card ${procedure.id === appState.selectedProcedureId ? "is-active" : ""}" data-procedure-id="${escapeHtml(procedure.id)}">
          <span class="badge muted">${escapeHtml(procedure.categoria)}</span>
          <h3>${escapeHtml(procedure.nome)}</h3>
          <p>${escapeHtml(procedure.descricao_curta)}</p>
          <div class="procedure-card-footer">
            <span class="procedure-step-count">${totalSteps} passos</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSelectedProcedure() {
  const procedure = getSelectedProcedure();
  renderEmptyState(procedure);

  if (!procedure) {
    elements.procedureView.classList.add("hidden");
    return;
  }

  elements.procedureView.classList.remove("hidden");
  elements.selectedCategory.textContent = procedure.categoria;
  elements.selectedStepSummary.textContent = `${procedure.passos.length} passos`;
  elements.selectedSourceBadge.textContent = procedure._meta.sourceLabel;
  elements.selectedFileLabel.textContent = `${procedure._meta.filePath}`;
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

function renderEmptyState(selectedProcedure) {
  if (!appState.procedures.length) {
    elements.emptyState.classList.remove("hidden");
    elements.emptyStateTitle.textContent = "Nenhum roteiro válido carregado";
    elements.emptyStateText.textContent =
      "Verifique app-config.json, a pasta /procedimentos, o manifest local ou use a importação local temporária para testar novos roteiros.";
    return;
  }

  if (!selectedProcedure) {
    elements.emptyState.classList.remove("hidden");
    elements.emptyStateTitle.textContent = "Escolha um procedimento para começar";
    elements.emptyStateText.textContent =
      "Use a lista lateral para selecionar um roteiro, revisar as etapas no modo estudo ou treinar a sequência passo a passo.";
    return;
  }

  elements.emptyState.classList.add("hidden");
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
    .map((step) =>
      createStepCard(step, {
        checked: progress.checklist.includes(step.numero),
        showChecklist: true
      })
    )
    .join("");
}

function renderSequenceView(procedure) {
  const progress = ensureProcedureProgress(procedure.id);
  const totalSteps = procedure.passos.length;
  const revealedSteps = procedure.passos.slice(0, progress.sequenceIndex);
  const percentage = totalSteps ? (progress.sequenceIndex / totalSteps) * 100 : 0;

  elements.sequenceCounter.textContent = `${progress.sequenceIndex} / ${totalSteps}`;
  elements.sequenceProgressBar.style.width = `${percentage}%`;
  syncSequenceControls(progress.sequenceIndex, totalSteps);
  renderSequenceSummaryState();
  elements.sequenceIntro.classList.toggle("hidden", revealedSteps.length > 0);

  if (!revealedSteps.length) {
    elements.sequenceStepsList.innerHTML = "";
    return;
  }

  elements.sequenceStepsList.innerHTML = revealedSteps
    .map((step, index) =>
      createStepCard(step, {
        current: index === revealedSteps.length - 1,
        sequenceIndex: index + 1
      })
    )
    .join("");
}

function createStepCard(step, options = {}) {
  const {
    checked = false,
    current = false,
    showChecklist = false,
    sequenceIndex = null
  } = options;

  return `
    <article
      class="step-card ${checked ? "is-checked" : ""} ${step.critico ? "is-critical" : ""} ${current ? "is-current" : ""}"
      ${sequenceIndex ? `data-sequence-index="${sequenceIndex}"` : ""}
    >
      <div class="step-topline">
        <div class="step-title-group">
          <span class="step-number">${step.numero}</span>
          <div class="step-meta">
            <h4>${escapeHtml(step.titulo)}</h4>
            <div class="step-badges">
              ${step.critico ? '<span class="badge critical-badge">Etapa crítica</span>' : ""}
              ${current ? '<span class="badge checked-badge">Passo atual</span>' : ""}
            </div>
          </div>
        </div>

        ${
          showChecklist
            ? `
            <label class="step-check step-check-inline">
              <input type="checkbox" data-step-number="${step.numero}" ${checked ? "checked" : ""} />
              <span>${checked ? "Concluído" : "Marcar como concluído"}</span>
            </label>
          `
            : ""
        }
      </div>

      <p class="step-description">${escapeHtml(step.descricao)}</p>
      ${createSubactionsBlock(step.subacoes)}
      ${step.alerta ? `<div class="step-alert">${escapeHtml(step.alerta)}</div>` : ""}
      ${step.imagem ? createImageBlock(step.imagem, `Imagem do passo ${step.numero}: ${step.titulo}`) : ""}
    </article>
  `;
}

function createSubactionsBlock(subactions) {
  if (!Array.isArray(subactions) || !subactions.length) {
    return "";
  }

  return `
    <div class="step-subactions">
      <div class="step-subactions-title">Subações</div>
      <ul class="step-subaction-list">
        ${subactions
          .map(
            (subaction) => `
              <li class="step-subaction-item">
                <span class="step-subaction-label">${escapeHtml(subaction.rotulo)}</span>
                <span>${escapeHtml(subaction.texto)}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
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
  renderSequenceSummaryState();

  if (procedure && isSequence) {
    renderSequenceView(procedure);
  }
}

function renderSequenceSummaryState() {
  const isPinned = appState.sequencePanelPinned;
  const isSequenceVisible = !elements.sequenceSection.classList.contains("hidden");

  elements.sequenceSummary.classList.toggle("is-static", !isPinned);
  elements.sequenceSummary.classList.toggle("is-condensed", false);
  elements.toggleSequencePinButton.textContent = isPinned ? "Desfixar do topo" : "Fixar no topo";
  elements.toggleSequencePinButton.setAttribute("aria-pressed", String(isPinned));
  elements.toggleSequencePinButton.setAttribute(
    "aria-label",
    isPinned ? "Desativar painel fixo no topo" : "Ativar painel fixo no topo"
  );
  elements.toggleSequencePinButton.classList.toggle("is-active", isPinned);
  elements.toggleSequencePinButton.disabled = !isSequenceVisible;

  updateSequenceSummaryState();
}

function updateSequenceSummaryState() {
  const isDesktop = window.innerWidth > 720;
  const isSequenceVisible = !elements.sequenceSection.classList.contains("hidden");
  const shouldBeSticky = isDesktop && isSequenceVisible && appState.mode === "sequence" && appState.sequencePanelPinned;

  if (!shouldBeSticky) {
    elements.sequenceSummary.classList.remove("is-condensed");
    return;
  }

  const summaryTop = elements.sequenceSummary.getBoundingClientRect().top;
  const isCondensed = summaryTop <= 18.5 && window.scrollY > 0;

  elements.sequenceSummary.classList.toggle("is-condensed", isCondensed);
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

function selectProcedure(procedureId) {
  if (!appState.procedures.find((procedure) => procedure.id === procedureId)) {
    return;
  }

  appState.selectedProcedureId = procedureId;
  persistState();
  render();
}

function selectRandomProcedure() {
  const pool = getFilteredProcedures();

  if (!pool.length) {
    return;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex];

  if (selected) {
    selectProcedure(selected.id);
  }
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

function restartSequence() {
  const procedure = getSelectedProcedure();

  if (!procedure) {
    return;
  }

  ensureProcedureProgress(procedure.id).sequenceIndex = 0;
  persistState();
  renderSequenceView(procedure);
  scrollSequenceSummaryIntoView();
}

function updateSequenceBy(amount) {
  const procedure = getSelectedProcedure();

  if (!procedure) {
    return;
  }

  const entry = ensureProcedureProgress(procedure.id);
  const previousIndex = entry.sequenceIndex;
  const nextIndex = Math.max(0, Math.min(entry.sequenceIndex + amount, procedure.passos.length));

  if (previousIndex === nextIndex) {
    return;
  }

  entry.sequenceIndex = nextIndex;
  persistState();
  renderSequenceView(procedure);

  if (amount > 0) {
    emphasizeSequenceStep(nextIndex);
  }
}

function syncSequenceControls(currentIndex, totalSteps) {
  const isAtStart = currentIndex === 0;
  const isComplete = currentIndex >= totalSteps;

  elements.previousStepButton.disabled = isAtStart;
  elements.nextStepButton.disabled = isComplete;
  elements.restartSequenceButton.disabled = isAtStart;
  elements.mobilePreviousStepButton.disabled = isAtStart;
  elements.mobileNextStepButton.disabled = isComplete;
  elements.mobileRestartSequenceButton.disabled = isAtStart;
}

function emphasizeSequenceStep(sequenceIndex) {
  const target = elements.sequenceStepsList.querySelector(`[data-sequence-index="${sequenceIndex}"]`);

  if (!target) {
    return;
  }

  target.classList.remove("is-revealed");

  requestAnimationFrame(() => {
    target.classList.add("is-revealed");
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      target.classList.remove("is-revealed");
    }, 1600);
  });
}

function scrollSequenceSummaryIntoView() {
  const summary = document.querySelector(".sequence-summary");

  if (!summary) {
    return;
  }

  summary.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleSequenceShortcuts(event) {
  if (appState.mode !== "sequence" || !getSelectedProcedure()) {
    return;
  }

  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  if (isInteractiveTarget(event.target)) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    updateSequenceBy(1);
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    updateSequenceBy(-1);
    return;
  }

  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    restartSequence();
  }
}

function isInteractiveTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, button, [contenteditable='true'], [contenteditable='']"));
}

function setStatusDetail(message) {
  appState.statusDetail = message;
  renderStatusPanel();
}

function setLoadingState(active, label, current, total) {
  appState.loading = {
    active,
    label,
    current,
    total
  };

  renderStatusPanel();
}

function getLoadingPercentage() {
  if (!appState.loading.total) {
    return 0;
  }

  return Math.max(0, Math.min(100, (appState.loading.current / appState.loading.total) * 100));
}

function countProceduresBySource() {
  return appState.procedures.reduce(
    (accumulator, procedure) => {
      accumulator[procedure._meta.sourceKind] = (accumulator[procedure._meta.sourceKind] || 0) + 1;
      return accumulator;
    },
    { github: 0, manifest: 0, example: 0, local: 0 }
  );
}

function buildProcedureBreakdownText(sourceCounts) {
  const parts = [];

  if (sourceCounts.github) {
    parts.push(`GitHub: ${sourceCounts.github}`);
  }

  if (sourceCounts.manifest) {
    parts.push(`Manifest: ${sourceCounts.manifest}`);
  }

  if (sourceCounts.local) {
    parts.push(`Local: ${sourceCounts.local}`);
  }

  if (sourceCounts.example) {
    parts.push(`Exemplos: ${sourceCounts.example}`);
  }

  return parts.length ? parts.join(" • ") : "Nenhum roteiro final carregado.";
}

function buildSourceLabel() {
  const hasLocal = getLocalProcedures().length > 0;

  if (appState.primarySource.kind === "github") {
    return hasLocal ? "GitHub + importação local" : "GitHub";
  }

  if (appState.primarySource.kind === "manifest") {
    return hasLocal ? "Manifest local + importação local" : "Manifest local";
  }

  if (appState.primarySource.kind === "example") {
    return hasLocal ? "Exemplos locais + importação local" : "Exemplos locais";
  }

  if (hasLocal) {
    return "Importação local";
  }

  return "Nenhuma fonte disponível";
}

function buildStatusMessage(totalProcedures, localCount) {
  if (appState.loading.active) {
    return `${appState.loading.label}...`;
  }

  if (!totalProcedures) {
    return "Nenhum roteiro válido disponível no momento. Confira o painel de erros, o manifest ou importe arquivos locais para teste.";
  }

  if (appState.primarySource.kind === "manifest") {
    return localCount
      ? "Base carregada por manifest local e combinada com importações temporárias."
      : "Base carregada a partir do manifest local após falha na leitura automática do GitHub.";
  }

  if (appState.primarySource.kind === "github") {
    return localCount
      ? "Roteiros lidos do GitHub e enriquecidos com arquivos locais temporários para pré-visualização."
      : "Roteiros lidos automaticamente da pasta configurada no repositório GitHub.";
  }

  if (appState.primarySource.kind === "example") {
    return localCount
      ? "Exemplos locais carregados e enriquecidos com arquivos temporários desta sessão."
      : "GitHub e manifest falharam, então o site carregou exemplos locais para permanecer utilizável.";
  }

  if (localCount) {
    return "Apenas arquivos locais temporários estão disponíveis nesta sessão.";
  }

  return "Aguardando uma fonte válida de dados.";
}

function getAllIssues() {
  return [...appState.baseIssues, ...getLocalIssues(), ...appState.mergeIssues];
}

function getLocalProcedures() {
  return Object.values(appState.localImports).flatMap((record) => record.entries || []);
}

function getLocalIssues() {
  return Object.values(appState.localImports).flatMap((record) => record.issues || []);
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

function createIssue(severity, sourceKind, fileName, message) {
  return {
    severity,
    sourceKind,
    sourceLabel: getIssueSourceLabel(sourceKind),
    fileName,
    message
  };
}

function getIssueSourceLabel(sourceKind) {
  const labels = {
    config: "Configuração",
    github: "GitHub",
    manifest: "Manifest local",
    example: "Exemplos locais",
    local: "Importação local",
    merge: "Mesclagem",
    validation: "Validação"
  };

  return labels[sourceKind] || "Sistema";
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => safeText(item)).filter(Boolean);
}

function resolveMediaPath(value) {
  const path = safeText(value);

  if (!path) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }

  // Relative media paths are resolved against the published site root, which keeps GitHub Pages compatible.
  return buildAppUrl(path).href;
}

function buildGitHubContentsUrl(githubConfig, path) {
  const encodedPath = encodePathSegments(path);

  return `https://api.github.com/repos/${encodeURIComponent(githubConfig.owner)}/${encodeURIComponent(githubConfig.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(githubConfig.branch)}`;
}

function buildRawGitHubUrl(githubConfig, path) {
  return `https://raw.githubusercontent.com/${encodeURIComponent(githubConfig.owner)}/${encodeURIComponent(githubConfig.repo)}/${encodeURIComponent(githubConfig.branch)}/${encodePathSegments(path)}`;
}

function buildRepositoryLabel(config) {
  return `${config.github.owner}/${config.github.repo}@${config.github.branch}`;
}

function createGitHubHttpError(response, folderPath) {
  if (response.status === 404) {
    return new Error(`Pasta não encontrada no GitHub: ${folderPath}. Verifique owner, repo, branch e proceduresPath.`);
  }

  if (response.status === 403) {
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const reset = response.headers.get("X-RateLimit-Reset");

    if (remaining === "0") {
      return new Error(
        `Limite temporário da API do GitHub atingido. Tente novamente mais tarde${reset ? ` (reset aproximado em ${new Date(Number(reset) * 1000).toLocaleString("pt-BR")})` : ""}.`
      );
    }

    return new Error("A API do GitHub recusou a requisição. Repositórios privados não funcionam sem autenticação, então mantenha o projeto público para GitHub Pages.");
  }

  return new Error(`Falha ao consultar a pasta ${folderPath} no GitHub: HTTP ${response.status}.`);
}

function getReadableError(error) {
  return error instanceof Error ? error.message : String(error);
}

function buildAppUrl(path) {
  return new URL(normalizeRelativePath(path), getSiteBaseUrl());
}

function getSiteBaseUrl() {
  const currentUrl = new URL(window.location.href);
  const cleanHref = currentUrl.href.split("#")[0].split("?")[0];

  if (currentUrl.protocol === "file:") {
    if (currentUrl.pathname.endsWith("/")) {
      return new URL(cleanHref);
    }

    const lastSegment = currentUrl.pathname.split("/").pop() || "";

    if (lastSegment.includes(".")) {
      return new URL("./", cleanHref);
    }

    return new URL(`${cleanHref.replace(/\/?$/, "/")}`);
  }

  let pathname = currentUrl.pathname || "/";

  if (pathname.endsWith("/")) {
    return new URL(pathname, currentUrl.origin);
  }

  const lastSegment = pathname.split("/").pop() || "";

  if (lastSegment.includes(".")) {
    pathname = pathname.slice(0, pathname.lastIndexOf("/") + 1) || "/";
  } else {
    pathname = `${pathname}/`;
  }

  return new URL(pathname, currentUrl.origin);
}

function normalizeRelativePath(path) {
  return String(path || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^\.\//, "")
    .trim();
}

function joinPaths(...parts) {
  return parts.map((part) => normalizeRelativePath(part)).filter(Boolean).join("/");
}

function getFileNameFromPath(path) {
  const normalized = normalizeRelativePath(path);
  const segments = normalized.split("/");
  return segments[segments.length - 1] || normalized;
}

function encodePathSegments(path) {
  return normalizeRelativePath(path)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function isProcedureFileName(fileName) {
  const lowerCaseName = String(fileName || "").toLowerCase();
  return SUPPORTED_EXTENSIONS.some((extension) => lowerCaseName.endsWith(extension));
}

function stripBom(text) {
  return String(text || "").replace(/^\uFEFF/, "");
}

function safeText(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
