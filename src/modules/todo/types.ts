export interface TodoPayload {
    title: string;
    notes?: string;
    due_date?: string;
    completed: boolean;
    completed_at?: string;
    order?: number;
}

export interface TodoDocument {
    _id: string;
    module_type: "todo";
    payload: TodoPayload;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}
