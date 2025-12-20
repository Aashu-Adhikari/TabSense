import { useState, useEffect, useRef } from 'react';
import { chromeApi } from '../services/chromeApi';

export const useSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const searchTimeoutRef = useRef(null);

  const performSearch = async (term) => {
    if (!term.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    try {
      setSearchLoading(true);
      setError(null);
      const response = await chromeApi.searchAllTabs(term);
      
      if (response && response.success) {
        setSearchResults(response);
      } else {
        throw new Error('Search failed');
      }
    } catch (err) {
      setError(err.message);
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
    setError(null);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    if (term.trim()) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(term);
      }, 300);
    } else {
      setSearchResults(null);
      setSearchLoading(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    searchTerm,
    searchResults,
    searchLoading,
    error,
    handleSearchChange,
    clearSearch,
    performSearch
  };
};
