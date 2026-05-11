import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models/project.model';
import { NotificationService, Notification } from '../../core/services/notification.service';
import { MatBadgeModule } from '@angular/material/badge';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';


export interface Feature {
  id: number;
  name: string;
  icon: string;
  route: string;
  isParent: boolean;
  showInSideNav: boolean;
  active: boolean;
  placement: number;
  subFeatures?: Feature[];
}

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatInputModule,
    FormsModule
  ],

  template: `
    <div class="portal-wrapper">
      <!-- Sidebar -->
      <aside class="sidebar" [class.mobile-open]="isSidebarOpen()">
        <div class="sidebar-header-mobile">
          <div class="logo-area">
            <mat-icon class="logo-icon">eco</mat-icon>
            <span class="logo-text">Punjab<span>CleanAir</span></span>
          </div>
          <button mat-icon-button (click)="toggleSidebar()" class="close-sidebar">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <nav class="nav-links">



          <!-- Dynamic Feature Groups -->
          <ng-container *ngFor="let group of menuItems()">
            <!-- Case 1: Parent with actual sub-features -> Show as Accordion Group -->
            <div class="nav-group" *ngIf="group.subFeatures && group.subFeatures.length > 0" [class.collapsed]="!groups()[group.name]">
              <div class="group-header" (click)="toggleGroup(group.name)">
                <span class="group-label">{{group.name}}</span>
                <mat-icon class="chevron">expand_more</mat-icon>
              </div>
              
              <div class="group-items">
                <ng-container *ngFor="let sub of group.subFeatures">
                  <a [routerLink]="sub.route" routerLinkActive="active" (click)="closeSidebarOnMobile()" class="nav-item">
                    <mat-icon>{{sub.icon || 'circle'}}</mat-icon>
                    <span>{{sub.name}}</span>
                  </a>
                </ng-container>
              </div>
            </div>

            <!-- Case 2: Parent is its own link (no sub-features or all hidden) -> Show as Direct Link (No Header) -->
            <div class="nav-group solo-item" *ngIf="(!group.subFeatures || group.subFeatures.length === 0) && group.route">
               <a [routerLink]="group.route" routerLinkActive="active" (click)="closeSidebarOnMobile()" class="nav-item">
                  <mat-icon>{{group.icon || 'star'}}</mat-icon>
                  <span>{{group.name}}</span>
                </a>
            </div>

            <div class="nav-divider"></div>
          </ng-container>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="avatar">{{ initials() }}</div>
            <div class="details">
              <p class="name">{{ authService.currentUser()?.name || 'Super Admin' }}</p>
              <p class="role">{{ (authService.currentUser()?.role || 'System Administrator') | titlecase }}</p>
            </div>
          </div>
          <button mat-icon-button (click)="logout()" color="warn" title="Logout">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </aside>

      <!-- Sidebar Backdrop -->
      <div class="sidebar-backdrop" *ngIf="isSidebarOpen()" (click)="toggleSidebar()"></div>

      <!-- Main Content -->
      <main class="main-body">
        <header class="top-nav">
          <div class="header-left">
            <button mat-icon-button class="menu-toggle" (click)="toggleSidebar()">
              <mat-icon>menu</mat-icon>
            </button>
            <div class="project-context">
              <mat-form-field appearance="outline" class="project-dropdown">
                <mat-select [value]="selectedProjectId()" (selectionChange)="onProjectChange($event.value)">
                  <mat-select-trigger>
                    <div class="selected-project">
                      <div class="status-signal"></div>
                      <span>{{ getSelectedProjectName() }}</span>
                    </div>
                  </mat-select-trigger>
                  <mat-option *ngFor="let p of projects()" [value]="p.id">
                    <div class="option-content">
                      <mat-icon>rocket_launch</mat-icon>
                      <span>{{p.name}}</span>
                    </div>
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>
          <div class="header-right">
            <button mat-icon-button (click)="toggleNotifPanel()" 
                    [class.pulse-bell]="notificationService.unreadCount() > 0"
                    [aria-label]="notificationService.unreadCount() > 0 ? 'Notifications, ' + notificationService.unreadCount() + ' unread' : 'No new notifications'">
              <mat-icon [matBadge]="notificationService.unreadCount() || null" 
                        matBadgeColor="warn" 
                        matBadgeSize="small"
                        aria-hidden="false">notifications</mat-icon>
            </button>
            <button
              type="button"
              class="profile-menu-trigger"
              [matMenuTriggerFor]="profileMenu"
              aria-label="Open profile menu">
              <span class="top-avatar">{{ initials() }}</span>
            </button>
            <mat-menu #profileMenu="matMenu">
              <div class="menu-user-header">
                <span class="user-name">{{ authService.currentUser()?.name }}</span>
                <span class="user-role">{{ authService.currentUser()?.role }}</span>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item>
                <mat-icon>person</mat-icon>
                <span>My Profile</span>
              </button>
              <button mat-menu-item>
                <mat-icon>settings</mat-icon>
                <span>Settings</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
              </button>
            </mat-menu>
          </div>
        </header>

        <section class="content-area">
          <router-outlet></router-outlet>
        </section>
      </main>

      <!-- Notification Side Slider -->
      <div class="notif-slider-backdrop" *ngIf="isNotifPanelOpen()" (click)="closeNotifPanel()"></div>
      <aside class="notif-slider" [class.open]="isNotifPanelOpen()">
        <div class="slider-header">
          <div class="header-title-area">
            <h3>Notifications</h3>
            <span class="unread-count" *ngIf="notificationService.unreadCount() > 0">
              {{ notificationService.unreadCount() }}
            </span>
          </div>
          <button mat-icon-button (click)="closeNotifPanel()" class="close-slider-btn">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="slider-actions">
          <div class="filter-controls">
            <mat-form-field appearance="outline" class="notif-search">
              <mat-icon matPrefix>search</mat-icon>
              <mat-label>Search notifications...</mat-label>
              <input matInput (input)="onNotifSearch($event)" [value]="notifSearchTerm()">
            </mat-form-field>

            <mat-form-field appearance="outline" class="notif-type">
              <mat-label>Type</mat-label>
              <mat-select [value]="notifTypeFilter()" (selectionChange)="onNotifFilterChange($event.value)">
                <mat-option value="ALL">All Types</mat-option>
                <mat-option value="QIC">QIC Notifications</mat-option>
                <mat-option value="DIC">DIC Notifications</mat-option>
                <mat-option value="BOOKED">Booking Notices</mat-option>
                <mat-option value="SUCCESS">Success Updates</mat-option>
                <mat-option value="WARNING">Action Required</mat-option>
                <mat-option value="ERROR">Failure Alerts</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          
          <button mat-button (click)="markAllAsRead()" class="mark-read-all" *ngIf="notificationService.unreadCount() > 0">
            <mat-icon>done_all</mat-icon>
            <span>Mark all read</span>
          </button>
        </div>

        <div class="slider-body">
          <!-- Main Loader -->
          <div class="notif-loader-container" *ngIf="isNotifLoading() && notificationService.notifications().length === 0">
            <mat-spinner diameter="40" strokeWidth="4"></mat-spinner>
            <span>Fetching your notifications...</span>
          </div>

          <div *ngIf="!isNotifLoading() && notificationService.notifications().length === 0" class="empty-state">
            <div class="empty-icon-circle">
              <mat-icon>notifications_none</mat-icon>
            </div>
            <h4>No notifications yet</h4>
            <p>We'll notify you when something important happens.</p>
          </div>

          <div class="notif-items-list">
            <div *ngFor="let notif of notificationService.notifications()" 
                 class="slider-item" 
                 [class.unread]="!notif.isRead"
                 (click)="onNotifClick(notif)">
              
              <div class="item-icon-col">
                <div class="item-icon" [ngClass]="getNotifTypeClass(notif.type)">
                  <mat-icon>{{ getNotifIcon(notif.type) }}</mat-icon>
                </div>
              </div>

              <div class="item-content-col">
                <div class="item-header">
                  <span class="item-title">{{ notif.title }}</span>
                  <div class="unread-pulse" *ngIf="!notif.isRead"></div>
                </div>
                <p class="item-message">{{ notif.message }}</p>
                <div class="item-footer">
                   <span class="item-time">
                    <mat-icon>schedule</mat-icon>
                    {{ notif.createdAt | date: 'shortTime' }}
                   </span>
                   <span class="item-date">{{ notif.createdAt | date: 'MMM d, y' }}</span>
                </div>
                <div class="item-trigger-info" *ngIf="notif.triggeredByName">
                  <mat-icon class="t-icon">person</mat-icon>
                  <span class="t-name">{{ notif.triggeredByName }}</span>
                  <a [href]="'tel:' + notif.triggeredByPhone" class="t-phone" *ngIf="notif.triggeredByPhone && notif.triggeredByPhone !== 'N/A'" (click)="$event.stopPropagation()">
                    <mat-icon>call</mat-icon> {{ notif.triggeredByPhone }}
                  </a>
                </div>
              </div>

              <div class="item-arrow">
                <mat-icon>chevron_right</mat-icon>
              </div>
            </div>

            <div class="load-more-container" *ngIf="hasMoreNotifications()">
              <button mat-button class="load-more-btn" (click)="loadMoreNotifications($event)" [disabled]="isNotifLoading()">
                <mat-icon *ngIf="!isNotifLoading()">expand_more</mat-icon>
                <mat-spinner diameter="20" *ngIf="isNotifLoading()"></mat-spinner>
                <span>{{ isNotifLoading() ? 'Fetching...' : 'Show earlier notifications' }}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .portal-wrapper {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #f8fafc;
    }

    /* Sidebar Styles */
    .sidebar {
      width: 280px;
      background: #1e293b;
      color: white;
      display: flex;
      flex-direction: column;
      z-index: 100;
      box-shadow: 4px 0 10px rgba(0,0,0,0.1);
    }

    .logo-area {
      padding: 32px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      .logo-icon { font-size: 32px; width: 32px; height: 32px; color: #4CAF50; }
      .logo-text { 
        font-size: 24px; font-weight: 800; letter-spacing: -1px; 
        span { color: #4CAF50; }
      }
    }

    .nav-links {
      flex: 1;
      padding: 0 16px;
      overflow-y: auto;
    }

    .nav-group {
      margin-bottom: 8px;
      border-radius: 12px;
      overflow: hidden;
      transition: background 0.2s;

      .group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 12px;
        cursor: pointer;
        user-select: none;
        
        &:hover {
          background: rgba(255,255,255,0.05);
        }

        .group-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 1px;
        }

        .chevron {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #64748b;
          transition: transform 0.3s ease;
        }
      }

      .group-items {
        max-height: 500px;
        overflow: hidden;
        transition: max-height 0.3s ease-in-out, opacity 0.2s ease;
        padding: 0 4px 8px;
      }

      &.collapsed {
        background: transparent;
        .group-items {
          max-height: 0;
          opacity: 0;
        }
        .chevron {
          transform: rotate(-90deg);
        }
      }
    }

    .nav-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.15);
      margin: 12px 16px;
      border-radius: 1px;
    }

    .nav-item {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 12px;
      padding: 12px 16px;
      color: #cbd5e1;
      text-decoration: none;
      border-radius: 10px;
      transition: all 0.2s ease;
      margin-bottom: 4px;

      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
      span { font-size: 14px; font-weight: 500; white-space: nowrap; }

      &:hover { background: rgba(255,255,255,0.08); color: white; }
      &.active { background: #4CAF50; color: white; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3); }
    }

    .sidebar-footer {
      padding: 24px 16px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255,255,255,0.05);

      .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
        .avatar {
          width: 42px; height: 42px; border-radius: 12px; background: #4CAF50;
          display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;
          color: white; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }
        .details {
          .name { font-size: 14px; font-weight: 700; margin: 0; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
          .role { font-size: 11px; color: #94a3b8; margin: 2px 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        }
      }
    }

    .profile-menu-trigger {
      border: none;
      margin: 0;
      padding: 0;
      background: transparent;
      cursor: pointer;
      border-radius: 10px;
      line-height: 0;
      -webkit-tap-highlight-color: transparent;
      &:focus-visible {
        outline: 2px solid #4CAF50;
        outline-offset: 2px;
      }
    }

    .top-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #4CAF50;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
      color: white;
      box-shadow: none;
    }

    .menu-user-header {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      .user-name { font-size: 15px; font-weight: 800; color: #1e293b; }
      .user-role { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    }

    /* Main Body Styles */
    .main-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .top-nav {
      height: 70px;
      background: white;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
    }

    .header-left {
      display: flex; align-items: center; gap: 8px; height: 100%;
      .menu-toggle { display: none; }
      
      .project-context {
        display: flex; align-items: center; height: 100%;
        
        .project-dropdown {
          width: 520px; margin: 0;
          ::ng-deep {
            .mat-mdc-form-field-subscript-wrapper { display: none; }
            .mat-mdc-form-field-wrapper { padding-bottom: 0; }
            .mat-mdc-text-field-wrapper { 
              background: #f1f5f9 !important; 
              border-radius: 12px !important;
              padding-top: 0 !important;
              padding-bottom: 0 !important;
              height: 44px !important;
              display: flex;
              align-items: center;
              transition: all 0.2s ease;
              border: 1px solid transparent;
              
              &:hover { background: #e2e8f0 !important; }
              &.mdc-text-field--focused { border-color: #4CAF50; background: white !important; }
            }
            .mat-mdc-form-field-flex { height: 44px !important; align-items: center !important; }
            .mat-mdc-form-field-infix { padding: 0 !important; border: none !important; min-height: unset !important; }
            .mdc-notched-outline { display: none; }
          }
        }

        .selected-project {
          display: flex; align-items: center; gap: 10px; color: #1e293b;
          
          .status-signal {
            width: 8px; height: 8px; background: #10b981; border-radius: 50%;
            position: relative; margin-right: -2px;
            
            &::after {
              content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
              border-radius: 50%; background: #10b981;
              animation: signal-ripple 1.5s infinite;
            }
          }

          mat-icon { font-size: 20px; width: 20px; height: 20px; color: #4CAF50; }
          span { font-size: 16px; font-weight: 800; letter-spacing: -0.3px; }
        }

        @keyframes signal-ripple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
      }
    }

    .option-content {
      display: flex; align-items: center; gap: 10px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #64748b; }
      span { font-weight: 600; }
    }

    .header-right { 
      display: flex; 
      align-items: center; 
      gap: 16px; 
      color: #64748b; 
    }

    .pulse-bell {
      animation: bell-pulse-ring 2s infinite;
      border-radius: 50% !important;
    }

    @keyframes bell-pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Notification Slider - Premium Sidebar Overhaul */
    .notif-slider-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(8px);
      z-index: 1500;
      animation: fadeIn 0.3s ease;
    }

    .notif-slider {
      position: fixed;
      top: 0;
      right: -640px;
      width: 640px;
      height: 100vh;
      background: #ffffff;
      z-index: 1501;
      box-shadow: -10px 0 50px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      
      &.open { right: 0; }
    }

    .slider-header {
      padding: 32px 32px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .header-title-area {
        display: flex;
        align-items: center;
        gap: 12px;
        h3 { margin: 0; font-size: 24px; font-weight: 850; color: #0f172a; letter-spacing: -0.5px; }
        .unread-count { 
          background: #ef4444; color: white; padding: 2px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
      }
      .close-slider-btn { color: #64748b; }
    }

    .slider-actions {
      padding: 0 32px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;

      .filter-controls {
        display: flex;
        gap: 12px;
        
        .notif-search { flex: 2; }
        .notif-type { flex: 1; }
        
        ::ng-deep {
          .mat-mdc-form-field-subscript-wrapper { display: none; }
          .mat-mdc-text-field-wrapper { 
            height: 48px !important; 
            background: #f8fafc !important; 
            border-radius: 12px !important; 
            padding: 0 12px !important;
          }
          .mat-mdc-form-field-flex { height: 100% !important; align-items: center !important; }
          .mat-mdc-form-field-infix { padding: 0 !important; border: none !important; min-height: unset !important; }
          .mdc-notched-outline { display: none; }
        }
      }

      .mark-read-all {
        width: 100%; height: 44px; border-radius: 12px;
        background: #f1f5f9; color: #3b82f6; font-weight: 800; font-size: 14px;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        transition: all 0.2s ease;
        &:hover { background: #e2e8f0; transform: translateY(-1px); }
      }
    }

    .slider-body {
      flex: 1;
      overflow-y: auto;
      padding: 0 16px 32px;
      
      &::-webkit-scrollbar { width: 5px; }
      &::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    }

    .empty-state {
      padding: 100px 40px;
      text-align: center;
      .empty-icon-circle {
        width: 80px; height: 80px; background: #f8fafc; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 24px;
        mat-icon { font-size: 40px; width: 40px; height: 40px; color: #cbd5e1; }
      }
      h4 { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #1e293b; }
      p { margin: 0; color: #64748b; font-size: 15px; }
    }

    .slider-item {
      padding: 20px 16px;
      margin: 0 8px 12px;
      border-radius: 18px;
      display: flex;
      gap: 16px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;
      position: relative;

      &:hover { 
        background: #f8fafc;
        border-color: #f1f5f9;
        .item-arrow { opacity: 1; transform: translateX(0); }
      }

      &.unread {
        background: #f0f7ff;
        border-color: #dbeafe;
        &:hover { background: #e0f2fe; }
      }

      .item-icon-col {
        flex-shrink: 0;
        .item-icon {
          width: 48px; height: 48px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          mat-icon { font-size: 24px; width: 24px; height: 24px; }
          
          &.info { background: #e0f2fe; color: #0284c7; }
          &.success { background: #f0fdf4; color: #16a34a; }
          &.warning { background: #fffbeb; color: #d97706; }
          &.error { background: #fef2f2; color: #dc2626; }
          &.qic { background: #f5f3ff; color: #7c3aed; }
          &.system { background: #f1f5f9; color: #475569; }
        }
      }

      .item-content-col {
        flex: 1;
        min-width: 0;
        
        .item-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 4px;
          .item-title { font-size: 15px; font-weight: 850; color: #0f172a; line-height: 1.4; }
          .unread-pulse {
            width: 10px; height: 10px; background: #3b82f6; border-radius: 50%;
            flex-shrink: 0; box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
            margin-top: 4px;
          }
        }

        .item-message { 
          font-size: 14px; color: #475569; margin: 0 0 12px; font-weight: 550;
          line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }

        .item-footer {
          display: flex; gap: 12px; align-items: center;
          margin-bottom: 8px;
          .item-time { 
            display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; color: #0f172a;
            mat-icon { font-size: 14px; width: 14px; height: 14px; }
          }
          .item-date { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        }

        .item-trigger-info {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px; background: #f8fafc; border-radius: 8px;
          .t-icon { font-size: 14px; width: 14px; height: 14px; color: #64748b; }
          .t-name { font-size: 11px; font-weight: 800; color: #1e293b; }
          .t-phone { 
            display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #10b981; 
            text-decoration: none; border-left: 1px solid #e2e8f0; padding-left: 8px;
            mat-icon { font-size: 12px; width: 12px; height: 12px; }
            &:hover { color: #059669; }
          }
        }
      }

      .item-arrow {
        align-self: center;
        color: #94a3b8;
        opacity: 0;
        transform: translateX(-10px);
        transition: all 0.3s ease;
      }
    }

    .load-more-container {
      padding: 24px 8px;
      .load-more-btn {
        width: 100%; height: 44px; border-radius: 12px; color: #64748b; font-weight: 700;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        &:hover { background: #f8fafc; color: #1e293b; }
      }
    }

    .notif-loader-container {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 100px 40px; gap: 20px;
      span { font-size: 14px; font-weight: 600; color: #94a3b8; letter-spacing: 0.5px; }
    }

    .content-area {

      flex: 1;
      overflow-y: auto;
      padding: 32px;
    }

    @media (max-width: 991px) {
      .sidebar { 
        position: fixed; 
        left: -280px; 
        top: 0;
        bottom: 0;
        transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1000;
      }
      .sidebar.mobile-open { left: 0; }
      
      .sidebar-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        z-index: 999;
        animation: fadeIn 0.3s ease;
      }

      .sidebar-header-mobile {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-right: 8px;
        .close-sidebar { color: #94a3b8; }
      }

      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

      .header-left .menu-toggle { display: block; }
      .content-area { padding: 16px; }
      .project-dropdown { width: 100% !important; max-width: 300px; }
    }

    @media (min-width: 992px) {
      .sidebar-header-mobile .close-sidebar { display: none; }
    }
  `]
})
export class PortalLayoutComponent implements OnInit {
  public authService = inject(AuthService);
  private projectService = inject(ProjectService);
  public notificationService = inject(NotificationService);
  private router = inject(Router);

