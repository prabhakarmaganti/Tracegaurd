// Dashboard Component Controller
const DashboardModule = {
  render(data) {
    if (!data) return;

    // 1. KPI Cards
    const kpiCompleteness = document.getElementById("kpi-completeness");
    const kpiCompletenessSub = document.getElementById("kpi-completeness-sub");
    if (kpiCompleteness) kpiCompleteness.textContent = `${data.completeness_percentage}%`;
    if (kpiCompletenessSub) kpiCompletenessSub.textContent = data.completeness_text;

    const kpiDefects = document.getElementById("kpi-open-defects");
    const kpiDefectsSub = document.getElementById("kpi-open-defects-sub");
    if (kpiDefects) kpiDefects.textContent = data.open_defects_count;
    if (kpiDefectsSub) kpiDefectsSub.textContent = data.open_defects_subtext;

    const kpiRecall = document.getElementById("kpi-recall-reduction");
    const kpiRecallSub = document.getElementById("kpi-recall-reduction-sub");
    if (kpiRecall) kpiRecall.textContent = `${data.recall_reduction_percentage}%`;
    if (kpiRecallSub) kpiRecallSub.textContent = data.recall_reduction_subtext;

    const kpiBatches = document.getElementById("kpi-batches-today");
    const kpiBatchesSub = document.getElementById("kpi-batches-today-sub");
    if (kpiBatches) kpiBatches.textContent = data.batches_today_count;
    if (kpiBatchesSub) kpiBatchesSub.textContent = data.batches_today_subtext;

    // 2. Machine Defect Rate Bar Chart
    const machineContainer = document.getElementById("chart-machine-defects");
    if (machineContainer && data.defects_by_machine) {
      const maxCount = Math.max(...data.defects_by_machine.map((d) => d.count), 8);
      machineContainer.innerHTML = data.defects_by_machine
        .map((m) => {
          const widthPct = Math.max(12, Math.round((m.count / maxCount) * 100));
          const colorClass = m.is_anomaly ? "coral" : "teal";
          return `
            <div class="bar-row" title="${m.code}: ${m.count} defects logged">
              <span class="bar-label">${m.code}</span>
              <div class="bar-track">
                <div class="bar-fill ${colorClass}" style="width: ${widthPct}%;"></div>
              </div>
              <span class="bar-value">${m.count}</span>
            </div>
          `;
        })
        .join("");
    }

    // 3. Material Lot Defect Rate Bar Chart
    const lotContainer = document.getElementById("chart-lot-defects");
    if (lotContainer && data.defects_by_lot) {
      const maxLotCount = Math.max(...data.defects_by_lot.map((l) => l.count), 7);
      lotContainer.innerHTML = data.defects_by_lot
        .map((l) => {
          const widthPct = Math.max(12, Math.round((l.count / maxLotCount) * 100));
          const colorClass = l.is_anomaly ? "coral" : "teal";
          return `
            <div class="bar-row" title="${l.lot_code}: ${l.count} defects linked">
              <span class="bar-label">${l.lot_code}</span>
              <div class="bar-track">
                <div class="bar-fill ${colorClass}" style="width: ${widthPct}%;"></div>
              </div>
              <span class="bar-value">${l.count}</span>
            </div>
          `;
        })
        .join("");
    }

    // 4. Recent Defects Table
    const tableBody = document.getElementById("recent-defects-tbody");
    if (tableBody && data.recent_defects) {
      tableBody.innerHTML = data.recent_defects
        .slice(0, 6)
        .map((d) => {
          let severityBadge = `<span class="badge badge-medium"><span class="badge-dot"></span>Medium</span>`;
          if (d.severity === "High") {
            severityBadge = `<span class="badge badge-high"><span class="badge-dot"></span>High</span>`;
          } else if (d.severity === "Low") {
            severityBadge = `<span class="badge badge-low"><span class="badge-dot"></span>Low</span>`;
          }

          let statusBadge = `<span class="badge badge-closed"><span class="badge-dot"></span>${d.status}</span>`;
          if (d.status.includes("pending")) {
            statusBadge = `<span class="badge badge-recall-pending"><span class="badge-dot"></span>${d.status}</span>`;
          } else if (d.status.includes("active")) {
            statusBadge = `<span class="badge badge-recall-active"><span class="badge-dot"></span>${d.status}</span>`;
          } else if (d.status.includes("Traced") || d.status.includes("clear")) {
            statusBadge = `<span class="badge badge-traced-clear"><span class="badge-dot"></span>${d.status}</span>`;
          } else if (d.status === "Closed") {
            statusBadge = `<span class="badge badge-closed"><span class="badge-dot"></span>Closed</span>`;
          }

          return `
            <tr style="cursor: pointer;" onclick="DashboardModule.onRowClick('${d.batch_code}')">
              <td><span class="code-mono">${d.batch_code}</span></td>
              <td><span style="font-family: var(--font-mono); color: var(--text-muted);">${d.machine_code}</span></td>
              <td>${d.defect_type}</td>
              <td>${severityBadge}</td>
              <td style="color: var(--text-muted);">${d.reported_at}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        })
        .join("");
    }
  },

  onRowClick(batchCode) {
    App.switchTab("trace");
    TraceModule.lookup(batchCode);
  },

  handleQuickTrace(event) {
    if (event) event.preventDefault();
    const input = document.getElementById("quick-trace-input");
    const code = input ? input.value.trim() : "";
    if (!code) {
      App.showToast("Please enter a batch code or serial to trace", "error");
      return;
    }
    App.switchTab("trace");
    TraceModule.lookup(code);
  },
};
