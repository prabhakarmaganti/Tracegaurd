// Batches Production Management Module
const BatchesModule = {
  batchesList: [],

  async load() {
    try {
      const res = await fetch("/api/batches");
      if (!res.ok) throw new Error("Failed to load batches");
      this.batchesList = await res.json();
      this.render();
      this.populateStartBatchForm();
    } catch (err) {
      console.error(err);
      App.showToast("Failed to fetch batches", "error");
    }
  },

  render() {
    const tbody = document.getElementById("batches-table-tbody");
    if (!tbody) return;

    if (!this.batchesList.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:24px;">No batches found.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.batchesList
      .map((b) => {
        let statusBadge = `<span class="badge badge-traced-clear"><span class="badge-dot"></span>Completed</span>`;
        if (b.status === "active") {
          statusBadge = `<span class="badge badge-recall-pending"><span class="badge-dot"></span>In Production</span>`;
        } else if (b.status === "incomplete") {
          statusBadge = `<span class="badge badge-high"><span class="badge-dot"></span>Incomplete Trace</span>`;
        }

        const actions =
          b.status === "active"
            ? `<button class="btn-primary" style="font-size:11px;padding:4px 8px;" onclick="BatchesModule.openCloseModal(${b.id}, '${b.batch_code}')">Close Batch</button>`
            : `<button class="btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="BatchesModule.printLabel(${b.id})">Label (QR)</button>`;

        return `
          <tr>
            <td><span class="code-mono" onclick="DashboardModule.onRowClick('${b.batch_code}')">${b.batch_code}</span></td>
            <td><b>${b.product_name}</b><div style="font-size:12px;color:var(--text-dim);">${b.product_sku}</div></td>
            <td><span style="font-family:var(--font-mono);">${b.machine_code}</span></td>
            <td>${b.operator_name}</td>
            <td><b>${b.quantity_produced}</b> units</td>
            <td>${statusBadge}</td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="DashboardModule.onRowClick('${b.batch_code}')">Trace</button>
                ${actions}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  },

  async populateStartBatchForm() {
    try {
      const [mRes, pRes, oRes, sRes, lRes] = await Promise.all([
        fetch("/api/machines"),
        fetch("/api/products"),
        fetch("/api/operators"),
        fetch("/api/shifts"),
        fetch("/api/materials/lots?available_only=true"),
      ]);

      const machines = await mRes.json();
      const products = await pRes.json();
      const operators = await oRes.json();
      const shifts = await sRes.json();
      const lots = await lRes.json();

      const mSelect = document.getElementById("start-batch-machine");
      if (mSelect) {
        mSelect.innerHTML = machines.map((m) => `<option value="${m.id}">${m.code} &mdash; ${m.name}</option>`).join("");
      }

      const pSelect = document.getElementById("start-batch-product");
      if (pSelect) {
        pSelect.innerHTML = products.map((p) => `<option value="${p.id}">${p.sku} &mdash; ${p.name}</option>`).join("");
      }

      const oSelect = document.getElementById("start-batch-operator");
      if (oSelect) {
        oSelect.innerHTML = operators.map((o) => `<option value="${o.id}">${o.name} (${o.badge_id})</option>`).join("");
      }

      const sSelect = document.getElementById("start-batch-shift");
      if (sSelect) {
        sSelect.innerHTML = shifts.map((s) => `<option value="${s.id}">${s.name} (${s.start_time}&ndash;${s.end_time})</option>`).join("");
      }

      const lotsContainer = document.getElementById("start-batch-lots-container");
      if (lotsContainer) {
        lotsContainer.innerHTML = lots
          .map(
            (l) => `
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:6px;background:#111618;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;">
            <input type="checkbox" name="material_lot_ids" value="${l.id}" checked />
            <span class="code-mono" style="color:#5eead4;">${l.lot_code}</span>
            <span style="color:var(--text-muted);font-size:12px;">(${l.material_name} &bull; ${l.remaining_quantity} ${l.unit} avail)</span>
          </label>
        `
          )
          .join("");
      }
    } catch (err) {
      console.error("Error populating start batch options", err);
    }
  },

  openStartModal() {
    this.populateStartBatchForm();
    App.openModal("start-batch-modal");
  },

  async handleStartSubmit(e) {
    e.preventDefault();
    const machineId = parseInt(document.getElementById("start-batch-machine").value);
    const productId = parseInt(document.getElementById("start-batch-product").value);
    const operatorId = parseInt(document.getElementById("start-batch-operator").value);
    const shiftId = parseInt(document.getElementById("start-batch-shift").value);

    const lotCheckboxes = document.querySelectorAll('input[name="material_lot_ids"]:checked');
    const lotIds = Array.from(lotCheckboxes).map((cb) => parseInt(cb.value));

    try {
      const res = await fetch("/api/batches/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machine_id: machineId,
          product_id: productId,
          operator_id: operatorId,
          shift_id: shiftId,
          material_lot_ids: lotIds,
          actor: App.state.currentRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start batch");
      }

      const data = await res.json();
      App.showToast(`Batch ${data.batch_code} initiated!`, "success");
      App.closeModal("start-batch-modal");
      this.load();
      App.loadDashboardData();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  openCloseModal(batchId, batchCode) {
    document.getElementById("close-batch-id").value = batchId;
    document.getElementById("close-batch-code-display").textContent = batchCode;
    App.openModal("close-batch-modal");
  },

  async handleCloseSubmit(e) {
    e.preventDefault();
    const batchId = document.getElementById("close-batch-id").value;
    const qty = parseFloat(document.getElementById("close-batch-qty").value);
    const notes = document.getElementById("close-batch-notes").value;
    const serialize = document.getElementById("close-batch-serialize").checked;

    try {
      const res = await fetch(`/api/batches/${batchId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity_produced: qty,
          notes: notes,
          serialize_units: serialize,
          actor: App.state.currentRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to close batch");
      }

      const data = await res.json();
      App.showToast(`Batch closed: ${data.message}`, "success");
      App.closeModal("close-batch-modal");
      this.load();
      App.loadDashboardData();
      BatchesModule.printLabel(batchId);
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  async printLabel(batchId) {
    try {
      const res = await fetch(`/api/batches/${batchId}/label`);
      if (!res.ok) throw new Error("Could not load label");
      const data = await res.json();
      const modalContent = document.getElementById("label-modal-content");
      if (!modalContent) return;

      modalContent.innerHTML = `
        <div id="printable-label-area" class="printable-label">
          <img src="${data.qr_data_url}" class="label-qr-img" alt="Batch QR Code" />
          <div class="label-info">
            <div class="label-brand">Production &amp; Defect Tracking Label</div>
            <div class="label-code">${data.batch_code}</div>
            <div class="label-meta"><b>Product:</b> ${data.product_sku} (${data.product_name})</div>
            <div class="label-meta"><b>Machine:</b> ${data.machine_code} &bull; <b>Shift:</b> ${data.shift_name}</div>
            <div class="label-meta"><b>Operator:</b> ${data.operator_name} &bull; <b>Qty:</b> ${data.quantity} units</div>
            <div class="label-meta"><b>Date:</b> ${data.date_str}</div>
          </div>
        </div>
        <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn-secondary" onclick="App.closeModal('label-modal')">Close</button>
          <button class="btn-primary" onclick="window.print()">Print to Floor Label Printer</button>
        </div>
      `;
      App.openModal("label-modal");
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },
};
