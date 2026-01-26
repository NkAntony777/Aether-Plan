import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-1 max-w-[85%] mr-auto"
        >
            <span className="text-[10px] font-medium uppercase tracking-widest text-stone-400 mb-1 px-1 text-left">
                Aether
            </span>
            <div className="bg-white border border-stone-100 rounded-2xl rounded-tl-sm px-5 py-4 w-16 flex items-center justify-center gap-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <span className="typing-dot w-1.5 h-1.5 bg-stone-400 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 bg-stone-400 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 bg-stone-400 rounded-full" />
            </div>
        </motion.div>
    );
};

export default TypingIndicator;
