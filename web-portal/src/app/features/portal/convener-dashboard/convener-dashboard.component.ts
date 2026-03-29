import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { InspectionQICReportService } from '../../../core/services/inspection-qic-report.service';
import { FirmService } from '../../../core/services/firm.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-convener-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="convener-dashboard">
      <!-- Background Elements -->
      <div class="bg-glow-1"></div>
      <div class="bg-glow-2"></div>

      <div class="dashboard-header">
        <div class="header-content">
          <h1>Convener <span>Dashboard</span></h1>
          <p>Portfolio overview and quality inspection management</p>
        </div>
        <div class="header-actions">
           <button class="action-btn blur-btn">
              <mat-icon>notifications</mat-icon>
           </button>
           <button class="action-btn profile-btn">
              <span class="initials">{{userInitials}}</span>
           </button>
        </div>
      </div>

      <div class="stats-row">
        <div class="glass-stat" *ngFor="let stat of stats">
          <div class="stat-icon-wrapper" [style.background]="stat.color">
            <mat-icon>{{stat.icon}}</mat-icon>
            <div class="icon-pulse" [style.background]="stat.color"></div>
          </div>
          <div class="stat-details">
            <span class="stat-label">{{stat.label}}</span>
            <div class="stat-main">
              <h3 class="stat-value">{{stat.value}}</h3>
              <div class="stat-trend" [class.up]="stat.trendUp">
                <mat-icon>{{stat.trendUp ? 'north_east' : 'south_west'}}</mat-icon>
                <span>{{stat.trend}}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid-layout">
        <div class="primary-visual">
          <div class="glass-container map-wrapper">
            <div class="container-header">
              <div class="header-text">
                <h3>Regional Distribution</h3>
                <p>Firm density and inspection status across districts</p>
              </div>
              <div class="header-actions">
                <div class="status-dot-active">Live System</div>
              </div>
            </div>
            <div id="convener-map" class="future-map"></div>
            <div class="map-overlay-stats">
              <div class="overlay-item">
                <span class="o-label">Managed Firms</span>
                <span class="o-val">{{stats[0].value}}</span>
              </div>
              <div class="o-divider"></div>
              <div class="overlay-item">
                <span class="o-label">Active Nodes</span>
                <span class="o-val">842</span>
              </div>
            </div>
          </div>
        </div>

        <div class="secondary-visual">
          <div class="glass-container feed-wrapper">
            <div class="container-header">
              <div class="header-text">
                <h3>Real-time Activity Feed</h3>
                <p>Recent QIC requests and updates</p>
              </div>
            </div>
            <div class="activity-scroll">
              <div class="activity-card" *ngFor="let activity of activities; let i = index">
                <div class="activity-indicator" [class.new]="i < 2"></div>
                <div class="activity-avatar" [style.background]="activity.avatarColor">
                   {{activity.firm.charAt(0)}}
                </div>
                <div class="activity-info">
                  <div class="info-top">
                    <span class="activity-name">{{activity.firm}}</span>
                    <span class="activity-time">{{activity.time}}</span>
                  </div>
                  <div class="info-bottom">
                    <span class="activity-desc">
                      <mat-icon>assignment</mat-icon> {{activity.type}}
                    </span>
                    <span class="activity-status" [class]="activity.status.toLowerCase()">
                      {{activity.status}}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button class="view-all-btn" (click)="navigateToRequests()">
              Manage All Requests <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .convener-dashboard { 
      position: relative;
      display: flex; flex-direction: column; gap: 32px; 
      padding: 32px;
      color: #e2e8f0;
      min-height: calc(100vh - 64px);
      background: #0d1117; /* Very deep dark */
      border-radius: 24px;
      overflow: hidden;
      font-family: 'Outfit', sans-serif;
    }

    /* Background Glows */
    .bg-glow-1 { position: absolute; top: -100px; right: -100px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%); filter: blur(80px); z-index: 1; }
    .bg-glow-2 { position: absolute; bottom: -100px; left: -100px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%); filter: blur(80px); z-index: 1; }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
      
      h1 { 
        font-size: 32px; font-weight: 800; color: white; margin: 0; 
        span { color: #10b981; }
      }
      p { font-size: 16px; color: #94a3b8; margin: 4px 0 0; }
    }

    .header-actions {
      display: flex; gap: 16px; align-items: center;
      
      .action-btn {
        width: 48px; height: 48px; border-radius: 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white; display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.3s;
        
        &:hover { background: rgba(255, 255, 255, 0.1); transform: translateY(-2px); }
      }
      
      .profile-btn {
        background: linear-gradient(135deg, #10b981, #3b82f6);
        border: none;
        .initials { font-weight: 800; }
      }
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
      z-index: 2;
    }

    .glass-stat {
      background: rgba(22, 27, 34, 0.6);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      transition: all 0.4s ease;
      
      &:hover {
        transform: translateY(-8px);
        border-color: rgba(16, 185, 129, 0.3);
        box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
      }
    }

    .stat-icon-wrapper {
      position: relative;
      width: 52px; height: 52px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      color: white;
      
      mat-icon { font-size: 24px; width: 24px; height: 24px; z-index: 2; }
      
      .icon-pulse {
        position: absolute; width: 100%; height: 100%; border-radius: 14px;
        opacity: 0.2; animation: pulse 2s infinite;
      }
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.4; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    .stat-details {
      flex: 1;
      .stat-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
      .stat-main {
        display: flex; align-items: baseline; justify-content: space-between; margin-top: 4px;
        .stat-value { font-size: 26px; font-weight: 800; color: white; margin: 0; }
        .stat-trend {
          display: flex; align-items: center; gap: 2px; font-size: 12px; font-weight: 700;
          mat-icon { font-size: 14px; width: 14px; height: 14px; }
          &.up { color: #10b981; }
          &.down { color: #f43f5e; }
        }
      }
    }

    .grid-layout {
      display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px;
      z-index: 2;
    }

    .glass-container {
      background: rgba(22, 27, 34, 0.4);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      overflow: hidden;
      display: flex; flex-direction: column;
    }

    .container-header {
      padding: 24px;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      
      h3 { font-size: 18px; font-weight: 700; color: white; margin: 0; }
      p { font-size: 13px; color: #64748b; margin: 2px 0 0; }
      
      .status-dot-active {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 12px; border-radius: 20px; background: rgba(16, 185, 129, 0.1);
        color: #10b981; font-size: 10px; font-weight: 800; text-transform: uppercase;
        &::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: blink 1.5s infinite; }
      }
    }

    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    .map-wrapper { position: relative; height: 520px; }
    .future-map { flex: 1; width: 100%; }
    
    .map-overlay-stats {
      position: absolute; bottom: 20px; left: 20px; z-index: 1000;
      background: rgba(13, 17, 23, 0.9); backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;
      display: flex; padding: 12px 18px; gap: 16px;
      
      .overlay-item {
        display: flex; flex-direction: column;
        .o-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; }
        .o-val { font-size: 16px; font-weight: 800; color: #10b981; }
      }
      .o-divider { width: 1px; background: rgba(255,255,255,0.1); }
    }

    .feed-wrapper { height: 520px; }
    .activity-scroll { flex: 1; overflow-y: auto; padding: 16px; }
    
    .activity-card {
      display: flex; align-items: center; gap: 16px; padding: 14px;
      border-radius: 16px; margin-bottom: 12px;
      transition: all 0.3s ease;
      position: relative;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid transparent;
      
      &:hover { 
        background: rgba(255, 255, 255, 0.05); 
        border-color: rgba(255, 255, 255, 0.1);
        transform: scale(1.02);
      }
      
      .activity-indicator {
        position: absolute; left: 0; top: 50%; transform: translateY(-50%);
        width: 3px; height: 24px; border-radius: 0 4px 4px 0; background: transparent;
        &.new { background: #10b981; }
      }

      .activity-avatar {
        width: 44px; height: 44px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-weight: 800; font-size: 16px; color: white;
      }

      .activity-info {
        flex: 1;
        .info-top {
          display: flex; justify-content: space-between; align-items: center;
          .activity-name { font-size: 14px; font-weight: 700; color: white; }
          .activity-time { font-size: 11px; color: #64748b; }
        }
        .info-bottom {
          display: flex; justify-content: space-between; align-items: center; margin-top: 2px;
          .activity-desc { 
            display: flex; align-items: center; gap: 4px; font-size: 12px; color: #94a3b8; 
            mat-icon { font-size: 14px; width: 14px; height: 14px; color: #10b981; }
          }
          .activity-status {
            font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
            &.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
            &.approved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
            &.sent { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
          }
        }
      }
    }

    .view-all-btn {
      margin: 16px; height: 44px; border-radius: 12px;
      background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);
      color: #10b981; font-weight: 700; font-size: 13px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      cursor: pointer; transition: all 0.3s ease;
      
      &:hover { background: #10b981; color: white; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3); }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    @media (max-width: 1200px) {
      .grid-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class ConvenerDashboardComponent implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private map!: L.Map;

  userInitials = 'CN';
  stats = [
    { label: 'Managed Firms', value: '24', icon: 'business', color: 'rgba(16, 185, 129, 0.2)', trend: '+3', trendUp: true },
    { label: 'QIC Requests', value: '156', icon: 'assignment_turned_in', color: 'rgba(59, 130, 246, 0.2)', trend: '+12%', trendUp: true },
    { label: 'Pending Reviews', value: '12', icon: 'pending_actions', color: 'rgba(245, 158, 11, 0.2)', trend: '-2', trendUp: false },
    { label: 'Approved Reports', value: '144', icon: 'verified', color: 'rgba(168, 85, 247, 0.2)', trend: '+8%', trendUp: true },
  ];

  activities = [
    { firm: 'Al-Ghazi Tractors', time: '5 mins ago', type: 'QIC Inspection Request', status: 'Sent', avatarColor: '#10b981' },
    { firm: 'Millat Tractors Ltd', time: '20 mins ago', type: 'Report Signed', status: 'Approved', avatarColor: '#3b82f6' },
    { firm: 'Sargodha Agro Ind.', time: '1 hour ago', type: 'New Registration', status: 'Pending', avatarColor: '#f59e0b' },
    { firm: 'Pak Agro Tech', time: '3 hours ago', type: 'QIC Inspection Request', status: 'Sent', avatarColor: '#a855f7' },
    { firm: 'Chenab Engineering', time: '5 hours ago', type: 'Report Rejected', status: 'Pending', avatarColor: '#f43f5e' },
    { firm: 'Buraq Implements', time: '6 hours ago', type: 'QIC Inspection Request', status: 'Sent', avatarColor: '#10b981' },
  ];

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user && user.name) {
      this.userInitials = user.name.charAt(0).toUpperCase();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
        this.initMap();
    }, 100);
  }

  private initMap(): void {
    const mapElement = document.getElementById('convener-map');
    if (!mapElement) return;

    this.map = L.map('convener-map', {
      center: [31.1704, 72.7097],
      zoom: 7,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      attribution: '&copy; CARTO'
    }).addTo(this.map);

    // Mock Firm Locations
    const firmLocations = [
      { lat: 31.5204, lng: 74.3587, name: 'Lahore Hub' },
      { lat: 31.4504, lng: 73.1350, name: 'Faisalabad Cluster' },
      { lat: 30.1575, lng: 71.5249, name: 'Multan Base' },
      { lat: 32.4945, lng: 74.5229, name: 'Sialkot Zone' }
    ];

    firmLocations.forEach(loc => {
      L.circleMarker([loc.lat, loc.lng], {
        radius: 10,
        fillColor: '#10b981',
        color: '#10b981',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.4
      }).addTo(this.map).bindPopup(`<b style="color:#0d1117">${loc.name}</b>`);
    });
  }

  navigateToRequests() {
    this.router.navigate(['/portal/quality-inspection/process']);
  }
}
