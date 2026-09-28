// Dashboard Component Controller - Multi-Role Station Architecture
const DashboardModule = {
  summaryData: null,

  async renderForRole(roleKey) {
    roleKey = roleKey || App.state.currentRole || "Manager";

    try {
      if (!this.summaryData) {
        const res = await fetch("/api/dashboard/summary");
        if (res.ok) {
          this.summaryData = await res.json();
          App.state.summary = this.summaryData;
        }
      }

      if (roleKey === "Manager") {
        this.renderManagerDashboard(this.summaryData);
      } else if (roleKey === "QA") {
        this.renderQADashboard(this.summaryData);
      } else if (roleKey === "Operator") {
        this.renderOperatorDashboard(this.summaryData);
      } else if (roleKey === "Receiving") {
        this.renderReceivingDashboard(this.summaryData);
      } else if (roleKey === "Admin") {
        this.renderAdminDashboard(this.summaryData);
      }
    } catch (err) {
      console.error("Dashboard render error:", err);
      App.showToast("Failed to populate station dashboard data", "error");
    }
  },

  // =========================================================
  // 1. QUALITY / PLANT MANAGER DASHBOARD
  // =========================================================
  renderManagerDashboard(data) {
    if (!data) return;

    // KPIs
    const compEl = document.getElementById("mgr-kpi-completeness");
    const compSub = document.getElementById("mgr-kpi-completeness-sub");
    if (compEl) compEl.textContent = `${data.completeness_percentage}%`;
    if (compSub) compSub.textContent = data.completeness_text;

    const defEl = document.getElementById("mgr-kpi-defects");
    const defSub = document.getElementById("mgr-kpi-defects-sub");
    if (defEl) defEl.textContent = data.open_defects_count;
    if (defSub) defSub.textContent = data.open_defects_subtext;

    const recEl = document.getElementById("mgr-kpi-recall-reduction");
    if (recEl) recEl.textContent = `${data.recall_reduction_percentage}%`;

    // Charts
    const machContainer = document.getElementById("mgr-chart-machine-defects");
    if (machContainer && data.defects_by_machine) {
      const maxCount = Math.max(...data.defects_by_machine.map((d) => d.count), 8);
      machContainer.innerHTML = data.defects_by_machine
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

    const lotContainer = document.getElementById("mgr-chart-lot-defects");
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

    // High Priority Defects Table
    const tbody = document.getElementById("mgr-recent-defects-tbody");
    if (tbody && data.recent_defects) {
      tbody.innerHTML = data.recent_defects
        .slice(0, 6)
        .map((d) => {
          let sevBadge = `<span class="badge badge-medium"><span class="badge-dot"></span>Medium</span>`;
          if (d.severity === "High") {
            sevBadge = `<span class="badge badge-high"><span class="badge-dot"></span>High</span>`;
          } else if (d.severity === "Low") {
            sevBadge = `<span class="badge badge-low"><span class="badge-dot"></span>Low</span>`;
          }

          let statusBadge = `<span class="badge badge-closed"><span class="badge-dot"></span>${d.status}</span>`;
          if (d.status.includes("pending")) {
            statusBadge = `<span class="badge badge-recall-pending"><span class="badge-dot"></span>${d.status}</span>`;
          } else if (d.status.includes("active")) {
            statusBadge = `<span class="badge badge-recall-active"><span class="badge-dot"></span>${d.status}</span>`;
          } else if (d.status.includes("Traced") || d.status.includes("clear")) {
            statusBadge = `<span class="badge badge-traced-clear"><span class="badge-dot"></span>${d.status}</span>`;
          }

          return `
            <tr>
              <td><span class="code-mono" style="cursor:pointer;" onclick="DashboardModule.onRowClick('${d.batch_code}')">${d.batch_code}</span></td>
              <td><span style="font-family:var(--font-mono);color:var(--text-muted);">${d.machine_code}</span></td>
              <td>${d.defect_type}</td>
              <td>${sevBadge}</td>
              <td style="color:var(--text-muted);font-size:12px;">${d.reported_at}</td>
              <td>${statusBadge}</td>
              <td>
                <button class="btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="DashboardModule.onRowClick('${d.batch_code}')">Trace Custody</button>
              </td>
            </tr>
          `;
        })
        .join("");
    }
  },

  // =========================================================
  // 2. QA INSPECTOR DASHBOARD
  // =========================================================
  renderQADashboard(data) {
    if (!data) return;

    const openEl = document.getElementById("qa-kpi-open-defects");
    if (openEl) openEl.textContent = data.open_defects_count;

    const tbody = document.getElementById("qa-defects-tbody");
    if (tbody && data.recent_defects) {
      tbody.innerHTML = data.recent_defects.map((d) => {
        let sevBadge = `<span class="badge badge-medium"><span class="badge-dot"></span>Medium</span>`;
        if (d.severity === "High") {
          sevBadge = `<span class="badge badge-high"><span class="badge-dot"></span>High</span>`;
        } else if (d.severity === "Low") {
          sevBadge = `<span class="badge badge-low"><span class="badge-dot"></span>Low</span>`;
        }

        let statusBadge = `<span class="badge badge-closed"><span class="badge-dot"></span>${d.status}</span>`;
        if (d.status.includes("pending")) {
          statusBadge = `<span class="badge badge-recall-pending"><span class="badge-dot"></span>${d.status}</span>`;
        } else if (d.status.includes("active")) {
          statusBadge = `<span class="badge badge-recall-active"><span class="badge-dot"></span>${d.status}</span>`;
        } else if (d.status.includes("Traced") || d.status.includes("clear")) {
          statusBadge = `<span class="badge badge-traced-clear"><span class="badge-dot"></span>${d.status}</span>`;
        }

        return `
          <tr>
            <td><b style="color:var(--color-coral);font-family:var(--font-mono);">DEF-${d.id}</b></td>
            <td><span class="code-mono" style="cursor:pointer;" onclick="DashboardModule.onRowClick('${d.batch_code}')">${d.batch_code}</span></td>
            <td><span style="font-family:var(--font-mono);">${d.machine_code}</span></td>
            <td><b>${d.defect_type}</b><div style="font-size:11.5px;color:var(--text-muted);">${d.description || "Quarantine hold under review"}</div></td>
            <td>${sevBadge}</td>
            <td style="color:var(--text-muted);font-size:12px;">${d.reported_at}</td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn-primary" style="font-size:11px;padding:3px 8px;" onclick="DashboardModule.onRowClick('${d.batch_code}')">Investigate &amp; Trace</button>
            </td>
          </tr>
        `;
      }).join("");
    }
  },

  handleQATrace(event) {
    if (event) event.preventDefault();
    const input = document.getElementById("qa-trace-input");
    const code = input ? input.value.trim() : "";
    if (!code) {
      App.showToast("Please enter a batch code or serial to trace", "error");
      return;
    }
    this.quickQATrace(code);
  },

  quickQATrace(code) {
    const input = document.getElementById("qa-trace-input");
    if (input) input.value = code;
    App.switchTab("trace");
    TraceModule.lookup(code);
  },

  // =========================================================
  // 3. MACHINE OPERATOR DASHBOARD
  // =========================================================
  async renderOperatorDashboard(data) {
    const batchesCountEl = document.getElementById("op-kpi-batches-today");
    if (batchesCountEl && data) batchesCountEl.textContent = data.batches_today_count;

    // Load active batches from API
    try {
      const res = await fetch("/api/batches");
      if (res.ok) {
        const batches = await res.json();
        const tbody = document.getElementById("op-batches-tbody");
        if (tbody) {
          if (!batches.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:20px;">No floor batches logged today.</td></tr>`;
          } else {
            tbody.innerHTML = batches
              .slice(0, 6)
              .map((b) => {
                const statusBadge =
                  b.status === "in_progress"
                    ? `<span class="badge badge-medium"><span class="badge-dot"></span>In Progress</span>`
                    : `<span class="badge badge-traced-clear"><span class="badge-dot"></span>Closed</span>`;

                const actionHtml =
                  b.status === "in_progress"
                    ? `<button class="btn-primary" style="font-size:11px;padding:3px 8px;" onclick="BatchesModule.openCloseModal(${b.id}, '${b.batch_code}')">Close Batch</button>`
                    : `<button class="btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="BatchesModule.printLabel(${b.id})">Print Label (QR)</button>`;

                return `
                  <tr>
                    <td><span class="code-mono" style="cursor:pointer;" onclick="DashboardModule.onRowClick('${b.batch_code}')">${b.batch_code}</span></td>
                    <td><b>${b.product_sku || "SKU-9920"}</b></td>
                    <td><span style="font-family:var(--font-mono);">${b.machine_code || "M04"}</span></td>
                    <td>${b.operator_name || "J. Alvarez"}</td>
                    <td><b>${b.quantity_produced || 0}</b> pcs</td>
                    <td>${statusBadge}</td>
                    <td>${actionHtml}</td>
                  </tr>
                `;
              })
              .join("");
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Load qualified materials for this station
    try {
      const resMat = await fetch("/api/materials/lots");
      if (resMat.ok) {
        const lots = await resMat.json();
        const tbodyMat = document.getElementById("op-materials-tbody");
        if (tbodyMat) {
          tbodyMat.innerHTML = lots
            .slice(0, 4)
            .map(
              (l) => `
              <tr>
                <td><span class="code-mono" style="color:#5eead4;">${l.lot_code}</span></td>
                <td><b>${l.material_name}</b></td>
                <td>${l.supplier_name}</td>
                <td><b>${l.remaining_quantity}</b> / ${l.quantity} ${l.unit}</td>
                <td>
                  <span class="badge badge-traced-clear"><span class="badge-dot"></span>Qualified for M04</span>
                </td>
              </tr>
            `
            )
            .join("");
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  // =========================================================
  // 4. RECEIVING CLERK DASHBOARD
  // =========================================================
  async renderReceivingDashboard(data) {
    try {
      const resMat = await fetch("/api/materials/lots");
      if (resMat.ok) {
        const lots = await resMat.json();
        const activeLotsEl = document.getElementById("rec-kpi-active-lots");
        if (activeLotsEl) activeLotsEl.textContent = lots.length;

        const tbody = document.getElementById("rec-materials-tbody");
        if (tbody) {
          tbody.innerHTML = lots
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
                      <div style="flex:1;height:6px;background:#334155;border-radius:4px;overflow:hidden;width:55px;">
                        <div style="width:${usagePct}%;background:#2dd4bf;height:100%;"></div>
                      </div>
                      <span style="font-size:11px;color:var(--text-muted);">${usagePct}%</span>
                    </div>
                  </td>
                  <td>
                    <button class="btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="MaterialsModule.showLotLabel(${l.id})">Pallet Tag (QR)</button>
                  </td>
                </tr>
              `;
            })
            .join("");
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const resSup = await fetch("/api/suppliers");
      if (resSup.ok) {
        const suppliers = await resSup.json();
        const supCountEl = document.getElementById("rec-kpi-suppliers");
        if (supCountEl) supCountEl.textContent = suppliers.length;

        const tbodySup = document.getElementById("rec-suppliers-tbody");
        if (tbodySup) {
          tbodySup.innerHTML = suppliers
            .map(
              (s) => `
              <tr>
                <td><b>${s.name}</b></td>
                <td><span class="code-mono">${s.code}</span></td>
                <td style="color:var(--text-muted);">${s.contact_email || "dock@supplier.com"}</td>
                <td><b>${s.lots_count || 2} Active Lots</b></td>
                <td>
                  <span class="badge badge-traced-clear"><span class="badge-dot"></span>Certified Vendor</span>
                </td>
              </tr>
            `
            )
            .join("");
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  // =========================================================
  // 5. SYSTEM ADMINISTRATOR DASHBOARD
  // =========================================================
  async renderAdminDashboard(data) {
    try {
      const [resMach, resOp, resProd, resAudit] = await Promise.all([
        fetch("/api/machines"),
        fetch("/api/operators"),
        fetch("/api/products"),
        fetch("/api/audit-logs?limit=8"),
      ]);

      if (resMach.ok) {
        const machines = await resMach.json();
        const el = document.getElementById("admin-kpi-machines");
        if (el) el.textContent = machines.length;
      }

      if (resOp.ok) {
        const operators = await resOp.json();
        const el = document.getElementById("admin-kpi-operators");
        if (el) el.textContent = operators.length;
      }

      if (resProd.ok) {
        const products = await resProd.json();
        const el = document.getElementById("admin-kpi-products");
        if (el) el.textContent = products.length;
      }

      if (resAudit.ok) {
        const auditLogs = await resAudit.json();
        const el = document.getElementById("admin-kpi-audit-count");
        if (el) el.textContent = auditLogs.length;

        const tbody = document.getElementById("admin-audit-tbody");
        if (tbody) {
          tbody.innerHTML = auditLogs
            .map((l) => {
              let actionBadge = `<span class="badge badge-low">${l.action}</span>`;
              if (l.action === "CREATE") {
                actionBadge = `<span class="badge badge-traced-clear">${l.action}</span>`;
              } else if (l.action === "RECALL_CALCULATION") {
                actionBadge = `<span class="badge badge-recall-active">${l.action}</span>`;
              }

              const diffText = l.diff ? JSON.stringify(l.diff).substring(0, 55) : "—";
              return `
                <tr>
                  <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">${l.timestamp}</td>
                  <td><span style="font-weight:600;color:#5eead4;">${l.actor}</span></td>
                  <td>${actionBadge}</td>
                  <td><span class="code-mono">${l.entity}${l.entity_id ? ` #${l.entity_id}` : ""}</span></td>
                  <td style="font-family:var(--font-mono);font-size:11.5px;color:var(--text-dim);">${diffText}...</td>
                </tr>
              `;
            })
            .join("");
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  onRowClick(batchCode) {
    App.switchTab("trace");
    TraceModule.lookup(batchCode);
  },
};
