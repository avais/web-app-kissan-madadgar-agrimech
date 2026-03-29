import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
    selector: 'app-reporting',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule],
    template: `
    <div class="reporting">
      <div class="header">
        <div class="title-section">
          <h1>Analytics & Reporting</h1>
          <p>Global insights into agriculture patterns and portal performance.</p>
        </div>
        <div class="actions">
          <button mat-flat-button color="primary">
            <mat-icon>assessment</mat-icon> Generate Monthly Report
          </button>
        </div>
      </div>

      <div class="metrics-row">
        <mat-card class="metric-card">
          <h4>Registration Growth</h4>
          <div class="value">85%</div>
          <mat-progress-bar mode="determinate" value="85" color="primary"></mat-progress-bar>
          <p class="hint">Target: 100% capacity in Punjab Districts</p>
        </mat-card>

        <mat-card class="metric-card">
          <h4>Machinery Utilization</h4>
          <div class="value">62%</div>
          <mat-progress-bar mode="determinate" value="62" color="accent"></mat-progress-bar>
          <p class="hint">Peak expected during Wheat harvest</p>
        </mat-card>

        <mat-card class="metric-card">
          <h4>Farmer Satisfaction</h4>
          <div class="value">4.8/5</div>
          <div class="rating-stars">
            <mat-icon *ngFor="let i of [1,2,3,4,5]">star</mat-icon>
          </div>
          <p class="hint">Based on 2,500+ localized reviews</p>
        </mat-card>
      </div>

      <div class="charts-placeholder">
        <mat-card class="chart-box">
          <div class="chart-header">
             <h3>Revenue vs Subsidy Disbursement</h3>
             <mat-icon>more_vert</mat-icon>
          </div>
          <div class="dummy-chart bar-chart">
            <div class="bar" style="height: 40%"></div>
            <div class="bar" style="height: 70%"></div>
            <div class="bar" style="height: 55%"></div>
            <div class="bar" style="height: 90%"></div>
            <div class="bar" style="height: 65%"></div>
            <div class="bar" style="height: 80%"></div>
            <div class="bar" style="height: 45%"></div>
          </div>
          <div class="labels">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
          </div>
        </mat-card>

        <mat-card class="chart-box">
          <div class="chart-header">
             <h3>Popular Machinery Categories</h3>
          </div>
          <div class="category-list">
             <div class="cat-item" *ngFor="let cat of categories">
                <span class="label">{{cat.name}}</span>
                <div class="bar-container">
                   <div class="inner-bar" [style.width.%]="cat.percent"></div>
                </div>
                <span class="val">{{cat.percent}}%</span>
             </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
    styles: [`
    .reporting { display: flex; flex-direction: column; gap: 32px; }
    
    .header {
      display: flex; justify-content: space-between; align-items: flex-end;
      h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; }
      p { font-size: 15px; color: #64748b; margin: 4px 0 0; }
      button { border-radius: 12px; height: 48px; font-weight: 700; background-color: #4CAF50 !important; }
    }

    .metrics-row {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
    }

    .metric-card {
      padding: 24px; border: none; border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);
      h4 { font-size: 13px; font-weight: 700; color: #94a3b8; margin: 0 0 12px; text-transform: uppercase; }
      .value { font-size: 32px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
      mat-progress-bar { height: 8px; border-radius: 4px; margin-bottom: 12px; }
      .hint { font-size: 12px; color: #64748b; margin: 0; }
      .rating-stars { color: #f59e0b; margin-bottom: 12px; mat-icon { font-size: 20px; width: 20px; height: 20px; } }
    }

    .charts-placeholder { display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; }
    .chart-box { 
      padding: 24px; border: none; border-radius: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);
      .chart-header { display: flex; justify-content: space-between; margin-bottom: 30px; h3 { font-size: 16px; font-weight: 800; margin: 0; } }
    }

    .dummy-chart { 
      height: 200px; display: flex; align-items: flex-end; justify-content: space-between; padding: 0 20px;
      .bar { width: 40px; background: #4CAF50; border-radius: 8px 8px 0 0; }
    }
    .labels { display: flex; justify-content: space-between; padding: 12px 20px 0; font-size: 11px; color: #94a3b8; }

    .category-list { display: flex; flex-direction: column; gap: 20px; }
    .cat-item { display: flex; align-items: center; gap: 12px;
      .label { width: 100px; font-size: 13px; font-weight: 600; color: #475569; }
      .bar-container { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;
        .inner-bar { height: 100%; background: #4CAF50; border-radius: 4px; }
      }
      .val { width: 40px; font-size: 12px; font-weight: 700; color: #1e293b; text-align: right; }
    }

    @media (max-width: 991px) {
      .metrics-row { grid-template-columns: 1fr; }
      .charts-placeholder { grid-template-columns: 1fr; }
    }
  `]
})
export class ReportingComponent {
    categories = [
        { name: 'Tractors', percent: 84 },
        { name: 'Harvesters', percent: 62 },
        { name: 'Levelers', percent: 45 },
        { name: 'Plows', percent: 38 },
    ];
}
