import React from 'react';

interface SkeletonProps {
    type: 'card' | 'table' | 'text';
    rows?: number;
}

export default function SkeletonLoader({ type, rows = 3 }: SkeletonProps) {
    const shimmer = "animate-pulse bg-slate-200 rounded";

    if (type === 'table') {
        return (
            <div className="space-y-4 w-full">
                {[...Array(rows)].map((_, i) => (
                    <div key={i} className="flex space-x-4">
                        <div className={`h-10 w-12 ${shimmer}`}></div>
                        <div className={`h-10 flex-1 ${shimmer}`}></div>
                        <div className={`h-10 w-24 ${shimmer}`}></div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'card') {
        return (
            <div className="p-6 border border-slate-200 rounded-xl bg-white space-y-4">
                <div className={`h-6 w-1/3 ${shimmer}`}></div>
                <div className={`h-24 w-full ${shimmer}`}></div>
                <div className="flex justify-between">
                    <div className={`h-4 w-20 ${shimmer}`}></div>
                    <div className={`h-4 w-20 ${shimmer}`}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className={`h-4 w-full ${shimmer}`}></div>
            ))}
        </div>
    );
}