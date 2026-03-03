# Code Questions API Documentation

## Overview
Hệ thống đã được mở rộng để hỗ trợ câu hỏi dạng code (coding challenges) tương tự LeetCode, với khả năng chạy code và kiểm tra test cases.

## Models

### QuizQuestion
Model đã được cập nhật với các fields mới cho code questions:

```python
{
    "question_text": "Two Sum",
    "question_type": "code",  # New type
    "difficulty": "easy",     # New field: easy/medium/hard
    "description": "Detailed problem description...",
    "points": 10,
    "time_limit": 2,          # Seconds for code execution
    "memory_limit": 128000,   # KB for code execution
    "allowed_languages": [63, 71, 62, 54],  # Judge0 language IDs
    "starter_code": "function twoSum(nums, target) {\n  \n}",
    "lesson": 123,
    "order_number": 1
}
```

### QuizTestCase (New Model)
Model mới để lưu test cases cho code questions:

```python
{
    "question": 101,
    "input_data": "2,7,11,15\n9",
    "expected_output": "0,1",
    "is_hidden": false,       # Public or hidden test case
    "points": 5,              # Optional points for this test case
    "order_number": 1
}
```

## API Endpoints

### 1. Create Code Question with Test Cases

**POST** `/api/quiz-questions/create/`

**Request Body:**
```json
{
  "lesson": 123,
  "question_text": "Two Sum",
  "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
  "question_type": "code",
  "difficulty": "easy",
  "points": 10,
  "time_limit": 2,
  "memory_limit": 128000,
  "allowed_languages": [63, 71, 62, 54],
  "starter_code": "// Write your solution here\nfunction twoSum(nums, target) {\n  \n}",
  "correct_answer": "solution_code_here",
  "explanation": "Use hash map for O(n) solution",
  "order_number": 1,
  "test_cases": [
    {
      "input_data": "2,7,11,15\n9",
      "expected_output": "0,1",
      "is_hidden": false,
      "order_number": 1
    },
    {
      "input_data": "3,2,4\n6",
      "expected_output": "1,2",
      "is_hidden": false,
      "order_number": 2
    },
    {
      "input_data": "3,3\n6",
      "expected_output": "0,1",
      "is_hidden": true,
      "points": 5,
      "order_number": 3
    }
  ]
}
```

**Response:**
```json
{
  "id": 101,
  "lesson": 123,
  "question_text": "Two Sum",
  "description": "Given an array...",
  "question_type": "code",
  "difficulty": "easy",
  "points": 10,
  "time_limit": 2,
  "memory_limit": 128000,
  "allowed_languages": [63, 71, 62, 54],
  "starter_code": "function twoSum(nums, target) {...}",
  "test_cases": [
    {
      "id": 1,
      "input_data": "2,7,11,15\n9",
      "expected_output": "0,1",
      "is_hidden": false,
      "points": 0,
      "order_number": 1
    },
    ...
  ],
  "created_at": "2024-03-20T10:00:00Z",
  "updated_at": "2024-03-20T10:00:00Z"
}
```

### 2. Get Quiz for Students (Code Questions)

**GET** `/api/quizzes/lesson/<lesson_id>/`

**Response for Code Question:**
```json
{
  "quiz_id": 123,
  "lesson_id": 123,
  "title": "Python Basics Quiz",
  "description": "Test your knowledge",
  "time_limit": null,
  "passing_score": 70,
  "questions": [
    {
      "question_id": 101,
      "question_text": "Two Sum",
      "question_type": "code",
      "difficulty": "easy",
      "points": 10,
      "description": "Given an array of integers...",
      "time_limit": 2,
      "memory_limit": 128000,
      "allowed_languages": [63, 71, 62, 54],
      "starter_code": "function twoSum(nums, target) {\n  \n}",
      "test_cases": [
        {
          "id": 1,
          "input_data": "2,7,11,15\n9",
          "expected_output": "0,1",
          "is_hidden": false
        },
        {
          "id": 2,
          "input_data": "3,2,4\n6",
          "expected_output": "1,2",
          "is_hidden": false
        },
        {
          "id": 3,
          "input_data": "3,3\n6",
          "is_hidden": true
          // Note: expected_output is hidden for hidden test cases
        }
      ]
    }
  ]
}
```

### 3. Submit Code Quiz

**POST** `/api/quizzes/submit/`

