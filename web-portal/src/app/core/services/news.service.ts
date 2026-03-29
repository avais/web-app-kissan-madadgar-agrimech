import { Injectable, signal } from '@angular/core';

export interface NewsArticle {
    id: number;
    title: string;
    summary: string;
    category: 'Farming Tips' | 'Market Trends' | 'Technology' | 'Policy';
    date: string;
    imageUrl: string;
    author: string;
}

@Injectable({
    providedIn: 'root'
})
export class NewsService {
    private mockNews: NewsArticle[] = [
        {
            id: 1,
            title: 'Revolutionizing Wheat Harvesting in Punjab',
            summary: 'New government-subsidized harvesters are helping farmers reduce waste and increase efficiency this season.',
            category: 'Technology',
            date: 'Feb 12, 2026',
            imageUrl: 'https://agriculture.punjab.gov.pk/system/files/machinery_harvester.jpg',
            author: 'Punjab Agri Bureau'
        },
        {
            id: 2,
            title: 'Global Cotton Prices Expected to Rise',
            summary: 'Market analysts predict a 10% increase in cotton exports, benefiting local farmers in the southern belt.',
            category: 'Market Trends',
            date: 'Feb 10, 2026',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz-W7P7Y6-O6-q6E6_9U6-O6-q6E6_9U6-O6-q',
            author: 'Economic Daily'
        },
        {
            id: 3,
            title: '5 Tips for Efficient Water Management',
            summary: 'Learn how Laser Land Levelers can save up to 30% of irrigation water in your fields.',
            category: 'Farming Tips',
            date: 'Feb 08, 2026',
            imageUrl: 'https://agriculture.punjab.gov.pk/system/files/styles/news_detail/private/Laser-land-leveler.jpg',
            author: 'Clean Air Advisory'
        },
        {
            id: 4,
            title: 'New Solar Tube-well Subsidy Announced',
            summary: 'The Punjab government has launched a new initiative to convert 5,000 tube-wells to solar power.',
            category: 'Policy',
            date: 'Feb 05, 2026',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcST-o6q6E6_9U6-O6-q6E6_9U6-O6-q6E6_9U6-O6-q',
            author: 'Govt. of Punjab'
        }
    ];

    news = signal<NewsArticle[]>(this.mockNews);

    constructor() { }
}
