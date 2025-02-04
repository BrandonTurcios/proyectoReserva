// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://figcohqizzoaptaqgsks.supabase.co'; // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZ2NvaHFpenpvYXB0YXFnc2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3Mzk5MjYsImV4cCI6MjA1MjMxNTkyNn0.TckWcvyJX-vA_F7R3WTczYMc9CQGhN40jwRPbDEmvP0'; // Replace with your Supabase Anon Key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
