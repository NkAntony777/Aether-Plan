import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ResourceItem {
    id: string;
    title: string;
    type?: string;
    description?: string;
    url?: string;
}

interface ResourceListWidgetProps {
    payload: {
        title?: string;
        resources: ResourceItem[];
    };
}

const ResourceListWidget: React.FC<ResourceListWidgetProps> = ({ payload }) => {
    const { title, resources } = payload;

    return (
        <div className="w-full max-w-3xl">
            {title && (
                <p className="text-sm font-serif text-stone-500 mb-4 tracking-wider italic">-- {title} --</p>
            )}
            <div className="space-y-3">
                {resources.map((resource) => (
                    <div
                        key={resource.id}
                        className="rounded-xl border border-stone-100 bg-white px-5 py-4 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-stone-800">{resource.title}</div>
                                {resource.type && (
                                    <div className="mt-1 text-xs text-stone-500">{resource.type}</div>
                                )}
                                {resource.description && (
                                    <div className="mt-2 text-xs text-stone-500 leading-relaxed">{resource.description}</div>
                                )}
                            </div>
                            {resource.url && (
                                <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cn(
                                        'inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900',
                                        'transition-colors'
                                    )}
                                >
                                    查看
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResourceListWidget;
