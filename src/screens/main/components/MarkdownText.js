import React from 'react';
import { Text, Platform } from 'react-native'; // Added Platform import

/**
 * Component to render text with markdown-style formatting
 * Supports: **bold**, *italic*, _italic_, __bold__, and `code`
 */
const MarkdownText = ({ text, style, isUser = false }) => {
  if (!text) return null;

  // Parse the text and convert markdown to React Native Text components
  const parseMarkdown = (inputText) => {
    const parts = [];
    let currentIndex = 0;
    let key = 0;

    // Regular expressions for markdown patterns
    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, type: 'bold' },        // **bold**
      { regex: /_(.+?)_/g, type: 'italic' },            // _italic_
      { regex: /__(.+?)__/g, type: 'bold' },            // __bold__
      { regex: /`(.+?)`/g, type: 'code' },              // `code`
    ];

    // Find all markdown matches in the text
    const allMatches = [];
    patterns.forEach(({ regex, type }) => {
      let match;
      const regexCopy = new RegExp(regex.source, regex.flags);
      while ((match = regexCopy.exec(inputText)) !== null) {
        allMatches.push({
          type,
          start: match.index,
          end: match.index + match[0].length,
          fullMatch: match[0],
          content: match[1],
        });
      }
    });

    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (keep the first one)
    const nonOverlappingMatches = [];
    let lastEnd = -1;
    allMatches.forEach((match) => {
      if (match.start >= lastEnd) {
        nonOverlappingMatches.push(match);
        lastEnd = match.end;
      }
    });

    // Build the text components
    nonOverlappingMatches.forEach((match) => {
      // Add text before the match
      if (currentIndex < match.start) {
        const plainText = inputText.slice(currentIndex, match.start);
        if (plainText) {
          parts.push(
            <Text key={`text-${key++}`} style={style}>
              {plainText}
            </Text>
          );
        }
      }

      // Add the formatted match
      switch (match.type) {
        case 'bold':
          parts.push(
            <Text key={`bold-${key++}`} style={[style, { fontWeight: '700' }]}>
              {match.content}
            </Text>
          );
          break;
        case 'italic':
          parts.push(
            <Text key={`italic-${key++}`} style={[style, { fontStyle: 'italic' }]}>
              {match.content}
            </Text>
          );
          break;
        case 'code':
          parts.push(
            <Text
              key={`code-${key++}`}
              style={[
                style,
                {
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  backgroundColor: isUser ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  borderRadius: 3,
                },
              ]}
            >
              {match.content}
            </Text>
          );
          break;
      }

      currentIndex = match.end;
    });

    // Add remaining text after last match
    if (currentIndex < inputText.length) {
      const remainingText = inputText.slice(currentIndex);
      if (remainingText) {
        parts.push(
          <Text key={`text-${key++}`} style={style}>
            {remainingText}
          </Text>
        );
      }
    }

    // If no matches found, return the original text
    if (parts.length === 0) {
      return <Text style={style}>{inputText}</Text>;
    }

    return <Text style={style}>{parts}</Text>;
  };

  return parseMarkdown(text);
};

export default MarkdownText;