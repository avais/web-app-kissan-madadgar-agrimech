import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterModule } from '@angular/router';
import { BallotingService, BallotingRecord } from '../../../core/services/balloting.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-manage-balloting',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatPaginatorModule
  ],
  template: `
    <div class="page-container">
      <div class="dashboard-header">
        <div class="header-content">
          <div class="title-badge">COMPUTERIZED SELECTION</div>
          <h1>Balloting</h1>
          <p>Transparent and automated selection of beneficiaries for agricultural implement subsidies.</p>
        </div>
        <div class="header-actions">
          <button mat-flat-button class="premium-btn primary" routerLink="/portal/balloting/process">
            <mat-icon>auto_awesome</mat-icon> Execute New Balloting
          </button>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon balloting"><mat-icon>casino</mat-icon></div>
          <div class="stat-data">
            <span class="label">Total Processes</span>
            <span class="value">{{ totalElements() }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon beneficiaries"><mat-icon>people</mat-icon></div>
          <div class="stat-data">
            <span class="label">Total Beneficiaries</span>
            <span class="value">{{ totalBeneficiariesCount() }}</span>
          </div>
        </div>
      </div>

      <!-- Search and Filter -->
      <div class="action-bar">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search by year or category..." (input)="onSearch($event)">
        </div>
      </div>

      <!-- Listing Table -->
      <div class="table-container">
        <mat-progress-bar *ngIf="isLoading()" mode="indeterminate" color="accent" class="table-loader"></mat-progress-bar>
        
        <mat-card class="premium-table-card">
          <table mat-table [dataSource]="dataSource()" class="mat-elevation-z0">
            
            <ng-container matColumnDef="year">
              <th mat-header-cell *matHeaderCellDef> Balloting Year </th>
              <td mat-cell *matCellDef="let record"> 
                <div class="year-cell">
                  <strong>{{record.ballotingYear}}</strong>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef> Category </th>
              <td mat-cell *matCellDef="let record">
                <mat-chip class="category-chip">{{record.category}}</mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="beneficiaries">
              <th mat-header-cell *matHeaderCellDef> Beneficiaries </th>
              <td mat-cell *matCellDef="let record">
                <div class="count-cell">
                  <mat-icon>groups</mat-icon>
                  <span>{{record.totalBeneficiaries}} Units</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdBy">
              <th mat-header-cell *matHeaderCellDef> Created By </th>
              <td mat-cell *matCellDef="let record">
                <div class="user-cell">
                  <mat-icon>account_circle</mat-icon>
                  <span>{{record.createdBy || 'SYSTEM'}}</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef> Timestamp </th>
              <td mat-cell *matCellDef="let record">
                <div class="date-cell">
                  <span class="date">{{record.createdAt | date:'mediumDate'}}</span>
                  <span class="time">{{record.createdAt | date:'shortTime'}}</span>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row class="premium-row" *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div class="empty-state" *ngIf="!isLoading() && dataSource().length === 0">
            <mat-icon>history_toggle_off</mat-icon>
            <p>No balloting records found in current fiscal window.</p>
          </div>

          <mat-paginator [length]="totalElements()"
                        [pageSize]="pageSize()"
                        [pageSizeOptions]="[5, 10, 25, 100]"
                        (page)="onPageChange($event)"
                        label="Records per page">
          </mat-paginator>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 40px; background: #fdfbf7; min-height: 100vh; }

    .dashboard-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;
      .header-content {
        .title-badge { font-size: 10px; font-weight: 800; color: #10b981; letter-spacing: 2px; margin-bottom: 8px; }
        h1 { margin: 0; font-size: 36px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
        p { margin: 8px 0 0; color: #64748b; font-size: 16px; font-weight: 500; }
      }
    }

    .premium-btn {
      height: 48px; padding: 0 28px; border-radius: 14px; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 10px;
      &.primary { background: #10b981 !important; color: white !important; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3); }
    }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .stat-card {
      background: white; border-radius: 24px; padding: 24px; display: flex; align-items: center; gap: 20px;
      border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.02);
      .stat-icon {
        width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
        mat-icon { font-size: 28px; width: 28px; height: 28px; }
        &.balloting { background: #10b98115; color: #10b981; }
        &.beneficiaries { background: #3b82f615; color: #3b82f6; }
      }
      .stat-data { 
        .label { display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { display: block; font-size: 24px; font-weight: 900; color: #0f172a; }
      }
    }

    .action-bar { margin-bottom: 24px; }
    .search-box {
      background: white; border-radius: 16px; padding: 0 20px; display: flex; align-items: center; gap: 12px;
      border: 1px solid #f1f5f9; width: 400px; height: 48px;
      mat-icon { color: #94a3b8; font-size: 20px; width: 20px; height: 20px; }
      input { border: none; outline: none; width: 100%; font-size: 14px; font-weight: 600; color: #475569; &::placeholder { color: #cbd5e1; } }
    }

    .premium-table-card { 
      border: none; border-radius: 28px; background: transparent !important; box-shadow: none !important;
    }
    table { width: 100%; border-collapse: separate; border-spacing: 0 16px; background: transparent; margin-top: -16px; }
    th { padding: 12px 24px !important; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border: none !important; }
    td { 
      padding: 20px 24px !important; background: white; border: none !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      &:first-child { border-radius: 20px 0 0 20px; border-left: 1px solid #f1f5f9 !important; }
      &:last-child { border-radius: 0 20px 20px 0; border-right: 1px solid #f1f5f9 !important; }
      border-top: 1px solid #f1f5f9 !important; border-bottom: 1px solid #f1f5f9 !important;
    }

    .premium-row { cursor: pointer; transition: all 0.3s; &:hover td { background: #fdfbf7; transform: translateY(-2px); box-shadow: 0 10px 20px -10px rgba(0,0,0,0.05); } }

    .category-chip { background: #f1f5f9 !important; color: #475569 !important; font-weight: 700; font-size: 12px; height: 28px; border-radius: 8px; border: 1px solid #e2e8f0; }
    
    .count-cell, .user-cell { display: flex; align-items: center; gap: 8px; color: #1e293b; font-weight: 600; mat-icon { font-size: 18px; width: 18px; height: 18px; color: #94a3b8; } }

    .date-cell {
      .date { display: block; font-size: 14px; font-weight: 700; color: #1e293b; }
      .time { display: block; font-size: 11px; color: #94a3b8; font-weight: 600; }
    }

    .empty-state { text-align: center; padding: 60px; color: #94a3b8; mat-icon { font-size: 48px; width: 48px; height: 48px; } p { font-weight: 600; margin-top: 16px; } }
    
    .table-loader { position: absolute; top: 0; left: 0; right: 0; border-radius: 2px; }
  `]
})
export class ManageBallotingComponent implements OnInit {
  private ballotingService = inject(BallotingService);

  dataSource = signal<BallotingRecord[]>([]);
  totalElements = signal(0);
  totalBeneficiariesCount = signal(0);
  isLoading = signal(true);
  pageSize = signal(10);
  currentPage = signal(0);
  searchQuery = signal('');

  displayedColumns: string[] = ['year', 'category', 'beneficiaries', 'createdBy', 'createdAt'];

  ngOnInit() {
    this.loadRecords();
  }

  loadRecords() {
    this.isLoading.set(true);
    this.ballotingService.list(this.searchQuery(), this.currentPage(), this.pageSize())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data: any) => {
          this.dataSource.set(data.content);
          this.totalElements.set(data.totalElements);
          this.calculateStats(data.content);
        }
      });
  }

  calculateStats(records: BallotingRecord[]) {
    // In a real app, this would come from a summary endpoint
    const total = records.reduce((sum, r) => sum + r.totalBeneficiaries, 0);
    this.totalBeneficiariesCount.set(total);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.currentPage.set(0);
    this.loadRecords();
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex);
    this.loadRecords();
  }
}
