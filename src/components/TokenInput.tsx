import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

type Token = {
    id: string;
    label: string;
    removable?: boolean;
};

type TokenInputProps = {
    tokens: Token[];
    onTokensChange: (tokens: Token[]) => void;
    suggestions: Token[];
    placeholder: string;
    className?: string;
};

export function TokenInput({
                               tokens,
                               onTokensChange,
                               suggestions,
                               placeholder,
                               className,
                           }: TokenInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<Token[]>([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Filter suggestions based on input and exclude already selected tokens
    useEffect(() => {
        if (!inputValue.trim()) {
            setFilteredSuggestions([]);
            return;
        }

        const selectedIds = new Set(tokens.map(token => token.id));
        const filtered = suggestions.filter(
            suggestion =>
                !selectedIds.has(suggestion.id) &&
                suggestion.label.toLowerCase().includes(inputValue.toLowerCase())
        );

        setFilteredSuggestions(filtered);
        setSelectedSuggestionIndex(0); // Reset selection when filter changes
    }, [inputValue, suggestions, tokens]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (filteredSuggestions.length === 0) return;

        // Arrow down
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestionIndex(prev =>
                prev < filteredSuggestions.length - 1 ? prev + 1 : prev
            );
        }

        // Arrow up
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : 0));
        }

        // Enter or Tab to select
        else if ((e.key === 'Enter' || e.key === 'Tab') && showSuggestions) {
            e.preventDefault();
            const selectedSuggestion = filteredSuggestions[selectedSuggestionIndex];
            if (selectedSuggestion) {
                addToken(selectedSuggestion);
            }
        }

        // Escape to close suggestions
        else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const addToken = (token: Token) => {
        onTokensChange([...tokens, token]);
        setInputValue('');
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const removeToken = (id: string) => {
        onTokensChange(tokens.filter(token => token.id !== id));
    };

    // Click outside to close suggestions
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className || ''}`}>
            <div
                className="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-400">
                {tokens.map((token) => (
                    <div
                        key={token.id}
                        className="flex items-center bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-md text-sm"
                    >
                        <span>{token.label}</span>
                        {token.removable !== false && (
                            <button
                                type="button"
                                onClick={() => removeToken(token.id)}
                                className="ml-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                            >
                                <X className="h-3.5 w-3.5"/>
                            </button>
                        )}
                    </div>
                ))}

                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={tokens.length === 0 ? placeholder : ''}
                    className="flex-grow min-w-[120px] bg-transparent border-0 p-1 text-sm text-gray-900 dark:text-white focus:ring-0 outline-none"
                />
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto"
                >
                    {filteredSuggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.id}
                            onClick={() => addToken(suggestion)}
                            className={`px-4 py-2 cursor-pointer text-sm ${
                                index === selectedSuggestionIndex
                                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {suggestion.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}