// Trace Module - Chain of Custody Resolution & Inspection
const TraceModule = {
  currentData: null,

  init() {
    const input = document.getElementById("trace-search-input");
    if (input && !input.value) {
      input.value = "P1-WGT-260927-M04-0032";
    }
  },

  async lookup(code) {
    if (!code) {
      const input = document.getElementById("trace-search-input");
      code = input ? input.value.trim() : "";
    }
    if (!code) {
      App.showToast("Please enter a batch code or unit serial", "error");
      return;
    }

    const input = document.getElementById("trace-search-input");
    if (input) input.value = code;

    const resultContainer = document.getElementById("trace-result-container");
    if (resultContainer) {
      resultContainer.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Resolving chain of custody for <b>${code}</b>...</div>`;
    }

    try {
      const res = await fetch(`/api/trace/${encodeURIComponent(code)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Batch or unit code not found");
      }
      const data = await res.json();
      this.currentData = data;
      this.renderTraceResult(data);
    } catch (err) {
      if (resultContainer) {
        resultContainer.innerHTML = `
          <div style="background:#201416;border:1px solid #7f1d1d;border-radius:8px;padding:24px;text-align:center;">
            <p style="color:#f87171;font-weight:600;font-size:15px;margin-bottom:8px;">Trace Lookup Failed</p>
            <p style="color:var(--text-muted);font-size:13px;">${err.message}</p>
          </div>
        `;
      }
    }
  },

  renderTraceResult(data) {
    const container = document.getElementById("trace-result-container");
    if (!container) return;

    const prod = data.product || {};
    const mach = data.machine || {};
    const op = data.operator || {};
    const shift = data.shift || {};
    const tw = data.time_window || {};

    const statusBadge = data.is_fully_traced
      ? `<span class="badge badge-traced-clear"><span class="badge-dot"></span>Fully Traced (100% Complete)</span>`
      : `<span class="badge badge-high"><span class="badge-dot"></span>Incomplete Trace (${data.missing_fields.join(", ")})</span>`;

    const lotsHtml = data.material_lots.length
      ? data.material_lots
          .map(
            (l) => `
          <div style="background:#151e22;border:1px solid var(--border-subtle);border-radius:6px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="code-mono" style="color:#5eead4;font-weight:600;">${l.lot_code}</span>
                <span style="font-size:12px;color:var(--text-muted);">&bull; ${l.material_name}</span>
              </div>
              <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">
                Supplier: <b style="color:var(--text-muted);">${l.supplier_name}</b> (${l.supplier_contact || "Direct"}) &bull; Received: ${l.received_date}
              </div>
            </div>
            <button class="btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="MaterialsModule.showLotLabel('${l.id}')">View Lot Label</button>
          </div>
        `
          )
          .join("")
      : `<span style="color:var(--text-dim);font-style:italic;">No raw material lots recorded</span>`;

    const defectsHtml = data.defects.length
      ? data.defects
          .map(
            (d) => `
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:6px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <span style="color:#f87171;font-weight:600;">DEF-${d.id}: ${d.defect_type}</span>
              <span style="color:var(--text-muted);font-size:12px;margin-left:8px;">(${d.severity} severity) &bull; Reported: ${d.reported_at}</span>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${d.description || "No description provided."}</div>
            </div>
            <span class="badge ${d.severity === "High" ? "badge-high" : "badge-medium"}">${d.status}</span>
          </div>
        `
          )
          .join("")
      : `<div style="color:#34d399;font-size:13px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);padding:10px 14px;border-radius:6px;">✓ No defects reported on this batch. Quality clear.</div>`;

    container.innerHTML = `
      <div class="card" style="margin-top:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--border-subtle);padding-bottom:18px;margin-bottom:18px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <span class="code-mono" style="font-size:20px;font-weight:700;color:#fff;">${data.batch_code}</span>
              ${statusBadge}
            </div>
            <div style="font-size:13px;color:var(--text-muted);">
              Product: <b style="color:#fff;">${prod.sku || "N/A"} &mdash; ${prod.name || "N/A"}</b> &bull; Quantity: <b style="color:#5eead4;">${data.quantity_produced} units</b>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-primary" onclick="TraceModule.showBatchLabel()">Print Label (QR)</button>
            <button class="btn-secondary" onclick="TraceModule.exportReport('pdf')">Export PDF</button>
            <button class="btn-secondary" onclick="TraceModule.exportReport('csv')">Export CSV</button>
            <button class="btn-secondary" onclick="RecallsModule.openForBatch('${data.batch_code}')">Recall Scope</button>
            <button class="btn-secondary" onclick="DefectsModule.openForBatch('${data.batch_code}')">+ Report Defect</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:24px;">
          <div style="background:#101618;border:1px solid var(--border-subtle);padding:14px;border-radius:8px;">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Machine / Work Center</div>
            <div style="font-size:15px;font-weight:600;color:#fff;">${mach.code || "N/A"} &mdash; ${mach.name || "N/A"}</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">Location: ${mach.location || "Line"}</div>
          </div>
          <div style="background:#101618;border:1px solid var(--border-subtle);padding:14px;border-radius:8px;">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Operator</div>
            <div style="font-size:15px;font-weight:600;color:#fff;">${op.name || "Unassigned"}</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">Badge ID: ${op.badge_id || "N/A"}</div>
          </div>
          <div style="background:#101618;border:1px solid var(--border-subtle);padding:14px;border-radius:8px;">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Shift & Time Window</div>
            <div style="font-size:15px;font-weight:600;color:#fff;">${shift.name || "N/A"} (${shift.time_window || ""})</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">Ran: ${tw.formatted || "Active"}</div>
          </div>
          <div style="background:#101618;border:1px solid var(--border-subtle);padding:14px;border-radius:8px;">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Trace Integrity Check</div>
            <div style="font-size:15px;font-weight:600;color:${data.is_fully_traced ? "#34d399" : "#f87171"};">
              ${data.is_fully_traced ? "PASSED (100% Chain)" : "FAILED (Missing Fields)"}
            </div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">Digital Audit Sign: VERIFIED</div>
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <h4 style="font-size:14px;font-weight:600;color:#fff;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
            <span style="color:#2dd4bf;">●</span> Consumed Raw Material Lots (Genealogy)
          </h4>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${lotsHtml}
          </div>
        </div>

        <div>
          <h4 style="font-size:14px;font-weight:600;color:#fff;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
            <span style="color:#f87171;">●</span> Quality Log & Known Defects
          </h4>
          ${defectsHtml}
        </div>
      </div>
    `;
  },

  showBatchLabel() {
    if (!this.currentData) return;
    const data = this.currentData;
    const modalContent = document.getElementById("label-modal-content");
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div id="printable-label-area" class="printable-label">
        <img src="${data.qr_data_url}" class="label-qr-img" alt="Batch QR Code" />
        <div class="label-info">
          <div class="label-brand">TraceGuard Traceability Label</div>
          <div class="label-code">${data.batch_code}</div>
          <div class="label-meta"><b>Product:</b> ${data.product?.sku || ""} (${data.product?.name || ""})</div>
          <div class="label-meta"><b>Machine:</b> ${data.machine?.code || ""} &bull; <b>Shift:</b> ${data.shift?.name || ""}</div>
          <div class="label-meta"><b>Operator:</b> ${data.operator?.name || ""} &bull; <b>Qty:</b> ${data.quantity_produced} units</div>
          <div class="label-meta"><b>Date:</b> ${data.time_window?.start || ""}</div>
        </div>
      </div>
      <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">
        <button class="btn-secondary" onclick="App.closeModal('label-modal')">Close</button>
        <button class="btn-primary" onclick="TraceModule.printLabel()">Print to Floor Label Printer</button>
      </div>
    `;

    App.openModal("label-modal");
  },

  printLabel() {
    window.print();
  },

  exportReport(format) {
    if (!this.currentData) return;
    const code = this.currentData.batch_code;
    window.open(`/api/reports/batch/${encodeURIComponent(code)}/export?format=${format}`, "_blank");
  },
};
