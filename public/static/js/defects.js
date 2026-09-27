// Defects Management Module
const DefectsModule = {
  defectsList: [],

  async load() {
    try {
      const res = await fetch("/api/defects");
      if (!res.ok) throw new Error("Failed to load defects");
      this.defectsList = await res.json();
      this.render();
    } catch (err) {
      console.error(err);
      App.showToast("Failed to fetch defects list", "error");
    }
  },

  render() {
    const tbody = document.getElementById("defects-table-tbody");
    if (!tbody) return;

    if (!this.defectsList.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:24px;">No defects recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.defectsList
      .map((d) => {
        let severityBadge = `<span class="badge badge-medium"><span class="badge-dot"></span>Medium</span>`;
        if (d.severity === "High") {
          severityBadge = `<span class="badge badge-high"><span class="badge-dot"></span>High</span>`;
        } else if (d.severity === "Low") {
          severityBadge = `<span class="badge badge-low"><span class="badge-dot"></span>Low</span>`;
        }

        let statusBadge = `<span class="badge badge-closed">${d.status}</span>`;
        if (d.status.includes("pending")) {
          statusBadge = `<span class="badge badge-recall-pending"><span class="badge-dot"></span>${d.status}</span>`;
        } else if (d.status.includes("active")) {
          statusBadge = `<span class="badge badge-recall-active"><span class="badge-dot"></span>${d.status}</span>`;
        } else if (d.status.includes("Traced") || d.status.includes("clear")) {
          statusBadge = `<span class="badge badge-traced-clear"><span class="badge-dot"></span>${d.status}</span>`;
        }

        return `
          <tr>
            <td><b style="color:var(--color-coral);">DEF-${d.id}</b></td>
            <td><span class="code-mono" onclick="DashboardModule.onRowClick('${d.batch_code}')">${d.batch_code}</span></td>
            <td><span style="font-family:var(--font-mono);">${d.machine_code || "N/A"}</span></td>
            <td><b>${d.defect_type}</b><div style="font-size:12px;color:var(--text-muted);">${d.description || ""}</div></td>
            <td>${severityBadge}</td>
            <td style="color:var(--text-muted);">${d.reported_at}</td>
            <td>
              <select onchange="DefectsModule.updateStatus(${d.id}, this.value)" style="background:#111618;border:1px solid var(--border-subtle);color:var(--text-main);padding:4px 8px;border-radius:4px;font-size:12px;">
                <option value="${d.status}" selected disabled>${d.status}</option>
                <option value="Recall calc pending">Recall calc pending</option>
                <option value="Recall active — 340 units">Recall active</option>
                <option value="Traced, no recall needed">Traced, no recall needed</option>
                <option value="Closed">Closed</option>
              </select>
            </td>
          </tr>
        `;
      })
      .join("");
  },

  openForBatch(batchCode) {
    const refInput = document.getElementById("defect-form-ref");
    if (refInput) refInput.value = batchCode;
    App.openModal("report-defect-modal");
  },

  async handleFormSubmit(event) {
    event.preventDefault();
    const ref = document.getElementById("defect-form-ref").value.trim();
    const type = document.getElementById("defect-form-type").value;
    const severity = document.getElementById("defect-form-severity").value;
    const description = document.getElementById("defect-form-desc").value.trim();
    const reportedBy = document.getElementById("defect-form-reporter").value.trim() || "QA Inspector";

    if (!ref) {
      App.showToast("Batch or Unit reference is required", "error");
      return;
    }

    try {
      const res = await fetch("/api/defects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: ref,
          defect_type: type,
          severity: severity,
          description: description,
          reported_by: reportedBy,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to log defect");
      }

      App.showToast("Defect logged and chain of custody linked!", "success");
      App.closeModal("report-defect-modal");
      this.load();
      App.loadDashboardData();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },

  async updateStatus(defectId, newStatus) {
    try {
      const res = await fetch(`/api/defects/${defectId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          actor: App.state.currentRole,
        }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      App.showToast(`Defect DEF-${defectId} status updated to: ${newStatus}`, "success");
      this.load();
      App.loadDashboardData();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  },
};
