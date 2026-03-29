import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Machinery } from '../../models/machinery.model';

@Component({
  selector: 'app-machinery-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <mat-card class="machinery-card">
      <div class="card-header">
        <div class="title-section">
          <h2 class="machine-title">{{ machine().title }}</h2>
          <p class="machine-desc">{{ machine().description }}</p>
        </div>
        <div class="image-count-badge">
          <mat-icon>image</mat-icon>
          <span>4 Photos</span>
        </div>
      </div>

      <div class="tags-row">
        <div class="rating-badge">
          <mat-icon class="star-icon">star</mat-icon>
          <span>{{ machine().rating.toFixed(1) }}</span>
        </div>
        <div class="chip chip-imported" *ngIf="machine().imported">
          <mat-icon>public</mat-icon>
          <span>Imported</span>
        </div>
        <div class="chip chip-crop" *ngIf="machine().crop">
          <mat-icon>eco</mat-icon>
          <span>{{ machine().crop }}</span>
        </div>
      </div>

      <div class="pricing-container">
        <div class="price-row">
          <mat-icon class="price-icon">payments</mat-icon>
          <span class="price-label">Daily Rent:</span>
          <span class="price-value">PKR {{ machine().rentPerHour * 8 }}/day</span>
        </div>
        <div class="price-row secondary">
           <span class="price-label">Hourly: PKR {{ machine().rentPerHour }}</span>
           <span class="dot">·</span>
           <span class="price-label">Fuel: PKR {{ machine().fuelPerKm }}/km</span>
        </div>
      </div>

      <div class="info-badges">
        <div class="badge badge-distance">
          <mat-icon>near_me</mat-icon>
          <span>{{ machine().distanceKm }} km</span>
        </div>
        <div class="badge badge-city">
          <mat-icon>place</mat-icon>
          <span>{{ machine().city }}</span>
        </div>
        <div class="badge-firm">
          <mat-icon>verified</mat-icon>
          <span>{{ machine().firmName }}</span>
        </div>
      </div>

      <div class="actions-row">
        <button mat-flat-button color="primary" class="book-btn" (click)="onBook.emit(machine())">
          Rent Now
        </button>
        <div class="icon-actions">
           <button mat-icon-button class="sub-action">
             <mat-icon>call</mat-icon>
           </button>
           <button mat-icon-button class="sub-action">
             <mat-icon>ios_share</mat-icon>
           </button>
        </div>
      </div>
    </mat-card>
  `,
  styles: [`
    .machinery-card {
      padding: 32px;
      border-radius: 28px;
      border: 1px solid #f0f0f0;
      background: white;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      &:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
        border-color: #4CAF50;
      }
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .machine-title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #1b5e20;
    }
    .machine-desc {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: #616161;
      line-height: 1.4;
    }
    .image-count-badge {
      background: #f1f8e9;
      color: #4CAF50;
      padding: 6px 10px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .tags-row {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .rating-badge {
      background: #fff8e1;
      color: #f57c00;
      padding: 4px 10px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 700;
      .star-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .chip {
      padding: 4px 12px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .chip-imported { background: #e3f2fd; color: #1976d2; }
    .chip-crop { background: #f3e5f5; color: #7b1fa2; }
    
    .pricing-container {
      background: #f8fafb;
      border: 1px solid #edf2f7;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .price-row {
      display: flex;
      align-items: center;
      gap: 8px;
      &.secondary { 
        margin-top: 4px; 
        font-size: 12px; 
        color: #718096; 
        .dot { margin: 0 4px; color: #cbd5e0; }
      }
    }
    .price-icon { color: #4CAF50; font-size: 22px; width: 22px; height: 22px; }
    .price-label { font-size: 14px; font-weight: 500; }
    .price-value { font-size: 18px; color: #2e7d32; font-weight: 800; }

    .info-badges {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      align-items: center;
    }
    .badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #4a5568;
      font-weight: 500;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #718096; }
    }
    .badge-distance { color: #2e7d32; font-weight: 700; mat-icon { color: #2e7d32; } }
    .badge-firm {
       display: flex;
       align-items: center;
       gap: 4px;
       font-size: 13px;
       color: #2D3748;
       background: #EDF2F7;
       padding: 4px 10px;
       border-radius: 8px;
       font-weight: 600;
       mat-icon { font-size: 16px; width: 16px; height: 16px; color: #4CAF50; }
    }

    .actions-row {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .book-btn {
      flex: 1;
      border-radius: 14px;
      height: 56px;
      font-size: 17px;
      font-weight: 700;
      background-color: #4CAF50 !important;
      letter-spacing: 0.5px;
    }
    .icon-actions {
       display: flex;
       gap: 8px;
    }
    .sub-action {
      background: #f1f8e9;
      color: #4CAF50;
      border-radius: 10px;
    }
  `]
})
export class MachineryCardComponent {
  machine = input.required<Machinery>();
  onBook = output<Machinery>();
}
