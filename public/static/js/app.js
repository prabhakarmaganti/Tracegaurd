// TraceGuard Frontend Core Application Controller
const App = {
  state: {
    currentTab: "dashboard",
    currentRole: "Manager",
    summary: null,
    selectedBatch: null,
  },

  init() {
    this.bindNavigation();
    this.bindRoleSelector();
    this.loadDashboardData();
  },

  bindNavigation() {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const tab = link.getAttribute("data-tab");
        this.switchTab(tab);
      });
    });
  },

  switchTab(tabName) {
    this.state.currentTab = tabName;
    document.querySelectorAll(".nav-link").forEach((l) => {
      l.classList.toggle("active", l.getAttribute("data-tab") === tabName);
    });

    document.querySelectorAll(".tab-pane").forEach((pane) => {
      pane.style.display = pane.id === `tab-${tabName}` ? "block" : "none";
    });

    // Tab-specific initializers
    if (tabName === "dashboard") {
      this.loadDashboardData();
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

  bindRoleSelector() {
    const selector = document.getElementById("role-selector");
    if (selector) {
      selector.addEventListener("change", (e) => {
        this.state.currentRole = e.target.value;
        this.showToast(`Switched active persona to ${this.state.currentRole}`);
      });
    }
  },

  async loadDashboardData() {
    try {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Failed to load dashboard summary");
      const data = await res.json();
      this.state.summary = data;
      DashboardModule.render(data);
    } catch (err) {
      console.error(err);
      this.showToast("Failed to fetch dashboard data", "error");
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
