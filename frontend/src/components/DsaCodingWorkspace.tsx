import { useState, useMemo, useEffect, useRef } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { buildEditorTheme } from "../lib/editorTheme";
import { type ExecuteLanguage } from "../lib/api";
import { executeCode, warmUpPython } from "../lib/codeExecution";
import {
  DSA_PROBLEMS,
  getDefaultDsaProblem,
  normalizeDsaTestCases,
  type DsaProblem,
  type DsaTestCase,
} from "../lib/dsaProblemBank";
import { useTheme } from "../lib/theme";

interface DsaCodingWorkspaceProps {
  problem: DsaProblem;
  onSolutionSubmitted?: (result: {
    passed: boolean;
    totalPassed: number;
    totalTests: number;
    code: string;
    language: string;
  }) => void;
  className?: string;
}

const LANGUAGES: { id: ExecuteLanguage; label: string }[] = [
  { id: "Python", label: "Python3" },
  { id: "JavaScript", label: "JavaScript" },
  { id: "C++", label: "C++" },
  { id: "Java", label: "Java" },
];

const LANGUAGE_EXTENSIONS: Record<ExecuteLanguage, Extension> = {
  Python: python(),
  JavaScript: javascript(),
  Java: java(),
  "C++": cpp(),
};

interface TestResult {
  testCase: DsaTestCase;
  passed: boolean;
  actualOutput: string;
  executionTime?: string;
  error?: string;
}

function compareOutputs(actual: unknown, expected: unknown): boolean {
  const normActual = String(actual ?? "").trim();
  const normExpected = String(expected ?? "").trim();
  if (normActual === normExpected) return true;

  try {
    const actJson = JSON.parse(normActual);
    const expJson = JSON.parse(normExpected);

    const normalize = (v: any): any => {
      if (Array.isArray(v)) {
        const items = v.map((item) => normalize(item));
        return items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      }
      return v;
    };

    return JSON.stringify(normalize(actJson)) === JSON.stringify(normalize(expJson));
  } catch {
    return false;
  }
}

