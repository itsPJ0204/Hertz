export type Json = any;

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    avatar_url: string | null
                    bio: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string
                }
            }
            songs: {
                Row: {
                    id: string
                    title: string
                    artist: string
                    url: string
                    cover_url: string | null
                    genre: string | null
                    duration: number | null
                    origin: 'jamendo' | 'local'
                    external_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    artist: string
                    url: string
                    cover_url?: string | null
                    genre?: string | null
                    duration?: number | null
                    origin?: 'jamendo' | 'local'
                    external_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    artist?: string
                    url?: string
                    cover_url?: string | null
                    genre?: string | null
                    duration?: number | null
                    origin?: 'jamendo' | 'local'
                    external_id?: string | null
                    created_at?: string
                }
            }
            listening_history: {
                Row: {
                    id: string
                    user_id: string
                    song_id: string | null
                    listened_at: string
                    duration_listened: number
                    completed: boolean | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    song_id?: string | null
                    listened_at?: string
                    duration_listened: number
                    completed?: boolean | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    song_id?: string | null
                    listened_at?: string
                    duration_listened?: number
                    completed?: boolean | null
                }
            }
            connections: {
                Row: {
                    id: string
                    user_a: string
                    user_b: string
                    status: 'pending' | 'connected' | 'blocked' | null
                    match_score: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_a: string
                    user_b: string
                    status?: 'pending' | 'connected' | 'blocked' | null
                    match_score?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_a?: string
                    user_b?: string
                    status?: 'pending' | 'connected' | 'blocked' | null
                    match_score?: number | null
                    created_at?: string
                }
            }
            messages: {
                Row: {
                    id: string
                    sender_id: string
                    receiver_id: string
                    content: string
                    is_read: boolean | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    sender_id: string
                    receiver_id: string
                    content: string
                    is_read?: boolean | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    sender_id?: string
                    receiver_id?: string
                    content?: string
                    is_read?: boolean | null
                    created_at?: string
                }
            }
            user_music_profiles: {
                Row: {
                    user_id: string
                    top_artists: Json
                    top_genres: Json
                    genre_vector: Json
                    is_spotify_linked: boolean
                    last_updated: string
                }
                Insert: {
                    user_id: string
                    top_artists?: Json
                    top_genres?: Json
                    genre_vector?: Json
                    is_spotify_linked?: boolean
                    last_updated?: string
                }
                Update: {
                    user_id?: string
                    top_artists?: Json
                    top_genres?: Json
                    genre_vector?: Json
                    is_spotify_linked?: boolean
                    last_updated?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
