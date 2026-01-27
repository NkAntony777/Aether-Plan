import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownCardWidgetProps {
    payload: {
        title?: string;
        content: string;
    };
}

const MarkdownCardWidget: React.FC<MarkdownCardWidgetProps> = ({ payload }) => {
    const { title, content } = payload;

    return (
        <div className="w-full max-w-3xl rounded-2xl border border-stone-100 bg-white shadow-sm px-6 py-5">
            {title && <h3 className="text-base font-serif text-stone-800 mb-4">{title}</h3>}
            <div className="text-sm md:text-base leading-relaxed text-stone-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default MarkdownCardWidget;
