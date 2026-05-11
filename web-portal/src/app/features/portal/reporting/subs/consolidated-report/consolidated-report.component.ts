import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ReportingService, RegionalReport } from '@app/core/services/reporting.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-consolidated-report',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatTableModule, 
    MatButtonModule, 
    MatTooltipModule,
    MatProgressBarModule
  ],
  template: `
    <div class="report-wrapper">
      <div class="glass-header">
        <div class="title-group">
          <div class="icon-box">
            <mat-icon>hub</mat-icon>
          </div>
          <div class="text-box">
            <h1>Regional Deployment Analytics</h1>
            <p>Unified Joint View (Firm & District Wise Status)</p>
          </div>
        </div>
        
        <div class="action-row">
           <button mat-flat-button class="export-btn" (click)="exportToExcel()" matTooltip="Export Joint Analytics" [disabled]="loading">
             <mat-icon>grid_on</mat-icon>
             Export Joint Analytics
           </button>
        </div>
      </div>

      <mat-progress-bar *ngIf="loading" mode="indeterminate" color="primary" class="loader"></mat-progress-bar>

      <div class="header-summary fade-in" *ngIf="!loading">
          <div class="stat-item">
              <span class="label">Operational Nodes</span>
              <span class="val">{{allData.length}}</span>
          </div>
          <div class="stat-item">
              <span class="label">Total Booked</span>
              <span class="val highlight">{{totalBooked}}</span>
          </div>
          <div class="stat-item">
              <span class="label">Avg Delivery Rate</span>
              <span class="val success">{{avgDeliveryRate}}%</span>
          </div>
          <div class="stat-item">
              <span class="label">Total DIC Pass</span>
              <span class="val">{{totalDicDone}}</span>
          </div>
          <div class="stat-item">
              <span class="label">Pending SS Bills</span>
              <span class="val danger">{{totalSSPending}}</span>
          </div>
      </div>

      <mat-card class="table-container fade-in" [class.loading-fade]="loading">
        <table mat-table [dataSource]="dataSource" class="premium-table">
          
          <!-- TOP TIER HEADERS (Double Headers) -->
           <ng-container matColumnDef="header-identity">
            <th mat-header-cell *matHeaderCellDef [attr.colspan]="3" class="group-header identity-bg"> 
                <mat-icon>fingerprint</mat-icon> CORE ENTITY IDENTITY 
            </th>
          </ng-container>
          <ng-container matColumnDef="header-ops">
            <th mat-header-cell *matHeaderCellDef [attr.colspan]="3" class="group-header ops-bg"> 
                <mat-icon>settings_suggest</mat-icon> DEPLOYMENT OPERATIONS 
            </th>
          </ng-container>
          <ng-container matColumnDef="header-finance">
            <th mat-header-cell *matHeaderCellDef [attr.colspan]="4" class="group-header finance-bg"> 
                <mat-icon>account_balance</mat-icon> FINANCIAL AUDIT LOGS 
            </th>
          </ng-container>

          <!-- Group Header Row (The Sticky Part) -->
          <ng-container matColumnDef="firmHeader">
            <td mat-cell *matCellDef="let element" colspan="10" class="firm-group-cell">
                <div class="firm-group-content">
                    <div class="main-info">
                        <span class="group-num">{{element.firmNumber}}.</span>
                        <span class="group-name">{{element.firmName}}</span>
                        <span class="group-badge">Active Manufacturing Site</span>
                    </div>
                    <div class="group-stats">
                        <mat-icon>shopping_cart</mat-icon>
                        <span class="stat-label">Volume:</span>
                        <span class="stat-val">{{element.totalFirmBooked}} Units</span>
                    </div>
                </div>
            </td>
          </ng-container>

          <!-- Group Footer Row (Summary) -->
          <ng-container matColumnDef="firmFooter">
            <td mat-cell *matCellDef="let element" colspan="10" class="firm-footer-cell">
                <div class="footer-layout">
                    <div class="footer-label">
                        <mat-icon>analytics</mat-icon>
                        <span>{{element.firmName}} Cumulative Summary</span>
                    </div>
                    <div class="footer-metrics">
                        <div class="metric">
                            <span class="m-label">Booked</span>
                            <span class="m-val">{{element.fBooked}}</span>
                        </div>
                        <div class="metric">
                            <span class="m-label">QIC</span>
                            <span class="m-val">{{element.fQic}}</span>
                        </div>
                        <div class="metric highlight">
                            <span class="m-label">DIC PASS</span>
                            <span class="m-val">{{element.fDic}}</span>
                        </div>
                        <div class="metric">
                            <span class="m-label">Bills Sub.</span>
                            <span class="m-val">{{element.fBillsSub}}</span>
                        </div>
                        <div class="metric success">
                            <span class="m-label">Bills Cleared</span>
                            <span class="m-val">{{element.fBillsClr}}</span>
                        </div>
                    </div>
                </div>
            </td>
          </ng-container>

          <!-- Standard Columns -->
          <ng-container matColumnDef="srNo">
            <th mat-header-cell *matHeaderCellDef> # </th>
            <td mat-cell *matCellDef="let element; let i = index" class="index-cell"> 
                <span class="sub-num">{{element.firmNumber}}.{{element.districtIndex}}</span>
            </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell label"> TOTAL </td>
          </ng-container>

          <ng-container matColumnDef="firmName">
            <th mat-header-cell *matHeaderCellDef> Manufacturing Firm </th>
            <td mat-cell *matCellDef="let element" [class.placeholder]="!element.firmName"> 
              {{ element.firmName || '-' }} 
            </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell description"> (Overall Global Count) </td>
          </ng-container>

          <ng-container matColumnDef="district">
            <th mat-header-cell *matHeaderCellDef> District </th>
            <td mat-cell *matCellDef="let element">
              <div class="loc-flex">
                <span class="loc-tag">{{element.district}}</span>
              </div>
            </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell"> - </td>
          </ng-container>

          <ng-container matColumnDef="booked">
            <th mat-header-cell *matHeaderCellDef> Booked </th>
            <td mat-cell *matCellDef="let element" class="font-bold"> {{element.booked}} </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell numeric"> {{totalBooked}} </td>
          </ng-container>

          <ng-container matColumnDef="qicDone">
            <th mat-header-cell *matHeaderCellDef> QIC Done </th>
            <td mat-cell *matCellDef="let element">
                <span class="badge qic" *ngIf="element.qicDone > 0">{{element.qicDone}}</span>
                <span *ngIf="element.qicDone == 0" style="color: #94a3b8; opacity: 0.5;">0</span>
            </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell numeric"> {{totalQicCount}} </td>
          </ng-container>

          <ng-container matColumnDef="dicDone">
            <th mat-header-cell *matHeaderCellDef> DIC Done </th>
            <td mat-cell *matCellDef="let element">
                <span class="badge dic" *ngIf="element.dicDone > 0">{{element.dicDone}}</span>
                <span *ngIf="element.dicDone == 0" style="color: #94a3b8; opacity: 0.5;">0</span>
            </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell numeric"> {{totalDicCount}} </td>
          </ng-container>

          <ng-container matColumnDef="billsSubmitted">
            <th mat-header-cell *matHeaderCellDef> Bills Sub. </th>
            <td mat-cell *matCellDef="let element"> {{element.billsSubmitted}} </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell numeric"> {{totalBillsSubCount}} </td>
          </ng-container>

          <ng-container matColumnDef="ssBillsSubmitted">
            <th mat-header-cell *matHeaderCellDef> SS Bills Sub. </th>
            <td mat-cell *matCellDef="let element"> {{element.ssBillsSubmitted}} </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell numeric"> {{totalSSBillsSubCount}} </td>
          </ng-container>

          <ng-container matColumnDef="billsCleared">
            <th mat-header-cell *matHeaderCellDef> Bills Clr. </th>
            <td mat-cell *matCellDef="let element" class="success-val"> {{element.billsCleared}} </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell numeric success-val"> {{totalBillsClrCount}} </td>
          </ng-container>

          <ng-container matColumnDef="ssBillsCleared">
            <th mat-header-cell *matHeaderCellDef> SS Bills Clr. </th>
            <td mat-cell *matCellDef="let element" class="success-val font-bold"> {{element.ssBillsCleared}} </td>
            <td mat-footer-cell *matFooterCellDef class="grand-total-cell numeric success-val"> {{totalSSBillsClrCount}} </td>
          </ng-container>

          <!-- Header Rows -->
          <tr mat-header-row *matHeaderRowDef="['header-identity', 'header-ops', 'header-finance']; sticky: true" class="group-header-row"></tr>
          <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true" class="sub-header-row"></tr>
          
          <!-- Sticky Group Row -->
          <tr mat-row *matRowDef="let row; columns: ['firmHeader']; when: isGroup" class="firm-sticky-row"></tr>

          <!-- Data Row -->
          <tr mat-row *matRowDef="let row; columns: displayedColumns; when: isData" class="table-row data-row"></tr>

          <!-- Footer Row -->
          <tr mat-row *matRowDef="let row; columns: ['firmFooter']; when: isFooter" class="firm-footer-row"></tr>

          <!-- GLOBAL TOTAL ROW -->
          <tr mat-footer-row *matFooterRowDef="displayedColumns; sticky: true" class="grand-footer-row"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" colspan="10" style="text-align: center; padding: 40px;">
              {{ loading ? 'Merging Regional intelligence...' : 'No synchronized data available.' }}
            </td>
          </tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`
    .report-wrapper { padding: 32px; background: #f1f5f9; min-height: 100vh; }
    .loader { margin-bottom: 8px; border-radius: 4px; }
    .loading-fade { opacity: 0.5; pointer-events: none; }
    
    .glass-header {
      background: white; padding: 24px 32px; border-radius: 24px; margin-bottom: 20px;
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .title-group {
      display: flex; gap: 20px; align-items: center;
      .icon-box {
        width: 56px; height: 56px; background: #1e293b; border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }
      }
      .text-box {
        h1 { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; }
        p { font-size: 14px; font-weight: 600; color: #1e293b; opacity: 0.6; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
      }
    }

    .export-btn {
      height: 48px; border-radius: 12px; background: #1e293b !important; font-weight: 700; color: white;
    }

    .header-summary {
        margin-bottom: 24px; display: flex; gap: 20px; padding: 24px 32px;
        background: #1e293b; border-radius: 24px; color: white;
        justify-content: space-between;
        .stat-item {
            display: flex; flex-direction: column; gap: 4px;
            .label { font-size: 10px; text-transform: uppercase; opacity: 0.5; font-weight: 800; letter-spacing: 1px; }
            .val { 
                font-size: 22px; font-weight: 800; 
                &.highlight { color: #3b82f6; }
                &.success { color: #10b981; }
                &.danger { color: #ef4444; }
            }
        }
    }

    .table-container {
      border-radius: 24px; overflow: hidden; border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.04);
      background: white; max-height: calc(100vh - 180px); overflow-y: auto;
    }

    .premium-table {
      width: 100%;
      
      .group-header-row { height: 56px; z-index: 100 !important; }
      .group-header { 
          font-size: 12px; font-weight: 800; text-align: center; color: white; 
          border-bottom: none; position: sticky; top: 0; z-index: 101;
          mat-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-right: 8px; }
      }
      .identity-bg { background: #334155; }
      .ops-bg { background: #475569; }
      .finance-bg { background: #64748b; }

      .sub-header-row { height: 64px; z-index: 99 !important; }
      .sub-header-row th { position: sticky; top: 56px; background: #f8fafc; z-index: 99; }
      
      th { color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase; padding: 16px; border-bottom: 2px solid #e2e8f0; }
      td { padding: 22px 16px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    }

    .firm-sticky-row {
        position: sticky; top: 120px; z-index: 98; background: #f8fafc;
        &:hover { background: #f1f5f9 !important; }
    }

    .firm-group-cell {
        padding: 0 !important; border-bottom: 2px solid #e2e8f0 !important;
        position: sticky; top: 120px; z-index: 98; background: #f8fafc;
    }

    .firm-group-content {
        display: flex; align-items: center; justify-content: space-between; padding: 16px 32px;
        background: #f8fafc; border-left: 6px solid #1e293b;
        
        .main-info { display: flex; align-items: center; gap: 16px; }
        .group-num { font-size: 20px; font-weight: 900; color: #1e293b; }
        .group-name { font-size: 18px; font-weight: 800; color: #1e293b; }
        .group-badge { 
            font-size: 10px; font-weight: 700; color: #3b82f6; background: #eff6ff; 
            padding: 4px 10px; border-radius: 20px; text-transform: uppercase; 
        }

        .group-stats {
            display: flex; align-items: center; gap: 12px; background: #f1f5f9;
            padding: 8px 20px; border-radius: 12px;
            mat-icon { font-size: 18px; width: 18px; height: 18px; color: #3b82f6; }
            .stat-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; }
            .stat-val { font-size: 16px; font-weight: 900; color: #1e293b; }
        }
    }

    .firm-footer-row { background: #f1f5f9 !important; }
    .firm-footer-cell { padding: 16px 32px !important; border-bottom: 4px solid #e2e8f0 !important; }
    
    .footer-layout {
        display: flex; justify-content: space-between; align-items: center;
        .footer-label {
            display: flex; align-items: center; gap: 12px;
            color: #475569; font-weight: 700; font-size: 13px;
            mat-icon { color: #3b82f6; font-size: 20px; width: 20px; height: 20px; }
        }
        .footer-metrics {
            display: flex; gap: 24px;
            .metric {
                display: flex; flex-direction: column; align-items: flex-end;
                .m-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; }
                .m-val { font-size: 15px; font-weight: 900; color: #1e293b; }
                &.highlight .m-val { color: #3b82f6; }
                &.success .m-val { color: #10b981; }
            }
        }
    }

    .grand-footer-row {
        background: #f8fafc !important;
        th, td { 
            border-top: 3px solid #1e293b !important;
            border-bottom: 3px solid #1e293b !important;
            padding: 24px 16px !important;
        }
    }

    .grand-total-cell {
        font-size: 16px !important; color: #1e293b !important; font-weight: 900 !important;
        &.label { color: #3b82f6 !important; letter-spacing: 1px; }
        &.description { font-size: 12px !important; font-weight: 700 !important; color: #64748b !important; }
        &.numeric { text-align: left; }
    }

    .data-row:hover { background: #fdfdfd; }
    .entity-cell.placeholder { color: #e2e8f0; font-weight: 300; }
    
    .loc-flex { display: flex; align-items: center; gap: 12px; }
    .loc-tag { 
        font-weight: 700; color: #3b82f6; background: #eff6ff; 
        padding: 4px 10px; border-radius: 8px; display: inline-block;
    }

    .sub-num { font-size: 11px; font-weight: 800; color: #94a3b8; }
    
    .badge { padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 11px;
        &.qic { background: #fef3c7; color: #92400e; }
        &.dic { background: #dcfce7; color: #15803d; }
    }

    .success-val { color: #10b981; }
    .font-bold { font-weight: 800; }

    .fade-in { animation: fadeIn 0.4s ease-in; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class ConsolidatedReportComponent implements OnInit {
  private reportingService = inject(ReportingService);
  private cdr = inject(ChangeDetectorRef);
  
  displayedColumns: string[] = ['srNo', 'firmName', 'district', 'booked', 'qicDone', 'dicDone', 'billsSubmitted', 'ssBillsSubmitted', 'billsCleared', 'ssBillsCleared'];
  loading = true;
  allData: any[] = [];
  dataSource: any[] = [];

  ngOnInit() {
    this.fetchData();
  }

  isGroup(index: number, item: any): boolean {
    return item.group;
  }

  isData(index: number, item: any): boolean {
    return !item.group && !item.footer;
  }

  isFooter(index: number, item: any): boolean {
    return item.footer;
  }

  fetchData() {
    this.loading = true;
    this.reportingService.getRegionalWiseReport().subscribe({
        next: (data: RegionalReport[]) => {
            this.transformData(data);
            this.loading = false;
            this.cdr.detectChanges();
        },
        error: (err: any) => {
            console.error('Error fetching regional report', err);
            this.loading = false;
            this.cdr.detectChanges();
        }
    });
  }

  transformData(rawData: RegionalReport[]) {
    const transformed: any[] = [];
    let firmNum = 0;
    
    // Group observations by firm
    const firmGroups = rawData.reduce((acc: any, item) => {
        if (!acc[item.firmName]) {
            acc[item.firmName] = { 
                data: [], 
                totalBooked: 0, 
                totalQic: 0, 
                totalDic: 0, 
                totalBillsSub: 0, 
                totalBillsClr: 0 
            };
        }
        acc[item.firmName].data.push(item);
        acc[item.firmName].totalBooked += item.booked;
        acc[item.firmName].totalQic += item.qicDone;
        acc[item.firmName].totalDic += item.dicDone;
        acc[item.firmName].totalBillsSub += item.ssBillsSubmitted;
        acc[item.firmName].totalBillsClr += item.ssBillsCleared;
        return acc;
    }, {});

    Object.keys(firmGroups).forEach((firmName) => {
        const group = firmGroups[firmName];
        firmNum++;
        
        // 1. Add Header Row
        transformed.push({
            group: true,
            firmName: firmName,
            firmNumber: firmNum,
            totalFirmBooked: group.totalBooked
        });

        // 2. Add Data Rows
        group.data.forEach((item: any, distAlphaIndex: number) => {
            transformed.push({
                ...item,
                group: false,
                footer: false,
                firmNumber: firmNum,
                districtIndex: String.fromCharCode(65 + distAlphaIndex)
            });
        });

        // 3. Add Footer Row
        transformed.push({
            group: false,
            footer: true,
            firmName: firmName,
            fBooked: group.totalBooked,
            fQic: group.totalQic,
            fDic: group.totalDic,
            fBillsSub: group.totalBillsSub,
            fBillsClr: group.totalBillsClr
        });
    });

    this.allData = transformed;
    this.dataSource = transformed;
  }

  get totalBooked(): number {
    return this.allData.filter(d => d.district).reduce((acc, curr) => acc + curr.booked, 0);
  }

  get totalQicCount(): number {
    return this.allData.filter(d => d.district).reduce((acc, curr) => acc + curr.qicDone, 0);
  }

  get totalDicCount(): number {
    return this.allData.filter(d => d.district).reduce((acc, curr) => acc + curr.dicDone, 0);
  }

  get totalBillsSubCount(): number {
    return this.allData.filter(d => d.district).reduce((acc, curr) => acc + curr.billsSubmitted, 0);
  }

  get totalSSBillsSubCount(): number {
    return this.allData.filter(d => d.district).reduce((acc, curr) => acc + curr.ssBillsSubmitted, 0);
  }

  get totalBillsClrCount(): number {
    return this.allData.filter(d => d.district).reduce((acc, curr) => acc + curr.billsCleared, 0);
  }

  get totalSSBillsClrCount(): number {
    return this.allData.filter(d => d.district).reduce((acc, curr) => acc + curr.ssBillsCleared, 0);
  }

  get totalDicDone(): number {
    return this.allData.filter(d => d.district).reduce((acc, curr) => acc + curr.dicDone, 0);
  }

  get totalSSPending(): number {
    return this.allData.filter(d => d.district).reduce((acc, curr) => acc + (curr.ssBillsSubmitted - curr.ssBillsCleared), 0);
  }

  get avgDeliveryRate(): number {
    const dataRows = this.allData.filter(d => d.district);
    if (dataRows.length === 0) return 0;
    const totalBooked = dataRows.reduce((acc, curr) => acc + curr.booked, 0);
    if (totalBooked === 0) return 0;
    const totalCleared = dataRows.reduce((acc, curr) => acc + curr.ssBillsCleared, 0);
    return Math.round((totalCleared / totalBooked) * 100);
  }

  exportToExcel() {
    const dataRows = this.allData.filter(d => d.district);
    const uniqueDistricts = Array.from(new Set(dataRows.map(d => d.district))).sort();
    const uniqueFirms = Array.from(new Set(dataRows.map(d => d.firmName))).sort();
    const metrics = ['Booked', 'QIC Done', 'DIC Done', 'Bills Sub.', 'SS Bills Sub.', 'Bills Clr.', 'SS Bills Clr.'];
    const metricsCount = metrics.length;

    // 1. Create the Master CSS for Excel
    const css = `
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }
        th, td { border: 1px solid #000; padding: 6px 12px; text-align: center; font-size: 11px; }
        
        .title-header { background: #1e293b; color: white; font-size: 16px; font-weight: bold; border: 3px solid #000; }
        .timestamp { background: #f1f5f9; font-style: italic; color: #475569; border: 3px solid #000; }
        
        .district-header { 
          background: #e2e8f0; font-weight: 800; font-size: 12px; 
          border: 3px solid #000 !important;
          color: #000;
        }
        
        .metric-header { background: #f8fafc; font-weight: bold; border: 2px solid #000 !important; }
        .firm-cell { text-align: left; font-weight: bold; border: 3px solid #000; background: #f1f5f9; padding-left: 15px; }
        
        .milestone-cell { border: 2px solid #000 !important; font-weight: bold; }
        .data-val { border: 1px solid #000; }
        .grand-total { background: #000; color: white; font-weight: bold; border: 3px solid #000; font-size: 12px; }
        
        /* District SILO separation */
        .dist-border-left { border-left: 4px solid #000 !important; }
        .dist-border-right { border-right: 4px solid #000 !important; }
        
        .numeric-val { mso-number-format:"\#\,\#\#0"; }
      </style>
    `;

    // 2. Build HTML Table
    let tableHtml = `
      <table border="1">
        <tr>
          <th colspan="${1 + uniqueDistricts.length * metricsCount}" class="title-header">
            STRATEGIC CROSS-REGIONAL MANUFACTURING AUDIT
          </th>
        </tr>
        <tr>
          <th colspan="${1 + uniqueDistricts.length * metricsCount}" class="timestamp">
            Executive Audit Intelligence Generated: ${new Date().toLocaleString()}
          </th>
        </tr>
        <tr>
          <th rowspan="2" class="firm-cell">MANUFACTURING FIRM IDENTITY</th>
    `;

    // Add District Spans (SEGREGATED SILOS)
    uniqueDistricts.forEach(dist => {
      tableHtml += `<th colspan="${metricsCount}" class="district-header">${dist}</th>`;
    });
    tableHtml += `</tr><tr>`;

    // Add Metric Repeaters
    uniqueDistricts.forEach(() => {
      metrics.forEach((m, i) => {
        let cls = 'metric-header';
        if (i === 0) cls += ' dist-border-left';
        if (i === metricsCount - 1) cls += ' dist-border-right';
        tableHtml += `<th class="${cls}">${m}</th>`;
      });
    });
    tableHtml += `</tr>`;

    // 3. Add Data Body
    uniqueFirms.forEach(firmName => {
      tableHtml += `<tr><td class="firm-cell">${firmName}</td>`;
      uniqueDistricts.forEach(dist => {
        const entry = dataRows.find(d => d.firmName === firmName && d.district === dist);
        const vals = entry ? 
          [entry.booked, entry.qicDone, entry.dicDone, entry.billsSubmitted, entry.ssBillsSubmitted, entry.billsCleared, entry.ssBillsCleared] :
          [0, 0, 0, 0, 0, 0, 0];
        
        vals.forEach((v, i) => {
          let cls = 'data-val numeric-val milestone-cell';
          if (i === 0) cls += ' dist-border-left';
          if (i === metricsCount - 1) cls += ' dist-border-right';
          
          tableHtml += `<td class="${cls}">${v}</td>`;
        });
      });
      tableHtml += `</tr>`;
    });

    // 4. Add Grand Totals
    tableHtml += `<tr><td class="grand-total">GRAND TOTAL (AGGR.)</td>`;
    uniqueDistricts.forEach(dist => {
      const distData = dataRows.filter(d => d.district === dist);
      const totals = [
        distData.reduce((a, b) => a + b.booked, 0),
        distData.reduce((a, b) => a + b.qicDone, 0),
        distData.reduce((a, b) => a + b.dicDone, 0),
        distData.reduce((a, b) => a + b.billsSubmitted, 0),
        distData.reduce((a, b) => a + b.ssBillsSubmitted, 0),
        distData.reduce((a, b) => a + b.billsCleared, 0),
        distData.reduce((a, b) => a + b.ssBillsCleared, 0)
      ];
      totals.forEach((t, i) => {
        let cls = 'grand-total numeric-val milestone-cell';
        if (i === 0) cls += ' dist-border-left';
        if (i === metricsCount - 1) cls += ' dist-border-right';
        tableHtml += `<td class="${cls}">${t}</td>`;
      });
    });
    tableHtml += `</tr></table>`;

    // 5. Final Assembly and Export
    const fullHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Strategic Audit</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        ${css}
        </head>
        <body>${tableHtml}</body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Strategic_Regional_Audit_${new Date().getTime()}.xls`;
    link.click();
  }
}
