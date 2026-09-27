// Raw Material Lots & Intake Module
const MaterialsModule = {
  lotsList: [],

  async load() {
    this.populateSuppliers();
    try {
      const res = await fetch("/api/materials/lots");
      if (!res.ok) throw new Error("Failed to load material lots");
      this.lotsList = await res.json();
      this.render();
    } catch (err) {
      console.error(err);
      App.showToast("Failed to load raw material inventory", "error");
    }
  },

  async populateSuppliers() {
    try {
      const res = await fetch("/api/suppliers");
      const suppliers = await res.json();
      const select = document.getElementById("lot-intake-supplier");
      if (select) {
        select.innerHTML = suppliers.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
      }
    } catch (err) {
      console.error(err);
    }
  },

  render() {
    const tbody = document.getElementById("materials-table-tbody");
    if (!tbody) return;

    tbody.innerHTML = this.lotsList
      .map((l) => {
        const usagePct = Math.round(((l.quantity - l.remaining_quantity) / l.quantity) * 100);
        return `
          <tr>
            <td><span class="code-mono" style="color:#5eead4;font-weight:600;">${l.lot_code}</span></td>
            <td><b>${l.material_name}</b></td>
            <td>${l.supplier_name}</td>
            <td>${l.received_date}</td>
            <td><b>${l.remaining_quantity}</b> / ${l.quantity} ${l.unit}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;height:6px;background:#334155;border-radius:4px;overflow:hidden;width:60px;">
                  <div style="width:${usagePct}%;background:#2dd4bf;height:100%;"></div>
                </div>
                <span style="font-size:11px;color:var(--text-muted);">${usagePct}% used</span>
              </div>
            </td>
            <td>
              <button class="btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="MaterialsModule.showLotLabel(${l.id})">Bin Label (QR)</button>
            </td>
          </tr>
        `;
      })
      .join("");
  },

  openIntakeModal() {
    this.populateSuppliers();
    App.openModal("material-intake-modal");
  },

  async handleIntakeSubmit(e) {
    e.preventDefault();
    const supId = parseInt(document.getElementById("lot-intake-supplier").value);
    const code = document.getElementById("lot-intake-code").value.trim();
    const name = document.getElementById("lot-intake-name").value.trim();
    const qty = parseFloat(document.getElementById("lot-intake-qty").value);
    const unit = document.getElementById("lot-intake-unit").value;

    try {
      const res = await fetch("/api/materials/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supId,
          lot_code: code,
          material_name: name,
          quantity: qty,
          unit: unit,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Intake failed");
      }

      const data = await res.json();
      App.showToast(`Lot ${data.lot_code} registered in warehouse!`, "success");
      App.closeModal("material-intake-modal");
      this.load();
      this.showLotLabel(data.id);
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  async showLotLabel(lotId) {
    try {
      const res = await fetch(`/api/materials/lots/${lotId}/label`);
      if (!res.ok) throw new Error("Could not load label");
      const data = await res.json();
      const modalContent = document.getElementById("label-modal-content");
      if (!modalContent) return;

      modalContent.innerHTML = `
        <div id="printable-label-area" class="printable-label">
          <img src="${data.qr_data_url}" class="label-qr-img" alt="Material Lot QR Code" />
          <div class="label-info">
            <div class="label-brand">TraceGuard Raw Material Bin Tag</div>
            <div class="label-code">${data.lot_code}</div>
            <div class="label-meta"><b>Material:</b> ${data.material_name}</div>
            <div class="label-meta"><b>Supplier:</b> ${data.supplier_name}</div>
            <div class="label-meta"><b>Initial Qty:</b> ${data.quantity} ${data.unit}</div>
            <div class="label-meta"><b>Received:</b> ${data.received_date}</div>
          </div>
        </div>
        <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn-secondary" onclick="App.closeModal('label-modal')">Close</button>
          <button class="btn-primary" onclick="window.print()">Print Bin Label</button>
        </div>
      `;
      App.openModal("label-modal");
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },
};