function wrapCodeForExecution(
  studentCode: string,
  lang: ExecuteLanguage,
  problem?: DsaProblem
): string {
  const prob = problem || getDefaultDsaProblem();
  const entryPoint = prob.entryPoint || "lengthOfLongestSubstring";

  if (lang === "C++") {
    let cppBody = "";
    if (prob.id === "longest-substring") {
      cppBody = `string s;
    if (getline(cin, s)) {
        Solution sol;
        cout << sol.lengthOfLongestSubstring(s) << "\\n";
    } else {
        cout << 0 << "\\n";
    }`;
    } else if (prob.id === "subarray-sum-k") {
      cppBody = `string l1, l2;
    if (getline(cin, l1) && getline(cin, l2)) {
        vector<int> nums = parseVectorInt(l1);
        int k = stoi(l2);
        Solution sol;
        cout << sol.subarraySum(nums, k) << "\\n";
    }`;
    } else if (prob.id === "coin-change") {
      cppBody = `string l1, l2;
    if (getline(cin, l1) && getline(cin, l2)) {
        vector<int> coins = parseVectorInt(l1);
        int amount = stoi(l2);
        Solution sol;
        cout << sol.coinChange(coins, amount) << "\\n";
    }`;
    } else if (prob.id === "ship-packages") {
      cppBody = `string l1, l2;
    if (getline(cin, l1) && getline(cin, l2)) {
        vector<int> weights = parseVectorInt(l1);
        int days = stoi(l2);
        Solution sol;
        cout << sol.shipWithinDays(weights, days) << "\\n";
    }`;
    } else if (prob.id === "course-schedule") {
      cppBody = `string l1, l2;
    if (getline(cin, l1) && getline(cin, l2)) {
        int numCourses = stoi(l1);
        vector<vector<int>> prereqs = parseVector2DInt(l2);
        Solution sol;
        cout << (sol.canFinish(numCourses, prereqs) ? "true" : "false") << "\\n";
    }`;
    } else if (prob.id === "trapping-rain-water") {
      cppBody = `string l1;
    if (getline(cin, l1)) {
        vector<int> height = parseVectorInt(l1);
        Solution sol;
        cout << sol.trap(height) << "\\n";
    }`;
    } else if (prob.id === "non-overlapping-intervals") {
      cppBody = `string l1;
    if (getline(cin, l1)) {
        vector<vector<int>> intervals = parseVector2DInt(l1);
        Solution sol;
        cout << sol.eraseOverlapIntervals(intervals) << "\\n";
    }`;
    } else if (prob.id === "three-sum") {
      cppBody = `string l1;
    if (getline(cin, l1)) {
        vector<int> nums = parseVectorInt(l1);
        Solution sol;
        vector<vector<int>> res = sol.threeSum(nums);
        print2D(res);
    }`;
    } else if (prob.id === "binary-tree-max-path") {
      cppBody = `string l1;
    if (getline(cin, l1)) {
        TreeNode* root = buildTree(l1);
        Solution sol;
        cout << sol.maxPathSum(root) << "\\n";
    }`;
    } else if (prob.id === "merge-k-sorted-lists") {
      cppBody = `string l1;
    if (getline(cin, l1)) {
        vector<vector<int>> raw = parseVector2DInt(l1);
        vector<ListNode*> lists;
        for (const auto& v : raw) lists.push_back(buildList(v));
        Solution sol;
        ListNode* res = sol.mergeKLists(lists);
        cout << "[";
        bool first = true;
        while (res) {
            if (!first) cout << ",";
            cout << res->val;
            first = false;
            res = res->next;
        }
        cout << "]\\n";
    }`;
    } else if (prob.id === "min-stack") {
      cppBody = `string l1, l2;
    if (getline(cin, l1) && getline(cin, l2)) {
        vector<string> ops;
        size_t pos = 0;
        while ((pos = l1.find('"', pos)) != string::npos) {
            size_t end = l1.find('"', pos + 1);
            if (end == string::npos) break;
            ops.push_back(l1.substr(pos + 1, end - pos - 1));
            pos = end + 1;
        }
        vector<vector<int>> args = parseVector2DInt(l2);
        MinStack st;
        cout << "[";
        for (size_t i = 0; i < ops.size(); ++i) {
            if (i > 0) cout << ",";
            if (ops[i] == "MinStack") cout << "null";
            else if (ops[i] == "push") { if (i < args.size() && !args[i].empty()) st.push(args[i][0]); cout << "null"; }
            else if (ops[i] == "pop") { st.pop(); cout << "null"; }
            else if (ops[i] == "top") cout << st.top();
            else if (ops[i] == "getMin") cout << st.getMin();
        }
        cout << "]\\n";
    }`;
    } else if (prob.id === "lru-cache") {
      cppBody = `string l1, l2;
    if (getline(cin, l1) && getline(cin, l2)) {
        vector<string> ops;
        size_t pos = 0;
        while ((pos = l1.find('"', pos)) != string::npos) {
            size_t end = l1.find('"', pos + 1);
            if (end == string::npos) break;
            ops.push_back(l1.substr(pos + 1, end - pos - 1));
            pos = end + 1;
        }
        vector<vector<int>> args = parseVector2DInt(l2);
        LRUCache* cache = nullptr;
        cout << "[";
        for (size_t i = 0; i < ops.size(); ++i) {
            if (i > 0) cout << ",";
            if (ops[i] == "LRUCache") {
                int cap = (i < args.size() && !args[i].empty()) ? args[i][0] : 1;
                cache = new LRUCache(cap);
                cout << "null";
            } else if (ops[i] == "put") {
                if (cache && i < args.size() && args[i].size() >= 2) cache->put(args[i][0], args[i][1]);
                cout << "null";
            } else if (ops[i] == "get") {
                int k = (i < args.size() && !args[i].empty()) ? args[i][0] : 0;
                cout << (cache ? cache->get(k) : -1);
            }
        }
        cout << "]\\n";
    }`;
    }

    return `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

${studentCode}

static vector<int> parseVectorInt(const string& s) {
    vector<int> res;
    stringstream ss(s);
    char ch;
    while (ss >> ch) {
        if (ch == '-' || isdigit(ch)) {
            ss.unget();
            int val;
            ss >> val;
            res.push_back(val);
        }
    }
    return res;
}

static vector<vector<int>> parseVector2DInt(const string& s) {
    vector<vector<int>> res;
    int depth = 0;
    int start = -1;
    for (int i = 0; i < (int)s.size(); ++i) {
        if (s[i] == '[') {
            depth++;
            if (depth == 2) start = i;
        } else if (s[i] == ']') {
            if (depth == 2 && start != -1) {
                res.push_back(parseVectorInt(s.substr(start, i - start + 1)));
                start = -1;
            }
            depth--;
        }
    }
    return res;
}

static TreeNode* buildTree(const string& s) {
    string clean;
    for (char c : s) if (c != '[' && c != ']' && c != ' ') clean += c;
    if (clean.empty()) return nullptr;
    stringstream ss(clean);
    string token;
    vector<string> tokens;
    while (getline(ss, token, ',')) {
        if (!token.empty()) tokens.push_back(token);
    }
    if (tokens.empty() || tokens[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(stoi(tokens[0]));
    queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < tokens.size()) {
        TreeNode* curr = q.front(); q.pop();
        if (i < tokens.size()) {
            if (tokens[i] != "null") {
                curr->left = new TreeNode(stoi(tokens[i]));
                q.push(curr->left);
            }
            i++;
        }
        if (i < tokens.size()) {
            if (tokens[i] != "null") {
                curr->right = new TreeNode(stoi(tokens[i]));
                q.push(curr->right);
            }
            i++;
        }
    }
    return root;
}

static ListNode* buildList(const vector<int>& nums) {
    if (nums.empty()) return nullptr;
    ListNode* head = new ListNode(nums[0]);
    ListNode* curr = head;
    for (size_t i = 1; i < nums.size(); ++i) {
        curr->next = new ListNode(nums[i]);
        curr = curr->next;
    }
    return head;
}

static void print2D(const vector<vector<int>>& res) {
    cout << "[";
    for (size_t i = 0; i < res.size(); ++i) {
        if (i > 0) cout << ",";
        cout << "[";
        for (size_t j = 0; j < res[i].size(); ++j) {
            if (j > 0) cout << ",";
            cout << res[i][j];
        }
        cout << "]";
    }
    cout << "]\\n";
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    ${cppBody}
    return 0;
}
`;
  }

  if (lang === "Python") {
    return `import sys, json

if 'TreeNode' not in globals():
    class TreeNode:
        def __init__(self, val=0, left=None, right=None):
            self.val = val
            self.left = left
            self.right = right

if 'ListNode' not in globals():
    class ListNode:
        def __init__(self, val=0, next=None):
            self.val = val
            self.next = next

def _build_tree(vals):
    if not vals:
        return None
    root = TreeNode(vals[0])
    queue = [root]
    i = 1
    while queue and i < len(vals):
        node = queue.pop(0)
        if i < len(vals):
            if vals[i] is not None:
                node.left = TreeNode(vals[i])
                queue.append(node.left)
            i += 1
        if i < len(vals):
            if vals[i] is not None:
                node.right = TreeNode(vals[i])
                queue.append(node.right)
            i += 1
    return root

def _build_list(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    curr = head
    for v in arr[1:]:
        curr.next = ListNode(v)
        curr = curr.next
    return head

def _list_to_arr(head):
    if head is None:
        return []
    if isinstance(head, list):
        return head
    res = []
    curr = head
    while curr:
        res.append(curr.val)
        curr = curr.next
    return res

${studentCode}

if __name__ == "__main__":
    raw = sys.stdin.read()
    if not raw.strip():
        if "${prob.id}" == "longest-substring":
            print(0)
        elif "${prob.returnType}" == "boolean":
            print("false")
        elif "${prob.returnType}".endswith("[]"):
            print("[]")
        else:
            print(0)
        sys.exit(0)

    lines = [l.strip() for l in raw.splitlines() if l.strip()]

    if "${prob.entryPoint}" in ["MinStack", "LRUCache", "TimeMap"]:
        ops = json.loads(lines[0])
        args = json.loads(lines[1])
        out = []
        cls = globals().get("${prob.entryPoint}") or (getattr(globals().get("Solution"), "${prob.entryPoint}") if "Solution" in globals() else None)
        obj = None
        for op, a in zip(ops, args):
            if op == "${prob.entryPoint}":
                obj = cls(*a)
                out.append(None)
            else:
                method = getattr(obj, op)
                res = method(*a)
                out.append(res)
        print(json.dumps(out, separators=(',', ':')))
        sys.exit(0)

    sol = Solution() if 'Solution' in globals() else None
    fn = getattr(sol, "${entryPoint}", None) if sol else globals().get("${entryPoint}")

    if "${prob.id}" == "longest-substring":
        s = raw.splitlines()[0] if raw.splitlines() else ""
        if fn:
            print(fn(s))
        else:
            print(0)
        sys.exit(0)

    parsed_args = []
    for line in lines:
        try:
            parsed_args.append(json.loads(line))
        except Exception:
            parsed_args.append(line)

    if "${prob.id}" == "binary-tree-max-path" and parsed_args:
        parsed_args = [_build_tree(parsed_args[0])]

    if "${prob.id}" == "merge-k-sorted-lists" and parsed_args:
        k_lists = [_build_list(sub) for sub in (parsed_args[0] or [])]
        parsed_args = [k_lists]

    if fn:
        result = fn(*parsed_args)
        if "${prob.id}" == "merge-k-sorted-lists":
            print(json.dumps(_list_to_arr(result), separators=(',', ':')))
        elif isinstance(result, bool):
            print("true" if result else "false")
        elif isinstance(result, (list, dict)):
            print(json.dumps(result, separators=(',', ':')))
        elif result is None:
            print("[]")
        else:
            print(result)
    else:
        print(0)
`;
  }

  if (lang === "JavaScript") {
    return `const fs = require('fs');

function TreeNode(val, left, right) {
    this.val = (val===undefined ? 0 : val);
    this.left = (left===undefined ? null : left);
    this.right = (right===undefined ? null : right);
}

function ListNode(val, next) {
    this.val = (val===undefined ? 0 : val);
    this.next = (next===undefined ? null : next);
}

function _buildTree(vals) {
    if (!vals || !vals.length || vals[0] === null) return null;
    const root = new TreeNode(vals[0]);
    const queue = [root];
    let i = 1;
    while (queue.length > 0 && i < vals.length) {
        const curr = queue.shift();
        if (i < vals.length) {
            if (vals[i] !== null && vals[i] !== undefined) {
                curr.left = new TreeNode(vals[i]);
                queue.push(curr.left);
            }
            i++;
        }
        if (i < vals.length) {
            if (vals[i] !== null && vals[i] !== undefined) {
                curr.right = new TreeNode(vals[i]);
                queue.push(curr.right);
            }
            i++;
        }
    }
    return root;
}

function _buildList(arr) {
    if (!arr || !arr.length) return null;
    const head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }
    return head;
}

function _listToArr(head) {
    if (!head) return [];
    if (Array.isArray(head)) return head;
    const res = [];
    let curr = head;
    while (curr) {
        res.push(curr.val);
        curr = curr.next;
    }
    return res;
}

${studentCode}

const raw = fs.readFileSync(0, 'utf-8');
if (!raw.trim()) {
    if ("${prob.id}" === "longest-substring") console.log(0);
    else if ("${prob.returnType}" === "boolean") console.log("false");
    else if ("${prob.returnType}".endsWith("[]")) console.log("[]");
    else console.log(0);
    process.exit(0);
}

if ("${prob.id}" === "longest-substring") {
    const s = raw.split(/\\r?\\n/)[0] || '';
    if (typeof Solution !== 'undefined') {
        const sol = new Solution();
        console.log(sol.lengthOfLongestSubstring(s));
    } else if (typeof lengthOfLongestSubstring === 'function') {
        console.log(lengthOfLongestSubstring(s));
    } else {
        console.log(0);
    }
    process.exit(0);
}

const lines = raw.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);

if (["MinStack", "LRUCache", "TimeMap"].includes("${prob.entryPoint}")) {
    const ops = JSON.parse(lines[0]);
    const args = JSON.parse(lines[1]);
    const out = [];
    let obj = null;
    const Cls = typeof ${prob.entryPoint} !== 'undefined' ? ${prob.entryPoint} : (typeof Solution !== 'undefined' && Solution.${prob.entryPoint});
    for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        const a = args[i];
        if (op === "${prob.entryPoint}") {
            obj = new Cls(...a);
            out.push(null);
        } else {
            const res = obj[op](...a);
            out.push(res !== undefined ? res : null);
        }
    }
    console.log(JSON.stringify(out));
    process.exit(0);
}

let parsedArgs = lines.map(line => {
    try {
        return JSON.parse(line);
    } catch (e) {
        return line;
    }
});

if ("${prob.id}" === "binary-tree-max-path" && parsedArgs.length > 0) {
    parsedArgs = [_buildTree(parsedArgs[0])];
}

if ("${prob.id}" === "merge-k-sorted-lists" && parsedArgs.length > 0) {
    parsedArgs = [(parsedArgs[0] || []).map(_buildList)];
}

let fn = null;
if (typeof Solution !== 'undefined') {
    const sol = new Solution();
    if (typeof sol["${entryPoint}"] === 'function') {
        fn = sol["${entryPoint}"].bind(sol);
    }
}
if (!fn && typeof global["${entryPoint}"] === 'function') {
    fn = global["${entryPoint}"];
}
if (!fn && typeof ${entryPoint} === 'function') {
    fn = ${entryPoint};
}

if (fn) {
    const res = fn(...parsedArgs);
    if ("${prob.id}" === "merge-k-sorted-lists") {
        console.log(JSON.stringify(_listToArr(res)));
    } else if (typeof res === 'boolean') {
        console.log(res ? "true" : "false");
    } else if (typeof res === 'object' && res !== null) {
        console.log(JSON.stringify(res));
    } else if (res === null || res === undefined) {
        console.log("[]");
    } else {
        console.log(res);
    }
} else {
    console.log(0);
}
`;
  }

  if (lang === "Java") {
    let javaBody = "";
    if (prob.id === "longest-substring") {
      javaBody = `String line = reader.readLine();
        if (line == null) line = "";
        Solution sol = new Solution();
        System.out.println(sol.lengthOfLongestSubstring(line));`;
    } else if (prob.id === "subarray-sum-k") {
      javaBody = `int[] nums = parseArray(reader.readLine());
        int k = Integer.parseInt(reader.readLine().trim());
        Solution sol = new Solution();
        System.out.println(sol.subarraySum(nums, k));`;
    } else if (prob.id === "coin-change") {
      javaBody = `int[] coins = parseArray(reader.readLine());
        int amount = Integer.parseInt(reader.readLine().trim());
        Solution sol = new Solution();
        System.out.println(sol.coinChange(coins, amount));`;
    } else if (prob.id === "ship-packages") {
      javaBody = `int[] weights = parseArray(reader.readLine());
        int days = Integer.parseInt(reader.readLine().trim());
        Solution sol = new Solution();
        System.out.println(sol.shipWithinDays(weights, days));`;
    } else if (prob.id === "course-schedule") {
      javaBody = `int numCourses = Integer.parseInt(reader.readLine().trim());
        int[][] prereqs = parse2DArray(reader.readLine());
        Solution sol = new Solution();
        System.out.println(sol.canFinish(numCourses, prereqs));`;
    } else if (prob.id === "trapping-rain-water") {
      javaBody = `int[] height = parseArray(reader.readLine());
        Solution sol = new Solution();
        System.out.println(sol.trap(height));`;
    } else if (prob.id === "non-overlapping-intervals") {
      javaBody = `int[][] intervals = parse2DArray(reader.readLine());
        Solution sol = new Solution();
        System.out.println(sol.eraseOverlapIntervals(intervals));`;
    } else if (prob.id === "three-sum") {
      javaBody = `int[] nums = parseArray(reader.readLine());
        Solution sol = new Solution();
        List<List<Integer>> res = sol.threeSum(nums);
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < res.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append("[");
            List<Integer> sub = res.get(i);
            for (int j = 0; j < sub.size(); j++) {
                if (j > 0) sb.append(",");
                sb.append(sub.get(j));
            }
            sb.append("]");
        }
        sb.append("]");
        System.out.println(sb.toString());`;
    } else if (prob.id === "binary-tree-max-path") {
      javaBody = `TreeNode root = buildTree(reader.readLine());
        Solution sol = new Solution();
        System.out.println(sol.maxPathSum(root));`;
    } else if (prob.id === "merge-k-sorted-lists") {
      javaBody = `int[][] raw = parse2DArray(reader.readLine());
        ListNode[] lists = new ListNode[raw.length];
        for (int i = 0; i < raw.length; i++) lists[i] = buildList(raw[i]);
        Solution sol = new Solution();
        ListNode res = sol.mergeKLists(lists);
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        while (res != null) {
            if (!first) sb.append(",");
            sb.append(res.val);
            first = false;
            res = res.next;
        }
        sb.append("]");
        System.out.println(sb.toString());`;
    } else if (prob.id === "min-stack") {
      javaBody = `String l1 = reader.readLine();
        String l2 = reader.readLine();
        List<String> ops = new ArrayList<>();
        int pos = 0;
        while ((pos = l1.indexOf("\"", pos)) != -1) {
            int end = l1.indexOf("\"", pos + 1);
            if (end == -1) break;
            ops.add(l1.substring(pos + 1, end));
            pos = end + 1;
        }
        int[][] argsList = parse2DArray(l2);
        MinStack st = new MinStack();
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < ops.size(); i++) {
            if (i > 0) sb.append(",");
            String op = ops.get(i);
            if (op.equals("MinStack")) sb.append("null");
            else if (op.equals("push")) { if (i < argsList.length && argsList[i].length > 0) st.push(argsList[i][0]); sb.append("null"); }
            else if (op.equals("pop")) { st.pop(); sb.append("null"); }
            else if (op.equals("top")) sb.append(st.top());
            else if (op.equals("getMin")) sb.append(st.getMin());
        }
        sb.append("]");
        System.out.println(sb.toString());`;
    } else if (prob.id === "lru-cache") {
      javaBody = `String l1 = reader.readLine();
        String l2 = reader.readLine();
        List<String> ops = new ArrayList<>();
        int pos = 0;
        while ((pos = l1.indexOf("\"", pos)) != -1) {
            int end = l1.indexOf("\"", pos + 1);
            if (end == -1) break;
            ops.add(l1.substring(pos + 1, end));
            pos = end + 1;
        }
        int[][] argsList = parse2DArray(l2);
        LRUCache cache = null;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < ops.size(); i++) {
            if (i > 0) sb.append(",");
            String op = ops.get(i);
            if (op.equals("LRUCache")) {
                int cap = (i < argsList.length && argsList[i].length > 0) ? argsList[i][0] : 1;
                cache = new LRUCache(cap);
                sb.append("null");
            } else if (op.equals("put")) {
                if (cache != null && i < argsList.length && argsList[i].length >= 2) cache.put(argsList[i][0], argsList[i][1]);
                sb.append("null");
            } else if (op.equals("get")) {
                int k = (i < argsList.length && argsList[i].length > 0) ? argsList[i][0] : 0;
                sb.append(cache != null ? cache.get(k) : -1);
            }
        }
        sb.append("]");
        System.out.println(sb.toString());`;
    }

    return `import java.util.*;
import java.io.*;

class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode() {}
    public TreeNode(int val) { this.val = val; }
    public TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class ListNode {
    public int val;
    public ListNode next;
    public ListNode() {}
    public ListNode(int val) { this.val = val; }
    public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

${studentCode}

public class Main {
    static int[] parseArray(String s) {
        if (s == null) return new int[0];
        String c = s.replaceAll("[\\[\\]\\s]", "");
        if (c.isEmpty()) return new int[0];
        String[] parts = c.split(",");
        int[] res = new int[parts.length];
        for (int i = 0; i < parts.length; i++) res[i] = Integer.parseInt(parts[i]);
        return res;
    }

    static int[][] parse2DArray(String s) {
        if (s == null) return new int[0][0];
        List<int[]> list = new ArrayList<>();
        int depth = 0;
        int start = -1;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '[') {
                depth++;
                if (depth == 2) start = i;
            } else if (ch == ']') {
                if (depth == 2 && start != -1) {
                    list.add(parseArray(s.substring(start, i + 1)));
                    start = -1;
                }
                depth--;
            }
        }
        return list.toArray(new int[list.size()][]);
    }

    static TreeNode buildTree(String s) {
        if (s == null) return null;
        String c = s.replaceAll("[\\[\\]\\s]", "");
        if (c.isEmpty()) return null;
        String[] tokens = c.split(",");
        if (tokens.length == 0 || tokens[0].equals("null")) return null;
        TreeNode root = new TreeNode(Integer.parseInt(tokens[0]));
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < tokens.length) {
            TreeNode curr = q.poll();
            if (i < tokens.length) {
                if (!tokens[i].equals("null")) {
                    curr.left = new TreeNode(Integer.parseInt(tokens[i]));
                    q.add(curr.left);
                }
                i++;
            }
            if (i < tokens.length) {
                if (!tokens[i].equals("null")) {
                    curr.right = new TreeNode(Integer.parseInt(tokens[i]));
                    q.add(curr.right);
                }
                i++;
            }
        }
        return root;
    }

    static ListNode buildList(int[] nums) {
        if (nums == null || nums.length == 0) return null;
        ListNode head = new ListNode(nums[0]);
        ListNode curr = head;
        for (int i = 1; i < nums.length; i++) {
            curr.next = new ListNode(nums[i]);
            curr = curr.next;
        }
        return head;
    }

    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        ${javaBody}
    }
}
`;
  }

  return studentCode;
}