  menuItems = signal<Feature[]>([]);
  groups = signal<Record<string, boolean>>({});
  isSidebarOpen = signal<boolean>(false);
  isNotifPanelOpen = signal<boolean>(false);
  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  selectedProjectTypeId = signal<number | null>(null);

  // Pagination for notifications
  notifPage = signal<number>(0);
  notifLastPage = signal<boolean>(false);
  isNotifLoading = signal<boolean>(false);
  notifSearchTerm = signal<string>('');
  notifTypeFilter = signal<string>('ALL');

  initials = signal<string>('SA');


  ngOnInit() {
    this.loadFeatures();
    this.loadProjects();
    this.updateInitials();
  }

  loadProjects() {
    this.projectService.getProjects().subscribe(data => {
      this.projects.set(data);
      // Pre-select "Punjab Clean Air Program"
      const targetProject = data.find(p => p.name.toLowerCase().includes('punjab clean air program'));
      if (targetProject) {
        this.selectedProjectId.set(targetProject.id!);
        this.selectedProjectTypeId.set(targetProject.projectTypeId || null);
      } else if (data.length > 0) {
        this.selectedProjectId.set(data[0].id!);
        this.selectedProjectTypeId.set(data[0].projectTypeId || null);
      }
    });
  }


  getSelectedProjectName(): string {
    const selected = this.projects().find(p => p.id === this.selectedProjectId());
    return selected ? selected.name : 'Select Project';
  }

