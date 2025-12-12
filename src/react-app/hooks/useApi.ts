import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

// Initialize Supabase client[citation:3][citation:5]
const supabaseUrl = 'https://mwlmitpcngbgnpicdmsa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bG1pdHBjbmdiZ25waWNkbXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTc0ODcsImV4cCI6MjA4MTA5MzQ4N30.u3lamYlASvv5lynPVjVsnbwBFbSQcCLqMFWzkVdRL58';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Custom hook for fetching data
export function useApi<T>(tableName: string, selectQuery: string = '*') {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: result, error } = await supabase
          .from(tableName)
          .select(selectQuery)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setData(result as T);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tableName, selectQuery]);

  const refetch = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase
        .from(tableName)
        .select(selectQuery)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result as T);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error refetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}

// API functions for CRUD operations[citation:7]
export async function apiPost(tableName: string, data: any) {
  const { data: result, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function apiPut(tableName: string, id: number, data: any) {
  const { data: result, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function apiDelete(tableName: string, id: number) {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}