**Request Body:**
```json
{
  "quiz_id": 123,
  "lesson_id": 123,
  "answers": [
    {
      "question_id": 101,
      "code_answer": "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n}",
      "language_id": 63  // JavaScript (Node.js) on Judge0
    }
  ],
  "time_spent": 900
}
```

### 4. Test Case Management

#### Create Test Case
**POST** `/api/test-cases/create/`

```json
{
  "question": 101,
  "input_data": "1,2,3,4,5\n10",
  "expected_output": "3,4",
  "is_hidden": true,
  "points": 5,
  "order_number": 4
}
```

#### Get Test Cases for Question
**GET** `/api/test-cases/?question_id=101`

#### Update Test Case
**PATCH** `/api/test-cases/update/<test_case_id>/`

#### Delete Test Case
**DELETE** `/api/test-cases/delete/<test_case_id>/`

## Judge0 Language IDs

Một số language IDs phổ biến:
- **63**: JavaScript (Node.js 12.14.0)
- **71**: Python (3.8.1)
- **62**: Java (OpenJDK 13.0.1)
- **54**: C++ (GCC 9.2.0)
- **51**: C# (Mono 6.6.0.161)
- **60**: Go (1.13.5)
- **68**: PHP (7.4.1)
- **72**: Ruby (2.7.0)

## Database Schema

### QuizQuestions Table
```sql
CREATE TABLE IF NOT EXISTS QuizQuestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    difficulty VARCHAR(10) DEFAULT 'easy',
    description TEXT,
    options JSON,
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    explanation TEXT,
    order_number INTEGER,
    time_limit INTEGER,  -- seconds for code execution
    memory_limit INTEGER,  -- KB for code execution
    allowed_languages JSON,  -- array of Judge0 language IDs
    starter_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by INTEGER,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (lesson_id) REFERENCES Lessons(id),
    FOREIGN KEY (deleted_by) REFERENCES Users(id)
);
```

### QuizTestCases Table
```sql
CREATE TABLE IF NOT EXISTS QuizTestCases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    points INTEGER DEFAULT 0,
    order_number INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (question_id) REFERENCES QuizQuestions(id)
);
```

## Example: Complete Code Question

```json
{
  "id": 101,
  "lesson": 123,
  "question_text": "Two Sum",
  "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\n**Example 1:**\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n```\n\n**Constraints:**\n- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9\n- Only one valid answer exists.",
  "question_type": "code",
  "difficulty": "easy",
  "points": 10,
  "time_limit": 2,
  "memory_limit": 128000,
  "allowed_languages": [63, 71, 62, 54],
  "starter_code": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Write your code here\n}",
  "correct_answer": "function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) {\n            return [map.get(complement), i];\n        }\n        map.set(nums[i], i);\n    }\n}",
  "explanation": "Use a hash map to store numbers we've seen. For each number, check if its complement (target - current number) exists in the map. Time complexity: O(n), Space complexity: O(n)",
  "order_number": 1,
  "test_cases": [
    {
      "id": 1,
      "input_data": "2,7,11,15\n9",
      "expected_output": "0,1",
      "is_hidden": false,
      "points": 0,
      "order_number": 1
    },
    {
      "id": 2,
      "input_data": "3,2,4\n6",
      "expected_output": "1,2",
      "is_hidden": false,
      "points": 0,
      "order_number": 2
    },
    {
      "id": 3,
      "input_data": "3,3\n6",
      "expected_output": "0,1",
      "is_hidden": true,
      "points": 5,
      "order_number": 3
    }
  ],
  "created_at": "2024-03-20T10:00:00Z",
  "updated_at": "2024-03-20T10:00:00Z"
}
```

## Notes

1. **Hidden Test Cases**: Student không thấy expected_output của hidden test cases cho đến khi submit
2. **Points Distribution**: Có thể assign points riêng cho từng test case hoặc dùng points chung của question
3. **Language Support**: Sử dụng Judge0 API để chạy code, cần config Judge0 server
4. **Time/Memory Limits**: Áp dụng khi chạy code để tránh infinite loops hoặc memory leaks
5. **Starter Code**: Cung cấp template code để học viên bắt đầu dễ dàng hơn

## Next Steps

1. Tích hợp Judge0 API để chạy code và test
2. Implement code editor UI (Monaco Editor hoặc CodeMirror)
3. Real-time syntax checking
4. Code submission history
5. Leaderboard cho code challenges
