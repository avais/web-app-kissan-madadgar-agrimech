import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatTableModule],
  template: `
    <div class="dashboard-container">
      <header class="portal-header">
        <div class="welcome">
          <h1>Welcome to Punjab<span>CleanAir</span> Portal</h1>
          <p>Dedicated environmental governance and emission control monitoring.</p>
        </div>
        <div class="actions">
          <button mat-stroked-button color="warn" (click)="logout()">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </div>
      </header>

      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="icon-box green">
              <mat-icon>eco</mat-icon>
            </div>
            <div class="info">
              <span class="label">Total Bookings</span>
              <span class="value">124</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="icon-box blue">
              <mat-icon>payments</mat-icon>
            </div>
            <div class="info">
              <span class="label">Total Spent</span>
              <span class="value">PKR 45,200</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="icon-box orange">
              <mat-icon>timer</mat-icon>
            </div>
            <div class="info">
              <span class="label">Hours Used</span>
              <span class="value">86.5 hrs</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="icon-box purple">
              <mat-icon>verified</mat-icon>
            </div>
            <div class="info">
              <span class="label">Status</span>
              <span class="value">Verified</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="active-rentals">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Recent Activities</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="recentActivities" class="w-full">
              <ng-container matColumnDef="machine">
                <th mat-header-cell *matHeaderCellDef [style.width.%]="40"> Machinery </th>
                <td mat-cell *matCellDef="let entry" [style.width.%]="40"> {{entry.machine}} </td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef> Date </th>
                <td mat-cell *matCellDef="let entry"> {{entry.date}} </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef> Status </th>
                <td mat-cell *matCellDef="let entry"> 
                  <span class="status-badge" [ngClass]="entry.status.toLowerCase()">
                    {{entry.status}}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let entry; columns: displayedColumns;"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 40px;
      background: var(--bg-color);
      min-height: calc(100vh - 80px);
    }

    .portal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;

      h1 { 
        font-size: 32px; 
        font-weight: 800; 
        color: #1e293b;
        margin: 0;
        span { color: #4CAF50; }
      }
      p { color: #64748b; margin-top: 5px; }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }

    .stat-card {
      border-radius: 16px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      background: var(--card-bg);
      
      mat-card-content {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 24px !important;
      }
    }

    .icon-box {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
      
      &.green { background: #ecfdf5; color: #10b981; }
      &.blue { background: #eff6ff; color: #3b82f6; }
      &.orange { background: #fff7ed; color: #f59e0b; }
      &.purple { background: #faf5ff; color: #a855f7; }
    }

    .info {
      display: flex;
      flex-direction: column;
      .label { color: #64748b; font-size: 14px; font-weight: 500; }
      .value { color: #1e293b; font-size: 24px; font-weight: 800; }
    }

    .active-rentals {
      mat-card { 
        border-radius: 16px; 
        border: 1px solid var(--border-color); 
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        background: var(--card-bg);
      }
      mat-card-title { font-weight: 800; color: #1e293b; margin-bottom: 20px; }
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      
      &.completed { background: #ecfdf5; color: #065f46; }
      &.pending { background: #fff7ed; color: #92400e; }
      &.active { background: #eff6ff; color: #1e40af; }
    }

    .w-full { width: 100%; }

    @media (max-width: 768px) {
      .dashboard-container { padding: 20px; }
      .portal-header { flex-direction: column; align-items: flex-start; gap: 20px; }
    }
  `]
})
export class DashboardComponent {
  private authService = inject(AuthService);

  displayedColumns: string[] = ['machine', 'date', 'status'];
  recentActivities = [
    { machine: 'Laser Land Leveler - Model X80', date: '2026-02-12', status: 'Completed' },
    { machine: 'Wheat Seed Grader Cum Cleaner', date: '2026-02-10', status: 'Completed' },
    { machine: 'Combine Harvester (Rice)', date: '2026-02-15', status: 'Active' },
    { machine: 'Rotavator Heavy Duty', date: '2026-02-18', status: 'Pending' }
  ];

  logout() {
    this.authService.logout();
  }
}
