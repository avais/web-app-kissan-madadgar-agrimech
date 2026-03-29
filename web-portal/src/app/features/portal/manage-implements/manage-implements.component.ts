import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ImplementService } from '../../../core/services/implement.service';
import { Implement } from '../../../core/models/implement.model';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-manage-implements',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div class="manage-container">
      <!-- High-end Loader -->
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Inventory Sync</h3>
            <p>Gathering implement specifications and pricing...</p>
          </div>
        </div>
      </div>
      <div class="header-section">
        <h1 class="page-title">Manage Implements</h1>
        <button mat-raised-button color="primary" routerLink="create">
          <mat-icon>add</mat-icon>
          Add New Implement
        </button>
      </div>

      <mat-card class="table-card">
        <table mat-table [dataSource]="implements()">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef> Name </th>
            <td mat-cell *matCellDef="let element"> {{element.name}} </td>
          </ng-container>

          <ng-container matColumnDef="cost">
            <th mat-header-cell *matHeaderCellDef> Cost Price </th>
            <td mat-cell *matCellDef="let element"> Rs. {{element.totalCostPrice | number:'1.0-0'}} </td>
          </ng-container>

          <ng-container matColumnDef="subsidy">
            <th mat-header-cell *matHeaderCellDef> Subsidy (%) </th>
            <td mat-cell *matCellDef="let element"> {{element.subsidyPercentage}}% </td>
          </ng-container>

          <ng-container matColumnDef="govShare">
            <th mat-header-cell *matHeaderCellDef> Gov Share </th>
            <td mat-cell *matCellDef="let element"> Rs. {{element.governmentShare | number:'1.0-0'}} </td>
          </ng-container>

          <ng-container matColumnDef="farmerShare">
            <th mat-header-cell *matHeaderCellDef> Farmer Share </th>
            <td mat-cell *matCellDef="let element"> Rs. {{element.farmerShare | number:'1.0-0'}} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button color="primary" [routerLink]="['edit', element.id]" title="Edit">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteImplement(element.id)" title="Delete">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div *ngIf="implements().length === 0" class="empty-state">
          No implements found. Add some to get started.
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .manage-container {
      position: relative;
      padding: 24px;
      min-height: 400px;
    }
    .loader-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      .loader-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        text-align: center;
        .loader-text {
          h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }
          p { color: #64748b; font-size: 14px; margin: 4px 0 0; }
        }
      }
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
      color: #333;
    }
    .table-card {
      padding: 0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border-radius: 12px;
    }
    table {
      width: 100%;
    }
    .empty-state {
      padding: 48px;
      text-align: center;
      color: #666;
      font-style: italic;
    }
    tr.mat-mdc-header-row {
      background-color: #f8f9fa;
    }
    .mat-mdc-cell {
      padding: 16px 24px;
    }
  `]
})
export class ManageImplementsComponent implements OnInit {
  private implementService = inject(ImplementService);

  implements = signal<Implement[]>([]);
  isLoading = signal(false);
  displayedColumns: string[] = ['name', 'cost', 'subsidy', 'govShare', 'farmerShare', 'actions'];

  ngOnInit() {
    this.loadImplements();
  }

  loadImplements() {
    this.isLoading.set(true);
    this.implementService.getAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(data => {
        this.implements.set(data);
      });
  }

  deleteImplement(id: number) {
    if (confirm('Are you sure you want to delete this implement?')) {
      this.isLoading.set(true);
      this.implementService.delete(id)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe(() => {
          this.loadImplements();
        });
    }
  }
}