  onProjectChange(projectId: number) {
    this.selectedProjectId.set(projectId);
    const selected = this.projects().find(p => p.id === projectId);
    this.selectedProjectTypeId.set(selected?.projectTypeId || null);

    // Persist for interceptor
    if (selected?.projectTypeId) {
      localStorage.setItem('selectedProjectTypeId', selected.projectTypeId.toString());
    } else {
      localStorage.removeItem('selectedProjectTypeId');
    }
  }


  private updateInitials() {
    const user = this.authService.currentUser();
    if (user && user.name) {
      const parts = user.name.split(' ');
      if (parts.length >= 2) {
        this.initials.set((parts[0][0] + parts[1][0]).toUpperCase());
      } else {
        this.initials.set(user.name.substring(0, 2).toUpperCase());
      }
    }
  }

  private loadFeatures() {
    const featuresStr = localStorage.getItem('user_features');
    if (featuresStr) {
      try {
        let allFeatures: Feature[] = JSON.parse(featuresStr);
        
        const userRole = (this.authService.currentUser()?.role || '').toUpperCase();
        const isSuperAdmin = userRole.includes('SUPER_ADMIN') || userRole.includes('ADMIN_DG_OFFICE');

        if (isSuperAdmin && !allFeatures.some(f => f.route === '/portal/dashboard')) {
          allFeatures.unshift({
            id: 0,
            name: 'Executive Dashboard',
            icon: 'analytics',
            route: '/portal/dashboard',
            isParent: true,
            active: true,
            showInSideNav: true,
            placement: -1,
            subFeatures: []
          });
        }

        // Filter only parent features and pre-filter their sub-features, then sort by placement
        const sidebarFeatures = allFeatures
          .filter(f => f.isParent && f.showInSideNav && f.active)
          .map(parent => ({
            ...parent,
            subFeatures: (parent.subFeatures?.filter(sub =>
              sub.active &&
              sub.showInSideNav &&
              allFeatures.some(af => af.id === sub.id)
            ) || [])
              .sort((a, b) => (a.placement || 0) - (b.placement || 0))
          }))
          .sort((a, b) => (a.placement || 0) - (b.placement || 0));

        this.menuItems.set(sidebarFeatures);

        // Initialize groups (all collapsed by default except maybe the first one)
        const initialGroups: Record<string, boolean> = {};
        sidebarFeatures.forEach((f, index) => {
          initialGroups[f.name] = index === 0; // Open first group by default
        });
        this.groups.set(initialGroups);
      } catch (e) {
        console.error('Error parsing user features from localStorage', e);
      }
    }
  }

