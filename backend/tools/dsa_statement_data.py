"""Hand-written problem statement data for the DSA catalog: real constraints, plus examples for problems with no tests.

Applied to the catalog (and mirrored into the frontend bank) by `python tools/dsa_statements.py apply`.
Constraints follow the usual LeetCode wording so the candidate can read them straight off the screen.
"""

CONSTRAINTS: dict[str, list[str]] = {
    # Sliding window
    "longest-substring": [
        "0 <= s.length <= 5 * 10^4",
        "s consists of English letters, digits, symbols and spaces.",
    ],
    "min-window-substring": [
        "1 <= s.length, t.length <= 10^5",
        "s and t consist of uppercase and lowercase English letters.",
        "Return an empty string if no window exists.",
    ],
    "longest-repeating-char-replacement": [
        "1 <= s.length <= 10^5",
        "s consists of only uppercase English letters.",
        "0 <= k <= s.length",
    ],
    "permutation-in-string": [
        "1 <= s1.length, s2.length <= 10^4",
        "s1 and s2 consist of lowercase English letters.",
    ],
    "fruit-into-baskets": [
        "1 <= fruits.length <= 10^5",
        "0 <= fruits[i] < fruits.length",
        "You have exactly two baskets, and each basket holds a single type of fruit.",
    ],
    "max-consecutive-ones-iii": [
        "1 <= nums.length <= 10^5",
        "nums[i] is either 0 or 1.",
        "0 <= k <= nums.length",
    ],
    # Two pointers
    "three-sum": [
        "3 <= nums.length <= 3000",
        "-10^5 <= nums[i] <= 10^5",
        "The answer must not contain duplicate triplets.",
    ],
    "container-with-most-water": [
        "2 <= height.length <= 10^5",
        "0 <= height[i] <= 10^4",
    ],
    "trapping-rain-water": [
        "1 <= height.length <= 2 * 10^4",
        "0 <= height[i] <= 10^5",
    ],
    "two-sum-ii": [
        "2 <= numbers.length <= 3 * 10^4",
        "-1000 <= numbers[i] <= 1000, sorted in non-decreasing order.",
        "-1000 <= target <= 1000",
        "Exactly one solution exists. Return 1-indexed positions, and do not use the same element twice.",
    ],
    "sort-colors": [
        "1 <= nums.length <= 300",
        "nums[i] is 0, 1, or 2.",
        "Sort in place without using a library sort.",
    ],
    "subarray-product-less-than-k": [
        "1 <= nums.length <= 3 * 10^4",
        "1 <= nums[i] <= 1000",
        "0 <= k <= 10^6",
    ],
    "minimum-size-subarray-sum": [
        "1 <= target <= 10^9",
        "1 <= nums.length <= 10^5",
        "1 <= nums[i] <= 10^4",
        "Return 0 if no subarray reaches the target.",
    ],
    "sliding-window-maximum": [
        "1 <= nums.length <= 10^5",
        "-10^4 <= nums[i] <= 10^4",
        "1 <= k <= nums.length",
    ],
    "find-all-anagrams": [
        "1 <= s.length, p.length <= 3 * 10^4",
        "s and p consist of lowercase English letters.",
    ],
    # Prefix sums and hashing
    "subarray-sum-k": [
        "1 <= nums.length <= 2 * 10^4",
        "-1000 <= nums[i] <= 1000",
        "-10^7 <= k <= 10^7",
    ],
    "product-except-self": [
        "2 <= nums.length <= 10^5",
        "-30 <= nums[i] <= 30",
        "Every prefix and suffix product fits in a 32-bit integer.",
        "Do not use division.",
    ],
    "longest-consecutive-sequence": [
        "0 <= nums.length <= 10^5",
        "-10^9 <= nums[i] <= 10^9",
        "The algorithm should run in O(N) time.",
    ],
    "group-anagrams": [
        "1 <= strs.length <= 10^4",
        "0 <= strs[i].length <= 100",
        "strs[i] consists of lowercase English letters.",
    ],
    "top-k-frequent-elements": [
        "1 <= nums.length <= 10^5",
        "-10^4 <= nums[i] <= 10^4",
        "k is in the range [1, the number of unique elements].",
        "The answer is guaranteed to be unique.",
    ],
    "continuous-subarray-sum": [
        "1 <= nums.length <= 10^5",
        "0 <= nums[i] <= 10^9",
        "0 <= sum(nums) <= 2^31 - 1",
        "1 <= k <= 2^31 - 1",
        "The subarray must contain at least two elements.",
    ],
    "contiguous-array": [
        "1 <= nums.length <= 10^5",
        "nums[i] is either 0 or 1.",
    ],
    "encode-and-decode-strings": [
        "0 <= strs.length <= 200",
        "0 <= strs[i].length <= 200",
        "strs[i] can contain any of the 256 ASCII characters.",
        "decode(encode(strs)) must return the original list, and encode and decode must not share state.",
    ],
    "valid-sudoku": [
        "board.length == 9 and board[i].length == 9",
        "board[i][j] is a digit '1'-'9' or '.'.",
        "Only the filled cells need to be validated against the three Sudoku rules (row, column, 3x3 box).",
    ],
    "first-missing-positive": [
        "1 <= nums.length <= 10^5",
        "-2^31 <= nums[i] <= 2^31 - 1",
        "Run in O(N) time using O(1) auxiliary space.",
    ],
    # Stacks
    "daily-temperatures": [
        "1 <= temperatures.length <= 10^5",
        "30 <= temperatures[i] <= 100",
    ],
    "largest-rectangle-histogram": [
        "1 <= heights.length <= 10^5",
        "0 <= heights[i] <= 10^4",
    ],
    "min-stack": [
        "-2^31 <= val <= 2^31 - 1",
        "pop, top and getMin are only called on a non-empty stack.",
        "At most 3 * 10^4 calls in total.",
        "Every operation must run in O(1) time.",
    ],
    "evaluate-reverse-polish-notation": [
        "1 <= tokens.length <= 10^4",
        "Each token is an operator (+, -, *, /) or an integer in the range [-200, 200].",
        "The expression is always valid, with no division by zero. Division truncates toward zero.",
        "Every intermediate result fits in a 32-bit integer.",
    ],
    "next-greater-element-i": [
        "1 <= nums1.length <= nums2.length <= 1000",
        "0 <= nums1[i], nums2[i] <= 10^4",
        "All integers in nums1 and nums2 are unique, and every element of nums1 appears in nums2.",
    ],
    "next-greater-element-ii": [
        "1 <= nums.length <= 10^4",
        "-10^9 <= nums[i] <= 10^9",
        "The array is circular: after the last element the search wraps to the first.",
    ],
    "asteroid-collision": [
        "2 <= asteroids.length <= 10^4",
        "-1000 <= asteroids[i] <= 1000, and asteroids[i] != 0",
        "Positive values move right and negative values move left, all at the same speed.",
    ],
    "remove-k-digits": [
        "1 <= k <= num.length <= 10^5",
        "num consists of digits only and has no leading zeros, except for zero itself.",
        "The result has no leading zeros. Return \"0\" if every digit is removed.",
    ],
    "car-fleet": [
        "n == position.length == speed.length, 1 <= n <= 10^5",
        "0 < target <= 10^6",
        "0 <= position[i] < target, and all positions are unique.",
        "0 < speed[i] <= 10^6",
    ],
    "trapping-rain-water-stack": [
        "1 <= height.length <= 2 * 10^4",
        "0 <= height[i] <= 10^5",
    ],
    # Binary search
    "binary-search": [
        "1 <= nums.length <= 10^4",
        "-10^4 < nums[i], target < 10^4",
        "All integers in nums are unique and sorted in ascending order.",
        "Run in O(log N) time.",
    ],
    "search-rotated-sorted-array": [
        "1 <= nums.length <= 5000",
        "-10^4 <= nums[i], target <= 10^4",
        "All values of nums are unique. nums is an ascending array rotated at an unknown pivot.",
        "Run in O(log N) time.",
    ],
    "find-min-rotated-sorted-array": [
        "1 <= nums.length <= 5000",
        "-5000 <= nums[i] <= 5000",
        "All integers are unique. nums is an ascending array rotated between 1 and n times.",
        "Run in O(log N) time.",
    ],
    "koko-eating-bananas": [
        "1 <= piles.length <= 10^4",
        "piles.length <= h <= 10^9",
        "1 <= piles[i] <= 10^9",
    ],
    "ship-packages": [
        "1 <= days <= weights.length <= 5 * 10^4",
        "1 <= weights[i] <= 500",
        "Packages must be shipped in the given order.",
    ],
    "find-peak-element": [
        "1 <= nums.length <= 1000",
        "-2^31 <= nums[i] <= 2^31 - 1",
        "nums[i] != nums[i + 1] for every valid i.",
        "Treat both ends as negative infinity. Run in O(log N) time.",
    ],
    "time-based-key-value-store": [
        "1 <= key.length, value.length <= 100, lowercase letters and digits only.",
        "1 <= timestamp <= 10^7",
        "Timestamps passed to set are strictly increasing for each key.",
        "At most 2 * 10^5 calls to set and get in total.",
    ],
    "median-two-sorted-arrays": [
        "0 <= nums1.length, nums2.length <= 1000, and 1 <= nums1.length + nums2.length <= 2000",
        "-10^6 <= nums1[i], nums2[i] <= 10^6",
        "Both arrays are sorted in ascending order.",
        "Run in O(log(m + n)) time.",
    ],
    "split-array-largest-sum": [
        "1 <= nums.length <= 1000",
        "0 <= nums[i] <= 10^6",
        "1 <= k <= min(50, nums.length)",
        "Each of the k parts must be a non-empty contiguous subarray.",
    ],
    "search-2d-matrix": [
        "1 <= m, n <= 100, where the matrix has m rows and n columns.",
        "-10^4 <= matrix[i][j], target <= 10^4",
        "Each row is sorted, and the first value of each row is greater than the last value of the previous row.",
        "Run in O(log(m * n)) time.",
    ],
    "find-first-last-position": [
        "0 <= nums.length <= 10^5",
        "-10^9 <= nums[i], target <= 10^9",
        "nums is sorted in non-decreasing order.",
        "Run in O(log N) time. Return [-1, -1] if target is absent.",
    ],
    "sqrtx": [
        "0 <= x <= 2^31 - 1",
        "Round down to the nearest integer.",
        "Do not use a built-in exponent function or operator.",
    ],
    # Linked lists
    "reverse-linked-list": [
        "0 <= number of nodes <= 5000",
        "-5000 <= Node.val <= 5000",
    ],
    "merge-two-sorted-lists": [
        "0 <= number of nodes in each list <= 50",
        "-100 <= Node.val <= 100",
        "Both lists are sorted in non-decreasing order.",
    ],
    "merge-k-sorted-lists": [
        "k == lists.length, 0 <= k <= 10^4",
        "0 <= lists[i].length <= 500",
        "-10^4 <= lists[i][j] <= 10^4",
        "Each list is sorted in ascending order, and the total number of nodes is at most 10^4.",
    ],
    "reorder-list": [
        "1 <= number of nodes <= 5 * 10^4",
        "1 <= Node.val <= 1000",
        "Reorder in place by relinking nodes. Do not change node values.",
    ],
    "remove-nth-node-from-end": [
        "1 <= sz <= 30, where sz is the number of nodes.",
        "0 <= Node.val <= 100",
        "1 <= n <= sz",
    ],
    "linked-list-cycle-ii": [
        "0 <= number of nodes <= 10^4",
        "-10^5 <= Node.val <= 10^5",
        "pos is -1 (no cycle) or a valid index in the list. pos is not passed to your function.",
        "Do not modify the list. Return the node where the cycle begins, or null.",
    ],
    "copy-list-with-random-pointer": [
        "0 <= n <= 1000",
        "-10^4 <= Node.val <= 10^4",
        "Node.random is null or points to a node in the list.",
        "Return a deep copy: no new node may point to a node of the original list.",
    ],
    "lru-cache": [
        "1 <= capacity <= 3000",
        "0 <= key <= 10^4",
        "0 <= value <= 10^5",
        "At most 2 * 10^5 calls to get and put.",
        "get and put must each run in O(1) average time.",
    ],
    # Trees
    "invert-binary-tree": [
        "0 <= number of nodes <= 1000",
        "-100 <= Node.val <= 100",
    ],
    "max-depth-binary-tree": [
        "0 <= number of nodes <= 10^4",
        "-100 <= Node.val <= 100",
        "Depth is the number of nodes on the longest root-to-leaf path.",
    ],
    "diameter-of-binary-tree": [
        "1 <= number of nodes <= 10^4",
        "-100 <= Node.val <= 100",
        "The diameter is the number of edges on the longest path between any two nodes. It may not pass through the root.",
    ],
    "balanced-binary-tree": [
        "0 <= number of nodes <= 5000",
        "-10^4 <= Node.val <= 10^4",
        "Balanced means that at every node the heights of the two subtrees differ by at most 1.",
    ],
    "same-tree": [
        "0 <= number of nodes in each tree <= 100",
        "-10^4 <= Node.val <= 10^4",
    ],
    "subtree-of-another-tree": [
        "1 <= number of nodes in root <= 2000",
        "1 <= number of nodes in subRoot <= 1000",
        "-10^4 <= root.val, subRoot.val <= 10^4",
    ],
    "lowest-common-ancestor-bst": [
        "2 <= number of nodes <= 10^5",
        "-10^9 <= Node.val <= 10^9, and all values are unique.",
        "p != q, and both p and q exist in the BST.",
        "A node may be a descendant of itself.",
    ],
    "lowest-common-ancestor-binary-tree": [
        "2 <= number of nodes <= 10^5",
        "-10^9 <= Node.val <= 10^9, and all values are unique.",
        "p != q, and both p and q exist in the tree.",
        "A node may be a descendant of itself.",
    ],
    "binary-tree-level-order": [
        "0 <= number of nodes <= 2000",
        "-1000 <= Node.val <= 1000",
    ],
    "binary-tree-right-side-view": [
        "0 <= number of nodes <= 100",
        "-100 <= Node.val <= 100",
    ],
    "count-good-nodes-binary-tree": [
        "1 <= number of nodes <= 10^5",
        "-10^4 <= Node.val <= 10^4",
        "A node is good if no node on the path from the root to it has a greater value.",
    ],
    "validate-binary-search-tree": [
        "1 <= number of nodes <= 10^4",
        "-2^31 <= Node.val <= 2^31 - 1",
        "Subtrees must be strictly less or strictly greater (no duplicates).",
    ],
    "kth-smallest-element-bst": [
        "n is the number of nodes, 1 <= k <= n <= 10^4",
        "0 <= Node.val <= 10^4",
        "k is 1-indexed.",
    ],
    "construct-tree-preorder-inorder": [
        "1 <= preorder.length <= 3000, and inorder.length == preorder.length",
        "-3000 <= preorder[i], inorder[i] <= 3000",
        "All values are unique, and both arrays describe the same tree.",
    ],
    "binary-tree-max-path": [
        "1 <= number of nodes <= 3 * 10^4",
        "-1000 <= Node.val <= 1000",
        "A path has at least one node and does not need to pass through the root.",
    ],
    "serialize-deserialize-binary-tree": [
        "0 <= number of nodes <= 10^4",
        "-1000 <= Node.val <= 1000",
        "deserialize(serialize(root)) must rebuild an identical tree.",
        "Do not use global or static state.",
    ],
    # Graphs
    "number-of-islands": [
        "m == grid.length, n == grid[i].length",
        "1 <= m, n <= 300",
        "grid[i][j] is '0' (water) or '1' (land).",
        "Land connects horizontally or vertically only. Treat all four edges as water.",
    ],
    "clone-graph": [
        "0 <= number of nodes <= 100",
        "1 <= Node.val <= 100, and Node.val is unique for each node.",
        "No repeated edges and no self-loops. The graph is undirected and connected.",
    ],
    "max-area-of-island": [
        "m == grid.length, n == grid[i].length",
        "1 <= m, n <= 50",
        "grid[i][j] is 0 or 1.",
        "Return 0 if there is no island.",
    ],
    "pacific-atlantic-water-flow": [
        "m == heights.length, n == heights[r].length",
        "1 <= m, n <= 200",
        "0 <= heights[r][c] <= 10^5",
        "Water flows to a neighbouring cell (up, down, left, right) with height less than or equal to the current one.",
    ],
    "surrounded-regions": [
        "m == board.length, n == board[i].length",
        "1 <= m, n <= 200",
        "board[i][j] is 'X' or 'O'.",
        "Modify the board in place. Regions touching the border are not captured.",
    ],
    "rotting-oranges": [
        "m == grid.length, n == grid[i].length",
        "1 <= m, n <= 10",
        "grid[i][j] is 0 (empty), 1 (fresh) or 2 (rotten).",
        "Rot spreads to the four adjacent cells each minute. Return -1 if some fresh orange can never rot.",
    ],
    "course-schedule": [
        "1 <= numCourses <= 2000",
        "0 <= prerequisites.length <= 5000, and prerequisites[i].length == 2",
        "0 <= ai, bi < numCourses. All prerequisite pairs are unique.",
    ],
    "course-schedule-ii": [
        "1 <= numCourses <= 2000",
        "0 <= prerequisites.length <= 5000, and prerequisites[i].length == 2",
        "0 <= ai, bi < numCourses, ai != bi. All pairs are unique.",
        "Return a valid order of all courses, or an empty array if that is impossible.",
    ],
    "redundant-connection": [
        "n == edges.length, 3 <= n <= 1000",
        "edges[i].length == 2, and 1 <= ai < bi <= edges.length",
        "There are no repeated edges, and the graph is a tree plus exactly one extra edge.",
        "If several edges qualify, return the one that appears last in the input.",
    ],
    "word-ladder": [
        "1 <= beginWord.length <= 10, and endWord.length == beginWord.length",
        "1 <= wordList.length <= 5000, and every word has the same length.",
        "All words consist of lowercase English letters. beginWord != endWord.",
        "All words in wordList are unique. Return 0 if no sequence exists.",
    ],
    "network-delay-time": [
        "1 <= k <= n <= 100",
        "1 <= times.length <= 6000, and times[i] = (ui, vi, wi)",
        "1 <= ui, vi <= n, ui != vi, 0 <= wi <= 100",
        "All (ui, vi) pairs are unique. Return -1 if some node is unreachable.",
    ],
    "alien-dictionary": [
        "1 <= words.length <= 100",
        "1 <= words[i].length <= 100",
        "words[i] consists of lowercase English letters.",
        "words is sorted lexicographically by the alien alphabet. Return an empty string if the ordering is invalid.",
    ],
    # Dynamic programming
    "climbing-stairs": [
        "1 <= n <= 45",
        "Each move climbs 1 or 2 steps.",
    ],
    "min-cost-climbing-stairs": [
        "2 <= cost.length <= 1000",
        "0 <= cost[i] <= 999",
        "You may start from step 0 or step 1, and must reach the top beyond the last step.",
    ],
    "house-robber": [
        "1 <= nums.length <= 100",
        "0 <= nums[i] <= 400",
        "You cannot rob two adjacent houses.",
    ],
    "house-robber-ii": [
        "1 <= nums.length <= 100",
        "0 <= nums[i] <= 400",
        "The houses form a circle, so the first and last house are adjacent.",
    ],
    "longest-palindromic-substring": [
        "1 <= s.length <= 1000",
        "s consists of digits and English letters.",
    ],
    "palindromic-substrings": [
        "1 <= s.length <= 1000",
        "s consists of lowercase English letters.",
        "Substrings at different positions count separately, even if they are identical.",
    ],
    "decode-ways": [
        "1 <= s.length <= 100",
        "s contains only digits and may start with zeros.",
        "'A' -> 1, 'B' -> 2, ..., 'Z' -> 26. Return 0 if the string cannot be decoded.",
    ],
    "coin-change": [
        "1 <= coins.length <= 12",
        "1 <= coins[i] <= 2^31 - 1",
        "0 <= amount <= 10^4",
        "You have an unlimited supply of each coin. Return -1 if the amount cannot be made.",
    ],
    "maximum-product-subarray": [
        "1 <= nums.length <= 2 * 10^4",
        "-10 <= nums[i] <= 10",
        "The product of any subarray fits in a 32-bit integer.",
    ],
    "word-break": [
        "1 <= s.length <= 300",
        "1 <= wordDict.length <= 1000, and 1 <= wordDict[i].length <= 20",
        "s and wordDict[i] consist of lowercase English letters. All words in wordDict are unique.",
        "A dictionary word may be reused any number of times.",
    ],
    "longest-increasing-subsequence": [
        "1 <= nums.length <= 2500",
        "-10^4 <= nums[i] <= 10^4",
        "The subsequence must be strictly increasing.",
    ],
    "partition-equal-subset-sum": [
        "1 <= nums.length <= 200",
        "1 <= nums[i] <= 100",
    ],
    "unique-paths": [
        "1 <= m, n <= 100",
        "The robot starts at the top-left cell and may only move right or down.",
        "The answer is at most 2 * 10^9.",
    ],
    "longest-common-subsequence": [
        "1 <= text1.length, text2.length <= 1000",
        "text1 and text2 consist of lowercase English letters.",
    ],
    "edit-distance": [
        "0 <= word1.length, word2.length <= 500",
        "word1 and word2 consist of lowercase English letters.",
        "Allowed operations: insert a character, delete a character, replace a character.",
    ],
    # Heaps, intervals, backtracking
    "kth-largest-element-array": [
        "1 <= k <= nums.length <= 10^5",
        "-10^4 <= nums[i] <= 10^4",
        "The kth largest is by sorted order, not the kth distinct value.",
    ],
    "task-scheduler": [
        "1 <= tasks.length <= 10^4",
        "tasks[i] is an uppercase English letter.",
        "0 <= n <= 100",
        "Two identical tasks must be at least n intervals apart. A CPU may be idle.",
    ],
    "merge-intervals": [
        "1 <= intervals.length <= 10^4",
        "intervals[i].length == 2",
        "0 <= start <= end <= 10^4",
    ],
    "insert-interval": [
        "0 <= intervals.length <= 10^4",
        "intervals[i].length == 2, and 0 <= start <= end <= 10^5",
        "intervals is sorted by start and has no overlaps. newInterval.length == 2.",
    ],
    "non-overlapping-intervals": [
        "1 <= intervals.length <= 10^5",
        "intervals[i].length == 2, and -5 * 10^4 <= start < end <= 5 * 10^4",
        "Intervals that only touch at an endpoint do not overlap.",
    ],
    "meeting-rooms-ii": [
        "1 <= intervals.length <= 10^4",
        "0 <= start < end <= 10^6",
        "A meeting ending at time t does not conflict with one starting at t.",
    ],
    "subsets": [
        "1 <= nums.length <= 10",
        "-10 <= nums[i] <= 10",
        "All elements are unique. The result must not contain duplicate subsets, in any order.",
    ],
    "permutations": [
        "1 <= nums.length <= 6",
        "-10 <= nums[i] <= 10",
        "All integers are unique. The permutations may be returned in any order.",
    ],
    "combination-sum": [
        "1 <= candidates.length <= 30",
        "2 <= candidates[i] <= 40, and all candidates are distinct.",
        "1 <= target <= 40",
        "A candidate may be used any number of times. Combinations must be unique.",
    ],
    "word-search": [
        "m == board.length, n == board[i].length",
        "1 <= m, n <= 6, and 1 <= word.length <= 15",
        "board and word consist of uppercase and lowercase English letters.",
        "Adjacent means horizontally or vertically. A cell may be used at most once per path.",
    ],
}

