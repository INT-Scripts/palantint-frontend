import React, { ReactNode } from "react";

interface BoxProps {
    icon?: ReactNode;
    title?: string;
    rightContent?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}

export function Box({ icon, title, rightContent, children, className = "", contentClassName = "" }: BoxProps) {
    return (
        <div className={`bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 flex flex-col relative shadow-2xl rounded-none ${className}`}>
            {title && (
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 bg-black/20 shrink-0">
                    <h3 className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        {icon}
                        {title}
                    </h3>
                    {rightContent && (
                        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                            {rightContent}
                        </div>
                    )}
                </div>
            )}
            <div className={`flex-1 relative overflow-hidden ${contentClassName}`}>
                {children}
            </div>
        </div>
    );
}
