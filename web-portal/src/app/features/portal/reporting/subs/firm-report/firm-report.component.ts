import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ReportingService, FirmReport } from '@app/core/services/reporting.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-firm-report',
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
            <mat-icon>business</mat-icon>
          </div>
          <div class="text-box">
            <h1>Corporate Performance Audit</h1>
            <p>Firm-wise status of Super Seeders Delivery & Compliance</p>
          </div>
        </div>
        
        <div class="action-row">
           <button mat-flat-button class="export-btn" (click)="exportToExcel()" matTooltip="Download Corporate Audit Report" [disabled]="loading">
             <mat-icon>description</mat-icon>
             Download Corporate Report
           </button>
        </div>
      </div>

      <mat-progress-bar *ngIf="loading" mode="indeterminate" color="accent" class="loader"></mat-progress-bar>

      <div class="header-summary fade-in" *ngIf="!loading">
          <div class="stat-item">
              <span class="label">Primary Manufacturers</span>
              <span class="val">{{allData.length}} Firms</span>
          </div>
          <div class="stat-item">
              <span class="label">Total Booked</span>
              <span class="val highlight">{{totalBooked}}</span>
          </div>
          <div class="stat-item">
              <span class="label">QIC Inspection Pass</span>
              <span class="val">{{totalQicDone}}</span>
          </div>
          <div class="stat-item">
              <span class="label">DIC Certification</span>
              <span class="val">{{totalDicDone}}</span>
          </div>
          <div class="stat-item">
              <span class="label">Revenue at Risk (Pending)</span>
              <span class="val danger">{{totalBillsPending}}</span>
          </div>
          <div class="stat-item">
              <span class="label">Delivery Efficiency</span>
              <span class="val success">{{completionRate}}%</span>
          </div>
      </div>

      <mat-card class="table-container fade-in" [class.loading-fade]="loading">
        <table mat-table [dataSource]="dataSource" class="premium-table">
          
          <ng-container matColumnDef="srNo">
            <th mat-header-cell *matHeaderCellDef> Sr. No. </th>
            <td mat-cell *matCellDef="let element; let i = index"> {{i + 1}} </td>
            <td mat-footer-cell *matFooterCellDef class="footer-label"> TOTAL </td>
          </ng-container>

          <ng-container matColumnDef="firmName">
            <th mat-header-cell *matHeaderCellDef> Manufacturing Firm </th>
            <td mat-cell *matCellDef="let element" class="firm-cell"> 
                <div class="firm-info">
                    <mat-icon class="firm-icon">store</mat-icon>
                    <span>{{element.firmName}}</span>
                </div>
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-desc"> Overall </td>
          </ng-container>

          <ng-container matColumnDef="booked">
            <th mat-header-cell *matHeaderCellDef> Booked </th>
            <td mat-cell *matCellDef="let element"> 
              <span class="metric-val">{{element.booked}}</span>
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val font-bold"> {{totalBooked}} </td>
          </ng-container>

          <ng-container matColumnDef="qicDone">
            <th mat-header-cell *matHeaderCellDef> QIC Done </th>
            <td mat-cell *matCellDef="let element"> 
                <span class="badge qic">{{element.qicDone}}</span>
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val"> {{totalQicDone}} </td>
          </ng-container>

          <ng-container matColumnDef="dicDone">
            <th mat-header-cell *matHeaderCellDef> DIC Done </th>
            <td mat-cell *matCellDef="let element"> 
                <span class="badge dic">{{element.dicDone}}</span>
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val"> {{totalDicDone}} </td>
          </ng-container>

          <ng-container matColumnDef="billsSubmitted">
            <th mat-header-cell *matHeaderCellDef> Bills Submitted </th>
            <td mat-cell *matCellDef="let element"> 
                {{element.billsSubmitted}} 
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val"> {{totalBillsSubCount}} </td>
          </ng-container>

          <ng-container matColumnDef="ssBillsSubmitted">
            <th mat-header-cell *matHeaderCellDef> SS Bills Submitted </th>
            <td mat-cell *matCellDef="let element"> 
                {{element.ssBillsSubmitted}} 
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val"> {{totalSSBillsSubCount}} </td>
          </ng-container>

          <ng-container matColumnDef="billsCleared">
            <th mat-header-cell *matHeaderCellDef> Bills Cleared </th>
            <td mat-cell *matCellDef="let element" class="success-text"> 
                {{element.billsCleared}} 
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val success-text"> {{totalBillsClrCount}} </td>
          </ng-container>

          <ng-container matColumnDef="ssBillsCleared">
            <th mat-header-cell *matHeaderCellDef> SS Bills Cleared </th>
            <td mat-cell *matCellDef="let element" class="success-text font-bold"> 
                {{element.ssBillsCleared}} 
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val success-text font-bold"> {{totalSSBillsClrCount}} </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
          <tr mat-footer-row *matFooterRowDef="displayedColumns; sticky: true" class="footer-row-style"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" colspan="9" style="text-align: center; padding: 40px;">
              {{ loading ? 'Synchronizing Corporate Data...' : 'Audit logs clear. No records found.' }}
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
      background: white; border-radius: 24px; padding: 24px 32px; margin-bottom: 20px;
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .title-group {
      display: flex; gap: 20px; align-items: center;
      .icon-box {
        width: 56px; height: 56px; background: #6366f1; border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }
      }
      .text-box {
        h1 { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.5px; }
        p { font-size: 14px; font-weight: 600; color: #6366f1; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px; }
      }
    }

    .export-btn {
      height: 48px; border-radius: 12px; background: #1e293b !important; font-weight: 700; color: white;
      mat-icon { margin-right: 8px; }
    }

    .header-summary {
        margin-bottom: 24px; display: flex; gap: 20px; padding: 24px 32px;
        background: #1e293b; border-radius: 24px; color: white;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        justify-content: space-between;
        .stat-item {
            display: flex; flex-direction: column; gap: 4px;
            .label { font-size: 10px; text-transform: uppercase; opacity: 0.5; font-weight: 800; letter-spacing: 1.2px; }
            .val { 
                font-size: 22px; font-weight: 800; 
                &.highlight { color: #818cf8; }
                &.success { color: #34d399; }
                &.danger { color: #fb7185; }
            }
        }
    }

    .table-container {
      border-radius: 24px; overflow: hidden; border: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      background: white; max-height: calc(100vh - 280px); overflow-y: auto;
    }

    .premium-table {
      width: 100%;
      th { background: #f8fafc; color: #64748b; font-weight: 700; font-size: 11px; text-transform: uppercase; padding: 20px 16px; border-bottom: 2px solid #edf2f7; }
      td { padding: 18px 16px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    }

    .footer-row-style {
        background: #f8fafc;
        td { 
            border-top: 3px solid #1e293b !important; 
            border-bottom: 3px solid #1e293b !important;
            font-weight: 900; 
            font-size: 14px !important;
            color: #1e293b !important;
        }
    }

    .footer-label { font-weight: 900 !important; color: #4338ca !important; }
    .footer-desc { opacity: 0.5; font-size: 11px !important; text-transform: uppercase; }
    .footer-val { text-align: center; }

    .firm-cell { font-weight: 700; }
    .firm-info { display: flex; align-items: center; gap: 10px; color: #4338ca; }
    .firm-icon { font-size: 18px; width: 18px; height: 18px; color: #94a3b8; }

    .metric-val { font-weight: 700; color: #1e293b; }

    .badge {
        padding: 5px 12px; border-radius: 10px; font-size: 12px; font-weight: 700;
        &.qic { background: #eef2ff; color: #4338ca; }
        &.dic { background: #ecfdf5; color: #059669; }
    }

    .success-text { color: #059669; }
    .font-bold { font-weight: 800; }

    .fade-in { animation: fadeIn 0.6s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class FirmReportComponent implements OnInit {
  private reportingService = inject(ReportingService);
  private cdr = inject(ChangeDetectorRef);
  
  displayedColumns: string[] = ['srNo', 'firmName', 'booked', 'qicDone', 'dicDone', 'billsSubmitted', 'ssBillsSubmitted', 'billsCleared', 'ssBillsCleared'];
  loading = true;
  allData: FirmReport[] = [];
  dataSource: FirmReport[] = [];

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.loading = true;
    this.reportingService.getFirmWiseReport().subscribe({
        next: (data: FirmReport[]) => {
            this.allData = data;
            this.dataSource = [...this.allData];
            this.loading = false;
            this.cdr.detectChanges();
        },
        error: (err: any) => {
            console.error('Error fetching firm report', err);
            this.loading = false;
            this.cdr.detectChanges();
        }
    });
  }

  get totalBooked(): number {
    return this.allData.reduce((acc, curr) => acc + curr.booked, 0);
  }

  get totalQicDone(): number {
    return this.allData.reduce((acc, curr) => acc + curr.qicDone, 0);
  }

  get totalDicDone(): number {
    return this.allData.reduce((acc, curr) => acc + curr.dicDone, 0);
  }

  get totalBillsSubCount(): number {
    return this.allData.reduce((acc, curr) => acc + curr.billsSubmitted, 0);
  }

  get totalSSBillsSubCount(): number {
    return this.allData.reduce((acc, curr) => acc + curr.ssBillsSubmitted, 0);
  }

  get totalBillsClrCount(): number {
    return this.allData.reduce((acc, curr) => acc + curr.billsCleared, 0);
  }

  get totalSSBillsClrCount(): number {
    return this.allData.reduce((acc, curr) => acc + curr.ssBillsCleared, 0);
  }

  get totalBillsPending(): number {
    // Risk assessment: Booked minus cleared
    return this.totalBooked - this.allData.reduce((acc, curr) => acc + curr.billsCleared, 0);
  }

  get completionRate(): number {
    if (this.totalBooked === 0) return 0;
    const totalCleared = this.allData.reduce((acc, curr) => acc + curr.ssBillsCleared, 0);
    return Math.round((totalCleared / this.totalBooked) * 100);
  }

  exportToExcel() {
    // 1. Create the Master CSS for Excel
    const css = `
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }
        th, td { border: 1px solid #000; padding: 8px 12px; text-align: center; font-size: 11px; }
        
        .title-header { background: #1e293b; color: white; font-size: 16px; font-weight: bold; border: 2px solid #000; }
        .timestamp { background: #f1f5f9; font-style: italic; color: #475569; border: 2px solid #000; }
        
        .column-header { background: #f1f5f9; font-weight: bold; border: 2px solid #000; font-size: 11px; text-transform: uppercase; }
        .firm-cell { text-align: left; font-weight: bold; border: 1px solid #000; padding-left: 10px; }
        
        .grand-total { background: #000; color: white; font-weight: bold; border: 2px solid #000; font-size: 12px; }
        
        .numeric-val { mso-number-format:"\#\,\#\#0"; }
      </style>
    `;

    // 2. Build HTML Table
    let tableHtml = `
      <table border="1">
        <tr>
          <th colspan="9" class="title-header">
            CORPORATE PERFORMANCE AUDIT: MANUFACTURING COMPLIANCE MATRIX
          </th>
        </tr>
        <tr>
          <th colspan="9" class="timestamp">
            Executive Audit Intelligence Generated: ${new Date().toLocaleString()}
          </th>
        </tr>
        <tr>
          <th class="column-header">Sr. No.</th>
          <th class="column-header">Manufacturing Firm</th>
          <th class="column-header">Booked</th>
          <th class="column-header">QIC Done</th>
          <th class="column-header">DIC Done</th>
          <th class="column-header">Bills Submitted</th>
          <th class="column-header">SS Bills Submitted</th>
          <th class="column-header">Bills Cleared</th>
          <th class="column-header">SS Bills Cleared</th>
        </tr>
    `;

    // 3. Add Data Body
    this.allData.forEach((item, index) => {
      tableHtml += `
        <tr>
          <td>${index + 1}</td>
          <td class="firm-cell">${item.firmName}</td>
          <td class="numeric-val">${item.booked}</td>
          <td class="numeric-val">${item.qicDone}</td>
          <td class="numeric-val">${item.dicDone}</td>
          <td class="numeric-val">${item.billsSubmitted}</td>
          <td class="numeric-val">${item.ssBillsSubmitted}</td>
          <td class="numeric-val">${item.billsCleared}</td>
          <td class="numeric-val">${item.ssBillsCleared}</td>
        </tr>
      `;
    });

    // 4. Add Grand Totals
    tableHtml += `
      <tr>
        <td colspan="2" class="grand-total">GRAND TOTAL (AGGR.)</td>
        <td class="grand-total numeric-val">${this.totalBooked}</td>
        <td class="grand-total numeric-val">${this.totalQicDone}</td>
        <td class="grand-total numeric-val">${this.totalDicDone}</td>
        <td class="grand-total numeric-val">${this.totalBillsSubCount}</td>
        <td class="grand-total numeric-val">${this.totalSSBillsSubCount}</td>
        <td class="grand-total numeric-val">${this.totalBillsClrCount}</td>
        <td class="grand-total numeric-val">${this.totalSSBillsClrCount}</td>
      </tr>
    </table>
    `;

    // 5. Final Assembly and Export
    const fullHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Corporate Performance</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        ${css}
        </head>
        <body>${tableHtml}</body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Corporate_Audit_Report_${new Date().getTime()}.xls`;
    link.click();
  }
}
