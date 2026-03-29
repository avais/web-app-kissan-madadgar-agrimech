export interface Feature {
    id: number;
    name: string;
    description: string;
    icon: string;
    route: string;
    color: string;
    isParent: boolean;
    showInSideNav: boolean;
    active: boolean;
    placement: number;
    subFeatures?: Feature[];
}

export interface Role {
    id?: number;
    name: string;
    level?: string;
    features: Feature[];
}