export default function DsaCodingWorkspace({
  problem: rawProblem,
  onSolutionSubmitted,
  className = "",
}: DsaCodingWorkspaceProps) {
  const problem = useMemo(
    () => ({ ...rawProblem, testCases: normalizeDsaTestCases(rawProblem.testCases) }),
    [rawProblem],
  );
  const [selectedLanguage, setSelectedLanguage] = useState<ExecuteLanguage>("Python");
  const [code, setCode] = useState(() => problem.templates.Python);

  // Synchronize starter code if problem changes
  useEffect(() => {
    warmUpPython();
  }, []);

  useEffect(() => {
    setCode(problem.templates[selectedLanguage] || "");
  }, [problem.id, selectedLanguage]);

  // Left panel tabs (Editorial removed during live interview)
  const [leftTab, setLeftTab] = useState<"description" | "submissions">("description");

  // Right console tabs
  const [consoleTab, setConsoleTab] = useState<"testcase" | "result">("testcase");
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);

  const [customInputs, setCustomInputs] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    problem.testCases.forEach((tc) => {
      init[tc.id] = tc.input;
    });
    return init;
  });

  // Keep customInputs and results in sync if problem changes
  useEffect(() => {
    const init: Record<number, string> = {};
    problem.testCases.forEach((tc) => {
      init[tc.id] = tc.input;
    });
    setCustomInputs(init);
    setTestResults([]);
    setSelectedCaseIdx(0);
  }, [problem.id]);

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [, setLastRunType] = useState<"run" | "submit" | null>(null);

  const { theme } = useTheme();
  const editorTheme = useMemo(() => buildEditorTheme(13, theme === "light"), [theme]);

  const visibleTests = useMemo(
    () => problem.testCases.filter((tc) => !tc.isHidden),
    [problem.testCases]
  );
  const activeVisibleCase = visibleTests[selectedCaseIdx] || visibleTests[0];

  const handleLanguageChange = (lang: ExecuteLanguage) => {
    setSelectedLanguage(lang);
    setCode(problem.templates[lang] || "");
  };

  const handleResetCode = () => {
    setCode(problem.templates[selectedLanguage] || "");
  };

  const runVisibleTests = async () => {
    if (isRunning || isSubmitting) return;
    setIsRunning(true);
    setConsoleTab("result");
    setLastRunType("run");

    const results: TestResult[] = [];
    const executableSource = wrapCodeForExecution(code, selectedLanguage, problem);

    for (const tc of visibleTests) {
      const runInput = customInputs[tc.id] !== undefined ? customInputs[tc.id] : tc.input;

      try {
        const res = await executeCode(
          { language: selectedLanguage, source_code: executableSource, stdin: runInput },
          { candidateCode: code, label: "dsa-visible-test" },
        );

        const rawOutput = (res.stdout || "").trim();
        const expected = String(tc.expectedOutput ?? "").trim();
        const passed = compareOutputs(rawOutput, expected);

        results.push({
          testCase: { ...tc, input: runInput },
          passed,
          actualOutput: rawOutput || (res.stderr ? `Error: ${res.stderr}` : "(empty output)"),
          executionTime: res.time ? `${res.time}s` : "0.04s",
          error: res.stderr || res.compile_output || undefined,
        });
      } catch (err: any) {
        results.push({
          testCase: { ...tc, input: runInput },
          passed: false,
          actualOutput: "Execution error",
          error: err.message || "Failed to execute",
        });
      }
    }

    setTestResults(results);
    setSelectedCaseIdx(0);
    setIsRunning(false);
  };

  const submitFullSolution = async () => {
    if (isRunning || isSubmitting) return;
    setIsSubmitting(true);
    setConsoleTab("result");
    setLastRunType("submit");

    const allTests = problem.testCases;
    const results: TestResult[] = [];
    const executableSource = wrapCodeForExecution(code, selectedLanguage, problem);

    for (const tc of allTests) {
      try {
        const res = await executeCode(
          { language: selectedLanguage, source_code: executableSource, stdin: tc.input },
          { candidateCode: code, label: "dsa-submit" },
        );

        const rawOutput = (res.stdout || "").trim();
        const expected = String(tc.expectedOutput ?? "").trim();
        const passed = compareOutputs(rawOutput, expected);

        results.push({
          testCase: tc,
          passed,
          actualOutput: rawOutput || (res.stderr ? `Error: ${res.stderr}` : "(empty output)"),
          executionTime: res.time ? `${res.time}s` : "0.03s",
          error: res.stderr || res.compile_output || undefined,
        });
      } catch (err: any) {
        results.push({
          testCase: tc,
          passed: false,
          actualOutput: "Execution error",
          error: err.message || "Failed to execute",
        });
      }
    }

    const passedCount = results.filter((r) => r.passed).length;
    const allPassed = passedCount === allTests.length;

    setTestResults(results);
    setSelectedCaseIdx(0);
    setIsSubmitting(false);

    if (onSolutionSubmitted) {
      onSolutionSubmitted({
        passed: allPassed,
        totalPassed: passedCount,
        totalTests: allTests.length,
        code,
        language: selectedLanguage,
      });
    }
  };

  const stateRef = useRef({
    code,
    selectedLanguage,
    problem,
    visibleTests,
    customInputs,
    isRunning,
    isSubmitting,
    runVisibleTests,
    submitFullSolution,
  });
  stateRef.current = {
    code,
    selectedLanguage,
    problem,
    visibleTests,
    customInputs,
    isRunning,
    isSubmitting,
    runVisibleTests,
    submitFullSolution,
  };

  // Keyboard shortcuts: Ctrl+' to Run, Ctrl+Enter to Submit
  // Registered in capture phase so CodeMirror or inner inputs cannot swallow them.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isQuote = e.key === "'" || e.code === "Quote";
      const isEnter = e.key === "Enter" || e.code === "Enter";
      if ((e.ctrlKey || e.metaKey) && isQuote) {
        e.preventDefault();
        e.stopPropagation();
        if (!stateRef.current.isRunning && !stateRef.current.isSubmitting) {
          stateRef.current.runVisibleTests();
        }
      } else if ((e.ctrlKey || e.metaKey) && isEnter) {
        e.preventDefault();
        e.stopPropagation();
        if (!stateRef.current.isRunning && !stateRef.current.isSubmitting) {
          stateRef.current.submitFullSolution();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const activeResult = testResults[selectedCaseIdx];
  const allTestsPassed = testResults.length > 0 && testResults.every((r) => r.passed);

  return (
    <div className={`flex flex-col h-full text-[#ebe9e2] overflow-hidden ${className}`}>
      {/* LeetCode Header Nav */}
      <div className="h-11 border-b border-white/10 bg-[#161614] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                problem.difficulty === "Easy"
                  ? "bg-emerald-400"
                  : problem.difficulty === "Medium"
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
            />
            <span className="text-xs font-semibold tracking-wide text-[#ebe9e2] font-mono px-1 py-0.5">
              {problem.title}
            </span>
          </div>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              problem.difficulty === "Easy"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : problem.difficulty === "Medium"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
            {problem.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#aaa89f]">
          <span className="px-2 py-0.5 rounded bg-[#20201e] text-[11px] font-mono text-[#d3d1c9] border border-white/5">
            {problem.optimalTimeComplexity} Time | {problem.optimalSpaceComplexity} Space
          </span>
        </div>
      </div>

      {/* Main Split: 50% Left (Problem Specs) | 50% Right (Editor & Console) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* ================================================================= */}
        {/* LEFT PANE: LeetCode Problem Description                           */}
        {/* ================================================================= */}
        <div className="col-span-12 lg:col-span-6 flex flex-col border-r border-white/10 overflow-hidden h-full">
          {/* Problem Tabs */}
          <div className="h-10 border-b border-white/10 bg-[#161614] px-3 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setLeftTab("description")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                leftTab === "description"
                  ? "bg-white/10 text-white shadow-sm font-semibold"
                  : "text-[#aaa89f] hover:text-white hover:bg-white/5"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Description</span>
            </button>
            <button
              onClick={() => setLeftTab("submissions")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                leftTab === "submissions"
                  ? "bg-white/10 text-white shadow-sm font-semibold"
                  : "text-[#aaa89f] hover:text-white hover:bg-white/5"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Submissions</span>
            </button>
          </div>

          {/* Left Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-[#d3d1c9] leading-relaxed font-sans bg-[#0d0d0c]">
            {leftTab === "description" && (
              <>
                <div>
                  <h1 className="text-lg font-bold text-white mb-2">
                    {problem.title}
                  </h1>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        problem.difficulty === "Easy"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                          : problem.difficulty === "Medium"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/25"
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                    <span className="text-[11px] text-[#8f8d85]">Topics</span>
                    <span className="text-[11px] text-[#8f8d85]">Companies</span>
                  </div>
                  <p className="text-[#d3d1c9] whitespace-pre-line leading-relaxed font-normal">
                    {problem.description}
                  </p>
                </div>

                {/* Examples */}
                <div className="space-y-4">
                  {problem.examples.map((ex, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="font-semibold text-[#d3d1c9]">
                        Example {idx + 1}:
                      </div>
                      <div className="bg-[#161614] border border-white/10 rounded-lg p-3 font-mono text-[11px] space-y-1">
                        <div>
                          <strong className="text-[#aaa89f] font-sans">Input: </strong>
                          <span className="text-[#d3d1c9]">{ex.input}</span>
                        </div>
                        <div>
                          <strong className="text-[#aaa89f] font-sans">Output: </strong>
                          <span className="text-[#d3d1c9]">{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div className="pt-1 font-sans text-[#aaa89f] text-[11px]">
                            <strong className="text-[#d3d1c9]">Explanation: </strong>
                            <span>{ex.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div>
                  <div className="font-semibold text-[#d3d1c9] mb-2">
                    Constraints:
                  </div>
                  <ul className="space-y-1.5 list-disc list-inside font-mono text-[11px] text-[#aaa89f]">
                    {problem.constraints.map((c, i) => (
                      <li key={i}>
                        <code className="bg-[#20201e] border border-white/10 px-1.5 py-0.5 rounded text-[#d3d1c9]">
                          {c}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tags */}
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs text-[#aaa89f] mb-2 font-semibold">
                    Related Topics
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {problem.tagline.split(", ").map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full bg-[#20201e] hover:bg-[#1a1e2d] text-[11px] text-[#d3d1c9] cursor-pointer transition-colors border border-white/5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {leftTab === "submissions" && (
              <div className="space-y-3">
                <div className="text-zinc-400 text-xs">
                  {testResults.length > 0
                    ? `Last evaluation: ${testResults.filter((r) => r.passed).length} / ${testResults.length} test cases passed.`
                    : "No submissions recorded yet for this session."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANE: Code Editor (Top) + LeetCode Test Console (Bottom)     */}
        {/* ================================================================= */}
        <div className="col-span-12 lg:col-span-6 flex flex-col overflow-hidden h-full">
          {/* Editor Header Bar */}
          <div className="h-10 border-b border-white/10 bg-[#161614] px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value as ExecuteLanguage)}
                className="bg-[#20201e] hover:bg-[#1c2030] border border-white/15 text-xs text-white rounded px-2.5 py-1 focus:outline-none cursor-pointer font-medium"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id} className="bg-[#20201e] text-white">
                    {l.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleResetCode}
                className="px-2 py-1 text-xs text-[#aaa89f] hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
                title="Reset to starter stub"
              >
                Reset
              </button>
            </div>

            <div className="text-[11px] text-[#8f8d85] font-mono">
              Auto-saved
            </div>
          </div>

          {/* Top 60%: CodeMirror Editor */}
          <div className="flex-[6] overflow-auto">
            <CodeMirror
              value={code}
              height="100%"
              extensions={[LANGUAGE_EXTENSIONS[selectedLanguage], editorTheme]}
              onChange={(value) => setCode(value)}
              theme="dark"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                autocompletion: true,
                bracketMatching: true,
                indentOnInput: true,
              }}
            />
          </div>

          {/* Bottom 40%: LeetCode Testcase & Console Drawer */}
          <div className="flex-[4] flex flex-col border-t border-white/10 bg-[#0d0d0c] overflow-hidden">
            {/* Console Tabs */}
            <div className="h-9 border-b border-white/10 bg-[#161614] px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConsoleTab("testcase")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === "testcase"
                      ? "bg-white/10 text-white font-semibold shadow-sm"
                      : "text-[#aaa89f] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Testcase</span>
                </button>
                <button
                  onClick={() => setConsoleTab("result")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === "result"
                      ? "bg-white/10 text-white font-semibold shadow-sm"
                      : "text-[#aaa89f] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 17l6-6-6-6M12 19h8" />
                  </svg>
                  <span>Test Result</span>
                  {testResults.length > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        allTestsPassed ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                  )}
                </button>
              </div>

              {(isRunning || isSubmitting) && (
                <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Running...</span>
                </div>
              )}
            </div>

            {/* Console Body */}
            <div className="flex-1 overflow-y-auto p-3 text-xs leading-relaxed font-sans bg-[#0d0d0c]">
              {/* TAB 1: TESTCASE INPUT */}
              {consoleTab === "testcase" && (
                <div className="space-y-3">
                  {/* Case Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {visibleTests.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCaseIdx(idx)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          selectedCaseIdx === idx
                            ? "bg-white/15 text-white font-semibold shadow-sm border border-white/20"
                            : "bg-[#20201e] text-[#aaa89f] hover:text-white hover:bg-[#1a1e2d] border border-white/5"
                        }`}
                      >
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Input field for chosen case */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-[#aaa89f] font-semibold font-mono">
                      {problem.args.map((a) => a.name).join(", ") || "input"} =
                    </div>
                    <textarea
                      rows={Math.max(1, (customInputs[activeVisibleCase?.id] ?? activeVisibleCase?.input ?? "").split("\n").length)}
                      value={customInputs[activeVisibleCase?.id] ?? activeVisibleCase?.input ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeVisibleCase) {
                          setCustomInputs((prev) => ({ ...prev, [activeVisibleCase.id]: val }));
                        }
                      }}
                      className="w-full bg-[#161614] border border-white/10 focus:border-cyan-500/60 rounded-lg px-3 py-2 text-[#ebe9e2] font-mono text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: TEST RESULT */}
              {consoleTab === "result" && (
                <div className="space-y-3">
                  {testResults.length === 0 && !isRunning && !isSubmitting && (
                    <div className="text-center py-6 text-[#8f8d85] italic text-xs">
                      Run your code to evaluate against testcases.
                    </div>
                  )}

                  {testResults.length > 0 && (
                    <>
                      {/* Big Status Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-base font-bold tracking-tight ${
                              allTestsPassed ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {allTestsPassed ? "Accepted" : "Wrong Answer"}
                          </span>
                          <span className="text-[#aaa89f] font-mono text-xs">
                            Runtime: {activeResult?.executionTime || "0.04s"}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-[#aaa89f]">
                          {testResults.filter((r) => r.passed).length} / {testResults.length} testcases passed
                        </span>
                      </div>

                      {/* Result Case Selector */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {testResults.map((r, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedCaseIdx(idx)}
                            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                              selectedCaseIdx === idx
                                ? "bg-white/15 text-white font-semibold shadow-sm border border-white/20"
                                : "bg-[#20201e] text-[#aaa89f] hover:text-white hover:bg-[#1a1e2d] border border-white/5"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.passed ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            />
                            <span>Case {idx + 1}</span>
                          </button>
                        ))}
                      </div>

                      {/* Detail of chosen result */}
                      {activeResult && (
                        <div className="space-y-2 p-3 rounded-lg border border-white/10 bg-[#161614] font-mono text-[11px]">
                          <div>
                            <span className="text-[#aaa89f]">Input: </span>
                            <div className="mt-1 p-2 rounded bg-black/40 text-[#ebe9e2] whitespace-pre-wrap border border-white/5">
                              {activeResult.testCase.input}
                            </div>
                          </div>
                          <div>
                            <span className="text-[#aaa89f]">Output: </span>
                            <span className={activeResult.passed ? "text-emerald-400" : "text-rose-400 font-semibold"}>
                              {activeResult.actualOutput}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#aaa89f]">Expected: </span>
                            <span className="text-emerald-400">{activeResult.testCase.expectedOutput}</span>
                          </div>

                          {activeResult.error && (
                            <div className="mt-2 p-2 bg-rose-950/30 text-rose-300 rounded border border-rose-500/20 whitespace-pre-wrap font-mono text-[10px]">
                              {activeResult.error}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bottom LeetCode Action Bar: Console (Left) | Run + Submit (Right) */}
            <div className="h-11 border-t border-white/10 bg-[#0d0d0c] px-3 flex items-center justify-between shrink-0">
              <button
                onClick={() => setConsoleTab((prev) => (prev === "testcase" ? "result" : "testcase"))}
                className="px-2.5 py-1 text-xs text-[#aaa89f] hover:text-white rounded hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span>Console</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={runVisibleTests}
                  disabled={isRunning || isSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-[#20201e] hover:bg-[#1c2030] text-[#d3d1c9] border border-white/15 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  title="Run tests (Ctrl+')"
                >
                  <svg className="w-3 h-3 text-[#aaa89f]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Run</span>
                  <span className="hidden sm:inline-block text-[10px] font-mono text-[#aaa89f] px-1 py-0.2 rounded bg-white/5 border border-white/10">Ctrl+'</span>
                </button>

                <button
                  onClick={submitFullSolution}
                  disabled={isRunning || isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2cbb5d] hover:bg-[#28a752] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                  title="Submit full solution (Ctrl+Enter)"
                >
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Submit</span>
                  <span className="hidden sm:inline-block text-[10px] font-mono text-white/90 px-1 py-0.2 rounded bg-black/20 border border-white/20">Ctrl+Enter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
