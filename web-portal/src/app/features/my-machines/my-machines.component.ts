import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { RentalService, Rental } from '../../core/services/rental.service';

@Component({
    selector: 'app-my-machines',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatTabsModule, MatChipsModule],
    template: `
    <div class="my-machines-dashboard">
      <header class="dashboard-header">
        <div class="content-wrapper">
          <div class="header-info">
            <h1>My Machinery Rentals</h1>
            <p>Track your active bookings, rental history, and upcoming farm service requests.</p>
          </div>
          <div class="header-stats">
            <div class="stat-card">
              <span class="label">Total Spent</span>
              <span class="value">PKR 30.9k</span>
            </div>
          </div>
        </div>
      </header>

      <div class="dashboard-content content-wrapper">
        <mat-tab-group (selectedTabChange)="selectedTab.set($event.index)" class="custom-tabs">
          <mat-tab label="Current & Upcoming">
            <div class="rental-list">
              @for (rental of currentRentals(); track rental.id) {
                <div class="rental-card">
                  <div class="rental-image">
                    <img [src]="rental.imageUrl" [alt]="rental.machineTitle">
                  </div>
                  <div class="rental-info">
                    <div class="rental-header">
                      <h3>{{ rental.machineTitle }}</h3>
                      <span class="status-badge" [class]="rental.status.toLowerCase()">{{ rental.status }}</span>
                    </div>
                    <p class="firm">{{ rental.firmName }}</p>
                    <div class="dates">
                      <div class="date-item">
                        <mat-icon>calendar_today</mat-icon>
                        <span>From: {{ rental.startDate }}</span>
                      </div>
                      <div class="date-item">
                        <mat-icon>event</mat-icon>
                        <span>To: {{ rental.endDate }}</span>
                      </div>
                    </div>
                    <div class="rental-footer">
                      <div class="cost">
                        <span class="cost-label">Total Cost:</span>
                        <span class="cost-value">PKR {{ rental.totalCost }}</span>
                      </div>
                      <div class="actions">
                        <button mat-stroked-button color="primary">View Details</button>
                        <button mat-button color="warn" *ngIf="rental.status === 'Pending'">Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="empty-state">
                  <mat-icon>agriculture</mat-icon>
                  <p>No active rentals at the moment.</p>
                  <button mat-flat-button color="primary">Browse Machinery</button>
                </div>
              }
            </div>
          </mat-tab>

          <mat-tab label="History">
            <div class="rental-list">
              @for (rental of historyRentals(); track rental.id) {
                <div class="rental-card history">
                  <div class="rental-image">
                    <img [src]="rental.imageUrl" [alt]="rental.machineTitle">
                  </div>
                  <div class="rental-info">
                    <div class="rental-header">
                      <h3>{{ rental.machineTitle }}</h3>
                      <span class="status-badge completed">{{ rental.status }}</span>
                    </div>
                    <p class="firm">{{ rental.firmName }}</p>
                    <div class="rental-footer">
                      <span class="cost-value">PKR {{ rental.totalCost }}</span>
                      <button mat-stroked-button>Book Again</button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
    styles: [`
    .my-machines-dashboard {
      background: #f8fafc;
      min-height: calc(100vh - 64px);
    }
    .content-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .dashboard-header {
      background: #1B5E20;
      color: white;
      padding: 40px 0;
      .content-wrapper { display: flex; justify-content: space-between; align-items: center; }
      h1 { font-size: 28px; font-weight: 800; margin: 0 0 8px; }
      p { opacity: 0.9; font-size: 16px; margin: 0; }
    }

    .stat-card {
      background: rgba(255,255,255,0.1);
      padding: 16px 24px;
      border-radius: 16px;
      backdrop-filter: blur(10px);
      text-align: right;
      .label { display: block; font-size: 12px; text-transform: uppercase; font-weight: 700; opacity: 0.8; margin-bottom: 4px; }
      .value { font-size: 24px; font-weight: 800; }
    }

    .dashboard-content {
      padding-top: 32px;
      padding-bottom: 60px;
    }

    ::ng_deep .custom-tabs {
      .mat-mdc-tab-header { margin-bottom: 32px; }
      .mat-mdc-tab-labels { gap: 24px; }
      .mat-mdc-tab { height: 48px; border-radius: 24px; }
    }

    .rental-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .rental-card {
      background: white;
      border-radius: 20px;
      padding: 24px;
      display: flex;
      gap: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #edf2f7;
      
      &.history { opacity: 0.8; filter: grayscale(0.2); }
    }

    .rental-image {
      width: 140px;
      height: 140px;
      border-radius: 16px;
      overflow: hidden;
      flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .rental-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .rental-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
      h3 { margin: 0; font-size: 20px; font-weight: 700; color: #1a202c; }
    }

    .firm { font-size: 14px; color: #718096; margin-bottom: 16px; }

    .status-badge {
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      &.current { background: #e8f5e9; color: #2e7d32; }
      &.pending { background: #fff3e0; color: #ef6c00; }
      &.completed { background: #f5f5f5; color: #616161; }
    }

    .dates {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
      .date-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #4a5568;
        mat-icon { font-size: 18px; width: 18px; height: 18px; color: #2e7d32; }
      }
    }

    .rental-footer {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid #edf2f7;
      display: flex;
      justify-content: space-between;
      align-items: center;
      .cost { display: flex; align-items: baseline; gap: 8px; }
      .cost-label { font-size: 12px; color: #718096; font-weight: 600; }
      .cost-value { font-size: 20px; font-weight: 800; color: #2e7d32; }
      .actions { display: flex; gap: 12px; }
    }

    .empty-state {
      text-align: center;
      padding: 60px 0;
      background: white;
      border-radius: 20px;
      border: 2px dashed #e2e8f0;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: #cbd5e0; margin-bottom: 16px; }
      p { font-size: 18px; color: #718096; margin-bottom: 24px; }
      button { padding: 0 40px; height: 48px; border-radius: 24px; font-weight: 700; }
    }

    @media (max-width: 768px) {
      .dashboard-header {
        .content-wrapper { flex-direction: column; text-align: center; }
        .header-stats { margin-top: 24px; }
      }
      .rental-card { flex-direction: column; padding: 16px; }
      .rental-image { width: 100%; height: 180px; }
      .rental-footer { flex-direction: column; gap: 16px; align-items: stretch; text-align: center; }
    }
  `]
})
export class MyMachinesComponent {
    private rentalService = inject(RentalService);

    selectedTab = signal(0);

    allRentals = this.rentalService.rentals;

    currentRentals = computed(() =>
        this.allRentals().filter(r => r.status === 'Current' || r.status === 'Pending')
    );

    historyRentals = computed(() =>
        this.allRentals().filter(r => r.status === 'Completed' || r.status === 'Cancelled')
    );
}
