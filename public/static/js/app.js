// TraceGuard Frontend Core Application Controller
const ROLES = {
  Manager: {
    role: "Manager",
    name: "Elena Vance",
    badge: "MGR-01",
    title: "Plant / Quality Manager",
    avatar: "EV",
    dashboardTab: "dashboard-manager",
    tagClass: "manager",
    actionLabel: "Recall Calculator",
    actionFn: () => App.switchTab("recalls"),
    allowedTabs: [
      { id: "dashboard-manager", label: "Manager Dashboard" },
      { id: "trace", label: "Trace Lookup" },
      { id: "defects", label: "Defects" },
      { id: "recalls", label: "Recalls" },
      { id: "reports", label: "Reports" },
      { id: "master-data", label: "Master Data" },
    ],
  },
  QA: {
    role: "QA",
    name: "T. Higgins",
    badge: "QA-882",
    title: "QA Inspector",
    avatar: "TH",
    dashboardTab: "dashboard-qa",
    tagClass: "qa",
    actionLabel: "+ Log Defect",
    actionFn: () => App.openModal("report-defect-modal"),
    allowedTabs: [
      { id: "dashboard-qa", label: "QA Station" },
      { id: "trace", label: "Trace Lookup" },
      { id: "defects", label: "Defects" },
      { id: "recalls", label: "Recalls" },
      { id: "reports", label: "Reports" },
    ],
  },
  Operator: {
    role: "Operator",
    name: "J. Alvarez",
    badge: "OP-4412",
    title: "Machine Operator",
    avatar: "JA",
    dashboardTab: "dashboard-operator",
    tagClass: "operator",
    actionLabel: "+ Start Batch",
    actionFn: () => BatchesModule.openStartModal(),
    allowedTabs: [
      { id: "dashboard-operator", label: "Floor Dashboard" },
      { id: "batches", label: "Batches" },
      { id: "trace", label: "Trace Lookup" },
    ],
  },
  Receiving: {
    role: "Receiving",
    name: "Marcus Chen",
    badge: "REC-104",
    title: "Receiving Clerk",
    avatar: "MC",
    dashboardTab: "dashboard-receiving",
    tagClass: "receiving",
    actionLabel: "+ Log Material",
    actionFn: () => MaterialsModule.openIntakeModal(),
    allowedTabs: [
      { id: "dashboard-receiving", label: "Dock Dashboard" },
      { id: "materials", label: "Material Intake" },
      { id: "trace", label: "Trace Lookup" },
    ],
  },
  Admin: {
    role: "Admin",
    name: "Sarah Connor",
    badge: "SYS-001",
    title: "System Administrator",
    avatar: "SC",
    dashboardTab: "dashboard-admin",
    tagClass: "admin",
    actionLabel: "+ Master Data",
    actionFn: () => App.switchTab("master-data"),
    allowedTabs: [
      { id: "dashboard-admin", label: "Admin Console" },
      { id: "master-data", label: "Master Data" },
      { id: "reports", label: "Audit & Reports" },
      { id: "batches", label: "Batches" },
      { id: "defects", label: "Defects" },
      { id: "materials", label: "Material Intake" },
      { id: "recalls", label: "Recalls" },
    ],
  },
};

