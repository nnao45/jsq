import type React from 'react';

interface JsonFormatterProps {
    content: string;
}

export const JsonFormatter: React.FC<JsonFormatterProps> = ({ content }) => {
    return (
        <pre style={{
            margin: 0,
            padding: '15px',
            backgroundColor: '#1e1e1e',
            borderRadius: '4px',
            color: '#e0e0e0',
            fontSize: '14px',
            fontFamily: "'Monaco', 'Consolas', 'Courier New', monospace",
            overflowX: 'auto',
            maxHeight: '400px',
            overflowY: 'auto'
        }}>
            {content}
        </pre>
    );
};