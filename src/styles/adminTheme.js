// src/styles/adminTheme.js
// Shared visual theme — matches AdminReservations.jsx
export const adminThemeCSS = `
  * { box-sizing: border-box; }

  /* ============ Layout ============ */
  .admin-container { max-width: 1400px; padding: 1.5rem; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
  .title { font-size: 1.875rem; font-weight: 700; background: linear-gradient(135deg, #0f172a, #334155); background-clip: text; -webkit-background-clip: text; color: transparent; }
  .subtitle { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }

  /* ============ Buttons ============ */
  .btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.5rem; padding: 0 1rem; border-radius: 9999px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
  .btn-secondary { background: #f1f5f9; color: #1e293b; }
  .btn-secondary:hover { background: #e2e8f0; transform: translateY(-1px); }
  .btn-primary { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; }
  .btn-primary:hover { background: linear-gradient(135deg, #1e293b, #334155); transform: translateY(-1px); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  /* ============ Stats ============ */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s; }
  .stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
  .stat-label { font-size: 0.75rem; color: #64748b; font-weight: 500; }
  .stat-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
  .stat-card.warning { border-left: 4px solid #f59e0b; }
  .stat-card.danger  { border-left: 4px solid #ef4444; }
  .stat-card.success { border-left: 4px solid #10b981; }
  .stat-card.info    { border-left: 4px solid #3b82f6; }
  .stat-card.purple  { border-left: 4px solid #8b5cf6; }

  /* ============ Search ============ */
  .search-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; }
  .search-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
  .search-input { flex: 1; padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; background: white; transition: all 0.2s; min-width: 150px; }
  .search-input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1); }
  .filter-select { width: 12rem; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; background: white; cursor: pointer; }

  /* ============ Table ============ */
  .table-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.25rem; }
  .table-info-text { font-size: 0.875rem; color: #64748b; }
  .table-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .table { width: 100%; font-size: 0.875rem; border-collapse: collapse; }
  .table th { text-align: left; padding: 0.75rem 1rem; background: #f8fafc; color: #64748b; font-weight: 500; }
  .table td { padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; }
  .table tr:hover { background: #f8fafc; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .py-12 { padding: 3rem 0; }

  /* ============ Badges ============ */
  .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .badge-success { background: #dcfce7; color: #166534; }
  .badge-danger  { background: #fee2e2; color: #991b1b; }
  .badge-blue    { background: #dbeafe; color: #1e40af; }
  .badge-purple  { background: #f3e8ff; color: #6b21a5; }
  .badge-gray    { background: #f1f5f9; color: #475569; }

  /* ============ Action buttons ============ */
  .action-buttons { display: flex; gap: 0.25rem; justify-content: flex-end; flex-wrap: wrap; }
  .action-btn { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; transition: all 0.2s; padding: 0; }
  .action-btn:hover { transform: scale(1.1); }
  .action-btn-primary  { color: #3b82f6; } .action-btn-primary:hover  { background: #eff6ff; }
  .action-btn-success  { color: #10b981; } .action-btn-success:hover  { background: #ecfdf5; }
  .action-btn-warning  { color: #eab308; } .action-btn-warning:hover  { background: #fefce8; }
  .action-btn-danger   { color: #ef4444; } .action-btn-danger:hover   { background: #fef2f2; }
  .action-btn-purple   { color: #8b5cf6; } .action-btn-purple:hover   { background: #f5f3ff; }
  .action-btn-info     { color: #06b6d4; } .action-btn-info:hover     { background: #ecfeff; }
  .action-btn-orange   { color: #f97316; } .action-btn-orange:hover   { background: #fff7ed; }
  .action-btn-emerald  { color: #059669; } .action-btn-emerald:hover  { background: #ecfdf5; }

  /* ============ Tabs ============ */
  .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: white; padding: 0.5rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; width: fit-content; }
  .tab-btn { padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; background: transparent; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #64748b; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
  .tab-btn:hover { background: #f8fafc; color: #0f172a; }
  .tab-btn.active { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; }

  /* ============ Modals ============ */
  .modal-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
  .modal { background: white; border-radius: 1.5rem; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideUp 0.3s ease; }
  .modal-wide { max-width: 900px; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: white; z-index: 10; }
  .modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; color: #0f172a; }
  .modal-close { background: #f1f5f9; border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; color: #0f172a; }
  .modal-close:hover { background: #e2e8f0; }
  .modal-body { padding: 1.5rem; }
  .modal-actions-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem 1.5rem 1.5rem; border-top: 1px solid #e2e8f0; }
  .modal-btn { height: 2.75rem; padding: 0 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
  .modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .modal-btn-cancel { border: 1px solid #e2e8f0; background: white; color: #1e293b; }
  .modal-btn-cancel:hover { background: #f8fafc; }
  .btn-delete { background: #ef4444; color: white; }
  .btn-delete:hover { background: #dc2626; }

  /* ============ Forms ============ */
  .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .form-label { font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
  .form-input, .form-select, .form-textarea { padding: 0.625rem 0.875rem; border: 1.5px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.875rem; transition: all 0.2s; background: white; font-family: inherit; width: 100%; color: #0f172a; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: #eab308; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1); }
  .form-textarea { resize: vertical; min-height: 80px; }
  .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-grid-full { grid-column: 1 / -1; }

  /* ============ Photo previews ============ */
  .photo-previews { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
  .photo-preview { position: relative; }
  .photo-preview img { width: 64px; height: 64px; object-fit: cover; border-radius: 0.5rem; border: 1px solid #e2e8f0; }
  .photo-preview-remove { position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }

  /* ============ Dynamic rows ============ */
  .row-grid-services { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center; }
  .row-grid-products { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center; }
  .row-remove-btn { background: #fee2e2; color: #ef4444; border: none; width: 36px; height: 36px; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .row-remove-btn:hover { background: #fecaca; }
  .section-header-inline { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
  .section-label { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .add-inline-btn { font-size: 0.75rem; color: #3b82f6; display: inline-flex; align-items: center; gap: 0.25rem; background: none; border: none; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 0.375rem; transition: background 0.2s; }
  .add-inline-btn:hover { background: #eff6ff; }
  .add-inline-btn-orange { color: #f97316; }
  .add-inline-btn-orange:hover { background: #fff7ed; }
  .subtotal-text { text-align: right; font-size: 0.75rem; color: #64748b; margin-top: 0.5rem; }
  .subtotal-text b { color: #0f172a; }

  /* ============ Cell helpers ============ */
  .image-thumb { width: 32px; height: 32px; border-radius: 0.375rem; object-fit: cover; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; color: #94a3b8; flex-shrink: 0; }
  .cell-flex { display: flex; align-items: center; gap: 0.5rem; }
  .cell-main { font-weight: 500; color: #0f172a; }
  .cell-sub  { font-size: 0.7rem; color: #94a3b8; margin-top: 0.125rem; }
  .category-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
  .category-icon-wrap { width: 36px; height: 36px; border-radius: 0.5rem; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }

  /* ============ Category pickers ============ */
  .color-swatches { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .color-swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s; padding: 0; }
  .color-swatch:hover { transform: scale(1.1); }
  .color-swatch.active { border-color: #0f172a; transform: scale(1.1); }
  .icon-picker { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .icon-pick-btn { width: 40px; height: 40px; border-radius: 0.5rem; display: inline-flex; align-items: center; justify-content: center; border: 2px solid #e2e8f0; background: white; cursor: pointer; transition: all 0.15s; color: #475569; }
  .icon-pick-btn:hover { border-color: #cbd5e1; background: #f8fafc; }
  .icon-pick-btn.active { border-color: #0f172a; background: #f1f5f9; color: #0f172a; }
  .preview-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #64748b; }

  .alert-message { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 0.75rem; padding: 0.75rem 1rem; color: #92400e; font-size: 0.875rem; margin-bottom: 1rem; }

  /* ============ Animations ============ */
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

  /* ============ Responsive ============ */
  @media (max-width: 768px) {
    .admin-container { padding: 1rem; }
    .header { flex-direction: column; align-items: flex-start; }
    .search-row { flex-direction: column; align-items: stretch; }
    .filter-select { width: 100%; }
    .form-grid-2 { grid-template-columns: 1fr; }
    .row-grid-services, .row-grid-products { grid-template-columns: 1fr 1fr auto; }
  }

  /* ============ Dark mode ============ */
  @media (prefers-color-scheme: dark) {
    body { background: #0f172a; }
    .table-wrapper, .search-wrapper, .modal, .tabs, .stat-card { background: #1e293b; border-color: #334155; }
    .table-info-text, .table th, .subtitle, .stat-label { color: #94a3b8; }
    .title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; color: transparent; }
    .btn-secondary { background: #334155; color: #f1f5f9; }
    .search-input, .filter-select, .form-input, .form-select, .form-textarea { background: #0f172a; border-color: #334155; color: #f1f5f9; }
    .modal-close { background: #334155; color: #f1f5f9; }
    .modal-title { color: #f1f5f9; }
    .badge-warning { background: #78350f; color: #fde68a; }
    .badge-success { background: #14532d; color: #4ade80; }
    .badge-danger  { background: #7f1d1d; color: #fca5a5; }
    .badge-blue    { background: #1e3a5f; color: #60a5fa; }
    .badge-purple  { background: #4c1d95; color: #c084fc; }
    .badge-gray    { background: #334155; color: #cbd5e1; }
    .table tr:hover { background: #334155; }
    .modal-btn-cancel { background: #1e293b; color: #f1f5f9; border-color: #334155; }
    .stat-value { color: #f1f5f9; }
    .tab-btn { color: #94a3b8; }
    .tab-btn:hover { background: #334155; color: #f1f5f9; }
    .form-label { color: #cbd5e1; }
    .photo-preview img { border-color: #475569; }
    .row-remove-btn { background: #7f1d1d; color: #fca5a5; }
    .image-thumb { background: #334155; border-color: #475569; color: #94a3b8; }
    .cell-main { color: #f1f5f9; }
    .section-label { color: #f1f5f9; }
    .subtotal-text b { color: #f1f5f9; }
    .icon-pick-btn { background: #1e293b; border-color: #475569; color: #cbd5e1; }
    .icon-pick-btn.active { background: #334155; border-color: #eab308; color: #fbbf24; }
    .color-swatch.active { border-color: #f1f5f9; }
    .action-btn-primary  { color: #60a5fa; } .action-btn-primary:hover  { background: #1e3a5f; }
    .action-btn-success  { color: #4ade80; } .action-btn-success:hover  { background: #14532d; }
    .action-btn-warning  { color: #fbbf24; } .action-btn-warning:hover  { background: #78350f; }
    .action-btn-danger   { color: #f87171; } .action-btn-danger:hover   { background: #7f1d1d; }
    .action-btn-purple   { color: #c084fc; } .action-btn-purple:hover   { background: #4c1d95; }
    .action-btn-info     { color: #22d3ee; } .action-btn-info:hover     { background: #164e63; }
    .action-btn-orange   { color: #fb923c; } .action-btn-orange:hover   { background: #7c2d12; }
    .action-btn-emerald  { color: #34d399; } .action-btn-emerald:hover  { background: #064e3b; }
  }
`;