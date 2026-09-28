// Recall Scope Calculator & Containment Module
const RecallsModule = {
  currentCalculation: null,

  async load() {
    this.loadRecallEvents();
    const input = document.getElementById("recall-trigger-code");
    if (input && !input.value) {
      input.value = "P1-WGT-260927-M04-0032";
    }
    this.calculate();
  },

  openForBatch(batchCode) {
    App.switchTab("recalls");
    const input = document.getElementById("recall-trigger-code");
    if (input) input.value = batchCode;
    this.calculate();
  },

  async calculate() {
    const code = document.getElementById("recall-trigger-code").value.trim();
    if (!code) {
      App.showToast("Please enter a triggering batch code", "error");
      return;
    }

    const matchMachine = document.getElementById("recall-match-machine").checked;
    const matchLots = document.getElementById("recall-match-lots").checked;
    const matchTime = document.getElementById("recall-match-time").checked;

    const resultsArea = document.getElementById("recall-results-area");
    if (resultsArea) {
      resultsArea.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">Calculating recall boundary...</div>`;
    }

    try {
      const res = await fetch("/api/recalls/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggering_code: code,
          match_machine: matchMachine,
          match_material_lots: matchLots,
          match_time_window: matchTime,
          window_hours: 24,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Recall calculation failed");
      }

      const data = await res.json();
      this.currentCalculation = data;
      this.renderResults(data);
    } catch (err) {
      if (resultsArea) {
        resultsArea.innerHTML = `<div style="background:#201416;border:1px solid #7f1d1d;padding:16px;border-radius:6px;color:#f87171;">${err.message}</div>`;
      }
    }
  },

  renderResults(data) {
    const resultsArea = document.getElementById("recall-results-area");
    if (!resultsArea) return;

    const batchesRows = data.affected_batches
      .map(
        (b) => `
      <tr>
        <td><span class="code-mono" onclick="DashboardModule.onRowClick('${b.batch_code}')">${b.batch_code}</span></td>
        <td>${b.product_name}</td>
        <td><span style="font-family:var(--font-mono);">${b.machine_code}</span></td>
        <td><b>${b.quantity_produced}</b> units</td>
        <td><span style="color:#5eead4;font-size:12.5px;">${b.matched_reasons.join(" &bull; ")}</span></td>
      </tr>
    `
      )
      .join("");

    resultsArea.innerHTML = `
      <div style="background:#12191c;border:1px solid var(--border-subtle);border-radius:8px;padding:20px;margin-bottom:20px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:20px;">
          <div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Production &amp; Defect Tracking Targeted Recall</div>
            <div style="font-size:28px;font-weight:700;color:#f87171;">${data.total_units_at_risk} <span style="font-size:14px;color:var(--text-muted);font-weight:400;">units at risk</span></div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">Across ${data.total_affected_batches} candidate batches</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Naive 30-Day Date Recall</div>
            <div style="font-size:28px;font-weight:700;color:var(--text-muted);">${data.naive_date_range_units} <span style="font-size:14px;color:var(--text-dim);font-weight:400;">units</span></div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">Blanket containment inventory loss</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Recall Scope Reduction</div>
            <div style="font-size:28px;font-weight:700;color:#2dd4bf;">${data.reduction_percentage}%</div>
            <div style="font-size:12px;color:#34d399;margin-top:2px;">✓ ${data.naive_date_range_units - data.total_units_at_risk} good units preserved!</div>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:6px;">
            <span>Targeted Recall (${data.total_units_at_risk} units)</span>
            <span>Saved Inventory (${data.reduction_percentage}%)</span>
          </div>
          <div style="height:12px;background:#334155;border-radius:9999px;overflow:hidden;display:flex;">
            <div style="width:${100 - data.reduction_percentage}%;background:#f87171;" title="Targeted Recall Population"></div>
            <div style="width:${data.reduction_percentage}%;background:#2dd4bf;" title="Preserved Good Inventory"></div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <span style="font-size:13px;color:var(--text-muted);">
            Criteria: Machine <b>${data.criteria.machine_code}</b> &bull; Shared Lots: <b>${data.criteria.lot_codes.join(", ") || "None"}</b>
          </span>
          <button class="btn-primary" style="background:#ef4444;color:#fff;" onclick="RecallsModule.confirmRecallEvent()">
            🚨 Authorize Quarantine & Recall (${data.total_units_at_risk} Units)
          </button>
        </div>
      </div>

      <h4 style="font-size:14px;font-weight:600;margin-bottom:12px;color:#fff;">Affected Batches in Quarantine Boundary:</h4>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Batch Code</th>
              <th>Product</th>
              <th>Machine</th>
              <th>Quantity</th>
              <th>Match Reason</th>
            </tr>
          </thead>
          <tbody>
            ${batchesRows}
          </tbody>
        </table>
      </div>
    `;
  },

  async confirmRecallEvent() {
    if (!this.currentCalculation) return;
    const calc = this.currentCalculation;
    const notes = prompt("Enter authorization notes / quarantine quarantine directive:", "Containment initiated by Plant Quality Manager.");
    if (notes === null) return;

    try {
      const res = await fetch("/api/recalls/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggering_batch_code: calc.triggering_batch_code,
          criteria: calc.criteria,
          affected_batch_codes: calc.affected_batches.map((b) => b.batch_code),
          total_units_at_risk: calc.total_units_at_risk,
          notes: notes,
          actor: App.state.currentRole,
        }),
      });

      if (!res.ok) throw new Error("Failed to confirm recall event");
      const ev = await res.json();
      App.showToast(`Recall REC-${ev.id} authorized for ${calc.total_units_at_risk} units!`, "success");
      this.loadRecallEvents();
      App.loadDashboardData();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  async loadRecallEvents() {
    const listContainer = document.getElementById("recall-history-list");
    if (!listContainer) return;

    try {
      const res = await fetch("/api/recalls");
      if (!res.ok) return;
      const events = await res.json();

      if (!events.length) {
        listContainer.innerHTML = `<div style="color:var(--text-dim);font-size:13px;">No past recall events recorded.</div>`;
        return;
      }

      listContainer.innerHTML = events
        .map(
          (e) => `
        <div style="background:#151e22;border:1px solid var(--border-subtle);border-radius:6px;padding:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-weight:700;color:#f87171;">REC-${e.id}</span>
              <span class="badge badge-high">${e.status}</span>
              <span style="font-size:12px;color:var(--text-muted);">${e.created_at}</span>
            </div>
            <div style="font-size:13px;color:var(--text-main);margin-top:4px;">
              Contained <b>${e.total_units_at_risk} units</b> across ${e.affected_batches.length} batches
            </div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${e.notes || ""}</div>
          </div>
          <button class="btn-secondary" style="font-size:11px;" onclick="ReportsModule.exportRecallEvent(${e.id})">Compliance Export</button>
        </div>
      `
        )
        .join("");
    } catch (err) {
      console.error(err);
    }
  },
};
