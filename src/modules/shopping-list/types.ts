export interface ShoppingItem {
    id: string;
    name: string;
    quantity?: string;
    unit?: string;
    purchased: boolean;
}

export interface ShoppingListPayload {
    title: string;
    items: ShoppingItem[];
    is_completed: boolean;
    completed_at?: string;
    notes?: string;
}

export interface ShoppingListDocument {
    _id: string;
    module_type: "shopping_list";
    payload: ShoppingListPayload;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}