# Problems the test harness cannot drive have no tests to derive examples from, so their examples are written here.
MANUAL_EXAMPLES: dict[str, list[dict[str, str]]] = {
    "linked-list-cycle-ii": [
        {
            "input": "head = [3,2,0,-4], pos = 1",
            "output": "the node with value 2 (index 1)",
            "explanation": "The tail connects back to the node at index 1, so that is where the cycle begins.",
        },
        {"input": "head = [1,2], pos = -1", "output": "null", "explanation": "The list has no cycle."},
    ],
    "copy-list-with-random-pointer": [
        {
            "input": "head = [[7,null],[13,0],[11,4],[10,2],[1,0]]",
            "output": "[[7,null],[13,0],[11,4],[10,2],[1,0]]",
            "explanation": "Each pair is [value, index of the random target]. The copy has the same values and the same random links, built from new nodes.",
        },
    ],
    "serialize-deserialize-binary-tree": [
        {
            "input": "root = [1,2,3,null,null,4,5]",
            "output": "[1,2,3,null,null,4,5]",
            "explanation": "deserialize(serialize(root)) rebuilds the same tree.",
        },
        {"input": "root = []", "output": "[]"},
    ],
    "clone-graph": [
        {
            "input": "adjList = [[2,4],[1,3],[2,4],[1,3]]",
            "output": "[[2,4],[1,3],[2,4],[1,3]]",
            "explanation": "Node 1 neighbours 2 and 4, node 2 neighbours 1 and 3, and so on. Return a deep copy with the same structure.",
        },
        {"input": "adjList = [[]]", "output": "[[]]", "explanation": "A single node with no neighbours."},
    ],
    "surrounded-regions": [
        {
            "input": 'board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]',
            "output": '[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]',
            "explanation": "The three connected O cells are surrounded by X and are captured. The O on the bottom border is not.",
        },
    ],
}
