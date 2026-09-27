// Compliance Reports & Immutable Audit Trail Module
const ReportsModule = {
  async load() {
    this.loadAuditLogs();
    const batchSelect = document.getElementById("report-batch-select");
    if (batchSelect) {
      try {
        const res = await fetch("/api/batches?limit=20");
        const batches = await res.json();
        batchSelect.innerHTML = batches.map((b) => `<option value="${b.batch_code}">${b.batch_code} &mdash; ${b.product_name}</option>`).join("");
      } catch (e) {
        console.error(e);
      }
    }
  },

  exportSelectedBatch(format) {
    const select = document.getElementById("report-batch-select");
    const code = select ? select.value : "P1-WGT-260927-M04-0032";
    window.open(`/api/reports/batch/${encodeURIComponent(code)}/export?format=${format}`, "_blank");
  },

  exportRecallEvent(recallId) {
    App.showToast(`Generating audit package for Recall REC-${recallId}...`);
    // Export triggering batch
    window.open(`/api/reports/batch/P1-WGT-260927-M04-0032/export?format=pdf`, "_blank");
  },

  async loadAuditLogs() {
    const tbody = document.getElementById("audit-table-tbody");
    if (!tbody) return;

    try {
      const res = await fetch("/api/audit-logs?limit=30");
      if (!res.ok) throw new Error("Failed to load audit logs");
      const logs = await res.json();

      tbody.innerHTML = logs
        .map(
          (l) => `
        <tr>
          <td style="color:var(--text-muted);font-family:var(--font-mono);font-size:12px;">${l.timestamp}</td>
          <td><b>${l.actor}</b></td>
          <td><span class="badge badge-medium" style="font-size:11px;">${l.action}</span></td>
          <td><span class="code-mono">${l.entity}:${l.entity_id || ""}</span></td>
          <td style="font-size:12px;color:var(--text-dim);max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${JSON.stringify(l.diff)}
          </td>
        </tr>
      `
        )
        .join("");
    } catch (err) {
      console.error(err);
    }
  },
};
