export interface CompassTask {
    _id: string;
    payload: {
        title: string;
        status: "backlog" | "in_progress" | "review" | "done";
        description?: string;
        comments: { text: string; created_at: string }[];
        checklist: {
            id: string;
            text: string;
            completed: boolean;
            description?: string;
            comments: { text: string; created_at: string }[];
        }[];
        category_tags: string[];
        priority: "p1" | "p2" | "p3" | "p4" | "p5";
        target_date?: string;
        links: { label: string; url: string }[];
    };
    created_at: string;
    updated_at: string;
}
