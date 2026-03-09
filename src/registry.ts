export interface ModuleConfig {
    name: string;
    icon: string;
    defaultPublic: boolean;
    contentType: string; // The module_type used in the content collection
}

export const moduleRegistry: Record<string, ModuleConfig> = {
    portfolio: { name: "Portfolio", icon: "User", defaultPublic: true, contentType: "portfolio_profile" },
    blog: { name: "Blog", icon: "FileText", defaultPublic: true, contentType: "blog_post" },
    expenses: { name: "Expenses", icon: "DollarSign", defaultPublic: false, contentType: "expense" },
    "recurring-expenses": { name: "Recurring Expenses", icon: "CreditCard", defaultPublic: false, contentType: "recurring_expense" },
    "emi-tracker": { name: "EMI Tracker", icon: "Calculator", defaultPublic: false, contentType: "emi_loan" },
    calculators: { name: "Calculators", icon: "Calculator", defaultPublic: false, contentType: "calculator_profile" },
    reading: { name: "Reading", icon: "BookOpen", defaultPublic: false, contentType: "reading_item" },
    bookshelf: { name: "Bookshelf", icon: "Library", defaultPublic: false, contentType: "book" },
    ideas: { name: "Ideas", icon: "Lightbulb", defaultPublic: false, contentType: "idea" },
    snippets: { name: "Snippets", icon: "Code", defaultPublic: false, contentType: "snippet" },
    habits: { name: "Habits", icon: "Target", defaultPublic: false, contentType: "habit" },
    analytics: { name: "Analytics", icon: "BarChart3", defaultPublic: false, contentType: "metric" },
    compass: { name: "Compass", icon: "Map", defaultPublic: false, contentType: "compass_task" },
    "crop-history": { name: "Crop History", icon: "Wheat", defaultPublic: false, contentType: "crop_history" },
    "rain-tracker": { name: "Rain Tracker", icon: "CloudRain", defaultPublic: false, contentType: "rain_area" },
    todo: { name: "Todo", icon: "CheckSquare", defaultPublic: false, contentType: "todo" },
    "shopping-list": { name: "Shopping List", icon: "ShoppingBag", defaultPublic: false, contentType: "shopping_list" },
    "ai-usage": { name: "AI Usage", icon: "Bot", defaultPublic: false, contentType: "ai_usage" },
    people: { name: "People", icon: "Users", defaultPublic: false, contentType: "person" },
    vehicle: { name: "Vehicle", icon: "Car", defaultPublic: false, contentType: "vehicle" },
    maintenance: { name: "Maintenance", icon: "Wrench", defaultPublic: false, contentType: "maintenance_task" },
    health: { name: "Health", icon: "HeartPulse", defaultPublic: false, contentType: "health_profile" },
    whiteboard: { name: "Whiteboard", icon: "PenLine", defaultPublic: false, contentType: "whiteboard_note" },
};
