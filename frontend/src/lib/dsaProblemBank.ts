export interface DsaTestCase {
  id: number;
  label: string;
  input: string;
  args: any[];
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

export interface DsaArgMeta {
  name: string;
  type: string;
}

export interface DsaTrap {
  trapName: string;
  misconception: string;
  counterExample: string;
  pushbackPrompt: string;
}

export interface DsaHints {
  tier1_conceptual: string;
  tier2_structural: string;
  tier3_concrete: string;
}

export interface DsaProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tagline: string;
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  entryPoint: string;
  args: DsaArgMeta[];
  returnType: string;
  optimalTimeComplexity: string;
  optimalSpaceComplexity: string;
  edgeCasesToProbe: string[];
  traps: DsaTrap[];
  hints: DsaHints;
  templates: Record<"Python" | "JavaScript" | "C++" | "Java", string>;
  testCases: DsaTestCase[];
}

export const DSA_PROBLEMS: DsaProblem[] = [
  {
    "id": "longest-substring",
    "title": "Longest Substring Without Repeating Characters",
    "difficulty": "Medium",
    "tagline": "String length up to 5*10^4. Letters, digits, symbols.",
    "description": "Given a string s, find the length of the longest substring without duplicate characters.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "s = 'abcabcbb', expected 3",
        "output": ""
      },
      {
        "input": "s = 'bbbbb', expected 1",
        "output": ""
      },
      {
        "input": "s = 'pwwkew', expected 3",
        "output": ""
      }
    ],
    "entryPoint": "lengthOfLongestSubstring",
    "args": [
      {
        "name": "s",
        "type": "string"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(min(N, Sigma))",
    "edgeCasesToProbe": [
      "How does direct index jump optimize over single-step increment?",
      "What is space complexity if input is UTF-8?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "sliding window technique with left and right pointers",
      "tier2_structural": "frequency hash map/array storing last seen index",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def lengthOfLongestSubstring(self, input_val):\n        pass\n",
      "JavaScript": "function lengthOfLongestSubstring(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void lengthOfLongestSubstring() {\n    }\n};\n",
      "Java": "class Solution {\n    public void lengthOfLongestSubstring() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"abcabcbb\"",
        "args": [
          "\"abcabcbb\""
        ],
        "expectedOutput": "3",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "\"bbbbb\"",
        "args": [
          "\"bbbbb\""
        ],
        "expectedOutput": "1",
        "isHidden": false
      },
      {
        "id": 3,
        "label": "Test Case 3",
        "input": "\"pwwkew\"",
        "args": [
          "\"pwwkew\""
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "min-window-substring",
    "title": "Minimum Window Substring",
    "difficulty": "Hard",
    "tagline": "s and t lengths up to 10^5, uppercase/lowercase English letters.",
    "description": "Given two strings s and t, return the minimum window substring of s such that every character in t is included in the window.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "s = 'ADOBECODEBANC', t = 'ABC', expected 'BANC'",
        "output": ""
      },
      {
        "input": "s = 'a', t = 'a', expected 'a'",
        "output": ""
      }
    ],
    "entryPoint": "minWindow",
    "args": [
      {
        "name": "s",
        "type": "string"
      },
      {
        "name": "t",
        "type": "string"
      }
    ],
    "returnType": "string",
    "optimalTimeComplexity": "O(N + M)",
    "optimalSpaceComplexity": "O(Sigma)",
    "edgeCasesToProbe": [
      "How do you avoid re-scanning the frequency map on every window shift?",
      "What happens if multiple minimal windows exist?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "frequency count map of t",
      "tier2_structural": "two pointers expanding right and contracting left",
      "tier3_concrete": "Think about optimal approach: O(N + M)"
    },
    "templates": {
      "Python": "class Solution:\n    def minWindow(self, input_val):\n        pass\n",
      "JavaScript": "function minWindow(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void minWindow() {\n    }\n};\n",
      "Java": "class Solution {\n    public void minWindow() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"ADOBECODEBANC\"\n\"ABC\"",
        "args": [
          "\"ADOBECODEBANC\"",
          "\"ABC\""
        ],
        "expectedOutput": "\"BANC\"",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "\"a\"\n\"a\"",
        "args": [
          "\"a\"",
          "\"a\""
        ],
        "expectedOutput": "\"a\"",
        "isHidden": false
      }
    ]
  },
  {
    "id": "longest-repeating-char-replacement",
    "title": "Longest Repeating Character Replacement",
    "difficulty": "Medium",
    "tagline": "s length up to 10^5, k >= 0, s consists of uppercase English letters.",
    "description": "Given a string s and an integer k, return the length of the longest substring containing the same letter you can get after changing at most k characters.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "s = 'ABAB', k = 2, expected 4",
        "output": ""
      },
      {
        "input": "s = 'AABABBA', k = 1, expected 4",
        "output": ""
      }
    ],
    "entryPoint": "characterReplacement",
    "args": [
      {
        "name": "s",
        "type": "string"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why do we not need to decrement max_freq when shrinking the left window boundary?",
      "Prove correctness of monotonic expansion."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "window length minus max frequency <= k condition",
      "tier2_structural": "track max_freq in current window",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def characterReplacement(self, input_val):\n        pass\n",
      "JavaScript": "function characterReplacement(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void characterReplacement() {\n    }\n};\n",
      "Java": "class Solution {\n    public void characterReplacement() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"ABAB\"\n2",
        "args": [
          "\"ABAB\"",
          "2"
        ],
        "expectedOutput": "4",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "\"AABABBA\"\n1",
        "args": [
          "\"AABABBA\"",
          "1"
        ],
        "expectedOutput": "4",
        "isHidden": false
      }
    ]
  },
  {
    "id": "permutation-in-string",
    "title": "Permutation in String",
    "difficulty": "Medium",
    "tagline": "s1, s2 lengths up to 10^4, lowercase English letters.",
    "description": "Given two strings s1 and s2, return true if s2 contains a permutation of s1, or false otherwise.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "s1 = 'ab', s2 = 'eidbaooo', expected true",
        "output": ""
      },
      {
        "input": "s1 = 'ab', s2 = 'eidboaoo', expected false",
        "output": ""
      }
    ],
    "entryPoint": "checkInclusion",
    "args": [
      {
        "name": "s1",
        "type": "string"
      },
      {
        "name": "s2",
        "type": "string"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "How can you update the character count differential in O(1) without iterating 26 chars each step?",
      "Can this be extended to arbitrary Unicode?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "fixed size sliding window of size len(s1)",
      "tier2_structural": "frequency array comparison with matches counter",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def checkInclusion(self, input_val):\n        pass\n",
      "JavaScript": "function checkInclusion(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void checkInclusion() {\n    }\n};\n",
      "Java": "class Solution {\n    public void checkInclusion() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"ab\"\n\"eidbaooo\"",
        "args": [
          "\"ab\"",
          "\"eidbaooo\""
        ],
        "expectedOutput": "true",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "\"ab\"\n\"eidboaoo\"",
        "args": [
          "\"ab\"",
          "\"eidboaoo\""
        ],
        "expectedOutput": "false",
        "isHidden": false
      }
    ]
  },
  {
    "id": "fruit-into-baskets",
    "title": "Fruit Into Baskets",
    "difficulty": "Medium",
    "tagline": "fruits length up to 10^5, fruits[i] >= 0.",
    "description": "You have two baskets and each basket can hold only one type of fruit. Return the maximum number of fruits you can pick from trees in a row.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "fruits = [1,2,1], expected 3",
        "output": ""
      },
      {
        "input": "fruits = [0,1,2,2], expected 3",
        "output": ""
      }
    ],
    "entryPoint": "totalFruit",
    "args": [
      {
        "name": "fruits",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "How would the algorithm generalize if there were K baskets instead of 2?",
      "What is the amortized complexity per tree element?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "longest contiguous subarray with at most 2 distinct elements",
      "tier2_structural": "hash map with window pointers",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def totalFruit(self, input_val):\n        pass\n",
      "JavaScript": "function totalFruit(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void totalFruit() {\n    }\n};\n",
      "Java": "class Solution {\n    public void totalFruit() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,1]",
        "args": [
          "[1,2,1]"
        ],
        "expectedOutput": "3",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[0,1,2,2]",
        "args": [
          "[0,1,2,2]"
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "max-consecutive-ones-iii",
    "title": "Max Consecutive Ones III",
    "difficulty": "Medium",
    "tagline": "nums length up to 10^5, k in [0, len(nums)].",
    "description": "Given a binary array nums and an integer k, return the maximum number of consecutive 1's if you can flip at most k 0's.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2, expected 6",
        "output": ""
      }
    ],
    "entryPoint": "longestOnes",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "How does the non-shrinking window optimization work to keep maximum window width without while loop shrinking?",
      "Explain the invariant."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "sliding window maintaining at most k zeros",
      "tier2_structural": "expand right pointer, contract left when zero_count > k",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def longestOnes(self, input_val):\n        pass\n",
      "JavaScript": "function longestOnes(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void longestOnes() {\n    }\n};\n",
      "Java": "class Solution {\n    public void longestOnes() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,1,1,0,0,0,1,1,1,1,0]\n2",
        "args": [
          "[1,1,1,0,0,0,1,1,1,1,0]",
          "2"
        ],
        "expectedOutput": "6",
        "isHidden": false
      }
    ]
  },
  {
    "id": "three-sum",
    "title": "3Sum",
    "difficulty": "Medium",
    "tagline": "nums length up to 3000, nums[i] between -10^5 and 10^5.",
    "description": "Given an integer array nums, return all triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0 without duplicate triplets.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [-1,0,1,2,-1,-4], expected [[-1,-1,2],[-1,0,1]]",
        "output": ""
      }
    ],
    "entryPoint": "threeSum",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number[][]",
    "optimalTimeComplexity": "O(N^2)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why is sorting required over 3 nested loops or hash maps?",
      "How do you handle duplicates cleanly for both the outer and inner pointers?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "sort array first in O(N log N)",
      "tier2_structural": "fix first element and use two pointers for remaining two",
      "tier3_concrete": "Think about optimal approach: O(N^2)"
    },
    "templates": {
      "Python": "class Solution:\n    def threeSum(self, input_val):\n        pass\n",
      "JavaScript": "function threeSum(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void threeSum() {\n    }\n};\n",
      "Java": "class Solution {\n    public void threeSum() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[-1,0,1,2,-1,-4]",
        "args": [
          "[-1,0,1,2,-1,-4]"
        ],
        "expectedOutput": "[[-1,-1,2],[-1,0,1]]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "container-with-most-water",
    "title": "Container With Most Water",
    "difficulty": "Medium",
    "tagline": "height length up to 10^5, height[i] >= 0.",
    "description": "Given n non-negative integers representing heights of vertical lines, find two lines that together with the x-axis form a container containing the most water.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "height = [1,8,6,2,5,4,8,3,7], expected 49",
        "output": ""
      },
      {
        "input": "height = [1,1], expected 1",
        "output": ""
      }
    ],
    "entryPoint": "maxArea",
    "args": [
      {
        "name": "height",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Prove mathematically why advancing the smaller height never misses a potential optimal container.",
      "Can height be negative?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "two pointers at start and end",
      "tier2_structural": "area = min(h[l], h[r]) * (r - l)",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def maxArea(self, input_val):\n        pass\n",
      "JavaScript": "function maxArea(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void maxArea() {\n    }\n};\n",
      "Java": "class Solution {\n    public void maxArea() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,8,6,2,5,4,8,3,7]",
        "args": [
          "[1,8,6,2,5,4,8,3,7]"
        ],
        "expectedOutput": "49",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1,1]",
        "args": [
          "[1,1]"
        ],
        "expectedOutput": "1",
        "isHidden": false
      }
    ]
  },
  {
    "id": "trapping-rain-water",
    "title": "Trapping Rain Water",
    "difficulty": "Hard",
    "tagline": "height length up to 2*10^4, height[i] >= 0.",
    "description": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "height = [0,1,0,2,1,0,1,3,2,1,2,1], expected 6",
        "output": ""
      }
    ],
    "entryPoint": "trap",
    "args": [
      {
        "name": "height",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Compare the two-pointer approach with monotonic stack and prefix/suffix arrays in time/space trade-offs.",
      "How does it handle plateau elevations?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "two pointers with left_max and right_max",
      "tier2_structural": "water trapped at index bounded by min(left_max, right_max) - height[i]",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def trap(self, input_val):\n        pass\n",
      "JavaScript": "function trap(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void trap() {\n    }\n};\n",
      "Java": "class Solution {\n    public void trap() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[0,1,0,2,1,0,1,3,2,1,2,1]",
        "args": [
          "[0,1,0,2,1,0,1,3,2,1,2,1]"
        ],
        "expectedOutput": "6",
        "isHidden": false
      }
    ]
  },
  {
    "id": "two-sum-ii",
    "title": "Two Sum II - Input Array Is Sorted",
    "difficulty": "Medium",
    "tagline": "numbers length up to 3*10^4, numbers sorted non-decreasing, exactly one solution.",
    "description": "Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "numbers = [2,7,11,15], target = 9, expected [1,2]",
        "output": ""
      }
    ],
    "entryPoint": "twoSum",
    "args": [
      {
        "name": "numbers",
        "type": "number[]"
      },
      {
        "name": "target",
        "type": "number"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why does binary search take O(N log N) while two pointers achieves O(N)?",
      "How do you guarantee no integer overflow occurs when calculating sum?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "two pointers at left=0 and right=n-1",
      "tier2_structural": "sum < target moves left rightward; sum > target moves right leftward",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def twoSum(self, input_val):\n        pass\n",
      "JavaScript": "function twoSum(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void twoSum() {\n    }\n};\n",
      "Java": "class Solution {\n    public void twoSum() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[2,7,11,15]\n9",
        "args": [
          "[2,7,11,15]",
          "9"
        ],
        "expectedOutput": "[1,2]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "sort-colors",
    "title": "Sort Colors (Dutch National Flag)",
    "difficulty": "Medium",
    "tagline": "nums length up to 300, elements are 0, 1, or 2.",
    "description": "Given an array nums with n objects colored red, white, or blue (0, 1, 2), sort them in-place so that objects of the same color are adjacent.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [2,0,2,1,1,0], expected [0,0,1,1,2,2]",
        "output": ""
      }
    ],
    "entryPoint": "sortColors",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "void",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why does moving a 2 to high NOT increment mid, while moving a 0 to low increments mid?",
      "Explain the tripartite partition invariant."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "three pointers: low, mid, high",
      "tier2_structural": "swap 0 to low and increment low+mid; swap 2 to high and decrement high; 1 increments mid",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def sortColors(self, input_val):\n        pass\n",
      "JavaScript": "function sortColors(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void sortColors() {\n    }\n};\n",
      "Java": "class Solution {\n    public void sortColors() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[2,0,2,1,1,0]",
        "args": [
          "[2,0,2,1,1,0]"
        ],
        "expectedOutput": "[0,0,1,1,2,2]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "subarray-product-less-than-k",
    "title": "Subarray Product Less Than K",
    "difficulty": "Medium",
    "tagline": "nums length up to 3*10^4, nums[i] >= 1, k >= 0.",
    "description": "Given an array of integers nums and an integer k, return the number of contiguous subarrays where the product of all the elements in the subarray is strictly less than k.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [10,5,2,6], k = 100, expected 8",
        "output": ""
      }
    ],
    "entryPoint": "numSubarrayProductLessThanK",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why is the number of new subarrays added simply (right - left + 1)?",
      "What edge case arises when k <= 1?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "sliding window multiplying right and dividing left when product >= k",
      "tier2_structural": "number of valid subarrays ending at right is (right - left + 1)",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def numSubarrayProductLessThanK(self, input_val):\n        pass\n",
      "JavaScript": "function numSubarrayProductLessThanK(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void numSubarrayProductLessThanK() {\n    }\n};\n",
      "Java": "class Solution {\n    public void numSubarrayProductLessThanK() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[10,5,2,6]\n100",
        "args": [
          "[10,5,2,6]",
          "100"
        ],
        "expectedOutput": "8",
        "isHidden": false
      }
    ]
  },
  {
    "id": "minimum-size-subarray-sum",
    "title": "Minimum Size Subarray Sum",
    "difficulty": "Medium",
    "tagline": "nums length up to 10^5, target up to 10^9, all elements positive.",
    "description": "Given an array of positive integers nums and a positive integer target, return the minimal length of a contiguous subarray of which the sum is greater than or equal to target.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "target = 7, nums = [2,3,1,2,4,3], expected 2",
        "output": ""
      }
    ],
    "entryPoint": "minSubArrayLen",
    "args": [
      {
        "name": "target",
        "type": "number"
      },
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why does this two-pointer approach fail if the array contains negative numbers?",
      "How would you solve it with negative numbers in O(N)? (Prefix sum + Monotonic Deque)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "two pointers expanding right to reach sum >= target",
      "tier2_structural": "contract left pointer while maintaining sum >= target to minimize window length",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def minSubArrayLen(self, input_val):\n        pass\n",
      "JavaScript": "function minSubArrayLen(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void minSubArrayLen() {\n    }\n};\n",
      "Java": "class Solution {\n    public void minSubArrayLen() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "7\n[2,3,1,2,4,3]",
        "args": [
          "7",
          "[2,3,1,2,4,3]"
        ],
        "expectedOutput": "2",
        "isHidden": false
      }
    ]
  },
  {
    "id": "sliding-window-maximum",
    "title": "Sliding Window Maximum",
    "difficulty": "Hard",
    "tagline": "nums length up to 10^5, k in [1, len(nums)].",
    "description": "You are given an array of integers nums, there is a sliding window of size k which is moving from the very left to the right. Return the max sliding window.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,3,-1,-3,5,3,6,7], k = 3, expected [3,3,5,5,6,7]",
        "output": ""
      }
    ],
    "entryPoint": "maxSlidingWindow",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(K)",
    "edgeCasesToProbe": [
      "Why does each element get pushed and popped at most once leading to amortized O(1) per step?",
      "Compare monotonic deque vs Max-Heap with lazy deletion."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "monotonic decreasing deque storing indices",
      "tier2_structural": "elements smaller than current element popped from back",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def maxSlidingWindow(self, input_val):\n        pass\n",
      "JavaScript": "function maxSlidingWindow(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void maxSlidingWindow() {\n    }\n};\n",
      "Java": "class Solution {\n    public void maxSlidingWindow() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,3,-1,-3,5,3,6,7]\n3",
        "args": [
          "[1,3,-1,-3,5,3,6,7]",
          "3"
        ],
        "expectedOutput": "[3,3,5,5,6,7]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "find-all-anagrams",
    "title": "Find All Anagrams in a String",
    "difficulty": "Medium",
    "tagline": "s, p lengths up to 3*10^4, lowercase English letters.",
    "description": "Given two strings s and p, return an array of all the start indices of p's anagrams in s.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "s = 'cbaebabacd', p = 'abc', expected [0,6]",
        "output": ""
      }
    ],
    "entryPoint": "findAnagrams",
    "args": [
      {
        "name": "s",
        "type": "string"
      },
      {
        "name": "p",
        "type": "string"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "How to maintain the character count difference in O(1) rather than comparing all 26 frequencies at each shift?",
      "Explain edge case where len(s) < len(p)."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "fixed sliding window of length len(p)",
      "tier2_structural": "character frequency arrays for p and window in s",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def findAnagrams(self, input_val):\n        pass\n",
      "JavaScript": "function findAnagrams(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void findAnagrams() {\n    }\n};\n",
      "Java": "class Solution {\n    public void findAnagrams() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"cbaebabacd\"\n\"abc\"",
        "args": [
          "\"cbaebabacd\"",
          "\"abc\""
        ],
        "expectedOutput": "[0,6]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "subarray-sum-k",
    "title": "Subarray Sum Equals K",
    "difficulty": "Medium",
    "tagline": "nums length up to 2*10^4, elements between -1000 and 1000.",
    "description": "Given an array of integers nums and an integer k, return the total number of subarrays whose sum equals to k.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,1,1], k = 2, expected 2",
        "output": ""
      },
      {
        "input": "nums = [1,2,3], k = 3, expected 2",
        "output": ""
      }
    ],
    "entryPoint": "subarraySum",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why does the two-pointer sliding window fail when negative numbers are present?",
      "Why initialize map with {0: 1}?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "prefix sum with frequency hash map",
      "tier2_structural": "formula: prefix_sum[j] - prefix_sum[i] = k -> prefix_sum[i] = prefix_sum[j] - k",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def subarraySum(self, input_val):\n        pass\n",
      "JavaScript": "function subarraySum(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void subarraySum() {\n    }\n};\n",
      "Java": "class Solution {\n    public void subarraySum() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,1,1]\n2",
        "args": [
          "[1,1,1]",
          "2"
        ],
        "expectedOutput": "2",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1,2,3]\n3",
        "args": [
          "[1,2,3]",
          "3"
        ],
        "expectedOutput": "2",
        "isHidden": false
      }
    ]
  },
  {
    "id": "product-except-self",
    "title": "Product of Array Except Self",
    "difficulty": "Medium",
    "tagline": "nums length up to 10^5, answer fits in 32-bit integer.",
    "description": "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i] without using division.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,2,3,4], expected [24,12,8,6]",
        "output": ""
      },
      {
        "input": "nums = [-1,1,0,-3,3], expected [0,0,9,0,0]",
        "output": ""
      }
    ],
    "entryPoint": "productExceptSelf",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why is the division operator prohibited?",
      "How to accumulate the suffix product on-the-fly using a single accumulator variable?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "prefix products pass from left to right",
      "tier2_structural": "suffix products pass from right to left",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def productExceptSelf(self, input_val):\n        pass\n",
      "JavaScript": "function productExceptSelf(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void productExceptSelf() {\n    }\n};\n",
      "Java": "class Solution {\n    public void productExceptSelf() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3,4]",
        "args": [
          "[1,2,3,4]"
        ],
        "expectedOutput": "[24,12,8,6]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[-1,1,0,-3,3]",
        "args": [
          "[-1,1,0,-3,3]"
        ],
        "expectedOutput": "[0,0,9,0,0]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "longest-consecutive-sequence",
    "title": "Longest Consecutive Sequence",
    "difficulty": "Medium",
    "tagline": "nums length up to 10^5, nums[i] between -10^9 and 10^9.",
    "description": "Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence in O(n) time.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [100,4,200,1,3,2], expected 4",
        "output": ""
      },
      {
        "input": "nums = [0,3,7,2,5,8,4,6,0,1], expected 9",
        "output": ""
      }
    ],
    "entryPoint": "longestConsecutive",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why does checking (num - 1) guarantee each element is visited at most twice yielding O(N)?",
      "What is worst-case hash collision complexity?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "insert all elements into a hash set",
      "tier2_structural": "only start counting streak if (num - 1) is NOT in set (identifies sequence root)",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def longestConsecutive(self, input_val):\n        pass\n",
      "JavaScript": "function longestConsecutive(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void longestConsecutive() {\n    }\n};\n",
      "Java": "class Solution {\n    public void longestConsecutive() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[100,4,200,1,3,2]",
        "args": [
          "[100,4,200,1,3,2]"
        ],
        "expectedOutput": "4",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[0,3,7,2,5,8,4,6,0,1]",
        "args": [
          "[0,3,7,2,5,8,4,6,0,1]"
        ],
        "expectedOutput": "9",
        "isHidden": false
      }
    ]
  },
  {
    "id": "group-anagrams",
    "title": "Group Anagrams",
    "difficulty": "Medium",
    "tagline": "strs length up to 10^4, strings length up to 100.",
    "description": "Given an array of strings strs, group the anagrams together. You can return the answer in any order.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "strs = ['eat','tea','tan','ate','nat','bat'], expected [['bat'],['nat','tan'],['ate','eat','tea']]",
        "output": ""
      }
    ],
    "entryPoint": "groupAnagrams",
    "args": [
      {
        "name": "strs",
        "type": "string[]"
      }
    ],
    "returnType": "string[][]",
    "optimalTimeComplexity": "O(N * K)",
    "optimalSpaceComplexity": "O(N * K)",
    "edgeCasesToProbe": [
      "Compare sorted string key O(N * K log K) vs character count tuple key O(N * K).",
      "How to serialize count tuple into a compact hash key?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "hash map keying on character count tuple (26 counts) or sorted string",
      "tier2_structural": "character count tuple achieves O(N * K) time",
      "tier3_concrete": "Think about optimal approach: O(N * K)"
    },
    "templates": {
      "Python": "class Solution:\n    def groupAnagrams(self, input_val):\n        pass\n",
      "JavaScript": "function groupAnagrams(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void groupAnagrams() {\n    }\n};\n",
      "Java": "class Solution {\n    public void groupAnagrams() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
        "args": [
          "[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]"
        ],
        "expectedOutput": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "top-k-frequent-elements",
    "title": "Top K Frequent Elements",
    "difficulty": "Medium",
    "tagline": "nums length up to 10^5, k in [1, unique elements].",
    "description": "Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,1,1,2,2,3], k = 2, expected [1,2]",
        "output": ""
      },
      {
        "input": "nums = [1], k = 1, expected [1]",
        "output": ""
      }
    ],
    "entryPoint": "topKFrequent",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "How does bucket sort achieve strict linear time O(N)?",
      "Compare Quickselect vs Min-Heap vs Bucket Sort."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "frequency hash map followed by bucket sort on frequencies",
      "tier2_structural": "bucket array indexed 0 to N holding lists of numbers",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def topKFrequent(self, input_val):\n        pass\n",
      "JavaScript": "function topKFrequent(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void topKFrequent() {\n    }\n};\n",
      "Java": "class Solution {\n    public void topKFrequent() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,1,1,2,2,3]\n2",
        "args": [
          "[1,1,1,2,2,3]",
          "2"
        ],
        "expectedOutput": "[1,2]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1]\n1",
        "args": [
          "[1]",
          "1"
        ],
        "expectedOutput": "[1]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "continuous-subarray-sum",
    "title": "Continuous Subarray Sum (Multiple of K)",
    "difficulty": "Medium",
    "tagline": "nums length up to 10^5, k between 1 and 2^31-1.",
    "description": "Given an integer array nums and an integer k, return true if nums has a good subarray of length at least two whose sum is a multiple of k.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [23,2,4,6,7], k = 6, expected true",
        "output": ""
      },
      {
        "input": "nums = [23,2,6,4,7], k = 6, expected true",
        "output": ""
      }
    ],
    "entryPoint": "checkSubarraySum",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(min(N, K))",
    "edgeCasesToProbe": [
      "Why does identical remainder (rem_j == rem_i) prove the subarray sum between i and j is divisible by k?",
      "Explain {0: -1} initialization."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "prefix sum modulo k stored in hash map",
      "tier2_structural": "map stores remainder -> earliest index seen",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def checkSubarraySum(self, input_val):\n        pass\n",
      "JavaScript": "function checkSubarraySum(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void checkSubarraySum() {\n    }\n};\n",
      "Java": "class Solution {\n    public void checkSubarraySum() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[23,2,4,6,7]\n6",
        "args": [
          "[23,2,4,6,7]",
          "6"
        ],
        "expectedOutput": "true",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[23,2,6,4,7]\n6",
        "args": [
          "[23,2,6,4,7]",
          "6"
        ],
        "expectedOutput": "true",
        "isHidden": false
      }
    ]
  },
  {
    "id": "contiguous-array",
    "title": "Contiguous Array (Equal 0s and 1s)",
    "difficulty": "Medium",
    "tagline": "nums length up to 10^5.",
    "description": "Given a binary array nums, return the maximum length of a contiguous subarray with an equal number of 0 and 1.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [0,1], expected 2",
        "output": ""
      },
      {
        "input": "nums = [0,1,0], expected 2",
        "output": ""
      }
    ],
    "entryPoint": "findMaxLength",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "How does mapping 0 to -1 transform this into the subarray sum equals 0 problem?",
      "Why only record the first seen index in the hash map?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "treat 0 as -1 and 1 as +1",
      "tier2_structural": "track running prefix sum in hash map: sum -> first seen index",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def findMaxLength(self, input_val):\n        pass\n",
      "JavaScript": "function findMaxLength(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void findMaxLength() {\n    }\n};\n",
      "Java": "class Solution {\n    public void findMaxLength() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[0,1]",
        "args": [
          "[0,1]"
        ],
        "expectedOutput": "2",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[0,1,0]",
        "args": [
          "[0,1,0]"
        ],
        "expectedOutput": "2",
        "isHidden": false
      }
    ]
  },
  {
    "id": "encode-and-decode-strings",
    "title": "Encode and Decode Strings",
    "difficulty": "Medium",
    "tagline": "strs can contain any of the 256 ASCII characters.",
    "description": "Design an algorithm to encode a list of strings to a single string and decode it back to the original list without delimiter collision.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "strs = ['lint','code','love','you'], expected ['lint','code','love','you']",
        "output": ""
      }
    ],
    "entryPoint": "encodeAndDecode",
    "args": [
      {
        "name": "strs",
        "type": "string[]"
      }
    ],
    "returnType": "string[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why is simple character escaping (like '\\,') more fragile than length-prefixed framing?",
      "How do real protocols like HTTP/2 or Redis RESP frame messages?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "length-prefixed framing: for each string encode as '<len>#<string>'",
      "tier2_structural": "decoder reads digits until '#' then reads exactly len bytes",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def encodeAndDecode(self, input_val):\n        pass\n",
      "JavaScript": "function encodeAndDecode(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void encodeAndDecode() {\n    }\n};\n",
      "Java": "class Solution {\n    public void encodeAndDecode() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[\"lint\",\"code\",\"love\",\"you\"]",
        "args": [
          "[\"lint\",\"code\",\"love\",\"you\"]"
        ],
        "expectedOutput": "[\"lint\",\"code\",\"love\",\"you\"]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "valid-sudoku",
    "title": "Valid Sudoku",
    "difficulty": "Medium",
    "tagline": "board is 9x9, cells contain '1'-'9' or '.'.",
    "description": "Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to standard rules.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "board = [['5','3','.','.','7','.','.','.','.']], expected true",
        "output": ""
      }
    ],
    "entryPoint": "isValidSudoku",
    "args": [
      {
        "name": "board",
        "type": "string[][]"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(1)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "How can bit manipulation with a single integer per row/col/box reduce auxiliary space to 27 integers?",
      "What is the bitwise check expression?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "bitmasks or hash sets for each row (9), column (9), and sub-box (9)",
      "tier2_structural": "sub-box index calculated as (row // 3) * 3 + (col // 3)",
      "tier3_concrete": "Think about optimal approach: O(1)"
    },
    "templates": {
      "Python": "class Solution:\n    def isValidSudoku(self, input_val):\n        pass\n",
      "JavaScript": "function isValidSudoku(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void isValidSudoku() {\n    }\n};\n",
      "Java": "class Solution {\n    public void isValidSudoku() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[\"5\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"]]",
        "args": [
          "[[\"5\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"]]"
        ],
        "expectedOutput": "true",
        "isHidden": false
      }
    ]
  },
  {
    "id": "first-missing-positive",
    "title": "First Missing Positive",
    "difficulty": "Hard",
    "tagline": "nums length up to 10^5, elements in range [-2^31, 2^31 - 1].",
    "description": "Given an unsorted integer array nums, return the smallest positive integer that is not present in nums in O(n) time and O(1) auxiliary space.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,2,0], expected 3",
        "output": ""
      },
      {
        "input": "nums = [3,4,-1,1], expected 2",
        "output": ""
      },
      {
        "input": "nums = [7,8,9,11,12], expected 1",
        "output": ""
      }
    ],
    "entryPoint": "firstMissingPositive",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why does each swap place at least one number in its permanent correct position bounding total swaps to N?",
      "How to handle duplicates during swapping?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "cyclic sort placing each number x into index x-1 if 1 <= x <= n",
      "tier2_structural": "second pass finds first index i where nums[i] != i + 1",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def firstMissingPositive(self, input_val):\n        pass\n",
      "JavaScript": "function firstMissingPositive(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void firstMissingPositive() {\n    }\n};\n",
      "Java": "class Solution {\n    public void firstMissingPositive() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,0]",
        "args": [
          "[1,2,0]"
        ],
        "expectedOutput": "3",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[3,4,-1,1]",
        "args": [
          "[3,4,-1,1]"
        ],
        "expectedOutput": "2",
        "isHidden": false
      },
      {
        "id": 3,
        "label": "Test Case 3",
        "input": "[7,8,9,11,12]",
        "args": [
          "[7,8,9,11,12]"
        ],
        "expectedOutput": "1",
        "isHidden": false
      }
    ]
  },
  {
    "id": "daily-temperatures",
    "title": "Daily Temperatures",
    "difficulty": "Medium",
    "tagline": "temperatures length up to 10^5, temperatures[i] between 30 and 100.",
    "description": "Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "temperatures = [73,74,75,71,69,72,76,73], expected [1,1,4,2,1,1,0,0]",
        "output": ""
      }
    ],
    "entryPoint": "dailyTemperatures",
    "args": [
      {
        "name": "temperatures",
        "type": "number[]"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why is each index pushed and popped at most once guaranteeing linear time?",
      "What is stored in the stack for days with no future warmer temperature?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "monotonic decreasing stack storing indices",
      "tier2_structural": "while current temp > stack.top temp, pop and resolve wait days: i - prev_idx",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def dailyTemperatures(self, input_val):\n        pass\n",
      "JavaScript": "function dailyTemperatures(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void dailyTemperatures() {\n    }\n};\n",
      "Java": "class Solution {\n    public void dailyTemperatures() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[73,74,75,71,69,72,76,73]",
        "args": [
          "[73,74,75,71,69,72,76,73]"
        ],
        "expectedOutput": "[1,1,4,2,1,1,0,0]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "largest-rectangle-histogram",
    "title": "Largest Rectangle in Histogram",
    "difficulty": "Hard",
    "tagline": "heights length up to 10^5, heights[i] >= 0.",
    "description": "Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "heights = [2,1,5,6,2,3], expected 10",
        "output": ""
      },
      {
        "input": "heights = [2,4], expected 4",
        "output": ""
      }
    ],
    "entryPoint": "largestRectangleArea",
    "args": [
      {
        "name": "heights",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Explain why dummy 0 bars at the boundaries simplify the logic and eliminate edge-case popping.",
      "How does this generalize to maximal rectangle in binary matrix?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "monotonic increasing stack storing indices",
      "tier2_structural": "when a shorter bar arrives, pop top and calculate width = (i - stack.peek() - 1)",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def largestRectangleArea(self, input_val):\n        pass\n",
      "JavaScript": "function largestRectangleArea(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void largestRectangleArea() {\n    }\n};\n",
      "Java": "class Solution {\n    public void largestRectangleArea() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[2,1,5,6,2,3]",
        "args": [
          "[2,1,5,6,2,3]"
        ],
        "expectedOutput": "10",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[2,4]",
        "args": [
          "[2,4]"
        ],
        "expectedOutput": "4",
        "isHidden": false
      }
    ]
  },
  {
    "id": "min-stack",
    "title": "Min Stack",
    "difficulty": "Medium",
    "tagline": "Methods push, pop, top, and getMin called up to 3*10^4 times.",
    "description": "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time O(1).",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "operations: push(-2), push(0), push(-3), getMin(), pop(), top(), getMin(), expected [-3, 0, -2]",
        "output": ""
      }
    ],
    "entryPoint": "MinStack",
    "args": [
      {
        "name": "input_val",
        "type": "any"
      }
    ],
    "returnType": "void",
    "optimalTimeComplexity": "O(1)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Explain the math behind storing 2*val - minVal without secondary stack.",
      "How do you detect overflow if values are near 32-bit integer limits?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dual stack or stack storing tuples (val, current_min)",
      "tier2_structural": "single stack encoding difference (2*val - minVal) to achieve O(1) space per entry",
      "tier3_concrete": "Think about optimal approach: O(1)"
    },
    "templates": {
      "Python": "class Solution:\n    def MinStack(self, input_val):\n        pass\n",
      "JavaScript": "function MinStack(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void MinStack() {\n    }\n};\n",
      "Java": "class Solution {\n    public void MinStack() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[\"MinStack\",\"push\",\"push\",\"push\",\"getMin\",\"pop\",\"top\",\"getMin\"]\n[[],[-2],[0],[-3],[],[],[],[]]",
        "args": [
          "[\"MinStack\",\"push\",\"push\",\"push\",\"getMin\",\"pop\",\"top\",\"getMin\"]",
          "[[],[-2],[0],[-3],[],[],[],[]]"
        ],
        "expectedOutput": "[null,null,null,null,-3,null,0,-2]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "evaluate-reverse-polish-notation",
    "title": "Evaluate Reverse Polish Notation",
    "difficulty": "Medium",
    "tagline": "tokens length up to 10^4, tokens are operators '+', '-', '*', '/' or integers.",
    "description": "You are given an array of strings tokens that represents an arithmetic expression in a Reverse Polish Notation. Evaluate the expression.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "tokens = ['2','1','+','3','*'], expected 9",
        "output": ""
      },
      {
        "input": "tokens = ['4','13','5','/','+'], expected 6",
        "output": ""
      }
    ],
    "entryPoint": "evalRPN",
    "args": [
      {
        "name": "tokens",
        "type": "string[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why does Python's // division behave differently from C++/Java for negative numbers, and how to truncate toward zero in Python?",
      "Give time/space complexity."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "operand stack",
      "tier2_structural": "when operator encountered, pop right operand then left operand, compute result, push back",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def evalRPN(self, input_val):\n        pass\n",
      "JavaScript": "function evalRPN(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void evalRPN() {\n    }\n};\n",
      "Java": "class Solution {\n    public void evalRPN() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[\"2\",\"1\",\"+\",\"3\",\"*\"]",
        "args": [
          "[\"2\",\"1\",\"+\",\"3\",\"*\"]"
        ],
        "expectedOutput": "9",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[\"4\",\"13\",\"5\",\"/\",\"+\"]",
        "args": [
          "[\"4\",\"13\",\"5\",\"/\",\"+\"]"
        ],
        "expectedOutput": "6",
        "isHidden": false
      }
    ]
  },
  {
    "id": "next-greater-element-i",
    "title": "Next Greater Element I",
    "difficulty": "Easy",
    "tagline": "nums1, nums2 lengths up to 1000, distinct integers.",
    "description": "The next greater element of some element x in an array is the first greater element that is to the right of x in the same array. Find next greater for nums1 in nums2.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums1 = [4,1,2], nums2 = [1,3,4,2], expected [-1,3,-1]",
        "output": ""
      }
    ],
    "entryPoint": "nextGreaterElement",
    "args": [
      {
        "name": "nums1",
        "type": "number[]"
      },
      {
        "name": "nums2",
        "type": "number[]"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N1 + N2)",
    "optimalSpaceComplexity": "O(N2)",
    "edgeCasesToProbe": [
      "How does the monotonic stack maintain decreasing order?",
      "What happens if an element has no next greater element?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "monotonic stack traversing nums2 to build next_greater hash map",
      "tier2_structural": "lookup each nums1 element in map in O(1)",
      "tier3_concrete": "Think about optimal approach: O(N1 + N2)"
    },
    "templates": {
      "Python": "class Solution:\n    def nextGreaterElement(self, input_val):\n        pass\n",
      "JavaScript": "function nextGreaterElement(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void nextGreaterElement() {\n    }\n};\n",
      "Java": "class Solution {\n    public void nextGreaterElement() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[4,1,2]\n[1,3,4,2]",
        "args": [
          "[4,1,2]",
          "[1,3,4,2]"
        ],
        "expectedOutput": "[-1,3,-1]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "next-greater-element-ii",
    "title": "Next Greater Element II (Circular Array)",
    "difficulty": "Medium",
    "tagline": "nums length up to 10^4, nums[i] between -10^9 and 10^9.",
    "description": "Given a circular integer array nums, return the next greater number for every element in nums.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,2,1], expected [2,-1,2]",
        "output": ""
      },
      {
        "input": "nums = [1,2,3,4,3], expected [2,3,4,-1,4]",
        "output": ""
      }
    ],
    "entryPoint": "nextGreaterElements",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why are exactly 2*N iterations sufficient to resolve all circular next greater elements?",
      "Do we push indices during the second pass?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "simulate circular array by iterating 2 * N indices using modulo (i % n)",
      "tier2_structural": "monotonic decreasing stack storing indices",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def nextGreaterElements(self, input_val):\n        pass\n",
      "JavaScript": "function nextGreaterElements(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void nextGreaterElements() {\n    }\n};\n",
      "Java": "class Solution {\n    public void nextGreaterElements() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,1]",
        "args": [
          "[1,2,1]"
        ],
        "expectedOutput": "[2,-1,2]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1,2,3,4,3]",
        "args": [
          "[1,2,3,4,3]"
        ],
        "expectedOutput": "[2,3,4,-1,4]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "asteroid-collision",
    "title": "Asteroid Collision",
    "difficulty": "Medium",
    "tagline": "asteroids length up to 10^4, non-zero values between -1000 and 1000.",
    "description": "We are given an array asteroids of integers representing asteroids in a row. Find out the state of the asteroids after all collisions.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "asteroids = [5,10,-5], expected [5,10]",
        "output": ""
      },
      {
        "input": "asteroids = [8,-8], expected []",
        "output": ""
      },
      {
        "input": "asteroids = [10,2,-5], expected [10]",
        "output": ""
      }
    ],
    "entryPoint": "asteroidCollision",
    "args": [
      {
        "name": "asteroids",
        "type": "number[]"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "When do two asteroids NOT collide even if one is positive and one is negative? (e.g. [-2, 2])",
      "Handle equal size mutual annihilation."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "stack representing surviving asteroids moving right (> 0)",
      "tier2_structural": "when negative asteroid arrives, collide against positive asteroids on stack until one explodes",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def asteroidCollision(self, input_val):\n        pass\n",
      "JavaScript": "function asteroidCollision(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void asteroidCollision() {\n    }\n};\n",
      "Java": "class Solution {\n    public void asteroidCollision() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[5,10,-5]",
        "args": [
          "[5,10,-5]"
        ],
        "expectedOutput": "[5,10]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[8,-8]",
        "args": [
          "[8,-8]"
        ],
        "expectedOutput": "[]",
        "isHidden": false
      },
      {
        "id": 3,
        "label": "Test Case 3",
        "input": "[10,2,-5]",
        "args": [
          "[10,2,-5]"
        ],
        "expectedOutput": "[10]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "remove-k-digits",
    "title": "Remove K Digits",
    "difficulty": "Medium",
    "tagline": "num length up to 10^5, k <= len(num).",
    "description": "Given string num representing a non-negative integer and an integer k, return the smallest possible integer after removing k digits from num.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "num = '1432219', k = 3, expected '1219'",
        "output": ""
      },
      {
        "input": "num = '10200', k = 1, expected '200'",
        "output": ""
      },
      {
        "input": "num = '10', k = 2, expected '0'",
        "output": ""
      }
    ],
    "entryPoint": "removeKdigits",
    "args": [
      {
        "name": "num",
        "type": "string"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "string",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why is a greedy local removal of the first decreasing digit globally optimal?",
      "Handle edge case where result is empty or all zeros."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "monotonic increasing stack of digits",
      "tier2_structural": "while k > 0 and stack.top > digit, pop from stack",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def removeKdigits(self, input_val):\n        pass\n",
      "JavaScript": "function removeKdigits(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void removeKdigits() {\n    }\n};\n",
      "Java": "class Solution {\n    public void removeKdigits() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"1432219\"\n3",
        "args": [
          "\"1432219\"",
          "3"
        ],
        "expectedOutput": "\"1219\"",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "\"10200\"\n1",
        "args": [
          "\"10200\"",
          "1"
        ],
        "expectedOutput": "\"200\"",
        "isHidden": false
      },
      {
        "id": 3,
        "label": "Test Case 3",
        "input": "\"10\"\n2",
        "args": [
          "\"10\"",
          "2"
        ],
        "expectedOutput": "\"0\"",
        "isHidden": false
      }
    ]
  },
  {
    "id": "car-fleet",
    "title": "Car Fleet",
    "difficulty": "Medium",
    "tagline": "n up to 10^5, target up to 10^6.",
    "description": "There are n cars at given miles away from the starting mile 0, traveling to reach the destination at mile target. Return the number of car fleets that will arrive.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3], expected 3",
        "output": ""
      }
    ],
    "entryPoint": "carFleet",
    "args": [
      {
        "name": "target",
        "type": "number"
      },
      {
        "name": "position",
        "type": "number[]"
      },
      {
        "name": "speed",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N log N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why sort by position descending instead of ascending?",
      "Why do faster cars behind never pass a slower car in front?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "sort cars by starting position descending",
      "tier2_structural": "calculate time to target: (target - pos) / speed",
      "tier3_concrete": "Think about optimal approach: O(N log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def carFleet(self, input_val):\n        pass\n",
      "JavaScript": "function carFleet(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void carFleet() {\n    }\n};\n",
      "Java": "class Solution {\n    public void carFleet() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "12\n[10,8,0,5,3]\n[2,4,1,1,3]",
        "args": [
          "12",
          "[10,8,0,5,3]",
          "[2,4,1,1,3]"
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "trapping-rain-water-stack",
    "title": "Trapping Rain Water (Monotonic Stack Variant)",
    "difficulty": "Hard",
    "tagline": "heights up to 2*10^4.",
    "description": "Solve the trapping rain water problem using a monotonic decreasing stack to compute horizontal bounded water layers.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "height = [0,1,0,2,1,0,1,3,2,1,2,1], expected 6",
        "output": ""
      }
    ],
    "entryPoint": "trapStack",
    "args": [
      {
        "name": "height",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Contrast horizontal slice calculation (stack) with vertical column calculation (two pointers).",
      "Prove equivalent aggregate area."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "monotonic decreasing stack storing bar indices",
      "tier2_structural": "when higher bar encountered, pop bottom, compute bounded water between bottom and new stack.top",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def trapStack(self, input_val):\n        pass\n",
      "JavaScript": "function trapStack(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void trapStack() {\n    }\n};\n",
      "Java": "class Solution {\n    public void trapStack() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[0,1,0,2,1,0,1,3,2,1,2,1]",
        "args": [
          "[0,1,0,2,1,0,1,3,2,1,2,1]"
        ],
        "expectedOutput": "6",
        "isHidden": false
      }
    ]
  },
  {
    "id": "binary-search",
    "title": "Binary Search",
    "difficulty": "Easy",
    "tagline": "nums length up to 10^4, unique elements sorted ascending.",
    "description": "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums in O(log n) runtime.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [-1,0,3,5,9,12], target = 9, expected 4",
        "output": ""
      },
      {
        "input": "nums = [-1,0,3,5,9,12], target = 2, expected -1",
        "output": ""
      }
    ],
    "entryPoint": "search",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "target",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(log N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why does (left + right) // 2 risk integer overflow in languages like C++/Java?",
      "Explain loop termination invariant: while (left <= right)."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "mid = left + (right - left) // 2 to prevent integer overflow",
      "tier2_structural": "adjust pointers left = mid + 1 or right = mid - 1",
      "tier3_concrete": "Think about optimal approach: O(log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def search(self, input_val):\n        pass\n",
      "JavaScript": "function search(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void search() {\n    }\n};\n",
      "Java": "class Solution {\n    public void search() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[-1,0,3,5,9,12]\n9",
        "args": [
          "[-1,0,3,5,9,12]",
          "9"
        ],
        "expectedOutput": "4",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[-1,0,3,5,9,12]\n2",
        "args": [
          "[-1,0,3,5,9,12]",
          "2"
        ],
        "expectedOutput": "-1",
        "isHidden": false
      }
    ]
  },
  {
    "id": "search-rotated-sorted-array",
    "title": "Search in Rotated Sorted Array",
    "difficulty": "Medium",
    "tagline": "nums length up to 5000, unique elements rotated at unknown pivot.",
    "description": "Given the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums in O(log n) time.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 0, expected 4",
        "output": ""
      },
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 3, expected -1",
        "output": ""
      }
    ],
    "entryPoint": "searchRotated",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "target",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(log N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "How does this algorithm fail if duplicate elements are allowed? (nums[left] == nums[mid] == nums[right])",
      "Prove worst case with duplicates is O(N)."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "identify which half is sorted: nums[left] <= nums[mid] means left half sorted",
      "tier2_structural": "check if target falls within the sorted half range",
      "tier3_concrete": "Think about optimal approach: O(log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def searchRotated(self, input_val):\n        pass\n",
      "JavaScript": "function searchRotated(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void searchRotated() {\n    }\n};\n",
      "Java": "class Solution {\n    public void searchRotated() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[4,5,6,7,0,1,2]\n0",
        "args": [
          "[4,5,6,7,0,1,2]",
          "0"
        ],
        "expectedOutput": "4",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[4,5,6,7,0,1,2]\n3",
        "args": [
          "[4,5,6,7,0,1,2]",
          "3"
        ],
        "expectedOutput": "-1",
        "isHidden": false
      }
    ]
  },
  {
    "id": "find-min-rotated-sorted-array",
    "title": "Find Minimum in Rotated Sorted Array",
    "difficulty": "Medium",
    "tagline": "nums length up to 5000, unique elements.",
    "description": "Given the sorted rotated array nums of unique elements, return the minimum element of this array in O(log n) time.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [3,4,5,1,2], expected 1",
        "output": ""
      },
      {
        "input": "nums = [4,5,6,7,0,1,2], expected 0",
        "output": ""
      },
      {
        "input": "nums = [11,13,15,17], expected 11",
        "output": ""
      }
    ],
    "entryPoint": "findMin",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(log N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why compare mid with right instead of left?",
      "Why is right set to mid instead of mid - 1?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "compare nums[mid] with nums[right]",
      "tier2_structural": "if nums[mid] > nums[right], minimum lies in right half (left = mid + 1); else right = mid",
      "tier3_concrete": "Think about optimal approach: O(log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def findMin(self, input_val):\n        pass\n",
      "JavaScript": "function findMin(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void findMin() {\n    }\n};\n",
      "Java": "class Solution {\n    public void findMin() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,4,5,1,2]",
        "args": [
          "[3,4,5,1,2]"
        ],
        "expectedOutput": "1",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[4,5,6,7,0,1,2]",
        "args": [
          "[4,5,6,7,0,1,2]"
        ],
        "expectedOutput": "0",
        "isHidden": false
      },
      {
        "id": 3,
        "label": "Test Case 3",
        "input": "[11,13,15,17]",
        "args": [
          "[11,13,15,17]"
        ],
        "expectedOutput": "11",
        "isHidden": false
      }
    ]
  },
  {
    "id": "koko-eating-bananas",
    "title": "Koko Eating Bananas",
    "difficulty": "Medium",
    "tagline": "piles length up to 10^4, h between len(piles) and 10^9.",
    "description": "Koko can decide her bananas-per-hour eating speed of k. Return the minimum integer k such that she can eat all the bananas within h hours.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "piles = [3,6,7,11], h = 8, expected 4",
        "output": ""
      },
      {
        "input": "piles = [30,11,23,4,20], h = 5, expected 30",
        "output": ""
      }
    ],
    "entryPoint": "minEatingSpeed",
    "args": [
      {
        "name": "piles",
        "type": "number[]"
      },
      {
        "name": "h",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N log M)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why is the search space monotonic?",
      "How to implement ceil(p / k) using integer arithmetic: (p + k - 1) // k?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "binary search on answer space: speed k in range [1, max(piles)]",
      "tier2_structural": "feasibility check: sum(ceil(p / k)) <= h in O(N)",
      "tier3_concrete": "Think about optimal approach: O(N log M)"
    },
    "templates": {
      "Python": "class Solution:\n    def minEatingSpeed(self, input_val):\n        pass\n",
      "JavaScript": "function minEatingSpeed(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void minEatingSpeed() {\n    }\n};\n",
      "Java": "class Solution {\n    public void minEatingSpeed() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,6,7,11]\n8",
        "args": [
          "[3,6,7,11]",
          "8"
        ],
        "expectedOutput": "4",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[30,11,23,4,20]\n5",
        "args": [
          "[30,11,23,4,20]",
          "5"
        ],
        "expectedOutput": "30",
        "isHidden": false
      }
    ]
  },
  {
    "id": "ship-packages",
    "title": "Capacity To Ship Packages Within D Days",
    "difficulty": "Medium",
    "tagline": "weights length up to 5*10^4, days <= len(weights).",
    "description": "A conveyor belt has packages that must be shipped within days days. Return the least weight capacity of the ship that will result in all packages being shipped.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "weights = [1,2,3,4,5,6,7,8,9,10], days = 5, expected 15",
        "output": ""
      },
      {
        "input": "weights = [3,2,2,4,1,4], days = 3, expected 6",
        "output": ""
      }
    ],
    "entryPoint": "shipWithinDays",
    "args": [
      {
        "name": "weights",
        "type": "number[]"
      },
      {
        "name": "days",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N log S)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why must the lower bound be max(weights) rather than 1?",
      "Prove greedy packing per day is optimal."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "binary search on capacity space [max(weights), sum(weights)]",
      "tier2_structural": "greedy simulation to count required days for capacity cap",
      "tier3_concrete": "Think about optimal approach: O(N log S)"
    },
    "templates": {
      "Python": "class Solution:\n    def shipWithinDays(self, input_val):\n        pass\n",
      "JavaScript": "function shipWithinDays(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void shipWithinDays() {\n    }\n};\n",
      "Java": "class Solution {\n    public void shipWithinDays() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3,4,5,6,7,8,9,10]\n5",
        "args": [
          "[1,2,3,4,5,6,7,8,9,10]",
          "5"
        ],
        "expectedOutput": "15",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[3,2,2,4,1,4]\n3",
        "args": [
          "[3,2,2,4,1,4]",
          "3"
        ],
        "expectedOutput": "6",
        "isHidden": false
      }
    ]
  },
  {
    "id": "find-peak-element",
    "title": "Find Peak Element",
    "difficulty": "Medium",
    "tagline": "nums length up to 1000, nums[i] != nums[i+1].",
    "description": "A peak element is an element that is strictly greater than its neighbors. Given a 0-indexed integer array nums, find a peak element, and return its index in O(log n).",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,2,3,1], expected 2",
        "output": ""
      },
      {
        "input": "nums = [1,2,1,3,5,6,4], expected 5",
        "output": ""
      }
    ],
    "entryPoint": "findPeakElement",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(log N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Prove why a peak is mathematically guaranteed in the direction of the ascending slope.",
      "How are boundary conditions nums[-1] = nums[n] = -infinity handled?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "binary search on unsorted array using gradient",
      "tier2_structural": "if nums[mid] < nums[mid + 1], a peak is guaranteed to exist on the right side",
      "tier3_concrete": "Think about optimal approach: O(log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def findPeakElement(self, input_val):\n        pass\n",
      "JavaScript": "function findPeakElement(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void findPeakElement() {\n    }\n};\n",
      "Java": "class Solution {\n    public void findPeakElement() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3,1]",
        "args": [
          "[1,2,3,1]"
        ],
        "expectedOutput": "2",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1,2,1,3,5,6,4]",
        "args": [
          "[1,2,1,3,5,6,4]"
        ],
        "expectedOutput": "5",
        "isHidden": false
      }
    ]
  },
  {
    "id": "time-based-key-value-store",
    "title": "Time Based Key-Value Store",
    "difficulty": "Medium",
    "tagline": "timestamp strictly increasing per key, up to 2*10^5 operations.",
    "description": "Design a time-based key-value data structure that can store multiple values for the same key at different time stamps and retrieve the key's value at a certain timestamp.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "set('foo', 'bar', 1), get('foo', 1) -> 'bar', get('foo', 3) -> 'bar', set('foo', 'bar2', 4), get('foo', 4) -> 'bar2'",
        "output": ""
      }
    ],
    "entryPoint": "TimeMap",
    "args": [
      {
        "name": "input_val",
        "type": "any"
      }
    ],
    "returnType": "void",
    "optimalTimeComplexity": "O(log N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why does strictly increasing timestamp insertion guarantee sorted list enabling binary search?",
      "How to handle target_time smaller than all recorded timestamps?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "hash map storing key -> list of (timestamp, value) tuples",
      "tier2_structural": "binary search on timestamps for largest timestamp <= target_time",
      "tier3_concrete": "Think about optimal approach: O(log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def TimeMap(self, input_val):\n        pass\n",
      "JavaScript": "function TimeMap(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void TimeMap() {\n    }\n};\n",
      "Java": "class Solution {\n    public void TimeMap() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[\"TimeMap\",\"set\",\"get\",\"get\",\"set\",\"get\",\"get\"]\n[[],[\"foo\",\"bar\",1],[\"foo\",1],[\"foo\",3],[\"foo\",\"bar2\",4],[\"foo\",4],[\"foo\",5]]",
        "args": [
          "[\"TimeMap\",\"set\",\"get\",\"get\",\"set\",\"get\",\"get\"]",
          "[[],[\"foo\",\"bar\",1],[\"foo\",1],[\"foo\",3],[\"foo\",\"bar2\",4],[\"foo\",4],[\"foo\",5]]"
        ],
        "expectedOutput": "[null,null,\"bar\",\"bar\",null,\"bar2\",\"bar2\"]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "median-two-sorted-arrays",
    "title": "Median of Two Sorted Arrays",
    "difficulty": "Hard",
    "tagline": "nums1, nums2 lengths up to 1000, sorted ascending.",
    "description": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays in O(log(min(m, n))) runtime.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums1 = [1,3], nums2 = [2], expected 2.0",
        "output": ""
      },
      {
        "input": "nums1 = [1,2], nums2 = [3,4], expected 2.5",
        "output": ""
      }
    ],
    "entryPoint": "findMedianSortedArrays",
    "args": [
      {
        "name": "nums1",
        "type": "number[]"
      },
      {
        "name": "nums2",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(log(min(M, N)))",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why must binary search run on the smaller array?",
      "How do you handle edge cases when partition cuts at index 0 or N?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "binary search on partition of smaller array",
      "tier2_structural": "partition conditions: left1 <= right2 and left2 <= right1",
      "tier3_concrete": "Think about optimal approach: O(log(min(M, N)))"
    },
    "templates": {
      "Python": "class Solution:\n    def findMedianSortedArrays(self, input_val):\n        pass\n",
      "JavaScript": "function findMedianSortedArrays(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void findMedianSortedArrays() {\n    }\n};\n",
      "Java": "class Solution {\n    public void findMedianSortedArrays() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,3]\n[2]",
        "args": [
          "[1,3]",
          "[2]"
        ],
        "expectedOutput": "2.0",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1,2]\n[3,4]",
        "args": [
          "[1,2]",
          "[3,4]"
        ],
        "expectedOutput": "2.5",
        "isHidden": false
      }
    ]
  },
  {
    "id": "split-array-largest-sum",
    "title": "Split Array Largest Sum",
    "difficulty": "Hard",
    "tagline": "nums length up to 1000, nums[i] >= 0, k in [1, min(50, len(nums))].",
    "description": "Given an integer array nums and an integer k, split nums into k non-empty subarrays such that the largest sum of any subarray is minimized.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [7,2,5,10,8], k = 2, expected 18",
        "output": ""
      },
      {
        "input": "nums = [1,2,3,4,5], k = 2, expected 9",
        "output": ""
      }
    ],
    "entryPoint": "splitArray",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N log S)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Show that this problem is mathematically identical to Capacity To Ship Packages Within D Days.",
      "Can dynamic programming solve this? Compare Big-O."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "binary search answer space [max(nums), sum(nums)]",
      "tier2_structural": "feasibility check: greedy greedily greedily count subarrays needed for max allowed sum S",
      "tier3_concrete": "Think about optimal approach: O(N log S)"
    },
    "templates": {
      "Python": "class Solution:\n    def splitArray(self, input_val):\n        pass\n",
      "JavaScript": "function splitArray(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void splitArray() {\n    }\n};\n",
      "Java": "class Solution {\n    public void splitArray() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[7,2,5,10,8]\n2",
        "args": [
          "[7,2,5,10,8]",
          "2"
        ],
        "expectedOutput": "18",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1,2,3,4,5]\n2",
        "args": [
          "[1,2,3,4,5]",
          "2"
        ],
        "expectedOutput": "9",
        "isHidden": false
      }
    ]
  },
  {
    "id": "search-2d-matrix",
    "title": "Search a 2D Matrix",
    "difficulty": "Medium",
    "tagline": "m, n up to 100.",
    "description": "You are given an m x n integer matrix with elements sorted left-to-right and first integer of each row > last of previous row. Search for target in O(log(m * n)).",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3, expected true",
        "output": ""
      }
    ],
    "entryPoint": "searchMatrix",
    "args": [
      {
        "name": "matrix",
        "type": "number[][]"
      },
      {
        "name": "target",
        "type": "number"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(log(MN))",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Contrast this matrix with Search a 2D Matrix II (row sorted, col sorted).",
      "What is the optimal complexity for Search a 2D Matrix II? (O(M + N) saddleback)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "treat 2D matrix as flattened 1D array of length m * n",
      "tier2_structural": "mapping index: row = mid // n, col = mid % n",
      "tier3_concrete": "Think about optimal approach: O(log(MN))"
    },
    "templates": {
      "Python": "class Solution:\n    def searchMatrix(self, input_val):\n        pass\n",
      "JavaScript": "function searchMatrix(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void searchMatrix() {\n    }\n};\n",
      "Java": "class Solution {\n    public void searchMatrix() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n3",
        "args": [
          "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]",
          "3"
        ],
        "expectedOutput": "true",
        "isHidden": false
      }
    ]
  },
  {
    "id": "find-first-last-position",
    "title": "Find First and Last Position of Element in Sorted Array",
    "difficulty": "Medium",
    "tagline": "nums length up to 10^5.",
    "description": "Given an array of integers nums sorted in non-decreasing order, find the starting and ending position of a given target value in O(log n).",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [5,7,7,8,8,10], target = 8, expected [3,4]",
        "output": ""
      },
      {
        "input": "nums = [5,7,7,8,8,10], target = 6, expected [-1,-1]",
        "output": ""
      }
    ],
    "entryPoint": "searchRange",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "target",
        "type": "number"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(log N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "How does the pointer update differ when finding left bound (right = mid - 1 on match) vs right bound (left = mid + 1 on match)?",
      "Provide exact termination condition."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "two binary searches: one finding leftmost occurrence (bias left), one finding rightmost (bias right)",
      "tier2_structural": "O(log N) time and O(1) space",
      "tier3_concrete": "Think about optimal approach: O(log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def searchRange(self, input_val):\n        pass\n",
      "JavaScript": "function searchRange(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void searchRange() {\n    }\n};\n",
      "Java": "class Solution {\n    public void searchRange() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[5,7,7,8,8,10]\n8",
        "args": [
          "[5,7,7,8,8,10]",
          "8"
        ],
        "expectedOutput": "[3,4]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[5,7,7,8,8,10]\n6",
        "args": [
          "[5,7,7,8,8,10]",
          "6"
        ],
        "expectedOutput": "[-1,-1]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "sqrtx",
    "title": "Sqrt(x)",
    "difficulty": "Easy",
    "tagline": "x in [0, 2^31 - 1].",
    "description": "Given a non-negative integer x, return the square root of x rounded down to the nearest integer without using built-in exponent functions.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "x = 4, expected 2",
        "output": ""
      },
      {
        "input": "x = 8, expected 2",
        "output": ""
      }
    ],
    "entryPoint": "mySqrt",
    "args": [
      {
        "name": "x",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(log X)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "How do you prevent 32-bit integer overflow when calculating mid * mid?",
      "Compare binary search vs Newton's method in convergence speed."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "binary search in range [0, x // 2 + 1]",
      "tier2_structural": "mid * mid <= x condition",
      "tier3_concrete": "Think about optimal approach: O(log X)"
    },
    "templates": {
      "Python": "class Solution:\n    def mySqrt(self, input_val):\n        pass\n",
      "JavaScript": "function mySqrt(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void mySqrt() {\n    }\n};\n",
      "Java": "class Solution {\n    public void mySqrt() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "4",
        "args": [
          "4"
        ],
        "expectedOutput": "2",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "8",
        "args": [
          "8"
        ],
        "expectedOutput": "2",
        "isHidden": false
      }
    ]
  },
  {
    "id": "reverse-linked-list",
    "title": "Reverse Linked List",
    "difficulty": "Easy",
    "tagline": "List length up to 5000.",
    "description": "Given the head of a singly linked list, reverse the list, and return the reversed list iteratively in O(N) time and O(1) space.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "head = [1,2,3,4,5], expected [5,4,3,2,1]",
        "output": ""
      }
    ],
    "entryPoint": "reverseList",
    "args": [
      {
        "name": "head",
        "type": "ListNode"
      }
    ],
    "returnType": "ListNode",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Explain the recursive formulation and its call-stack space overhead O(N).",
      "Can you reverse a sublist between positions left and right?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "three pointers: prev, curr, next_node",
      "tier2_structural": "redirect curr.next = prev, advance prev = curr, curr = next_node",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def reverseList(self, input_val):\n        pass\n",
      "JavaScript": "function reverseList(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void reverseList() {\n    }\n};\n",
      "Java": "class Solution {\n    public void reverseList() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3,4,5]",
        "args": [
          "[1,2,3,4,5]"
        ],
        "expectedOutput": "[5,4,3,2,1]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "merge-two-sorted-lists",
    "title": "Merge Two Sorted Lists",
    "difficulty": "Easy",
    "tagline": "list1, list2 lengths up to 50.",
    "description": "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list and return its head.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "list1 = [1,2,4], list2 = [1,3,4], expected [1,1,2,3,4,4]",
        "output": ""
      }
    ],
    "entryPoint": "mergeTwoLists",
    "args": [
      {
        "name": "list1",
        "type": "ListNode"
      },
      {
        "name": "list2",
        "type": "ListNode"
      }
    ],
    "returnType": "ListNode",
    "optimalTimeComplexity": "O(N + M)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why is a sentinel dummy node preferred over manual head initialization?",
      "What is time complexity if list lengths are N and M?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dummy sentinel node head",
      "tier2_structural": "compare l1.val and l2.val, attach smaller node to tail, advance",
      "tier3_concrete": "Think about optimal approach: O(N + M)"
    },
    "templates": {
      "Python": "class Solution:\n    def mergeTwoLists(self, input_val):\n        pass\n",
      "JavaScript": "function mergeTwoLists(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void mergeTwoLists() {\n    }\n};\n",
      "Java": "class Solution {\n    public void mergeTwoLists() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,4]\n[1,3,4]",
        "args": [
          "[1,2,4]",
          "[1,3,4]"
        ],
        "expectedOutput": "[1,1,2,3,4,4]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "merge-k-sorted-lists",
    "title": "Merge k Sorted Lists",
    "difficulty": "Hard",
    "tagline": "k up to 10^4, total nodes up to 10^4.",
    "description": "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "lists = [[1,4,5],[1,3,4],[2,6]], expected [1,1,2,3,4,4,5,6]",
        "output": ""
      }
    ],
    "entryPoint": "mergeKLists",
    "args": [
      {
        "name": "lists",
        "type": "ListNode[]"
      }
    ],
    "returnType": "ListNode",
    "optimalTimeComplexity": "O(N log K)",
    "optimalSpaceComplexity": "O(K)",
    "edgeCasesToProbe": [
      "Contrast Min-Heap approach with Divide-and-Conquer pairwise merge (O(N log K) and O(1) heap memory).",
      "Prove depth of divide-and-conquer tree."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "Min-Heap storing (node.val, list_idx, node)",
      "tier2_structural": "extract min, append to result, push node.next if exists",
      "tier3_concrete": "Think about optimal approach: O(N log K)"
    },
    "templates": {
      "Python": "class Solution:\n    def mergeKLists(self, input_val):\n        pass\n",
      "JavaScript": "function mergeKLists(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void mergeKLists() {\n    }\n};\n",
      "Java": "class Solution {\n    public void mergeKLists() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[1,4,5],[1,3,4],[2,6]]",
        "args": [
          "[[1,4,5],[1,3,4],[2,6]]"
        ],
        "expectedOutput": "[1,1,2,3,4,4,5,6]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "reorder-list",
    "title": "Reorder List (L0 -> Ln -> L1 -> Ln-1...)",
    "difficulty": "Medium",
    "tagline": "List length up to 5*10^4.",
    "description": "You are given the head of a singly linked-list. Reorder the list to: L0 -> Ln -> L1 -> Ln-1 -> L2 -> Ln-2 in-place without modifying node values.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "head = [1,2,3,4], expected [1,4,2,3]",
        "output": ""
      },
      {
        "input": "head = [1,2,3,4,5], expected [1,5,2,4,3]",
        "output": ""
      }
    ],
    "entryPoint": "reorderList",
    "args": [
      {
        "name": "head",
        "type": "ListNode"
      }
    ],
    "returnType": "void",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why is three-step decomposition (find middle, reverse half, interleave) optimal in O(1) memory?",
      "Handle odd vs even node count."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "find middle of list using fast/slow pointers",
      "tier2_structural": "reverse the second half of the list",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def reorderList(self, input_val):\n        pass\n",
      "JavaScript": "function reorderList(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void reorderList() {\n    }\n};\n",
      "Java": "class Solution {\n    public void reorderList() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3,4]",
        "args": [
          "[1,2,3,4]"
        ],
        "expectedOutput": "[1,4,2,3]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1,2,3,4,5]",
        "args": [
          "[1,2,3,4,5]"
        ],
        "expectedOutput": "[1,5,2,4,3]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "remove-nth-node-from-end",
    "title": "Remove Nth Node From End of List",
    "difficulty": "Medium",
    "tagline": "List length up to 30, n <= length.",
    "description": "Given the head of a linked list, remove the nth node from the end of the list and return its head in one pass.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "head = [1,2,3,4,5], n = 2, expected [1,2,3,5]",
        "output": ""
      },
      {
        "input": "head = [1], n = 1, expected []",
        "output": ""
      }
    ],
    "entryPoint": "removeNthFromEnd",
    "args": [
      {
        "name": "head",
        "type": "ListNode"
      },
      {
        "name": "n",
        "type": "number"
      }
    ],
    "returnType": "ListNode",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why is dummy sentinel critical when removing the head node itself (n == length)?",
      "Prove one-pass efficiency."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dummy sentinel node before head",
      "tier2_structural": "two pointers fast and slow spaced n + 1 steps apart",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def removeNthFromEnd(self, input_val):\n        pass\n",
      "JavaScript": "function removeNthFromEnd(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void removeNthFromEnd() {\n    }\n};\n",
      "Java": "class Solution {\n    public void removeNthFromEnd() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3,4,5]\n2",
        "args": [
          "[1,2,3,4,5]",
          "2"
        ],
        "expectedOutput": "[1,2,3,5]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1]\n1",
        "args": [
          "[1]",
          "1"
        ],
        "expectedOutput": "[]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "linked-list-cycle-ii",
    "title": "Linked List Cycle II (Floyd's Tortoise and Hare)",
    "difficulty": "Medium",
    "tagline": "List length up to 10^4.",
    "description": "Given the head of a linked list, return the node where the cycle begins. If there is no cycle, return null in O(1) memory.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "head = [3,2,0,-4], pos = 1, expected tail connects to node index 1",
        "output": ""
      }
    ],
    "entryPoint": "detectCycle",
    "args": [
      {
        "name": "head",
        "type": "ListNode"
      }
    ],
    "returnType": "ListNode",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Walk through the mathematical proof showing why distance from head to entrance equals distance from intersection to entrance.",
      "Can this be used to find duplicate number in array?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "fast and slow pointers to detect intersection point inside cycle",
      "tier2_structural": "reset one pointer to head; advance both 1 step at a time; intersection is cycle entrance",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def detectCycle(self, input_val):\n        pass\n",
      "JavaScript": "function detectCycle(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void detectCycle() {\n    }\n};\n",
      "Java": "class Solution {\n    public void detectCycle() {\n    }\n}\n"
    },
    "testCases": []
  },
  {
    "id": "copy-list-with-random-pointer",
    "title": "Copy List with Random Pointer",
    "difficulty": "Medium",
    "tagline": "n up to 1000, random points to any node or null.",
    "description": "A linked list of length n is given such that each node contains an additional random pointer. Construct a deep copy of the list in O(1) auxiliary space.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "head = [[7,null],[13,0],[11,4],[10,2],[1,0]], expected cloned deep copy",
        "output": ""
      }
    ],
    "entryPoint": "copyRandomList",
    "args": [
      {
        "name": "head",
        "type": "Node"
      }
    ],
    "returnType": "Node",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why does the interwoven list approach eliminate the O(N) hash map memory?",
      "Explain node decoupling step."
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "interweave cloned nodes directly next to original nodes: A -> A' -> B -> B'",
      "tier2_structural": "assign random pointers: curr.next.random = curr.random.next",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def copyRandomList(self, input_val):\n        pass\n",
      "JavaScript": "function copyRandomList(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void copyRandomList() {\n    }\n};\n",
      "Java": "class Solution {\n    public void copyRandomList() {\n    }\n}\n"
    },
    "testCases": []
  },
  {
    "id": "lru-cache",
    "title": "LRU Cache",
    "difficulty": "Medium",
    "tagline": "capacity up to 3000, operations up to 2*10^5.",
    "description": "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with O(1) get and put operations.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "LRUCache(2), put(1,1), put(2,2), get(1)->1, put(3,3), get(2)->-1, put(4,4), get(1)->-1, get(3)->3, get(4)->4",
        "output": ""
      }
    ],
    "entryPoint": "LRUCache",
    "args": [
      {
        "name": "capacity",
        "type": "number"
      }
    ],
    "returnType": "void",
    "optimalTimeComplexity": "O(1)",
    "optimalSpaceComplexity": "O(capacity)",
    "edgeCasesToProbe": [
      "Why is a Doubly Linked List strictly required over a Singly Linked List? (O(1) deletion of arbitrary node)",
      "How to make this thread-safe in a multi-threaded system?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "hash map storing key -> doubly linked list node",
      "tier2_structural": "doubly linked list maintaining access order with dummy head and tail",
      "tier3_concrete": "Think about optimal approach: O(1)"
    },
    "templates": {
      "Python": "class Solution:\n    def LRUCache(self, input_val):\n        pass\n",
      "JavaScript": "function LRUCache(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void LRUCache() {\n    }\n};\n",
      "Java": "class Solution {\n    public void LRUCache() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[\"LRUCache\",\"put\",\"put\",\"get\",\"put\",\"get\",\"put\",\"get\",\"get\",\"get\"]\n[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]",
        "args": [
          "[\"LRUCache\",\"put\",\"put\",\"get\",\"put\",\"get\",\"put\",\"get\",\"get\",\"get\"]",
          "[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]"
        ],
        "expectedOutput": "[null,null,null,1,null,-1,null,-1,3,4]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "invert-binary-tree",
    "title": "Invert Binary Tree",
    "difficulty": "Easy",
    "tagline": "Nodes up to 1000.",
    "description": "Invert a binary tree in-place.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [4,2,7,1,3,6,9], expected [4,7,2,9,6,3,1]",
        "output": ""
      }
    ],
    "entryPoint": "invertTree",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      }
    ],
    "returnType": "TreeNode",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Recursive vs iterative queue BFS"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "recursive swap of left and right children",
      "tier2_structural": "O(N) time and O(H) stack",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def invertTree(self, input_val):\n        pass\n",
      "JavaScript": "function invertTree(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void invertTree() {\n    }\n};\n",
      "Java": "class Solution {\n    public void invertTree() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[4,2,7,1,3,6,9]",
        "args": [
          "[4,2,7,1,3,6,9]"
        ],
        "expectedOutput": "[4,7,2,9,6,3,1]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "max-depth-binary-tree",
    "title": "Maximum Depth of Binary Tree",
    "difficulty": "Easy",
    "tagline": "Nodes up to 10^4.",
    "description": "Find maximum depth of a binary tree.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7], expected 3",
        "output": ""
      }
    ],
    "entryPoint": "maxDepth",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Tail recursion optimization"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "1 + max(depth(left), depth(right))",
      "tier2_structural": "",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def maxDepth(self, input_val):\n        pass\n",
      "JavaScript": "function maxDepth(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void maxDepth() {\n    }\n};\n",
      "Java": "class Solution {\n    public void maxDepth() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,9,20,null,null,15,7]",
        "args": [
          "[3,9,20,null,null,15,7]"
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "diameter-of-binary-tree",
    "title": "Diameter of Binary Tree",
    "difficulty": "Easy",
    "tagline": "Nodes up to 10^4.",
    "description": "Return the length of the longest path between any two nodes in a tree.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [1,2,3,4,5], expected 3",
        "output": ""
      }
    ],
    "entryPoint": "diameterOfBinaryTree",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Does diameter always pass through root?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "post-order traversal calculating left_height + right_height",
      "tier2_structural": "global max tracking",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def diameterOfBinaryTree(self, input_val):\n        pass\n",
      "JavaScript": "function diameterOfBinaryTree(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void diameterOfBinaryTree() {\n    }\n};\n",
      "Java": "class Solution {\n    public void diameterOfBinaryTree() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3,4,5]",
        "args": [
          "[1,2,3,4,5]"
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "balanced-binary-tree",
    "title": "Balanced Binary Tree",
    "difficulty": "Easy",
    "tagline": "Nodes up to 5000.",
    "description": "Determine if a binary tree is height-balanced.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7], expected true",
        "output": ""
      }
    ],
    "entryPoint": "isBalanced",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Why bottom-up avoids redundant height recomputation"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "bottom-up post-order returning -1 if subtree unbalanced",
      "tier2_structural": "O(N) vs naive O(N^2) top-down",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def isBalanced(self, input_val):\n        pass\n",
      "JavaScript": "function isBalanced(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void isBalanced() {\n    }\n};\n",
      "Java": "class Solution {\n    public void isBalanced() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,9,20,null,null,15,7]",
        "args": [
          "[3,9,20,null,null,15,7]"
        ],
        "expectedOutput": "true",
        "isHidden": false
      }
    ]
  },
  {
    "id": "same-tree",
    "title": "Same Tree",
    "difficulty": "Easy",
    "tagline": "Nodes up to 100.",
    "description": "Check if two binary trees are structurally identical with identical values.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "p = [1,2,3], q = [1,2,3], expected true",
        "output": ""
      }
    ],
    "entryPoint": "isSameTree",
    "args": [
      {
        "name": "p",
        "type": "TreeNode"
      },
      {
        "name": "q",
        "type": "TreeNode"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Iterative validation with single queue"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "simultaneous pre-order traversal",
      "tier2_structural": "base cases: both null, one null, values differ",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def isSameTree(self, input_val):\n        pass\n",
      "JavaScript": "function isSameTree(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void isSameTree() {\n    }\n};\n",
      "Java": "class Solution {\n    public void isSameTree() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3]\n[1,2,3]",
        "args": [
          "[1,2,3]",
          "[1,2,3]"
        ],
        "expectedOutput": "true",
        "isHidden": false
      }
    ]
  },
  {
    "id": "subtree-of-another-tree",
    "title": "Subtree of Another Tree",
    "difficulty": "Easy",
    "tagline": "Nodes up to 2000.",
    "description": "Given roots of tree and subRoot, return true if subRoot is a subtree of tree.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [3,4,5,1,2], subRoot = [4,1,2], expected true",
        "output": ""
      }
    ],
    "entryPoint": "isSubtree",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      },
      {
        "name": "subRoot",
        "type": "TreeNode"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(N * M)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Tree serialization vs tree traversal"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "isSameTree check at each node",
      "tier2_structural": "Merkle tree hashing O(N) optimization",
      "tier3_concrete": "Think about optimal approach: O(N * M)"
    },
    "templates": {
      "Python": "class Solution:\n    def isSubtree(self, input_val):\n        pass\n",
      "JavaScript": "function isSubtree(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void isSubtree() {\n    }\n};\n",
      "Java": "class Solution {\n    public void isSubtree() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,4,5,1,2]\n[4,1,2]",
        "args": [
          "[3,4,5,1,2]",
          "[4,1,2]"
        ],
        "expectedOutput": "true",
        "isHidden": false
      }
    ]
  },
  {
    "id": "lowest-common-ancestor-bst",
    "title": "Lowest Common Ancestor of a BST",
    "difficulty": "Medium",
    "tagline": "Nodes up to 10^5.",
    "description": "Find LCA of two nodes p and q in a BST.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [6,2,8,0,4,7,9], p = 2, q = 8, expected 6",
        "output": ""
      }
    ],
    "entryPoint": "lowestCommonAncestor",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      },
      {
        "name": "p",
        "type": "TreeNode"
      },
      {
        "name": "q",
        "type": "TreeNode"
      }
    ],
    "returnType": "TreeNode",
    "optimalTimeComplexity": "O(H)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why BST property avoids visiting all nodes"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "leverage BST invariant: if both p,q < root go left; if both > root go right; else root is LCA",
      "tier2_structural": "O(H) time",
      "tier3_concrete": "Think about optimal approach: O(H)"
    },
    "templates": {
      "Python": "class Solution:\n    def lowestCommonAncestor(self, input_val):\n        pass\n",
      "JavaScript": "function lowestCommonAncestor(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void lowestCommonAncestor() {\n    }\n};\n",
      "Java": "class Solution {\n    public void lowestCommonAncestor() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[6,2,8,0,4,7,9]\n2\n8",
        "args": [
          "[6,2,8,0,4,7,9]",
          "2",
          "8"
        ],
        "expectedOutput": "6",
        "isHidden": false
      }
    ]
  },
  {
    "id": "lowest-common-ancestor-binary-tree",
    "title": "Lowest Common Ancestor of a Binary Tree",
    "difficulty": "Medium",
    "tagline": "Nodes up to 10^5.",
    "description": "Find LCA of p and q in a general binary tree.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1, expected 3",
        "output": ""
      }
    ],
    "entryPoint": "lowestCommonAncestorBT",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      },
      {
        "name": "p",
        "type": "TreeNode"
      },
      {
        "name": "q",
        "type": "TreeNode"
      }
    ],
    "returnType": "TreeNode",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Parent pointers with set vs recursive divide and conquer"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "post-order recursion returning non-null child",
      "tier2_structural": "if left and right return non-null, current node is LCA",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def lowestCommonAncestorBT(self, input_val):\n        pass\n",
      "JavaScript": "function lowestCommonAncestorBT(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void lowestCommonAncestorBT() {\n    }\n};\n",
      "Java": "class Solution {\n    public void lowestCommonAncestorBT() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,5,1,6,2,0,8,null,null,7,4]\n5\n1",
        "args": [
          "[3,5,1,6,2,0,8,null,null,7,4]",
          "5",
          "1"
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "binary-tree-level-order",
    "title": "Binary Tree Level Order Traversal",
    "difficulty": "Medium",
    "tagline": "Nodes up to 2000.",
    "description": "Return level order traversal of node values as 2D list.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7], expected [[3],[9,20],[15,7]]",
        "output": ""
      }
    ],
    "entryPoint": "levelOrder",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      }
    ],
    "returnType": "number[][]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(W)",
    "edgeCasesToProbe": [
      "BFS vs DFS with level index parameter"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "BFS queue measuring queue.size at each level",
      "tier2_structural": "O(N) time and O(N) space",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def levelOrder(self, input_val):\n        pass\n",
      "JavaScript": "function levelOrder(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void levelOrder() {\n    }\n};\n",
      "Java": "class Solution {\n    public void levelOrder() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,9,20,null,null,15,7]",
        "args": [
          "[3,9,20,null,null,15,7]"
        ],
        "expectedOutput": "[[3],[9,20],[15,7]]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "binary-tree-right-side-view",
    "title": "Binary Tree Right Side View",
    "difficulty": "Medium",
    "tagline": "Nodes up to 100.",
    "description": "Return the values of nodes visible from the right side.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [1,2,3,null,5,null,4], expected [1,3,4]",
        "output": ""
      }
    ],
    "entryPoint": "rightSideView",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "DFS right-first vs BFS level-by-level"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "BFS capturing last element of each level or DFS visiting right child first",
      "tier2_structural": "",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def rightSideView(self, input_val):\n        pass\n",
      "JavaScript": "function rightSideView(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void rightSideView() {\n    }\n};\n",
      "Java": "class Solution {\n    public void rightSideView() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3,null,5,null,4]",
        "args": [
          "[1,2,3,null,5,null,4]"
        ],
        "expectedOutput": "[1,3,4]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "count-good-nodes-binary-tree",
    "title": "Count Good Nodes in Binary Tree",
    "difficulty": "Medium",
    "tagline": "Nodes up to 10^5.",
    "description": "Count nodes X where path from root to X has no value greater than X.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [3,1,4,3,null,1,5], expected 4",
        "output": ""
      }
    ],
    "entryPoint": "goodNodes",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Boundary value initialization with root.val"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "DFS passing max_val_along_path parameter",
      "tier2_structural": "increment count if node.val >= max_val",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def goodNodes(self, input_val):\n        pass\n",
      "JavaScript": "function goodNodes(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void goodNodes() {\n    }\n};\n",
      "Java": "class Solution {\n    public void goodNodes() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,1,4,3,null,1,5]",
        "args": [
          "[3,1,4,3,null,1,5]"
        ],
        "expectedOutput": "4",
        "isHidden": false
      }
    ]
  },
  {
    "id": "validate-binary-search-tree",
    "title": "Validate Binary Search Tree",
    "difficulty": "Medium",
    "tagline": "Nodes up to 10^4.",
    "description": "Determine if a binary tree is a valid BST.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [2,1,3], expected true",
        "output": ""
      },
      {
        "input": "root = [5,1,4,null,null,3,6], expected false",
        "output": ""
      }
    ],
    "entryPoint": "isValidBST",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Why node.left < node.val is insufficient (must be < all ancestors)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "recursion passing valid range (min_val, max_val)",
      "tier2_structural": "in-order traversal verifying strictly increasing values",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def isValidBST(self, input_val):\n        pass\n",
      "JavaScript": "function isValidBST(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void isValidBST() {\n    }\n};\n",
      "Java": "class Solution {\n    public void isValidBST() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[2,1,3]",
        "args": [
          "[2,1,3]"
        ],
        "expectedOutput": "true",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[5,1,4,null,null,3,6]",
        "args": [
          "[5,1,4,null,null,3,6]"
        ],
        "expectedOutput": "false",
        "isHidden": false
      }
    ]
  },
  {
    "id": "kth-smallest-element-bst",
    "title": "Kth Smallest Element in a BST",
    "difficulty": "Medium",
    "tagline": "Nodes up to 10^4, k <= N.",
    "description": "Find the kth smallest value in a BST.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [3,1,4,null,2], k = 1, expected 1",
        "output": ""
      }
    ],
    "entryPoint": "kthSmallest",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(H + k)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Augmenting tree nodes with subtree size for O(H) dynamic lookups"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "in-order traversal stops when count == k",
      "tier2_structural": "iterative stack implementation in O(H + k)",
      "tier3_concrete": "Think about optimal approach: O(H + k)"
    },
    "templates": {
      "Python": "class Solution:\n    def kthSmallest(self, input_val):\n        pass\n",
      "JavaScript": "function kthSmallest(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void kthSmallest() {\n    }\n};\n",
      "Java": "class Solution {\n    public void kthSmallest() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,1,4,null,2]\n1",
        "args": [
          "[3,1,4,null,2]",
          "1"
        ],
        "expectedOutput": "1",
        "isHidden": false
      }
    ]
  },
  {
    "id": "construct-tree-preorder-inorder",
    "title": "Construct Binary Tree from Preorder and Inorder Traversal",
    "difficulty": "Medium",
    "tagline": "Nodes up to 3000.",
    "description": "Build binary tree given preorder and inorder traversals.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "preorder = [3,9,20,15,7], inorder = [9,3,15,20,7], expected [3,9,20,null,null,15,7]",
        "output": ""
      }
    ],
    "entryPoint": "buildTree",
    "args": [
      {
        "name": "preorder",
        "type": "number[]"
      },
      {
        "name": "inorder",
        "type": "number[]"
      }
    ],
    "returnType": "TreeNode",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why unique node values are strictly necessary"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "preorder gives root; inorder hash map gives split between left and right subtrees",
      "tier2_structural": "O(N) time with hash map",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def buildTree(self, input_val):\n        pass\n",
      "JavaScript": "function buildTree(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void buildTree() {\n    }\n};\n",
      "Java": "class Solution {\n    public void buildTree() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,9,20,15,7]\n[9,3,15,20,7]",
        "args": [
          "[3,9,20,15,7]",
          "[9,3,15,20,7]"
        ],
        "expectedOutput": "[3,9,20,null,null,15,7]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "binary-tree-max-path",
    "title": "Binary Tree Maximum Path Sum",
    "difficulty": "Hard",
    "tagline": "Nodes up to 3*10^4.",
    "description": "Find the maximum path sum of any non-empty path in a binary tree.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [1,2,3], expected 6",
        "output": ""
      },
      {
        "input": "root = [-10,9,20,null,null,15,7], expected 42",
        "output": ""
      }
    ],
    "entryPoint": "maxPathSum",
    "args": [
      {
        "name": "root",
        "type": "TreeNode"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(H)",
    "edgeCasesToProbe": [
      "Why can a valid path only split at one node?"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "post-order traversal: max_gain = max(0, dfs(child))",
      "tier2_structural": "split_path = node.val + left_gain + right_gain updates global max",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def maxPathSum(self, input_val):\n        pass\n",
      "JavaScript": "function maxPathSum(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void maxPathSum() {\n    }\n};\n",
      "Java": "class Solution {\n    public void maxPathSum() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3]",
        "args": [
          "[1,2,3]"
        ],
        "expectedOutput": "6",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[-10,9,20,null,null,15,7]",
        "args": [
          "[-10,9,20,null,null,15,7]"
        ],
        "expectedOutput": "42",
        "isHidden": false
      }
    ]
  },
  {
    "id": "serialize-deserialize-binary-tree",
    "title": "Serialize and Deserialize Binary Tree",
    "difficulty": "Hard",
    "tagline": "Nodes up to 10^4.",
    "description": "Design an algorithm to serialize and deserialize a binary tree.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "root = [1,2,3,null,null,4,5], expected roundtrip identical tree",
        "output": ""
      }
    ],
    "entryPoint": "Codec",
    "args": [
      {
        "name": "input_val",
        "type": "any"
      }
    ],
    "returnType": "void",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Pre-order with nulls vs Level-order BFS with nulls"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "pre-order traversal with 'null' placeholders",
      "tier2_structural": "reconstruction consumes tokens from queue in O(N)",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def Codec(self, input_val):\n        pass\n",
      "JavaScript": "function Codec(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void Codec() {\n    }\n};\n",
      "Java": "class Solution {\n    public void Codec() {\n    }\n}\n"
    },
    "testCases": []
  },
  {
    "id": "number-of-islands",
    "title": "Number of Islands",
    "difficulty": "Medium",
    "tagline": "m, n up to 300.",
    "description": "Count islands in an m x n binary grid.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "grid with 3 islands, expected 3",
        "output": ""
      }
    ],
    "entryPoint": "numIslands",
    "args": [
      {
        "name": "grid",
        "type": "string[][]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(MN)",
    "optimalSpaceComplexity": "O(MN)",
    "edgeCasesToProbe": [
      "Union-Find with path compression alternative"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "BFS/DFS connected component discovery",
      "tier2_structural": "in-place grid mutation ('0') to track visited in O(1) space",
      "tier3_concrete": "Think about optimal approach: O(MN)"
    },
    "templates": {
      "Python": "class Solution:\n    def numIslands(self, input_val):\n        pass\n",
      "JavaScript": "function numIslands(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void numIslands() {\n    }\n};\n",
      "Java": "class Solution {\n    public void numIslands() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]",
        "args": [
          "[[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]"
        ],
        "expectedOutput": "1",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]",
        "args": [
          "[[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]"
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "clone-graph",
    "title": "Clone Graph",
    "difficulty": "Medium",
    "tagline": "Nodes up to 100.",
    "description": "Return a deep copy of a connected undirected graph.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "adjList = [[2,4],[1,3],[2,4],[1,3]], expected identical clone",
        "output": ""
      }
    ],
    "entryPoint": "cloneGraph",
    "args": [
      {
        "name": "node",
        "type": "Node"
      }
    ],
    "returnType": "Node",
    "optimalTimeComplexity": "O(V + E)",
    "optimalSpaceComplexity": "O(V)",
    "edgeCasesToProbe": [
      "Handling cyclic references in deep copy"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "hash map tracking old_node -> new_node clone",
      "tier2_structural": "DFS/BFS copying neighbors",
      "tier3_concrete": "Think about optimal approach: O(V + E)"
    },
    "templates": {
      "Python": "class Solution:\n    def cloneGraph(self, input_val):\n        pass\n",
      "JavaScript": "function cloneGraph(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void cloneGraph() {\n    }\n};\n",
      "Java": "class Solution {\n    public void cloneGraph() {\n    }\n}\n"
    },
    "testCases": []
  },
  {
    "id": "max-area-of-island",
    "title": "Max Area of Island",
    "difficulty": "Medium",
    "tagline": "m, n up to 50.",
    "description": "Find maximum area of an island in a binary grid.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "grid with max area 6, expected 6",
        "output": ""
      }
    ],
    "entryPoint": "maxAreaOfIsland",
    "args": [
      {
        "name": "grid",
        "type": "number[][]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(MN)",
    "optimalSpaceComplexity": "O(MN)",
    "edgeCasesToProbe": [
      "Recursion depth limits in Python"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "DFS computing area = 1 + sum(dfs(neighbors))",
      "tier2_structural": "mark visited cells",
      "tier3_concrete": "Think about optimal approach: O(MN)"
    },
    "templates": {
      "Python": "class Solution:\n    def maxAreaOfIsland(self, input_val):\n        pass\n",
      "JavaScript": "function maxAreaOfIsland(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void maxAreaOfIsland() {\n    }\n};\n",
      "Java": "class Solution {\n    public void maxAreaOfIsland() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,1,1,0,1,0,0,0,0,0,0,0,0],[0,1,0,0,1,1,0,0,1,0,1,0,0],[0,1,0,0,1,1,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,0,0,0,0,0,0,1,1,0,0,0,0]]",
        "args": [
          "[[0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,1,1,0,1,0,0,0,0,0,0,0,0],[0,1,0,0,1,1,0,0,1,0,1,0,0],[0,1,0,0,1,1,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,0,0,0,0,0,0,1,1,0,0,0,0]]"
        ],
        "expectedOutput": "6",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[[0,0,0,0,0,0,0,0]]",
        "args": [
          "[[0,0,0,0,0,0,0,0]]"
        ],
        "expectedOutput": "0",
        "isHidden": false
      }
    ]
  },
  {
    "id": "pacific-atlantic-water-flow",
    "title": "Pacific Atlantic Water Flow",
    "difficulty": "Medium",
    "tagline": "m, n up to 200.",
    "description": "Find cells where rain water can flow to both Pacific and Atlantic oceans.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "heights matrix, expected coordinates",
        "output": ""
      }
    ],
    "entryPoint": "pacificAtlantic",
    "args": [
      {
        "name": "heights",
        "type": "number[][]"
      }
    ],
    "returnType": "number[][]",
    "optimalTimeComplexity": "O(MN)",
    "optimalSpaceComplexity": "O(MN)",
    "edgeCasesToProbe": [
      "Why reverse traversal avoids visiting cells repeatedly"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "reverse traversal from ocean borders inwards (height <= neighbor)",
      "tier2_structural": "intersection of pacific_reachable and atlantic_reachable sets",
      "tier3_concrete": "Think about optimal approach: O(MN)"
    },
    "templates": {
      "Python": "class Solution:\n    def pacificAtlantic(self, input_val):\n        pass\n",
      "JavaScript": "function pacificAtlantic(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void pacificAtlantic() {\n    }\n};\n",
      "Java": "class Solution {\n    public void pacificAtlantic() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        "args": [
          "[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]"
        ],
        "expectedOutput": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[[1]]",
        "args": [
          "[[1]]"
        ],
        "expectedOutput": "[[0,0]]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "surrounded-regions",
    "title": "Surrounded Regions (Capture O's)",
    "difficulty": "Medium",
    "tagline": "m, n up to 200.",
    "description": "Capture all regions surrounded by 'X' in-place.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "board with surrounded regions captured",
        "output": ""
      }
    ],
    "entryPoint": "solve",
    "args": [
      {
        "name": "board",
        "type": "string[][]"
      }
    ],
    "returnType": "void",
    "optimalTimeComplexity": "O(MN)",
    "optimalSpaceComplexity": "O(MN)",
    "edgeCasesToProbe": [
      "Solving negative problem (uncapturable border components)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "boundary BFS/DFS marking uncapturable 'O' cells connected to border",
      "tier2_structural": "flip remaining 'O' to 'X' and uncapturable back to 'O'",
      "tier3_concrete": "Think about optimal approach: O(MN)"
    },
    "templates": {
      "Python": "class Solution:\n    def solve(self, input_val):\n        pass\n",
      "JavaScript": "function solve(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void solve() {\n    }\n};\n",
      "Java": "class Solution {\n    public void solve() {\n    }\n}\n"
    },
    "testCases": []
  },
  {
    "id": "rotting-oranges",
    "title": "Rotting Oranges",
    "difficulty": "Medium",
    "tagline": "m, n up to 10.",
    "description": "Return minimum minutes until no fresh orange remains in grid.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "grid, expected 4 minutes",
        "output": ""
      },
      {
        "input": "unreachable fresh orange, expected -1",
        "output": ""
      }
    ],
    "entryPoint": "orangesRotting",
    "args": [
      {
        "name": "grid",
        "type": "number[][]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(MN)",
    "optimalSpaceComplexity": "O(MN)",
    "edgeCasesToProbe": [
      "Multi-source BFS vs iterative scanning"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "multi-source BFS starting with all initially rotten oranges",
      "tier2_structural": "track fresh_count and decrement per infection",
      "tier3_concrete": "Think about optimal approach: O(MN)"
    },
    "templates": {
      "Python": "class Solution:\n    def orangesRotting(self, input_val):\n        pass\n",
      "JavaScript": "function orangesRotting(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void orangesRotting() {\n    }\n};\n",
      "Java": "class Solution {\n    public void orangesRotting() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[2,1,1],[1,1,0],[0,1,1]]",
        "args": [
          "[[2,1,1],[1,1,0],[0,1,1]]"
        ],
        "expectedOutput": "4",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[[2,1,1],[0,1,1],[1,0,1]]",
        "args": [
          "[[2,1,1],[0,1,1],[1,0,1]]"
        ],
        "expectedOutput": "-1",
        "isHidden": false
      },
      {
        "id": 3,
        "label": "Test Case 3",
        "input": "[[0,2]]",
        "args": [
          "[[0,2]]"
        ],
        "expectedOutput": "0",
        "isHidden": false
      }
    ]
  },
  {
    "id": "course-schedule",
    "title": "Course Schedule",
    "difficulty": "Medium",
    "tagline": "Courses up to 2000, prereqs up to 5000.",
    "description": "Determine if you can finish all courses given prerequisite pairs.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "numCourses = 2, prereqs = [[1,0]], expected true",
        "output": ""
      },
      {
        "input": "numCourses = 2, prereqs = [[1,0],[0,1]], expected false",
        "output": ""
      }
    ],
    "entryPoint": "canFinish",
    "args": [
      {
        "name": "numCourses",
        "type": "number"
      },
      {
        "name": "prerequisites",
        "type": "number[][]"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(V + E)",
    "optimalSpaceComplexity": "O(V + E)",
    "edgeCasesToProbe": [
      "Detecting cycle vs producing valid topological order"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "cycle detection in directed graph",
      "tier2_structural": "Kahn's algorithm (BFS with in-degree array) or DFS with 3-color states",
      "tier3_concrete": "Think about optimal approach: O(V + E)"
    },
    "templates": {
      "Python": "class Solution:\n    def canFinish(self, input_val):\n        pass\n",
      "JavaScript": "function canFinish(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void canFinish() {\n    }\n};\n",
      "Java": "class Solution {\n    public void canFinish() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "2\n[[1,0]]",
        "args": [
          "2",
          "[[1,0]]"
        ],
        "expectedOutput": "true",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "2\n[[1,0],[0,1]]",
        "args": [
          "2",
          "[[1,0],[0,1]]"
        ],
        "expectedOutput": "false",
        "isHidden": false
      }
    ]
  },
  {
    "id": "course-schedule-ii",
    "title": "Course Schedule II",
    "difficulty": "Medium",
    "tagline": "Courses up to 2000.",
    "description": "Return the ordering of courses you should take to finish all courses.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "numCourses = 4, prereqs = [[1,0],[2,0],[3,1],[3,2]], expected [0,2,1,3]",
        "output": ""
      }
    ],
    "entryPoint": "findOrder",
    "args": [
      {
        "name": "numCourses",
        "type": "number"
      },
      {
        "name": "prerequisites",
        "type": "number[][]"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(V + E)",
    "optimalSpaceComplexity": "O(V + E)",
    "edgeCasesToProbe": [
      "Handling disconnected graph components in topo order"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "Kahn's algorithm appending to order when in-degree becomes 0",
      "tier2_structural": "if len(order) != numCourses return []",
      "tier3_concrete": "Think about optimal approach: O(V + E)"
    },
    "templates": {
      "Python": "class Solution:\n    def findOrder(self, input_val):\n        pass\n",
      "JavaScript": "function findOrder(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void findOrder() {\n    }\n};\n",
      "Java": "class Solution {\n    public void findOrder() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "4\n[[1,0],[2,0],[3,1],[3,2]]",
        "args": [
          "4",
          "[[1,0],[2,0],[3,1],[3,2]]"
        ],
        "expectedOutput": "[0,2,1,3]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "redundant-connection",
    "title": "Redundant Connection",
    "difficulty": "Medium",
    "tagline": "Nodes up to 1000.",
    "description": "Find an edge in graph that can be removed so graph is a tree.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "edges = [[1,2],[1,3],[2,3]], expected [2,3]",
        "output": ""
      }
    ],
    "entryPoint": "findRedundantConnection",
    "args": [
      {
        "name": "edges",
        "type": "number[][]"
      }
    ],
    "returnType": "number[]",
    "optimalTimeComplexity": "O(E * alpha(V))",
    "optimalSpaceComplexity": "O(V)",
    "edgeCasesToProbe": [
      "DSU inverse Ackermann complexity alpha(N)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "Disjoint Set Union (DSU) with path compression and union by rank",
      "tier2_structural": "first edge connecting two nodes already in same component is redundant",
      "tier3_concrete": "Think about optimal approach: O(E * alpha(V))"
    },
    "templates": {
      "Python": "class Solution:\n    def findRedundantConnection(self, input_val):\n        pass\n",
      "JavaScript": "function findRedundantConnection(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void findRedundantConnection() {\n    }\n};\n",
      "Java": "class Solution {\n    public void findRedundantConnection() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[1,2],[1,3],[2,3]]",
        "args": [
          "[[1,2],[1,3],[2,3]]"
        ],
        "expectedOutput": "[2,3]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "word-ladder",
    "title": "Word Ladder",
    "difficulty": "Hard",
    "tagline": "wordList up to 5000, word len up to 10.",
    "description": "Return length of shortest transformation sequence from beginWord to endWord.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "beginWord = 'hit', endWord = 'cog', wordList = ['hot','dot','dog','lot','log','cog'], expected 5",
        "output": ""
      }
    ],
    "entryPoint": "ladderLength",
    "args": [
      {
        "name": "beginWord",
        "type": "string"
      },
      {
        "name": "endWord",
        "type": "string"
      },
      {
        "name": "wordList",
        "type": "string[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N * L^2)",
    "optimalSpaceComplexity": "O(N * L)",
    "edgeCasesToProbe": [
      "Bidirectional BFS vs unidirectional BFS state space explosion"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "bidirectional BFS from beginWord and endWord",
      "tier2_structural": "intermediate wildcard patterns (d*g) to find neighbors in O(L^2)",
      "tier3_concrete": "Think about optimal approach: O(N * L^2)"
    },
    "templates": {
      "Python": "class Solution:\n    def ladderLength(self, input_val):\n        pass\n",
      "JavaScript": "function ladderLength(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void ladderLength() {\n    }\n};\n",
      "Java": "class Solution {\n    public void ladderLength() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"hit\"\n\"cog\"\n[\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]",
        "args": [
          "\"hit\"",
          "\"cog\"",
          "[\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]"
        ],
        "expectedOutput": "5",
        "isHidden": false
      }
    ]
  },
  {
    "id": "network-delay-time",
    "title": "Network Delay Time",
    "difficulty": "Medium",
    "tagline": "Nodes up to 100, edges up to 6000.",
    "description": "Find time for all nodes to receive signal sent from node k.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2, expected 2",
        "output": ""
      }
    ],
    "entryPoint": "networkDelayTime",
    "args": [
      {
        "name": "times",
        "type": "number[][]"
      },
      {
        "name": "n",
        "type": "number"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(E log V)",
    "optimalSpaceComplexity": "O(V + E)",
    "edgeCasesToProbe": [
      "Dijkstra vs Bellman-Ford vs Floyd-Warshall"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "Dijkstra's algorithm with Min-Heap",
      "tier2_structural": "dist array initialized to infinity, relax edges",
      "tier3_concrete": "Think about optimal approach: O(E log V)"
    },
    "templates": {
      "Python": "class Solution:\n    def networkDelayTime(self, input_val):\n        pass\n",
      "JavaScript": "function networkDelayTime(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void networkDelayTime() {\n    }\n};\n",
      "Java": "class Solution {\n    public void networkDelayTime() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[2,1,1],[2,3,1],[3,4,1]]\n4\n2",
        "args": [
          "[[2,1,1],[2,3,1],[3,4,1]]",
          "4",
          "2"
        ],
        "expectedOutput": "2",
        "isHidden": false
      }
    ]
  },
  {
    "id": "alien-dictionary",
    "title": "Alien Dictionary",
    "difficulty": "Hard",
    "tagline": "words up to 100.",
    "description": "Given sorted dictionary of alien words, derive the order of characters in the language.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "words = ['wrt','wrf','erf','ett','rftt'], expected 'wertf'",
        "output": ""
      }
    ],
    "entryPoint": "alienOrder",
    "args": [
      {
        "name": "words",
        "type": "string[]"
      }
    ],
    "returnType": "string",
    "optimalTimeComplexity": "O(C)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Prefix trap: word1 starts with word2 but word1 is longer (invalid order)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "compare adjacent words to find first differing character (directed edge u -> v)",
      "tier2_structural": "topological sort; check for prefix invalidity and cycles",
      "tier3_concrete": "Think about optimal approach: O(C)"
    },
    "templates": {
      "Python": "class Solution:\n    def alienOrder(self, input_val):\n        pass\n",
      "JavaScript": "function alienOrder(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void alienOrder() {\n    }\n};\n",
      "Java": "class Solution {\n    public void alienOrder() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[\"wrt\",\"wrf\",\"erf\",\"ett\",\"rftt\"]",
        "args": [
          "[\"wrt\",\"wrf\",\"erf\",\"ett\",\"rftt\"]"
        ],
        "expectedOutput": "\"wertf\"",
        "isHidden": false
      }
    ]
  },
  {
    "id": "climbing-stairs",
    "title": "Climbing Stairs",
    "difficulty": "Easy",
    "tagline": "n up to 45.",
    "description": "You are climbing a staircase with n steps. You can take 1 or 2 steps. How many distinct ways to reach top?",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "n = 2, expected 2",
        "output": ""
      },
      {
        "input": "n = 3, expected 3",
        "output": ""
      }
    ],
    "entryPoint": "climbStairs",
    "args": [
      {
        "name": "n",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Matrix exponentiation O(log N) for ultra-large N"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dp[i] = dp[i-1] + dp[i-2]",
      "tier2_structural": "Fibonacci space optimization O(1)",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def climbStairs(self, input_val):\n        pass\n",
      "JavaScript": "function climbStairs(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void climbStairs() {\n    }\n};\n",
      "Java": "class Solution {\n    public void climbStairs() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "2",
        "args": [
          "2"
        ],
        "expectedOutput": "2",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "3",
        "args": [
          "3"
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "min-cost-climbing-stairs",
    "title": "Min Cost Climbing Stairs",
    "difficulty": "Easy",
    "tagline": "cost length up to 1000.",
    "description": "Return minimum cost to reach top of floor.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "cost = [10,15,20], expected 15",
        "output": ""
      }
    ],
    "entryPoint": "minCostClimbingStairs",
    "args": [
      {
        "name": "cost",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "In-place array mutation O(1) memory"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dp[i] = cost[i] + min(dp[i-1], dp[i-2])",
      "tier2_structural": "",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def minCostClimbingStairs(self, input_val):\n        pass\n",
      "JavaScript": "function minCostClimbingStairs(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void minCostClimbingStairs() {\n    }\n};\n",
      "Java": "class Solution {\n    public void minCostClimbingStairs() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[10,15,20]",
        "args": [
          "[10,15,20]"
        ],
        "expectedOutput": "15",
        "isHidden": false
      }
    ]
  },
  {
    "id": "house-robber",
    "title": "House Robber",
    "difficulty": "Medium",
    "tagline": "nums up to 100.",
    "description": "Determine maximum money you can rob tonight without robbing two adjacent houses.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,2,3,1], expected 4",
        "output": ""
      },
      {
        "input": "nums = [2,7,9,3,1], expected 12",
        "output": ""
      }
    ],
    "entryPoint": "rob",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "State transition derivation"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dp[i] = max(dp[i-1], nums[i] + dp[i-2])",
      "tier2_structural": "two rolling variables rob1 and rob2 in O(1) space",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def rob(self, input_val):\n        pass\n",
      "JavaScript": "function rob(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void rob() {\n    }\n};\n",
      "Java": "class Solution {\n    public void rob() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3,1]",
        "args": [
          "[1,2,3,1]"
        ],
        "expectedOutput": "4",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[2,7,9,3,1]",
        "args": [
          "[2,7,9,3,1]"
        ],
        "expectedOutput": "12",
        "isHidden": false
      }
    ]
  },
  {
    "id": "house-robber-ii",
    "title": "House Robber II (Circular Street)",
    "difficulty": "Medium",
    "tagline": "nums up to 100.",
    "description": "Houses arranged in circle. Rob max money without alerting police.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [2,3,2], expected 3",
        "output": ""
      },
      {
        "input": "nums = [1,2,3,1], expected 4",
        "output": ""
      }
    ],
    "entryPoint": "robCircular",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Circular dependency resolution by partitioning first and last"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "two subproblems: rob(nums[0..n-2]) vs rob(nums[1..n-1])",
      "tier2_structural": "max of both",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def robCircular(self, input_val):\n        pass\n",
      "JavaScript": "function robCircular(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void robCircular() {\n    }\n};\n",
      "Java": "class Solution {\n    public void robCircular() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[2,3,2]",
        "args": [
          "[2,3,2]"
        ],
        "expectedOutput": "3",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1,2,3,1]",
        "args": [
          "[1,2,3,1]"
        ],
        "expectedOutput": "4",
        "isHidden": false
      }
    ]
  },
  {
    "id": "longest-palindromic-substring",
    "title": "Longest Palindromic Substring",
    "difficulty": "Medium",
    "tagline": "s length up to 1000.",
    "description": "Given string s, return longest palindromic substring.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "s = 'babad', expected 'bab'",
        "output": ""
      },
      {
        "input": "s = 'cbbd', expected 'bb'",
        "output": ""
      }
    ],
    "entryPoint": "longestPalindrome",
    "args": [
      {
        "name": "s",
        "type": "string"
      }
    ],
    "returnType": "string",
    "optimalTimeComplexity": "O(N^2)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Manacher's algorithm linear time O(N)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "expand around centers (2N-1 centers) in O(N^2) time and O(1) space",
      "tier2_structural": "DP table dp[i][j] = s[i]==s[j] and dp[i+1][j-1]",
      "tier3_concrete": "Think about optimal approach: O(N^2)"
    },
    "templates": {
      "Python": "class Solution:\n    def longestPalindrome(self, input_val):\n        pass\n",
      "JavaScript": "function longestPalindrome(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void longestPalindrome() {\n    }\n};\n",
      "Java": "class Solution {\n    public void longestPalindrome() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"babad\"",
        "args": [
          "\"babad\""
        ],
        "expectedOutput": "\"bab\"",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "\"cbbd\"",
        "args": [
          "\"cbbd\""
        ],
        "expectedOutput": "\"bb\"",
        "isHidden": false
      }
    ]
  },
  {
    "id": "palindromic-substrings",
    "title": "Palindromic Substrings",
    "difficulty": "Medium",
    "tagline": "s length up to 1000.",
    "description": "Count total palindromic substrings in string.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "s = 'abc', expected 3",
        "output": ""
      },
      {
        "input": "s = 'aaa', expected 6",
        "output": ""
      }
    ],
    "entryPoint": "countSubstrings",
    "args": [
      {
        "name": "s",
        "type": "string"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N^2)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Center expansion vs interval DP"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "expand around 2N-1 centers counting valid expansions",
      "tier2_structural": "O(N^2) time and O(1) space",
      "tier3_concrete": "Think about optimal approach: O(N^2)"
    },
    "templates": {
      "Python": "class Solution:\n    def countSubstrings(self, input_val):\n        pass\n",
      "JavaScript": "function countSubstrings(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void countSubstrings() {\n    }\n};\n",
      "Java": "class Solution {\n    public void countSubstrings() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"abc\"",
        "args": [
          "\"abc\""
        ],
        "expectedOutput": "3",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "\"aaa\"",
        "args": [
          "\"aaa\""
        ],
        "expectedOutput": "6",
        "isHidden": false
      }
    ]
  },
  {
    "id": "decode-ways",
    "title": "Decode Ways",
    "difficulty": "Medium",
    "tagline": "s length up to 100.",
    "description": "Count ways to decode encoded message of digits ('A'=1 to 'Z'=26).",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "s = '12', expected 2",
        "output": ""
      },
      {
        "input": "s = '226', expected 3",
        "output": ""
      },
      {
        "input": "s = '06', expected 0",
        "output": ""
      }
    ],
    "entryPoint": "numDecodings",
    "args": [
      {
        "name": "s",
        "type": "string"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Edge cases with leading zeros ('06', '0')"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dp[i] takes 1 digit if valid (1-9) + takes 2 digits if valid (10-26)",
      "tier2_structural": "carefully handle '0' digits",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def numDecodings(self, input_val):\n        pass\n",
      "JavaScript": "function numDecodings(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void numDecodings() {\n    }\n};\n",
      "Java": "class Solution {\n    public void numDecodings() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"12\"",
        "args": [
          "\"12\""
        ],
        "expectedOutput": "2",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "\"226\"",
        "args": [
          "\"226\""
        ],
        "expectedOutput": "3",
        "isHidden": false
      },
      {
        "id": 3,
        "label": "Test Case 3",
        "input": "\"06\"",
        "args": [
          "\"06\""
        ],
        "expectedOutput": "0",
        "isHidden": false
      }
    ]
  },
  {
    "id": "coin-change",
    "title": "Coin Change",
    "difficulty": "Medium",
    "tagline": "coins up to 12, amount up to 10^4.",
    "description": "Return fewest coins needed to make up amount using denominations.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "coins = [1,2,5], amount = 11, expected 3",
        "output": ""
      },
      {
        "input": "coins = [2], amount = 3, expected -1",
        "output": ""
      }
    ],
    "entryPoint": "coinChange",
    "args": [
      {
        "name": "coins",
        "type": "number[]"
      },
      {
        "name": "amount",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N * amount)",
    "optimalSpaceComplexity": "O(amount)",
    "edgeCasesToProbe": [
      "BFS shortest path in graph vs bottom-up DP"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "unbounded knapsack: dp[i] = min(dp[i], 1 + dp[i - c])",
      "tier2_structural": "initialize dp with infinity, dp[0] = 0",
      "tier3_concrete": "Think about optimal approach: O(N * amount)"
    },
    "templates": {
      "Python": "class Solution:\n    def coinChange(self, input_val):\n        pass\n",
      "JavaScript": "function coinChange(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void coinChange() {\n    }\n};\n",
      "Java": "class Solution {\n    public void coinChange() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,5]\n11",
        "args": [
          "[1,2,5]",
          "11"
        ],
        "expectedOutput": "3",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[2]\n3",
        "args": [
          "[2]",
          "3"
        ],
        "expectedOutput": "-1",
        "isHidden": false
      }
    ]
  },
  {
    "id": "maximum-product-subarray",
    "title": "Maximum Product Subarray",
    "difficulty": "Medium",
    "tagline": "nums up to 2*10^4.",
    "description": "Find contiguous subarray with largest product.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [2,3,-2,4], expected 6",
        "output": ""
      },
      {
        "input": "nums = [-2,0,-1], expected 0",
        "output": ""
      }
    ],
    "entryPoint": "maxProduct",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why tracking min is necessary (negative * negative = positive)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "track both max_so_far and min_so_far at each step",
      "tier2_structural": "negative number swaps max and min",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def maxProduct(self, input_val):\n        pass\n",
      "JavaScript": "function maxProduct(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void maxProduct() {\n    }\n};\n",
      "Java": "class Solution {\n    public void maxProduct() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[2,3,-2,4]",
        "args": [
          "[2,3,-2,4]"
        ],
        "expectedOutput": "6",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[-2,0,-1]",
        "args": [
          "[-2,0,-1]"
        ],
        "expectedOutput": "0",
        "isHidden": false
      }
    ]
  },
  {
    "id": "word-break",
    "title": "Word Break",
    "difficulty": "Medium",
    "tagline": "s length up to 300, wordDict up to 1000.",
    "description": "Determine if string s can be segmented into words from wordDict.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "s = 'leetcode', wordDict = ['leet','code'], expected true",
        "output": ""
      }
    ],
    "entryPoint": "wordBreak",
    "args": [
      {
        "name": "s",
        "type": "string"
      },
      {
        "name": "wordDict",
        "type": "string[]"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(N^2 * L)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Trie prefix matching vs substring hash lookups"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dp[i] = true if any dp[j] is true and s[j..i] in wordDict",
      "tier2_structural": "Trie optimization for matching",
      "tier3_concrete": "Think about optimal approach: O(N^2 * L)"
    },
    "templates": {
      "Python": "class Solution:\n    def wordBreak(self, input_val):\n        pass\n",
      "JavaScript": "function wordBreak(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void wordBreak() {\n    }\n};\n",
      "Java": "class Solution {\n    public void wordBreak() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"leetcode\"\n[\"leet\",\"code\"]",
        "args": [
          "\"leetcode\"",
          "[\"leet\",\"code\"]"
        ],
        "expectedOutput": "true",
        "isHidden": false
      }
    ]
  },
  {
    "id": "longest-increasing-subsequence",
    "title": "Longest Increasing Subsequence (LIS)",
    "difficulty": "Medium",
    "tagline": "nums up to 2500.",
    "description": "Return length of longest strictly increasing subsequence in O(N log N).",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [10,9,2,5,3,7,101,18], expected 4",
        "output": ""
      }
    ],
    "entryPoint": "lengthOfLIS",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N log N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why tails array stores smallest tail for each subsequence length",
      "How to reconstruct the actual LIS sequence"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "patience sorting: tails array with binary search (bisect_left)",
      "tier2_structural": "O(N log N) time and O(N) space",
      "tier3_concrete": "Think about optimal approach: O(N log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def lengthOfLIS(self, input_val):\n        pass\n",
      "JavaScript": "function lengthOfLIS(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void lengthOfLIS() {\n    }\n};\n",
      "Java": "class Solution {\n    public void lengthOfLIS() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[10,9,2,5,3,7,101,18]",
        "args": [
          "[10,9,2,5,3,7,101,18]"
        ],
        "expectedOutput": "4",
        "isHidden": false
      }
    ]
  },
  {
    "id": "partition-equal-subset-sum",
    "title": "Partition Equal Subset Sum",
    "difficulty": "Medium",
    "tagline": "nums up to 200, sum up to 20000.",
    "description": "Determine if array can be partitioned into two subsets with equal sum.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,5,11,5], expected true",
        "output": ""
      },
      {
        "input": "nums = [1,2,3,5], expected false",
        "output": ""
      }
    ],
    "entryPoint": "canPartition",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(N * target)",
    "optimalSpaceComplexity": "O(target)",
    "edgeCasesToProbe": [
      "Bit manipulation bitset optimization in C++ O(N * S / 64)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "0/1 Knapsack with target = sum // 2",
      "tier2_structural": "bitset or reverse iteration 1D boolean array",
      "tier3_concrete": "Think about optimal approach: O(N * target)"
    },
    "templates": {
      "Python": "class Solution:\n    def canPartition(self, input_val):\n        pass\n",
      "JavaScript": "function canPartition(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void canPartition() {\n    }\n};\n",
      "Java": "class Solution {\n    public void canPartition() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,5,11,5]",
        "args": [
          "[1,5,11,5]"
        ],
        "expectedOutput": "true",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[1,2,3,5]",
        "args": [
          "[1,2,3,5]"
        ],
        "expectedOutput": "false",
        "isHidden": false
      }
    ]
  },
  {
    "id": "unique-paths",
    "title": "Unique Paths in Grid",
    "difficulty": "Medium",
    "tagline": "m, n up to 100.",
    "description": "Robot on m x n grid can only move right or down. Find total unique paths to bottom-right.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "m = 3, n = 7, expected 28",
        "output": ""
      },
      {
        "input": "m = 3, n = 2, expected 3",
        "output": ""
      }
    ],
    "entryPoint": "uniquePaths",
    "args": [
      {
        "name": "m",
        "type": "number"
      },
      {
        "name": "n",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(MN)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Combinatorial O(min(M, N)) vs DP O(M * N)"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dp[i][j] = dp[i-1][j] + dp[i][j-1]",
      "tier2_structural": "1D row rolling array in O(N) space",
      "tier3_concrete": "Think about optimal approach: O(MN)"
    },
    "templates": {
      "Python": "class Solution:\n    def uniquePaths(self, input_val):\n        pass\n",
      "JavaScript": "function uniquePaths(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void uniquePaths() {\n    }\n};\n",
      "Java": "class Solution {\n    public void uniquePaths() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "3\n7",
        "args": [
          "3",
          "7"
        ],
        "expectedOutput": "28",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "3\n2",
        "args": [
          "3",
          "2"
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "longest-common-subsequence",
    "title": "Longest Common Subsequence",
    "difficulty": "Medium",
    "tagline": "text1, text2 lengths up to 1000.",
    "description": "Given text1 and text2, return length of longest common subsequence.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "text1 = 'abcde', text2 = 'ace', expected 3",
        "output": ""
      }
    ],
    "entryPoint": "longestCommonSubsequence",
    "args": [
      {
        "name": "text1",
        "type": "string"
      },
      {
        "name": "text2",
        "type": "string"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(MN)",
    "optimalSpaceComplexity": "O(min(M, N))",
    "edgeCasesToProbe": [
      "Reconstructing the LCS string via backtrack"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dp[i][j] = 1 + dp[i-1][j-1] if match else max(dp[i-1][j], dp[i][j-1])",
      "tier2_structural": "O(M * N) time and O(min(M, N)) space",
      "tier3_concrete": "Think about optimal approach: O(MN)"
    },
    "templates": {
      "Python": "class Solution:\n    def longestCommonSubsequence(self, input_val):\n        pass\n",
      "JavaScript": "function longestCommonSubsequence(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void longestCommonSubsequence() {\n    }\n};\n",
      "Java": "class Solution {\n    public void longestCommonSubsequence() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"abcde\"\n\"ace\"",
        "args": [
          "\"abcde\"",
          "\"ace\""
        ],
        "expectedOutput": "3",
        "isHidden": false
      }
    ]
  },
  {
    "id": "edit-distance",
    "title": "Edit Distance (Levenshtein)",
    "difficulty": "Medium",
    "tagline": "word1, word2 lengths up to 500.",
    "description": "Return minimum operations (insert, delete, replace) to convert word1 to word2.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "word1 = 'horse', word2 = 'ros', expected 3",
        "output": ""
      },
      {
        "input": "word1 = 'intention', word2 = 'execution', expected 5",
        "output": ""
      }
    ],
    "entryPoint": "minDistance",
    "args": [
      {
        "name": "word1",
        "type": "string"
      },
      {
        "name": "word2",
        "type": "string"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(MN)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Space optimization to 2 rows"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "dp[i][j] = 1 + min(insert, delete, replace) on mismatch",
      "tier2_structural": "O(M * N) time and O(N) space",
      "tier3_concrete": "Think about optimal approach: O(MN)"
    },
    "templates": {
      "Python": "class Solution:\n    def minDistance(self, input_val):\n        pass\n",
      "JavaScript": "function minDistance(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void minDistance() {\n    }\n};\n",
      "Java": "class Solution {\n    public void minDistance() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "\"horse\"\n\"ros\"",
        "args": [
          "\"horse\"",
          "\"ros\""
        ],
        "expectedOutput": "3",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "\"intention\"\n\"execution\"",
        "args": [
          "\"intention\"",
          "\"execution\""
        ],
        "expectedOutput": "5",
        "isHidden": false
      }
    ]
  },
  {
    "id": "kth-largest-element-array",
    "title": "Kth Largest Element in an Array",
    "difficulty": "Medium",
    "tagline": "nums up to 10^5.",
    "description": "Find the kth largest element in an unsorted array.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [3,2,1,5,6,4], k = 2, expected 5",
        "output": ""
      }
    ],
    "entryPoint": "findKthLargest",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      },
      {
        "name": "k",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N log K)",
    "optimalSpaceComplexity": "O(K)",
    "edgeCasesToProbe": [
      "Worst-case O(N^2) for Quickselect"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "Min-Heap of size k",
      "tier2_structural": "Quickselect in O(N) average time",
      "tier3_concrete": "Think about optimal approach: O(N log K)"
    },
    "templates": {
      "Python": "class Solution:\n    def findKthLargest(self, input_val):\n        pass\n",
      "JavaScript": "function findKthLargest(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void findKthLargest() {\n    }\n};\n",
      "Java": "class Solution {\n    public void findKthLargest() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[3,2,1,5,6,4]\n2",
        "args": [
          "[3,2,1,5,6,4]",
          "2"
        ],
        "expectedOutput": "5",
        "isHidden": false
      }
    ]
  },
  {
    "id": "task-scheduler",
    "title": "Task Scheduler (CPU Cooldown)",
    "difficulty": "Medium",
    "tagline": "tasks up to 10^4, n up to 100.",
    "description": "Find minimum CPU intervals needed to execute tasks with cooldown n.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "tasks = ['A','A','A','B','B','B'], n = 2, expected 8",
        "output": ""
      }
    ],
    "entryPoint": "leastInterval",
    "args": [
      {
        "name": "tasks",
        "type": "string[]"
      },
      {
        "name": "n",
        "type": "number"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Idle slot math"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "frequency count of most frequent tasks",
      "tier2_structural": "formula: (max_freq - 1) * (n + 1) + count(max_freq)",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def leastInterval(self, input_val):\n        pass\n",
      "JavaScript": "function leastInterval(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void leastInterval() {\n    }\n};\n",
      "Java": "class Solution {\n    public void leastInterval() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"]\n2",
        "args": [
          "[\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"]",
          "2"
        ],
        "expectedOutput": "8",
        "isHidden": false
      }
    ]
  },
  {
    "id": "merge-intervals",
    "title": "Merge Intervals",
    "difficulty": "Medium",
    "tagline": "intervals up to 10^4.",
    "description": "Given an array of intervals, merge all overlapping intervals.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "intervals = [[1,3],[2,6],[8,10],[15,18]], expected [[1,6],[8,10],[15,18]]",
        "output": ""
      }
    ],
    "entryPoint": "merge",
    "args": [
      {
        "name": "intervals",
        "type": "number[][]"
      }
    ],
    "returnType": "number[][]",
    "optimalTimeComplexity": "O(N log N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Why sorting by start time is optimal"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "sort intervals by start time",
      "tier2_structural": "compare curr.start with prev.end",
      "tier3_concrete": "Think about optimal approach: O(N log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def merge(self, input_val):\n        pass\n",
      "JavaScript": "function merge(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void merge() {\n    }\n};\n",
      "Java": "class Solution {\n    public void merge() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[1,3],[2,6],[8,10],[15,18]]",
        "args": [
          "[[1,3],[2,6],[8,10],[15,18]]"
        ],
        "expectedOutput": "[[1,6],[8,10],[15,18]]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "insert-interval",
    "title": "Insert Interval",
    "difficulty": "Medium",
    "tagline": "intervals up to 10^4.",
    "description": "Insert newInterval into sorted non-overlapping intervals and merge if necessary.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "intervals = [[1,3],[6,9]], newInterval = [2,5], expected [[1,5],[6,9]]",
        "output": ""
      }
    ],
    "entryPoint": "insert",
    "args": [
      {
        "name": "intervals",
        "type": "number[][]"
      },
      {
        "name": "newInterval",
        "type": "number[]"
      }
    ],
    "returnType": "number[][]",
    "optimalTimeComplexity": "O(N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Single pass in-place vs new array"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "three stages: append non-overlapping left, merge overlapping, append non-overlapping right",
      "tier2_structural": "O(N) time single pass",
      "tier3_concrete": "Think about optimal approach: O(N)"
    },
    "templates": {
      "Python": "class Solution:\n    def insert(self, input_val):\n        pass\n",
      "JavaScript": "function insert(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void insert() {\n    }\n};\n",
      "Java": "class Solution {\n    public void insert() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[1,3],[6,9]]\n[2,5]",
        "args": [
          "[[1,3],[6,9]]",
          "[2,5]"
        ],
        "expectedOutput": "[[1,5],[6,9]]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "non-overlapping-intervals",
    "title": "Non-overlapping Intervals",
    "difficulty": "Medium",
    "tagline": "intervals up to 10^5.",
    "description": "Return minimum number of intervals you need to remove to make the rest non-overlapping.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "intervals = [[1,2],[2,3],[3,4],[1,3]], expected 1",
        "output": ""
      }
    ],
    "entryPoint": "eraseOverlapIntervals",
    "args": [
      {
        "name": "intervals",
        "type": "number[][]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N log N)",
    "optimalSpaceComplexity": "O(1)",
    "edgeCasesToProbe": [
      "Why sort by end time vs start time"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "greedy choice: sort by end time",
      "tier2_structural": "always keep the interval that finishes earliest to leave room for future intervals",
      "tier3_concrete": "Think about optimal approach: O(N log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def eraseOverlapIntervals(self, input_val):\n        pass\n",
      "JavaScript": "function eraseOverlapIntervals(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void eraseOverlapIntervals() {\n    }\n};\n",
      "Java": "class Solution {\n    public void eraseOverlapIntervals() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[1,2],[2,3],[3,4],[1,3]]",
        "args": [
          "[[1,2],[2,3],[3,4],[1,3]]"
        ],
        "expectedOutput": "1",
        "isHidden": false
      }
    ]
  },
  {
    "id": "meeting-rooms-ii",
    "title": "Meeting Rooms II (Minimum Conference Rooms)",
    "difficulty": "Medium",
    "tagline": "intervals up to 10^4.",
    "description": "Find minimum conference rooms required given meeting time intervals.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "intervals = [[0,30],[5,10],[15,20]], expected 2",
        "output": ""
      }
    ],
    "entryPoint": "minMeetingRooms",
    "args": [
      {
        "name": "intervals",
        "type": "number[][]"
      }
    ],
    "returnType": "number",
    "optimalTimeComplexity": "O(N log N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Two pointers vs Min-Heap of end times"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "two arrays: start times and end times sorted independently",
      "tier2_structural": "two pointers counting active overlapping meetings",
      "tier3_concrete": "Think about optimal approach: O(N log N)"
    },
    "templates": {
      "Python": "class Solution:\n    def minMeetingRooms(self, input_val):\n        pass\n",
      "JavaScript": "function minMeetingRooms(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void minMeetingRooms() {\n    }\n};\n",
      "Java": "class Solution {\n    public void minMeetingRooms() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[0,30],[5,10],[15,20]]",
        "args": [
          "[[0,30],[5,10],[15,20]]"
        ],
        "expectedOutput": "2",
        "isHidden": false
      }
    ]
  },
  {
    "id": "subsets",
    "title": "Subsets (Power Set)",
    "difficulty": "Medium",
    "tagline": "nums up to 10.",
    "description": "Return all possible subsets (the power set) of unique integers nums.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,2,3], expected 8 subsets",
        "output": ""
      }
    ],
    "entryPoint": "subsets",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number[][]",
    "optimalTimeComplexity": "O(N * 2^N)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "Backtracking vs Bitmask iteration"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "backtracking DFS with pick / don't pick branching",
      "tier2_structural": "bit manipulation 1 << N iterating binary masks",
      "tier3_concrete": "Think about optimal approach: O(N * 2^N)"
    },
    "templates": {
      "Python": "class Solution:\n    def subsets(self, input_val):\n        pass\n",
      "JavaScript": "function subsets(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void subsets() {\n    }\n};\n",
      "Java": "class Solution {\n    public void subsets() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3]",
        "args": [
          "[1,2,3]"
        ],
        "expectedOutput": "[[],[1],[2],[3],[1,2],[1,3],[2,3],[1,2,3]]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[0]",
        "args": [
          "[0]"
        ],
        "expectedOutput": "[[],[0]]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "permutations",
    "title": "Permutations",
    "difficulty": "Medium",
    "tagline": "nums up to 6.",
    "description": "Given an array nums of distinct integers, return all the possible permutations.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "nums = [1,2,3], expected 6 permutations",
        "output": ""
      }
    ],
    "entryPoint": "permute",
    "args": [
      {
        "name": "nums",
        "type": "number[]"
      }
    ],
    "returnType": "number[][]",
    "optimalTimeComplexity": "O(N * N!)",
    "optimalSpaceComplexity": "O(N)",
    "edgeCasesToProbe": [
      "In-place swap vs visited array memory"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "backtracking with swap in-place or boolean visited array",
      "tier2_structural": "O(N * N!) time",
      "tier3_concrete": "Think about optimal approach: O(N * N!)"
    },
    "templates": {
      "Python": "class Solution:\n    def permute(self, input_val):\n        pass\n",
      "JavaScript": "function permute(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void permute() {\n    }\n};\n",
      "Java": "class Solution {\n    public void permute() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[1,2,3]",
        "args": [
          "[1,2,3]"
        ],
        "expectedOutput": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[0,1]",
        "args": [
          "[0,1]"
        ],
        "expectedOutput": "[[0,1],[1,0]]",
        "isHidden": false
      },
      {
        "id": 3,
        "label": "Test Case 3",
        "input": "[1]",
        "args": [
          "[1]"
        ],
        "expectedOutput": "[[1]]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "combination-sum",
    "title": "Combination Sum (Unbounded Repeats)",
    "difficulty": "Medium",
    "tagline": "candidates up to 30, target up to 40.",
    "description": "Return list of all unique combinations of candidates where sum equals target.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "candidates = [2,3,6,7], target = 7, expected [[2,2,3],[7]]",
        "output": ""
      }
    ],
    "entryPoint": "combinationSum",
    "args": [
      {
        "name": "candidates",
        "type": "number[]"
      },
      {
        "name": "target",
        "type": "number"
      }
    ],
    "returnType": "number[][]",
    "optimalTimeComplexity": "O(2^T)",
    "optimalSpaceComplexity": "O(T)",
    "edgeCasesToProbe": [
      "Pruning condition with sorted array"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "backtracking allowing element reuse (idx stays same)",
      "tier2_structural": "sort and prune when candidate > remaining target",
      "tier3_concrete": "Think about optimal approach: O(2^T)"
    },
    "templates": {
      "Python": "class Solution:\n    def combinationSum(self, input_val):\n        pass\n",
      "JavaScript": "function combinationSum(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void combinationSum() {\n    }\n};\n",
      "Java": "class Solution {\n    public void combinationSum() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[2,3,6,7]\n7",
        "args": [
          "[2,3,6,7]",
          "7"
        ],
        "expectedOutput": "[[2,2,3],[7]]",
        "isHidden": false
      }
    ]
  },
  {
    "id": "word-search",
    "title": "Word Search in Grid",
    "difficulty": "Medium",
    "tagline": "m, n up to 6, word up to 15.",
    "description": "Given m x n board and word, return true if word exists in grid.",
    "constraints": [
      "Optimal Big-O time and space complexity required.",
      "Handle empty, single element, and boundary conditions."
    ],
    "examples": [
      {
        "input": "board with word 'ABCCED', expected true",
        "output": ""
      }
    ],
    "entryPoint": "exist",
    "args": [
      {
        "name": "board",
        "type": "string[][]"
      },
      {
        "name": "word",
        "type": "string"
      }
    ],
    "returnType": "boolean",
    "optimalTimeComplexity": "O(N * 3^L)",
    "optimalSpaceComplexity": "O(L)",
    "edgeCasesToProbe": [
      "In-place grid backtracking"
    ],
    "traps": [],
    "hints": {
      "tier1_conceptual": "backtracking DFS exploring 4 directions",
      "tier2_structural": "temporarily mutate board[r][c] = '#' to mark visited without extra memory",
      "tier3_concrete": "Think about optimal approach: O(N * 3^L)"
    },
    "templates": {
      "Python": "class Solution:\n    def exist(self, input_val):\n        pass\n",
      "JavaScript": "function exist(input_val) {\n}\n",
      "C++": "class Solution {\npublic:\n    void exist() {\n    }\n};\n",
      "Java": "class Solution {\n    public void exist() {\n    }\n}\n"
    },
    "testCases": [
      {
        "id": 1,
        "label": "Test Case 1",
        "input": "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\n\"ABCCED\"",
        "args": [
          "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]",
          "\"ABCCED\""
        ],
        "expectedOutput": "true",
        "isHidden": false
      },
      {
        "id": 2,
        "label": "Test Case 2",
        "input": "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\n\"SEE\"",
        "args": [
          "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]",
          "\"SEE\""
        ],
        "expectedOutput": "true",
        "isHidden": false
      },
      {
        "id": 3,
        "label": "Test Case 3",
        "input": "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\n\"ABCB\"",
        "args": [
          "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]",
          "\"ABCB\""
        ],
        "expectedOutput": "false",
        "isHidden": false
      }
    ]
  }
];

