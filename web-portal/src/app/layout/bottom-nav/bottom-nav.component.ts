import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-bottom-nav',
    standalone: true,
    imports: [CommonModule, RouterModule, MatIconModule],
    template: `
    <nav class="bottom-nav">
      <a routerLink="/home" routerLinkActive="active" class="nav-item">
        <mat-icon>home</mat-icon>
        <span>Home</span>
      </a>
      <a routerLink="/firms" routerLinkActive="active" class="nav-item">
        <mat-icon>business</mat-icon>
        <span>Firms</span>
      </a>
      <a routerLink="/search" routerLinkActive="active" class="nav-item">
        <mat-icon>search</mat-icon>
        <span>Search</span>
      </a>
      <a routerLink="/news" routerLinkActive="active" class="nav-item">
        <mat-icon>newspaper</mat-icon>
        <span>News</span>
      </a>
      <a routerLink="/my-machines" routerLinkActive="active" class="nav-item">
        <mat-icon>agriculture</mat-icon>
        <span>My Machines</span>
      </a>
    </nav>
  `,
    styles: [`
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: white;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 1000;
      padding-bottom: env(safe-area-inset-bottom);
    }
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      color: #757575;
      font-size: 11px;
      flex: 1;
      padding: 8px 0;
      transition: color 0.2s;
      &.active {
        color: #4CAF50;
      }
      mat-icon {
        margin-bottom: 4px;
      }
    }
  `]
})
export class BottomNavComponent { }