  toggleGroup(groupName: string) {
    this.groups.update(state => {
      const isOpening = !state[groupName];
      const newState: Record<string, boolean> = {};

      // Close all and open only the selected one (accordion behavior)
      Object.keys(state).forEach(key => {
        newState[key] = false;
      });

      if (isOpening) {
        newState[groupName] = true;
      }
      return newState;
    });
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  closeSidebarOnMobile() {
    if (window.innerWidth <= 991) {
      this.isSidebarOpen.set(false);
    }
  }

  loadNotifications() {
    this.notifPage.set(0);
    this.isNotifLoading.set(true);
    this.notificationService.getNotifications(0, 10, this.notifSearchTerm(), this.notifTypeFilter())
      .pipe(finalize(() => this.isNotifLoading.set(false)))
      .subscribe(res => {
        this.notifLastPage.set(res.last);
      });
  }

  toggleNotifPanel() {
    if (!this.isNotifPanelOpen()) {
      this.loadNotifications();
    }
    this.isNotifPanelOpen.update(v => !v);
  }

  closeNotifPanel() {
    this.isNotifPanelOpen.set(false);
  }

  loadMoreNotifications(event: Event) {
    event.stopPropagation();
    const nextPage = this.notifPage() + 1;
    this.notifPage.set(nextPage);
    this.isNotifLoading.set(true);
    this.notificationService.getNotifications(nextPage, 10, this.notifSearchTerm(), this.notifTypeFilter())
      .pipe(finalize(() => this.isNotifLoading.set(false)))
      .subscribe(res => {
        this.notifLastPage.set(res.last);
      });
  }

  onNotifFilterChange(type: string) {
    this.notifTypeFilter.set(type);
    this.loadNotifications();
  }

  onNotifSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.notifSearchTerm.set(term);
    this.loadNotifications();
  }

