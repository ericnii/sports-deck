"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ActivityData {
  date: string;
  posts: number;
  comments: number;
}

interface UserActivityChartProps {
  username: string;
}

export default function UserActivityChart({ username }: UserActivityChartProps) {
  const [data, setData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorLine, setErrorLine] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!username) return;

    const fetchActivity = async () => {
      try {
        setIsLoading(true);
        setErrorLine(null);
        
        // Use the requested endpoint
        const res = await fetch(`/api/users/${username}/activity`);
        
        if (!res.ok) {
          throw new Error("Failed to fetch activity data.");
        }
        
        const jsonData = await res.json();
        
        if (isMounted) {
          // Fallback to empty array if data isn't structured as expected
          setData(jsonData.activityByDate || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorLine(err.message || "An error occurred while loading activity chart.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchActivity();

    return () => {
      isMounted = false;
    };
  }, [username]);

  // Render a pulsing skeleton loading state
  if (isLoading) {
    return (
      <div className="w-full h-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-lg flex flex-col justify-end gap-3 overflow-hidden relative">
        <h3 className="text-xl font-bold text-zinc-400 dark:text-zinc-600 absolute top-6 left-6">
          Activity Overview
        </h3>
        {/* Animated Bar Chart Skeleton */}
        <div className="w-full h-full flex items-end gap-2 animate-pulse mt-12 pb-2">
           {[40, 70, 45, 90, 65, 80, 50, 60, 100, 30].map((height, i) => (
             <div 
               key={i} 
               className="flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-t-sm" 
               style={{ height: `${height}%` }}
             ></div>
           ))}
        </div>
      </div>
    );
  }

  // Handle empty or error states uniquely within the chart container
  if (errorLine || data.length === 0) {
    return (
      <div className="w-full h-96 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center p-6 text-center shadow-lg">
        <svg className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">
          {errorLine ? "Failed to load activity chart" : "No activity data to display yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-lg transition group">
      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Activity Overview
      </h3>
      
      {/* 
        ResponsiveContainer dynamically resizes to fill its parent.
        Must be contained in a div with explicit height, otherwise it collapses to 0 height.
      */}
      <div className="w-full h-[calc(100%-3rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af" 
              tick={{ fill: '#9ca3af', fontSize: 12 }} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#9ca3af" 
              tick={{ fill: '#9ca3af', fontSize: 12 }} 
              tickLine={false} 
              axisLine={false}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151', 
                borderRadius: '0.75rem',
                color: '#f3f4f6',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
              }} 
              itemStyle={{ color: '#e5e7eb' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }} 
              iconType="circle"
            />
            <Line 
              type="monotone" 
              dataKey="posts" 
              name="Posts" 
              stroke="#818cf8" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: '#e0e7ff', strokeWidth: 2 }} 
            />
            <Line 
              type="monotone" 
              dataKey="comments" 
              name="Comments" 
              stroke="#34d399" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: '#d1fae5', strokeWidth: 2 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
