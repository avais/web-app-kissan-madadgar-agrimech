import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ReportingService, DistrictReport } from '@app/core/services/reporting.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-district-report',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatTableModule, 
    MatButtonModule, 
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule
  ],
  template: `
    <div class="report-wrapper">
      <div class="glass-header">
        <div class="title-group">
          <div class="icon-box">
            <mat-icon>analytics</mat-icon>
          </div>
          <div class="text-box">
            <h1>District Wise Status of Super Seeders</h1>
            <p>Punjab Clean Air Program - Agriculture Component</p>
          </div>
        </div>
        
        <div class="action-row">
           <button mat-flat-button class="export-btn" (click)="exportToExcel()" matTooltip="Download as Excel File" [disabled]="loading">
             <mat-icon>download</mat-icon>
             Export to Excel
           </button>
        </div>
      </div>

      <mat-progress-bar *ngIf="loading" mode="indeterminate" color="primary" class="loader"></mat-progress-bar>

      <div class="header-summary fade-in" *ngIf="!loading">
          <div class="stat-item">
              <span class="label">Total Districts</span>
              <span class="val">{{allData.length}}</span>
          </div>
          <div class="stat-item">
              <span class="label">Total Booked</span>
              <span class="val highlight">{{totalBooked}}</span>
          </div>
          <div class="stat-item">
              <span class="label">QIC Done</span>
              <span class="val">{{totalQicDone}}</span>
          </div>
          <div class="stat-item">
              <span class="label">DIC Done</span>
              <span class="val">{{totalDicDone}}</span>
          </div>
          <div class="stat-item">
              <span class="label">Bills Pending</span>
              <span class="val danger">{{totalBillsPending}}</span>
          </div>
          <div class="stat-item">
              <span class="label">SS Bills Pending</span>
              <span class="val danger">{{totalSSBillsPending}}</span>
          </div>
          <div class="stat-item">
              <span class="label">Completion Rate</span>
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

          <ng-container matColumnDef="district">
            <th mat-header-cell *matHeaderCellDef> District </th>
            <td mat-cell *matCellDef="let element" class="district-cell"> {{element.district}} </td>
            <td mat-footer-cell *matFooterCellDef class="footer-desc"> All Regions </td>
          </ng-container>

          <ng-container matColumnDef="booked">
            <th mat-header-cell *matHeaderCellDef> No. of Super Seeders Booked </th>
            <td mat-cell *matCellDef="let element"> 
              <span class="badge booked">{{element.booked}}</span>
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val"> {{totalBooked}} </td>
          </ng-container>

          <ng-container matColumnDef="qicDone">
            <th mat-header-cell *matHeaderCellDef> No. of QIC Done </th>
            <td mat-cell *matCellDef="let element"> 
                <span class="badge qic">{{element.qicDone}}</span>
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val"> {{totalQicDone}} </td>
          </ng-container>

          <ng-container matColumnDef="dicDone">
            <th mat-header-cell *matHeaderCellDef> No. of DIC Done </th>
            <td mat-cell *matCellDef="let element"> 
                <span class="badge dic">{{element.dicDone}}</span>
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val"> {{totalDicDone}} </td>
          </ng-container>

          <ng-container matColumnDef="billsPending">
            <th mat-header-cell *matHeaderCellDef> No. of Bills Pending </th>
            <td mat-cell *matCellDef="let element" [class.warning]="element.billsPending > 10"> 
                {{element.billsPending}} 
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val"> {{totalBillsPending}} </td>
          </ng-container>

          <ng-container matColumnDef="superSeederBillsPending">
            <th mat-header-cell *matHeaderCellDef> No. of Super Seeders Bills Pending </th>
            <td mat-cell *matCellDef="let element" [class.danger]="element.superSeederBillsPending > 5"> 
                {{element.superSeederBillsPending}} 
            </td>
            <td mat-footer-cell *matFooterCellDef class="footer-val"> {{totalSSBillsPending}} </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
          <tr mat-footer-row *matFooterRowDef="displayedColumns; sticky: true" class="footer-row-style"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" colspan="7" style="text-align: center; padding: 40px;">
              {{ loading ? 'Loading data...' : 'No data matching the filter' }}
            </td>
          </tr>
        </table>
      </mat-card>

    </div>
  `,
  styles: [`
    .report-wrapper { padding: 32px; background: #f8fafc; min-height: 100vh; }
    .loader { margin-bottom: 8px; border-radius: 4px; }
    .loading-fade { opacity: 0.5; pointer-events: none; }
    
    .glass-header {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 24px 32px;
      border-radius: 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.03);
    }

    .title-group {
      display: flex; gap: 20px; align-items: center;
      .icon-box {
        width: 56px; height: 56px; background: #10b981; border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }
      }
      .text-box {
        h1 { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.5px; }
        p { font-size: 14px; font-weight: 600; color: #10b981; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px; }
      }
    }

    .action-row { display: flex; gap: 16px; align-items: center; }
    
    .export-btn {
      height: 48px; border-radius: 12px; background: #1e293b !important; font-weight: 700;
      mat-icon { margin-right: 8px; }
      &:disabled { opacity: 0.5; }
    }

    .header-summary {
        margin-bottom: 24px; display: flex; gap: 40px; padding: 24px 32px;
        background: #1e293b; border-radius: 24px; color: white;
        box-shadow: 0 10px 30px rgba(30, 41, 59, 0.15);
        justify-content: space-between;
        .stat-item {
            display: flex; flex-direction: column; gap: 4px;
            .label { font-size: 11px; text-transform: uppercase; opacity: 0.6; font-weight: 700; letter-spacing: 1px; }
            .val { 
                font-size: 22px; font-weight: 800; 
                &.highlight { color: #38bdf8; }
                &.success { color: #10b981; }
                &.danger { color: #f87171; }
            }
        }
    }

    .table-container {
      border-radius: 24px; overflow: hidden; border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.04);
      background: white; max-height: calc(100vh - 260px); overflow-y: auto;
      transition: opacity 0.3s ease;
    }

    .premium-table {
      width: 100%;
      th { background: #f1f5f9; color: #475569; font-weight: 800; font-size: 11px; text-transform: uppercase; padding: 20px 16px; }
      td { padding: 20px 16px; font-size: 14px; color: #1e293b; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
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

    .footer-label { font-weight: 900 !important; color: #10b981 !important; }
    .footer-desc { opacity: 0.5; font-size: 11px !important; text-transform: uppercase; }
    .footer-val { text-align: center; }

    .table-row:hover { background: #f8fafc; cursor: pointer; }
    .district-cell { font-weight: 700; color: #10b981; }

    .badge {
        padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700;
        &.booked { background: #e0f2fe; color: #0369a1; }
        &.qic { background: #fef3c7; color: #92400e; }
        &.dic { background: #dcfce7; color: #15803d; }
    }

    .warning { color: #f59e0b; font-weight: 700; }
    .danger { color: #ef4444; font-weight: 700; }

    .fade-in { animation: fadeIn 0.8s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class DistrictReportComponent implements OnInit {
  private reportingService = inject(ReportingService);
  private cdr = inject(ChangeDetectorRef);
  
  displayedColumns: string[] = ['srNo', 'district', 'booked', 'qicDone', 'dicDone', 'billsPending', 'superSeederBillsPending'];
  loading = true;
  allData: DistrictReport[] = [];
  dataSource: DistrictReport[] = [];

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.loading = true;
    this.reportingService.getDistrictWiseReport().subscribe({
        next: (data: DistrictReport[]) => {
            this.allData = data;
            this.dataSource = [...this.allData];
            this.loading = false;
            this.cdr.detectChanges();
        },
        error: (err: any) => {
            console.error('Error fetching district report', err);
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

  get totalBillsPending(): number {
    return this.allData.reduce((acc, curr) => acc + curr.billsPending, 0);
  }

  get totalSSBillsPending(): number {
    return this.allData.reduce((acc, curr) => acc + curr.superSeederBillsPending, 0);
  }

  get completionRate(): number {
    if (this.totalBooked === 0) return 0;
    const totalDic = this.allData.reduce((acc, curr) => acc + curr.dicDone, 0);
    return Math.round((totalDic / this.totalBooked) * 100);
  }

  exportToExcel() {
    // 1. Create the Master CSS for Excel
    const css = `
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }
        th, td { border: 1px solid #000; padding: 8px 12px; text-align: center; font-size: 11px; }
        
        .title-header { background: #1e293b; color: white; font-size: 16px; font-weight: bold; border: 2px solid #000; }
        .timestamp { background: #f1f5f9; font-style: italic; color: #475569; border: 2px solid #000; }
        
        .column-header { background: #f8fafc; font-weight: bold; border: 2px solid #000; font-size: 11px; text-transform: uppercase; }
        .district-cell { text-align: left; font-weight: bold; border: 1px solid #000; padding-left: 10px; }
        
        .grand-total { background: #000; color: white; font-weight: bold; border: 2px solid #000; font-size: 12px; }
        
        .numeric-val { mso-number-format:"\#\,\#\#0"; }
      </style>
    `;

    // 2. Build HTML Table
    let tableHtml = `
      <table border="1">
        <tr>
          <th colspan="7" class="title-header">
            DISTRICT-WISE STATUS AUDIT: SUPER SEEDER DEPLOYMENT
          </th>
        </tr>
        <tr>
          <th colspan="7" class="timestamp">
            Regional Pulse Report Generated: ${new Date().toLocaleString()}
          </th>
        </tr>
        <tr>
          <th class="column-header">Sr. No.</th>
          <th class="column-header">District</th>
          <th class="column-header">Super Seeders Booked</th>
          <th class="column-header">QIC Done</th>
          <th class="column-header">DIC Done</th>
          <th class="column-header">Bills Pending</th>
          <th class="column-header">SS Bills Pending</th>
        </tr>
    `;

    // 3. Add Data Body
    this.allData.forEach((item, index) => {
      tableHtml += `
        <tr>
          <td>${index + 1}</td>
          <td class="district-cell">${item.district}</td>
          <td class="numeric-val">${item.booked}</td>
          <td class="numeric-val">${item.qicDone}</td>
          <td class="numeric-val">${item.dicDone}</td>
          <td class="numeric-val">${item.billsPending}</td>
          <td class="numeric-val">${item.superSeederBillsPending}</td>
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
        <td class="grand-total numeric-val">${this.totalBillsPending}</td>
        <td class="grand-total numeric-val">${this.totalSSBillsPending}</td>
      </tr>
    </table>
    `;

    // 5. Final Assembly and Export
    const fullHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>District Performance</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        ${css}
        </head>
        <body>${tableHtml}</body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `District_Pulse_Report_${new Date().getTime()}.xls`;
    link.click();
  }
}
