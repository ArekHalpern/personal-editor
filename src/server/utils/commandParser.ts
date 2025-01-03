import { EditOperation } from '../types/assistant';

interface OperationPatterns {
  operation: EditOperation;
  patterns: string[];
}

const operationPatterns: OperationPatterns[] = [
  {
    operation: 'inline_edit',
    patterns: [
      'edit',
      'change',
      'modify',
      'update',
      'fix',
      'improve',
      'enhance',
      'rewrite',
      'rephrase',
      'revise',
      'adjust',
      'tweak',
      'refine',
      'polish',
      'shorten',
      'lengthen',
      'expand',
      'clarify',
      'simplify'
    ]
  },
  {
    operation: 'multi_line_edit',
    patterns: [
      'edit lines',
      'change lines',
      'modify lines',
      'update lines',
      'fix lines',
      'improve lines',
      'enhance lines',
      'rewrite lines',
      'revise lines'
    ]
  },
  {
    operation: 'continue_text',
    patterns: [
      'continue',
      'add',
      'append',
      'extend',
      'proceed',
      'go on',
      'write more',
      'add more',
      'keep going'
    ]
  },
  {
    operation: 'summarize_text',
    patterns: [
      'summarize',
      'summary',
      'tldr',
      'summarise',
      'brief',
      'overview',
      'recap',
      'condense',
      'digest',
      'outline'
    ]
  },
  {
    operation: 'analyze_text',
    patterns: [
      'analyze',
      'analyse',
      'review',
      'check',
      'suggest',
      'examine',
      'inspect',
      'evaluate',
      'assess',
      'explain',
      'describe',
      'tell me about',
      'what is',
      'what does',
      'how does',
      'show me',
      'help me understand',
      'what\'s in',
      'what is in',
      'contents of',
      'purpose of',
      'explain the file',
      'about this file',
      'about the file',
      'understand this file',
      'understand the file'
    ]
  }
];

interface ParsedCommand {
  operation: EditOperation;
  lineNumbers?: number[];
  afterLine?: number;
  isFileQuery?: boolean;
}

export function parseCommand(message: string): ParsedCommand {
  // Convert to lowercase for easier matching
  const lowerMessage = message.toLowerCase();

  // Check if this is a file-level query
  const isFileQuery = lowerMessage.includes('file') || 
                     lowerMessage.includes('this') ||
                     Boolean(lowerMessage.match(/^what|^how|^explain|^show|^tell/));

  // First, check for multi-line edit patterns as they're most specific
  const multiLineMatch = lowerMessage.match(/(?:\w+)\s+lines?\s+(\d+(?:\s*-\s*\d+)?|\d+(?:\s*,\s*\d+)*)/i);
  if (multiLineMatch) {
    return {
      operation: 'multi_line_edit',
      lineNumbers: extractLineNumbers(multiLineMatch[1])
    };
  }

  // Check for continuation with line number
  const continueMatch = lowerMessage.match(/(?:continue|add|append|extend)\s+(?:after\s+)?(?:line\s+)?(\d+)?/i);
  if (continueMatch) {
    return {
      operation: 'continue_text',
      afterLine: continueMatch[1] ? parseInt(continueMatch[1]) : undefined
    };
  }

  // Check each operation's patterns
  for (const { operation, patterns } of operationPatterns) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern)) {
        return { 
          operation,
          isFileQuery: operation === 'analyze_text' ? isFileQuery : undefined
        };
      }
    }
  }

  // Default to analyze_text if no patterns match
  return {
    operation: 'analyze_text',
    isFileQuery: true // Default to true for unmatched queries
  };
}

// Helper function to extract line numbers from command
function extractLineNumbers(lineSpec: string): number[] {
  const numbers: number[] = [];
  
  // Handle ranges (e.g., "2-5")
  if (lineSpec.includes('-')) {
    const [start, end] = lineSpec.split('-').map(n => parseInt(n.trim()));
    for (let i = start; i <= end; i++) {
      numbers.push(i);
    }
  }
  // Handle comma-separated numbers (e.g., "2,4,6")
  else if (lineSpec.includes(',')) {
    numbers.push(...lineSpec.split(',').map(n => parseInt(n.trim())));
  }
  // Handle single number
  else {
    numbers.push(parseInt(lineSpec.trim()));
  }
  
  return numbers.filter(n => !isNaN(n));
} 