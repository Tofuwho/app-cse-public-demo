# OpenProcure — Public APP-CSE & Procurement RBAC Mock Demo

A standalone, brand-free, client-side interactive demonstration of an **APP-CSE (Annual Procurement Plan - Common-Use Supplies & Equipment)** system with Role-Based Access Control (RBAC), Fiscal Planning, Inventory Management, PPMP, SR, PR, PO workflows, File Upload & Extraction, and Physical Copy Form Printing.

> **Sandbox Notice:** All data is synthetic and runs 100% locally in your browser (`localStorage`). No backend, no real agency data, and zero connection to any private legacy repository or deployment.

## Features Included

- **6-Role RBAC & Live Permission Matrix:** Switch instantly between *System Administrator*, *Fiscal & Budget Officer*, *Procurement / BAC Officer*, *Supply & Inventory Custodian*, *Department End-User*, and *Approving Authority (HOPE)*. Includes an interactive permission matrix and immutable activity audit log.
- **Fiscal Planning & Budget Calculations:** Multi-year ceilings (MOOE & Capital Outlay), contingency reserves, departmental allocations, real-time obligated vs. utilized tracking, quarterly Q1–Q4 cash breakdown, and an interactive VAT / Withholding Tax impact simulator.
- **PPMP & Consolidated APP-CSE:** Departmental quarterly procurement plans with multi-stage verification and automatic consolidation into the agency-wide APP-CSE schedule.
- **Inventory Management & Ledger:** Real-time warehouse stock catalog, low/out-of-stock reorder alerts, stock adjustments, and automated `STOCK_IN` / `STOCK_OUT` movement history.
- **End-to-End Workflows (SR → PR → PO):**
  - **SR (Stock Requisition):** Warehouse stock requests with automatic stock deduction or shortfall escalation to PR.
  - **PR (Purchase Request):** Budget-checked requisitions with Funds Certification, HOPE approval, and 1-click PO conversion.
  - **PO (Purchase Order):** Supplier order generation with VAT/EWT breakdown, amount-in-words, and warehouse receiving (`Stock In`).
- **Allowed File Upload & Client-Side Extraction:** Drag-and-drop extraction for `.xlsx`, `.xls`, `.csv`, `.tsv`, `.json`, `.txt`, and `.pdf` (with column auto-mapping, live preview, downloadable sample templates, and direct injection into PPMP, Inventory, SR, PR, PO, or Print Studio).
- **Form Generator & Physical Copy Printing:** Interactive form studio and per-document print previews formatted with `@media print` CSS for physical filing or PDF export.

## Local Development

```bash
npm install
npm run dev
```

## GitHub Pages Deployment

The static production bundle (`dist/`) is published on the `gh-pages` branch and built with `base: './'` in `vite.config.ts`.

To rebuild and republish `gh-pages` locally:

```bash
npm run build
```

*(Optional)* To auto-deploy on push via GitHub Actions, create `.github/workflows/deploy.yml` in the repository with:

```yaml
name: Deploy APP-CSE Public Demo to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