  hasMoreNotifications(): boolean {
    return !this.notifLastPage() && this.notificationService.notifications().length > 0;
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe();
  }

  onNotifClick(notif: Notification) {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id).subscribe();
    }

    if (notif.targetUrl) {
      // If already on the same URL, force a refresh by navigating to root and back
      if (this.router.url === notif.targetUrl) {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigateByUrl(notif.targetUrl!);
        });
      } else {
        this.router.navigateByUrl(notif.targetUrl);
      }
    }
    this.closeNotifPanel();
  }

  getNotifTypeClass(type?: string): string {
    const t = type?.toUpperCase();
    if (t?.includes('QIC')) return 'qic';
    if (t?.includes('SUCCESS')) return 'success';
    if (t?.includes('WARNING')) return 'warning';
    if (t?.includes('ERROR')) return 'error';
    if (t?.startsWith('SYSTEM')) return 'system';
    return 'info';
  }

  getNotifIcon(type?: string): string {
    const t = type?.toUpperCase();
    if (t?.includes('QIC')) return 'assignment_turned_in';
    if (t?.includes('SUCCESS')) return 'check_circle';
    if (t?.includes('WARNING')) return 'warning';
    if (t?.includes('ERROR')) return 'error';
    if (t?.includes('REPORT')) return 'description';
    return 'info';
  }

  logout() {
    this.authService.logout();
  }
}

