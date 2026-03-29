import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="future-dashboard">
      <!-- Background Elements for futuristic feel -->
      <div class="bg-glow-1"></div>
      <div class="bg-glow-2"></div>

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
                <h3>Geospatial Intelligence</h3>
                <p>Live emission monitoring and machine deployment density</p>
              </div>
              <div class="header-actions">
                <div class="status-dot-active">Live System</div>
              </div>
            </div>
            <div id="admin-map" class="future-map"></div>
            <div class="map-overlay-stats">
              <div class="overlay-item">
                <span class="o-label">Active Nodes</span>
                <span class="o-val">1,204</span>
              </div>
              <div class="o-divider"></div>
              <div class="overlay-item">
                <span class="o-label">Sync Rate</span>
                <span class="o-val">99.8%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="secondary-visual">
          <div class="glass-container activity-wrapper">
            <div class="container-header">
              <h3>Real-time Feed</h3>
            </div>
            <div class="activity-scroll">
              <div class="activity-card-new" *ngFor="let app of recentApps; let i = index">
                <div class="activity-indicator" [class.new]="i < 2"></div>
                <div class="activity-avatar-new" [style.background-image]="'linear-gradient(135deg, #4CAF50, #10b981)'">
                   {{app.name.charAt(0)}}
                </div>
                <div class="activity-info-new">
                  <div class="info-top">
                    <span class="activity-name">{{app.name}}</span>
                    <span class="activity-time">{{app.time}}</span>
                  </div>
                  <div class="info-bottom">
                    <span class="activity-location">
                      <mat-icon>location_on</mat-icon> {{app.location}}
                    </span>
                    <span class="activity-status-new" [class]="app.status.toLowerCase()">
                      {{app.status}}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button class="view-all-btn">
              Explore All Activities <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .future-dashboard { 
      position: relative;
      display: flex; flex-direction: column; gap: 32px; 
      padding: 0px;
      color: #e2e8f0;
      min-height: calc(100vh - 100px);
      background: #0f172a; /* Deep tech background */
      border-radius: 32px;
      overflow: hidden;
    }

    /* Background Glows */
    .bg-glow-1 { position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, transparent 70%); filter: blur(60px); z-index: 1; }
    .bg-glow-2 { position: absolute; bottom: -100px; left: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%); filter: blur(60px); z-index: 1; }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      z-index: 2;
      padding: 32px 32px 0;
    }

    .glass-stat {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      
      &:hover {
        transform: translateY(-5px) scale(1.02);
        border-color: rgba(76, 175, 80, 0.3);
        box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
      }
    }

    .stat-icon-wrapper {
      position: relative;
      width: 56px; height: 56px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      color: white;
      
      mat-icon { font-size: 26px; width: 26px; height: 26px; z-index: 2; }
      
      .icon-pulse {
        position: absolute; width: 100%; height: 100%; border-radius: 16px;
        opacity: 0.3; animation: pulse 2s infinite;
      }
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    .stat-details {
      flex: 1;
      .stat-label { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
      .stat-main {
        display: flex; align-items: baseline; justify-content: space-between; margin-top: 4px;
        .stat-value { font-size: 28px; font-weight: 900; color: white; margin: 0; letter-spacing: -0.5px; }
        .stat-trend {
          display: flex; align-items: center; gap: 2px; font-size: 12px; font-weight: 700;
          mat-icon { font-size: 14px; width: 14px; height: 14px; }
          &.up { color: #10b981; }
          &.down { color: #ef4444; }
        }
      }
    }

    .grid-layout {
      display: grid; grid-template-columns: 1.8fr 1fr; gap: 24px;
      padding: 0 32px 32px;
      z-index: 2;
    }

    .glass-container {
      background: rgba(30, 41, 59, 0.5);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 32px;
      overflow: hidden;
      display: flex; flex-direction: column;
    }

    .container-header {
      padding: 24px 32px;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      
      h3 { font-size: 20px; font-weight: 800; color: white; margin: 0; }
      p { font-size: 14px; color: #94a3b8; margin: 4px 0 0; }
      
      .status-dot-active {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 14px; border-radius: 20px; background: rgba(16, 185, 129, 0.1);
        color: #10b981; font-size: 11px; font-weight: 800; text-transform: uppercase;
        
        &::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: blink 1.5s infinite; }
      }
    }

    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    .map-wrapper { position: relative; height: 580px; }
    .future-map { flex: 1; width: 100%; filter: saturate(0.8) contrast(1.1); }
    
    .map-overlay-stats {
      position: absolute; bottom: 24px; left: 24px; z-index: 1000;
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
      display: flex; padding: 16px 24px; gap: 20px;
      
      .overlay-item {
        display: flex; flex-direction: column;
        .o-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }
        .o-val { font-size: 18px; font-weight: 900; color: #4CAF50; }
      }
      .o-divider { width: 1px; background: rgba(255,255,255,0.1); }
    }

    .activity-wrapper { height: 580px; }
    .activity-scroll { flex: 1; overflow-y: auto; padding: 10px 20px; padding-bottom: 20px; }
    
    .activity-card-new {
      display: flex; align-items: center; gap: 16px; padding: 18px;
      border-radius: 20px; margin-bottom: 12px;
      transition: all 0.3s ease;
      position: relative;
      background: rgba(255, 255, 255, 0.02);
      
      &:hover { background: rgba(255, 255, 255, 0.05); transform: translateX(8px); }
      
      .activity-indicator {
        position: absolute; left: 0; top: 50%; transform: translateY(-50%);
        width: 3px; height: 30px; border-radius: 0 4px 4px 0; background: transparent;
        &.new { background: #4CAF50; }
      }

      .activity-avatar-new {
        width: 48px; height: 48px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-weight: 800; font-size: 16px; color: white;
      }

      .activity-info-new {
        flex: 1;
        .info-top {
          display: flex; justify-content: space-between; align-items: center;
          .activity-name { font-size: 15px; font-weight: 700; color: white; }
          .activity-time { font-size: 12px; color: #64748b; }
        }
        .info-bottom {
          display: flex; justify-content: space-between; align-items: center; margin-top: 4px;
          .activity-location { 
            display: flex; align-items: center; gap: 4px; font-size: 13px; color: #94a3b8; 
            mat-icon { font-size: 14px; width: 14px; height: 14px; color: #4CAF50; }
          }
          .activity-status-new {
            font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;
            &.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
            &.approved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
          }
        }
      }
    }

    .view-all-btn {
      margin: 10px 20px 24px; height: 48px; border-radius: 16px;
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
      color: white; font-weight: 700; font-size: 14px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      cursor: pointer; transition: all 0.3s ease;
      
      &:hover { background: #4CAF50; border-color: #4CAF50; box-shadow: 0 8px 16px rgba(76, 175, 80, 0.3); }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }


    /* Sparkling Tracker Animation */
    ::ng-deep {
      .sparkling-tracker {
        width: 12px; height: 12px;
        background: #3b82f6; border-radius: 50%;
        position: relative;
        box-shadow: 0 0 10px #3b82f6;
        
        &::after {
          content: '';
          position: absolute; width: 100%; height: 100%;
          border-radius: 50%; border: 2px solid #3b82f6;
          animation: tracker-spark 1.5s infinite;
        }

        &::before {
          content: '';
          position: absolute; width: 100%; height: 100%;
          border-radius: 50%; border: 1px solid #3b82f6;
          animation: tracker-spark 1.5s infinite 0.75s;
        }
      }

      /* Refresh button next to Leaflet close button */
      .leaflet-popup-content-wrapper {
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      
      .leaflet-popup-content {
        margin: 0 !important;
        width: 260px !important;
      }

      .popup-refresh-btn {
        position: absolute;
        top: 8px;
        right: 32px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(4px);
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.2s;
        z-index: 1001;
        
        &:hover { background: rgba(255, 255, 255, 0.2); color: #4CAF50; transform: rotate(180deg); }
        i { font-size: 12px; }
      }

      .leaflet-popup-tip-container { display: none; }
      .leaflet-popup-close-button { 
         color: rgba(255,255,255,0.5) !important; 
         padding: 8px !important;
         font-size: 16px !important;
      }
    }


    @keyframes tracker-spark {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(3.5); opacity: 0; }
    }

    @media (max-width: 1400px) {
      .grid-layout { grid-template-columns: 1fr; }
      .activity-wrapper { height: auto; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  private map!: L.Map;

  stats = [
    { label: 'Total Farmers', value: '12,450', icon: 'groups', color: 'rgba(76, 175, 80, 0.2)', trend: '+12%', trendUp: true },
    { label: 'Pending Apps', value: '453', icon: 'pending_actions', color: 'rgba(245, 158, 11, 0.2)', trend: '-5%', trendUp: false },
    { label: 'Active Machines', value: '1,204', icon: 'precision_manufacturing', color: 'rgba(59, 130, 246, 0.2)', trend: '+8%', trendUp: true },
    { label: 'Districts', value: '42', icon: 'map', color: 'rgba(168, 85, 247, 0.2)', trend: '+2', trendUp: true },
  ];

  recentApps = [
    { name: 'Muhammad Ahmed', location: 'Multan', time: '2 mins ago', status: 'Pending' },
    { name: 'Sajid Khan', location: 'Faisalabad', time: '15 mins ago', status: 'Approved' },
    { name: 'Irfan Ali', location: 'Sargodha', time: '1 hour ago', status: 'Pending' },
    { name: 'Zafar Iqbal', location: 'Lahore', time: '3 hours ago', status: 'Approved' },
    { name: 'Usman Ghani', location: 'Rawalpindi', time: '5 hours ago', status: 'Pending' },
    { name: 'Abid Hussain', location: 'Bhakkar', time: '8 hours ago', status: 'Approved' },
  ];

  ngOnInit() { }

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('admin-map', {
      center: [31.5204, 74.3587],
      zoom: 7,
      zoomControl: false
    });

    const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    });

    tiles.addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // District Density Markers (Green)
    const densityMarkers = [
      { lat: 30.1575, lng: 71.5249, count: 450, city: 'Multan' },
      { lat: 31.4504, lng: 73.1350, count: 320, city: 'Faisalabad' },
      { lat: 32.0740, lng: 72.6861, count: 180, city: 'Sargodha' },
      { lat: 31.5204, lng: 74.3587, count: 890, city: 'Lahore' }
    ];

    densityMarkers.forEach(m => {
      const circle = L.circleMarker([m.lat, m.lng], {
        radius: Math.sqrt(m.count) * 1.5,
        fillColor: '#4CAF50',
        color: '#4CAF50',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.3
      }).addTo(this.map);

      circle.bindPopup(`
              <div style="background: #1e293b; color: white; padding: 12px; border-radius: 12px;">
                <h4 style="margin: 0 0 4px; color: #4CAF50;">${m.city}</h4>
                <p style="margin: 0; font-size: 13px; color: #94a3b8;">${m.count} Active Deployments</p>
                <div style="margin-top: 8px; height: 4px; background: rgba(76, 175, 80, 0.2); border-radius: 4px; overflow: hidden;">
                   <div style="width: 80%; height: 100%; background: #4CAF50;"></div>
                </div>
              </div>
            `);
    });

    this.addSparklingTrackers();
  }

  private addSparklingTrackers(): void {
    const trackerIcon = L.divIcon({
      className: 'tracker-icon-container',
      html: '<div class="sparkling-tracker"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const trackerData = [
      { coords: [31.2, 74.1], farmer: 'Chaudhry Muhammad Aslam', machine: 'Super Seeder - X1', status: 'Running', lastSeen: '1 min ago' },
      { coords: [31.5, 74.4], farmer: 'Malik Zahid Iqbal', machine: 'Rice Harvester', status: 'Idle', lastSeen: '3 mins ago' },
      { coords: [31.8, 73.9], farmer: 'Mian Abdul Rashid', machine: 'Super Seeder - Pro', status: 'Running', lastSeen: 'Just now' },
      { coords: [30.5, 71.8], farmer: 'Sardar Ali Gohar', machine: 'Lazer Leveler', status: 'Idle', lastSeen: '12 mins ago' },
      { coords: [30.2, 71.4], farmer: 'Rana Waqas Ahmed', machine: 'Super Seeder - X1', status: 'Running', lastSeen: '5 mins ago' },
      { coords: [31.6, 73.2], farmer: 'Haji Ghulam Nabi', machine: 'Happy Seeder', status: 'Running', lastSeen: '2 mins ago' },
      { coords: [31.3, 72.8], farmer: 'Zafar Uppal', machine: 'Wheat Thresher', status: 'Idle', lastSeen: '45 mins ago' },
      { coords: [31.0, 72.5], farmer: 'Sheikh Imtiaz', machine: 'Super Seeder - X1', status: 'Running', lastSeen: '1 min ago' },
      { coords: [32.2, 72.9], farmer: 'Pirzada Qasim', machine: 'Cotton Picker', status: 'Running', lastSeen: '4 mins ago' },
      { coords: [32.5, 73.1], farmer: 'Chaudhry Pervaiz', machine: 'Happy Seeder', status: 'Idle', lastSeen: '10 mins ago' },
      { coords: [32.8, 74.2], farmer: 'Malik Tanveer', machine: 'Super Seeder - X2', status: 'Running', lastSeen: '2 mins ago' },
      { coords: [33.1, 73.5], farmer: 'Raja Ashfaq', machine: 'Rice Harvester', status: 'Running', lastSeen: 'Just now' },
      { coords: [30.8, 74.0], farmer: 'Sardar Mushtaq', machine: 'Lazer Leveler', status: 'Idle', lastSeen: '15 mins ago' },
      { coords: [30.1, 71.1], farmer: 'Khan Bahadur', machine: 'Super Seeder - X1', status: 'Running', lastSeen: '3 mins ago' },
      { coords: [32.1, 74.5], farmer: 'Syed Munawar', machine: 'Wheat Thresher', status: 'Idle', lastSeen: '8 mins ago' },
      { coords: [31.9, 73.5], farmer: 'Makhdoom Shah', machine: 'Happy Seeder', status: 'Running', lastSeen: 'Just now' },
      { coords: [32.4, 72.4], farmer: 'Arshad Bhatti', machine: 'Rice Harvester', status: 'Running', lastSeen: '6 mins ago' },
      { coords: [33.5, 73.0], farmer: 'Zulfiqar Ali', machine: 'Super Seeder - X2', status: 'Idle', lastSeen: '22 mins ago' },
      { coords: [30.4, 72.0], farmer: 'Ghulam Sarwar', machine: 'Cotton Picker', status: 'Running', lastSeen: '4 mins ago' },
      { coords: [31.4, 73.8], farmer: 'Nawazish Ali', machine: 'Super Seeder - X1', status: 'Running', lastSeen: '1 min ago' }
    ];

    trackerData.forEach(data => {
      const statusColor = data.status === 'Running' ? '#10b981' : '#f59e0b';

      L.marker(data.coords as L.LatLngExpression, { icon: trackerIcon })
        .addTo(this.map)
        .bindPopup(`
          <div class="popup-refresh-btn" onclick="window.location.reload()" title="Refresh Data">
             <i class="material-icons" style="font-size: 14px;">refresh</i>
          </div>
          <div style="background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(16px); color: white; padding: 12px 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 15px 35px rgba(0,0,0,0.4);">
             <div style="margin-bottom: 6px; padding-right: 35px;">
                <span style="color: #3b82f6; font-weight: 900; font-size: 14px; letter-spacing: 0.3px; text-transform: uppercase; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${data.farmer}</span>
                <span style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Unit #8271</span>
             </div>
             
             <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                   <i class="material-icons" style="font-size: 14px; color: #3b82f6;">precision_manufacturing</i>
                   <span style="color: #cbd5e1; font-size: 12px; font-weight: 700;">\${data.machine}</span>
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                   <div style="width: 7px; height: 7px; border-radius: 50%; background: \${statusColor}; box-shadow: 0 0 8px \${statusColor};"></div>
                   <span style="color: #cbd5e1; font-size: 12px; font-weight: 600;">\${data.status}</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 6px;">
                   <i class="material-icons" style="font-size: 14px; color: #94a3b8;">history</i>
                   <span style="color: #94a3b8; font-size: 12px; font-weight: 500;">Seen: <span style="color: white; font-weight: 700;">\${data.lastSeen}</span></span>
                </div>
             </div>

             <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 6px;">
                <i class="material-icons" style="font-size: 13px; color: #4CAF50;">verified_user</i>
                <span style="color: #4CAF50; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Encrypted Node</span>
             </div>
          </div>
       `);
    });
  }
}
