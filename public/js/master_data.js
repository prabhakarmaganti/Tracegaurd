// Master Data Management Module (Admin)
const MasterDataModule = {
  currentTab: "machines",

  async load() {
    this.switchSubTab(this.currentTab);
  },

  switchSubTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll(".master-tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-subtab") === tab);
    });

    if (tab === "machines") this.loadMachines();
    else if (tab === "operators") this.loadOperators();
    else if (tab === "shifts") this.loadShifts();
    else if (tab === "products") this.loadProducts();
    else if (tab === "suppliers") this.loadSuppliers();
  },

  async loadMachines() {
    const container = document.getElementById("master-data-content");
    try {
      const res = await fetch("/api/machines");
      const list = await res.json();
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h4 style="font-size:15px;color:#fff;">Production Machines & Work Centers (${list.length})</h4>
          <button class="btn-primary" onclick="MasterDataModule.promptAddMachine()">+ Add Machine</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Location</th><th>Status</th></tr></thead>
          <tbody>
            ${list
              .map(
                (m) => `
              <tr>
                <td><span class="code-mono" style="color:#5eead4;">${m.code}</span></td>
                <td><b>${m.name}</b></td>
                <td>${m.location || "N/A"}</td>
                <td><span class="badge badge-traced-clear">Active</span></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error(e);
    }
  },

  async promptAddMachine() {
    const code = prompt("Machine Code (e.g. M10):");
    if (!code) return;
    const name = prompt("Machine Name (e.g. Hydraulic Press 3):");
    if (!name) return;
    const location = prompt("Location (e.g. Bay 2 - Stamping):", "Bay 2");

    try {
      const res = await fetch("/api/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, location, active: true }),
      });
      if (!res.ok) throw new Error("Failed to add machine");
      App.showToast(`Machine ${code} added!`, "success");
      this.loadMachines();
    } catch (e) {
      App.showToast(e.message, "error");
    }
  },

  async loadOperators() {
    const container = document.getElementById("master-data-content");
    try {
      const res = await fetch("/api/operators");
      const list = await res.json();
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h4 style="font-size:15px;color:#fff;">Qualified Machine Operators (${list.length})</h4>
          <button class="btn-primary" onclick="MasterDataModule.promptAddOperator()">+ Add Operator</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Badge ID</th><th>Full Name</th><th>Status</th></tr></thead>
          <tbody>
            ${list
              .map(
                (o) => `
              <tr>
                <td><span class="code-mono">${o.badge_id}</span></td>
                <td><b>${o.name}</b></td>
                <td><span class="badge badge-traced-clear">Active</span></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error(e);
    }
  },

  async promptAddOperator() {
    const name = prompt("Operator Name:");
    if (!name) return;
    const badge_id = prompt("Badge ID (e.g. OP-9011):");
    if (!badge_id) return;

    try {
      const res = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, badge_id, active: true }),
      });
      if (!res.ok) throw new Error("Failed to add operator");
      App.showToast(`Operator ${name} registered!`, "success");
      this.loadOperators();
    } catch (e) {
      App.showToast(e.message, "error");
    }
  },

  async loadShifts() {
    const container = document.getElementById("master-data-content");
    try {
      const res = await fetch("/api/shifts");
      const list = await res.json();
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h4 style="font-size:15px;color:#fff;">Factory Shifts</h4>
        </div>
        <table class="data-table">
          <thead><tr><th>Shift Name</th><th>Start Time</th><th>End Time</th></tr></thead>
          <tbody>
            ${list
              .map(
                (s) => `
              <tr>
                <td><b>${s.name}</b></td>
                <td><span class="code-mono">${s.start_time}</span></td>
                <td><span class="code-mono">${s.end_time}</span></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error(e);
    }
  },

  async loadProducts() {
    const container = document.getElementById("master-data-content");
    try {
      const res = await fetch("/api/products");
      const list = await res.json();
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h4 style="font-size:15px;color:#fff;">Manufactured Products & SKUs (${list.length})</h4>
          <button class="btn-primary" onclick="MasterDataModule.promptAddProduct()">+ Add Product</button>
        </div>
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Product Name</th><th>Specification</th></tr></thead>
          <tbody>
            ${list
              .map(
                (p) => `
              <tr>
                <td><span class="code-mono" style="color:#5eead4;">${p.sku}</span></td>
                <td><b>${p.name}</b></td>
                <td>${p.spec || "N/A"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error(e);
    }
  },

  async promptAddProduct() {
    const sku = prompt("Product SKU (e.g. VLV-C300):");
    if (!sku) return;
    const name = prompt("Product Name (e.g. Check Valve C300):");
    if (!name) return;
    const spec = prompt("Specification / Description:", "Precision hydraulic valve");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, name, spec }),
      });
      if (!res.ok) throw new Error("Failed to add product");
      App.showToast(`Product ${sku} created!`, "success");
      this.loadProducts();
    } catch (e) {
      App.showToast(e.message, "error");
    }
  },

  async loadSuppliers() {
    const container = document.getElementById("master-data-content");
    try {
      const res = await fetch("/api/suppliers");
      const list = await res.json();
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h4 style="font-size:15px;color:#fff;">Raw Material Suppliers (${list.length})</h4>
          <button class="btn-primary" onclick="MasterDataModule.promptAddSupplier()">+ Add Supplier</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Supplier Name</th><th>Contact / Dispatch Info</th></tr></thead>
          <tbody>
            ${list
              .map(
                (s) => `
              <tr>
                <td><b>${s.name}</b></td>
                <td>${s.contact || "N/A"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error(e);
    }
  },

  async promptAddSupplier() {
    const name = prompt("Supplier Name:");
    if (!name) return;
    const contact = prompt("Contact Info / Email:");

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact }),
      });
      if (!res.ok) throw new Error("Failed to add supplier");
      App.showToast(`Supplier ${name} saved!`, "success");
      this.loadSuppliers();
    } catch (e) {
      App.showToast(e.message, "error");
    }
  },
};