const App = {
  state: {
    isAuthenticated: false,
    currentRole: "Manager",
    currentUser: null,
    selectedLoginRole: "Manager",
    currentTab: "dashboard-manager",
    summary: null,
    selectedBatch: null,
  },

  init() {
    this.checkAuth();
  },

  checkAuth() {
    const saved = localStorage.getItem("traceguard_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && ROLES[parsed.role]) {
          this.login(parsed.role, false);
          return;
        }
      } catch (e) {
        console.error("Auth session parse error:", e);
      }
    }
    // Show login screen
    this.showLoginScreen();
  },

  showLoginScreen() {
    this.state.isAuthenticated = false;
    const loginScreen = document.getElementById("login-screen");
    const appScreen = document.getElementById("authenticated-app");
    if (loginScreen) loginScreen.style.display = "flex";
    if (appScreen) appScreen.style.display = "none";
    this.selectRoleCard(this.state.selectedLoginRole || "Manager");
  },

  selectRoleCard(roleKey) {
    if (!ROLES[roleKey]) return;
    this.state.selectedLoginRole = roleKey;

    document.querySelectorAll(".role-card").forEach((card) => {
      card.classList.toggle("selected", card.id === `role-card-${roleKey}`);
    });

    const roleInfo = ROLES[roleKey];
    const nameEl = document.getElementById("selected-role-name");
    const titleEl = document.getElementById("selected-role-title");
    if (nameEl) nameEl.textContent = `${roleInfo.name} (${roleInfo.badge})`;
    if (titleEl) titleEl.textContent = roleInfo.title;
  },

  loginSelectedRole() {
    this.login(this.state.selectedLoginRole || "Manager");
  },

  login(roleKey, notify = true) {
    const roleInfo = ROLES[roleKey];
    if (!roleInfo) return;

    this.state.isAuthenticated = true;
    this.state.currentRole = roleKey;
    this.state.currentUser = roleInfo;

    localStorage.setItem(
      "traceguard_user",
      JSON.stringify({
        role: roleKey,
        name: roleInfo.name,
        badge: roleInfo.badge,
        title: roleInfo.title,
      })
    );

    // Update Header UI
    const loginScreen = document.getElementById("login-screen");
    const appScreen = document.getElementById("authenticated-app");
    if (loginScreen) loginScreen.style.display = "none";
    if (appScreen) appScreen.style.display = "flex";

    const avatarEl = document.getElementById("header-user-avatar");
    const nameEl = document.getElementById("header-user-name");
    const roleEl = document.getElementById("header-user-role");
    if (avatarEl) avatarEl.textContent = roleInfo.avatar;
    if (nameEl) nameEl.textContent = `${roleInfo.name} (${roleInfo.badge})`;
    if (roleEl) roleEl.textContent = roleInfo.title;

    // Update Action Button in Header
    const actionBtn = document.getElementById("header-role-action-btn");
    if (actionBtn) {
      actionBtn.textContent = roleInfo.actionLabel;
      actionBtn.onclick = roleInfo.actionFn;
    }

    // Render Navigation for this role
    this.updateNavigation(roleKey);

    // Switch to role's primary dashboard
    this.switchTab(roleInfo.dashboardTab);

    if (notify) {
      this.showToast(`Logged into Plant 1 Station as ${roleInfo.name} (${roleInfo.title})`, "success");
    }
  },

  logout() {
    localStorage.removeItem("traceguard_user");
    this.state.isAuthenticated = false;
    this.state.currentUser = null;
    this.showLoginScreen();
    this.showToast("Signed out from terminal station.");
  },

  getRoleDashboardTab() {
    const role = this.state.currentRole || "Manager";
    return ROLES[role] ? ROLES[role].dashboardTab : "dashboard-manager";
  },

  updateNavigation(roleKey) {
    const roleInfo = ROLES[roleKey] || ROLES.Manager;
    const navContainer = document.getElementById("main-nav-links");
    if (!navContainer) return;

    navContainer.innerHTML = roleInfo.allowedTabs
      .map(
        (t) => `
        <a class="nav-link ${t.id === roleInfo.dashboardTab ? "active" : ""}" data-tab="${t.id}" onclick="event.preventDefault(); App.switchTab('${t.id}')">
          ${t.label}
        </a>
      `
      )
      .join("");
  },

  switchTab(tabName) {
    this.state.currentTab = tabName;

    // Update nav links active state
    document.querySelectorAll(".nav-link").forEach((l) => {
      l.classList.toggle("active", l.getAttribute("data-tab") === tabName);
    });

    // Show selected pane and hide others
    document.querySelectorAll(".tab-pane").forEach((pane) => {
      pane.style.display = pane.id === `tab-${tabName}` ? "block" : "none";
    });

    // Tab-specific initializers
    if (tabName.startsWith("dashboard-")) {
      DashboardModule.renderForRole(this.state.currentRole);
    } else if (tabName === "trace") {
      if (!this.state.selectedBatch) {
        TraceModule.init();
      }
    } else if (tabName === "defects") {
      DefectsModule.load();
    } else if (tabName === "batches") {
      BatchesModule.load();
    } else if (tabName === "recalls") {
      RecallsModule.load();
    } else if (tabName === "materials") {
      MaterialsModule.load();
    } else if (tabName === "reports") {
      ReportsModule.load();
    } else if (tabName === "master-data") {
      MasterDataModule.load();
    }
  },

  switchMasterSubTab(subtab) {
    this.switchTab("master-data");
    if (typeof MasterDataModule !== "undefined" && MasterDataModule.switchSubTab) {
      MasterDataModule.switchSubTab(subtab);
    }
  },

  showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.cssText =
        "position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const bgColor = type === "error" ? "#7f1d1d" : type === "success" ? "#065f46" : "#1e293b";
    const borderColor = type === "error" ? "#ef4444" : type === "success" ? "#10b981" : "#38bdf8";

    toast.style.cssText = `background:${bgColor};border:1px solid ${borderColor};color:#fff;padding:10px 18px;border-radius:6px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,0.5);opacity:0;transform:translateY(10px);transition:all 0.2s ease;`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 10);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  },

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add("open");
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove("open");
  },
};

window.addEventListener("DOMContentLoaded", () => App.init());
