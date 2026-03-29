import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NewsService, NewsArticle } from '../../core/services/news.service';

@Component({
    selector: 'app-news',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatChipsModule, MatButtonToggleModule],
    template: `
    <div class="news-landing">
      <header class="page-header">
        <div class="content-wrapper">
          <h1>Agri-News & Updates</h1>
          <p>Stay informed with the latest trends, tips, and technology in Pakistan's agricultural sector.</p>
        </div>
      </header>

      <div class="main-content content-wrapper">
        <div class="filter-bar">
          <mat-button-toggle-group #group="matButtonToggleGroup" 
                                   [value]="selectedCategory()" 
                                   (change)="selectedCategory.set($event.value)"
                                   class="category-toggle">
            <mat-button-toggle value="All">All News</mat-button-toggle>
            <mat-button-toggle value="Technology">Technology</mat-button-toggle>
            <mat-button-toggle value="Market Trends">Market Trends</mat-button-toggle>
            <mat-button-toggle value="Farming Tips">Farming Tips</mat-button-toggle>
            <mat-button-toggle value="Policy">Policy</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <div class="news-grid">
          @for (article of filteredNews(); track article.id) {
            <article class="news-card">
              <div class="card-image">
                <img [src]="article.imageUrl" [alt]="article.title">
                <span class="category-badge">{{ article.category }}</span>
              </div>
              <div class="card-body">
                <div class="meta">
                  <span class="date">{{ article.date }}</span>
                  <span class="dot"></span>
                  <span class="author">By {{ article.author }}</span>
                </div>
                <h3>{{ article.title }}</h3>
                <p>{{ article.summary }}</p>
                <button mat-button color="primary" class="read-more">
                  Read Article <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            </article>
          }
        </div>
      </div>
    </div>
  `,
    styles: [`
    .news-landing {
      background: #f8fafc;
      min-height: calc(100vh - 64px);
    }
    .content-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .page-header {
      background: #1B5E20;
      color: white;
      padding: 60px 0;
      text-align: center;
      h1 { font-size: 36px; font-weight: 800; margin: 0 0 16px; }
      p { font-size: 18px; opacity: 0.9; max-width: 600px; margin: 0 auto; line-height: 1.6; }
    }

    .main-content {
      padding-top: 40px;
      padding-bottom: 80px;
    }

    .filter-bar {
      margin-bottom: 40px;
      display: flex;
      justify-content: center;
    }

    .category-toggle {
      border: none !important;
      background: white;
      border-radius: 30px !important;
      padding: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);

      ::ng-deep .mat-button-toggle {
        border-radius: 25px !important;
        border: none !important;
        .mat-button-toggle-label-content { padding: 0 24px !important; }
        &.mat-button-toggle-checked {
          background: #4CAF50 !important;
          color: white !important;
        }
      }
    }

    .news-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 32px;
    }

    .news-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      transition: transform 0.3s;
      border: 1px solid #edf2f7;
      &:hover { transform: translateY(-8px); }
    }

    .card-image {
      height: 200px;
      position: relative;
      img { width: 100%; height: 100%; object-fit: cover; }
      .category-badge {
        position: absolute;
        top: 16px;
        left: 16px;
        background: rgba(255, 255, 255, 0.9);
        color: #2e7d32;
        padding: 4px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        backdrop-filter: blur(4px);
      }
    }

    .card-body {
      padding: 24px;
      .meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #718096;
        margin-bottom: 12px;
        .dot { width: 4px; height: 4px; background: #cbd5e0; border-radius: 50%; }
      }
      h3 { font-size: 20px; font-weight: 700; color: #1a202c; margin: 0 0 12px; line-height: 1.4; }
      p { font-size: 14px; color: #4a5568; line-height: 1.6; margin: 0 0 20px; }
      .read-more {
        padding: 0;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 4px;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
      }
    }

    @media (max-width: 768px) {
      .page-header { padding: 40px 20px; h1 { font-size: 28px; } }
      .news-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class NewsComponent {
    private newsService = inject(NewsService);

    selectedCategory = signal<string>('All');

    filteredNews = computed(() => {
        const category = this.selectedCategory();
        const allNews = this.newsService.news();
        return category === 'All'
            ? allNews
            : allNews.filter(a => a.category === category);
    });
}