export function getDefaultDsaProblem(): DsaProblem {
  return DSA_PROBLEMS[0];
}

export function getDsaProblemById(id: string): DsaProblem | undefined {
  return DSA_PROBLEMS.find((p) => p.id === id);
}

export function getAllDsaProblems(): DsaProblem[] {
  return DSA_PROBLEMS;
}

export function getRandomDsaProblem(difficulty?: "Easy" | "Medium" | "Hard"): DsaProblem {
  const filtered = difficulty ? DSA_PROBLEMS.filter((p) => p.difficulty === difficulty) : DSA_PROBLEMS;
  const list = filtered.length > 0 ? filtered : DSA_PROBLEMS;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

/**
 * Many bank entries store a test as one prose line ("nums = [1,2], k = 2, expected [1]") with an empty
 * expectedOutput, which no correct solution can ever pass. Convert those into what the runner expects:
 * one JSON argument per line on stdin and a JSON expected output.
 */
function toJsonText(raw: string): string {
  const t = raw.trim().replace(/\bNone\b/g, "null").replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false");
  const candidates = [t, t.replace(/'/g, '"')];
  for (const c of candidates) {
    try {
      return JSON.stringify(JSON.parse(c));
    } catch {
      /* try next form */
    }
  }
  return t;
}

/** Coerce any value a backend or bank might hold (string, array, number, null) into text the runner can compare. */
function asText(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * One canonical test-case shape for the whole app. Sources disagree: the bank uses
 * {input, expectedOutput, ...}, the backend catalog uses {input, expected} and omits id, label and isHidden,
 * and some entries carry the answer inside a prose input ("nums = [1], k = 1, expected [1]").
 * Every consumer gets { id, label, input, args, expectedOutput (always a string), isHidden }.
 */
export function normalizeDsaTestCases(cases: any[]): DsaTestCase[] {
  return (cases || []).map((raw, idx) => {
    const tc = raw && typeof raw === "object" ? raw : { input: raw };
    let input = asText(tc.input);
    let expectedOutput = asText(tc.expectedOutput ?? tc.expected_output ?? tc.expected ?? tc.output);
    let args: any[] = Array.isArray(tc.args) ? tc.args : [];

    if (!expectedOutput.trim()) {
      const m = /^(.*?),?\s*expected\s*[:=]?\s*(.+)$/is.exec(input);
      if (m) {
        const segments = m[1].trim().split(/,\s*(?=[A-Za-z_]\w*\s*=)/).filter(Boolean);
        const lines = segments.map((seg) => {
          const eq = seg.indexOf("=");
          return toJsonText(eq >= 0 ? seg.slice(eq + 1) : seg);
        });
        input = lines.join(String.fromCharCode(10));
        args = lines;
        expectedOutput = toJsonText(m[2]);
      }
    }

    return {
      ...tc,
      id: typeof tc.id === "number" ? tc.id : idx + 1,
      label: typeof tc.label === "string" && tc.label ? tc.label : `Test Case ${idx + 1}`,
      input,
      args,
      expectedOutput,
      isHidden: Boolean(tc.isHidden ?? tc.is_hidden),
    } as DsaTestCase;
  });
}
