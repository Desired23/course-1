# Example API Requests for Code Questions

## 1. Create a Code Question with Test Cases

### Request
```bash
POST /api/quiz-questions/create/
Content-Type: application/json
Authorization: Bearer <instructor_or_admin_token>
```

```json
{
  "lesson": 1,
  "question_text": "Two Sum",
  "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\n**Example:**\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n```",
  "question_type": "code",
  "difficulty": "easy",
  "points": 10,
  "time_limit": 2,
  "memory_limit": 128000,
  "allowed_languages": [63, 71, 62, 54],
  "starter_code": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Write your code here\n}",
  "correct_answer": "correct_solution_here",
  "explanation": "The optimal solution uses a hash map to achieve O(n) time complexity.",
  "order_number": 1,
  "test_cases": [
    {
      "input_data": "[2,7,11,15]\n9",
      "expected_output": "[0,1]",
      "is_hidden": false,
      "order_number": 1
    },
    {
      "input_data": "[3,2,4]\n6",
      "expected_output": "[1,2]",
      "is_hidden": false,
      "order_number": 2
    },
    {
      "input_data": "[3,3]\n6",
      "expected_output": "[0,1]",
      "is_hidden": true,
      "points": 5,
      "order_number": 3
    }
  ]
}
```

## 2. Create Multiple Choice Question (Traditional)

### Request
```bash
POST /api/quiz-questions/create/
```

```json
{
  "lesson": 1,
  "question_text": "What is the time complexity of binary search?",
  "question_type": "multiple",
  "difficulty": "medium",
  "points": 5,
  "options": [
    {
      "option_id": 1,
      "option_text": "O(n)",
      "order": 1
    },
    {
      "option_id": 2,
      "option_text": "O(log n)",
      "order": 2
    },
    {
      "option_id": 3,
      "option_text": "O(n²)",
      "order": 3
    },
    {
      "option_id": 4,
      "option_text": "O(1)",
      "order": 4
    }
  ],
  "correct_answer": "2",
  "explanation": "Binary search divides the search space in half each time, resulting in O(log n) complexity.",
  "order_number": 2
}
```

## 3. Get Quiz for Lesson (Student View)

### Request
```bash
GET /api/quizzes/lesson/1/
Authorization: Bearer <student_token>
```

### Response
```json
{
  "quiz_id": 1,
  "lesson_id": 1,
  "title": "Python Basics Quiz",
  "description": "Test your knowledge",
  "time_limit": null,
  "passing_score": 70,
  "total_points": 15,
  "total_questions": 2,
  "questions": [
    {
      "question_id": 1,
      "question_text": "Two Sum",
      "question_type": "code",
      "difficulty": "easy",
      "points": 10,
      "order": 1,
      "description": "Given an array of integers...",
      "time_limit": 2,
      "memory_limit": 128000,
      "allowed_languages": [63, 71, 62, 54],
      "starter_code": "function twoSum(nums, target) {\n  \n}",
      "test_cases": [
        {
          "id": 1,
          "input_data": "[2,7,11,15]\n9",
          "expected_output": "[0,1]",
          "is_hidden": false,
          "points": 0,
          "order_number": 1
        },
        {
          "id": 2,
          "input_data": "[3,2,4]\n6",
          "expected_output": "[1,2]",
          "is_hidden": false,
          "points": 0,
          "order_number": 2
        },
        {
          "id": 3,
          "input_data": "[3,3]\n6",
          "is_hidden": true,
          "points": 5,
          "order_number": 3
          // Note: expected_output is NOT returned for hidden test cases
        }
      ],
      "image_url": null,
      "code_snippet": null,
      "options": []
    },
    {
      "question_id": 2,
      "question_text": "What is the time complexity of binary search?",
      "question_type": "multiple",
      "difficulty": "medium",
      "points": 5,
      "order": 2,
      "options": [
        {
          "option_id": 1,
          "option_text": "O(n)",
          "order": 1
        },
        {
          "option_id": 2,
          "option_text": "O(log n)",
          "order": 2
        }
      ],
      "description": null,
      "time_limit": null,
      "memory_limit": null,
      "allowed_languages": null,
      "starter_code": null,
      "test_cases": []
    }
  ]
}
```

## 4. Submit Quiz with Code Answer

### Request
```bash
POST /api/quizzes/submit/
Authorization: Bearer <student_token>
```

```json
{
  "quiz_id": 1,
  "lesson_id": 1,
  "answers": [
    {
      "question_id": 1,
      "code_answer": "function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) {\n            return [map.get(complement), i];\n        }\n        map.set(nums[i], i);\n    }\n}",
      "language_id": 63
    },
    {
      "question_id": 2,
      "selected_option_id": 2
    }
  ],
  "time_spent": 1200
}
```

### Response
```json
{
  "quiz_result_id": 42,
  "quiz_id": 1,
  "user_id": 101,
  "score": 93.33,
  "total_points": 15.0,
  "earned_points": 14.0,
  "passing_score": 70,
  "passed": true,
  "time_spent": 1200,
  "submitted_at": "2024-03-20T11:00:00Z",
  "answers": [
    {
      "question_id": 1,
      "code_answer": "function twoSum(nums, target) {...}",
      "language_id": 63,
      "is_correct": true,
      "points_earned": 9.0,
      "correct_answer_explanation": "The optimal solution uses a hash map...",
      "test_cases_results": [
        {
          "test_case_id": 1,
          "passed": true,
          "input": "[2,7,11,15]\n9",
          "expected_output": "[0,1]",
          "actual_output": "[0,1]",
          "execution_time": 0.023,
          "memory_used": 1024
        },
        {
          "test_case_id": 2,
          "passed": true,
          "input": "[3,2,4]\n6",
          "expected_output": "[1,2]",
          "actual_output": "[1,2]",
          "execution_time": 0.019,
          "memory_used": 1024
        },
        {
          "test_case_id": 3,
          "passed": false,
          "input": "[3,3]\n6",
          "expected_output": "[0,1]",
          "actual_output": "undefined",
          "execution_time": 0.015,
          "memory_used": 1024,
          "error": "null"
        }
      ]
    },
    {
      "question_id": 2,
      "selected_option_id": 2,
      "is_correct": true,
      "points_earned": 5.0,
      "correct_answer_explanation": "Binary search divides the search space..."
    }
  ]
}
```

## 5. Test Case Management

### Create Test Case
```bash
POST /api/test-cases/create/
Authorization: Bearer <instructor_token>
```

```json
{
  "question": 1,
  "input_data": "[1,2,3,4,5]\n10",
  "expected_output": "[3,4]",
  "is_hidden": true,
  "points": 5,
  "order_number": 4
}
```

### Get Test Cases for Question
```bash
GET /api/test-cases/?question_id=1
Authorization: Bearer <instructor_token>
```

### Update Test Case
```bash
PATCH /api/test-cases/update/1/
Authorization: Bearer <instructor_token>
```

```json
{
  "expected_output": "[3,4]",
  "is_hidden": false
}
```

### Delete Test Case
```bash
DELETE /api/test-cases/delete/1/
Authorization: Bearer <instructor_token>
```

## 6. Update Code Question

### Request
```bash
PATCH /api/quiz-questions/update/1/
Authorization: Bearer <instructor_token>
```

```json
{
  "difficulty": "medium",
  "points": 15,
  "test_cases": [
    {
      "input_data": "[2,7,11,15]\n9",
      "expected_output": "[0,1]",
      "is_hidden": false,
      "order_number": 1
    },
    {
      "input_data": "[3,2,4]\n6",
      "expected_output": "[1,2]",
      "is_hidden": false,
      "order_number": 2
    },
    {
      "input_data": "[3,3]\n6",
      "expected_output": "[0,1]",
      "is_hidden": true,
      "points": 5,
      "order_number": 3
    },
    {
      "input_data": "[-1,-2,-3,-4,-5]\n-8",
      "expected_output": "[2,4]",
      "is_hidden": true,
      "points": 5,
      "order_number": 4
    }
  ]
}
```

## Notes

### Judge0 Language IDs Reference
- **63**: JavaScript (Node.js 12.14.0)
- **71**: Python (3.8.1)
- **62**: Java (OpenJDK 13.0.1)
- **54**: C++ (GCC 9.2.0)
- **51**: C# (Mono 6.6.0.161)
- **60**: Go (1.13.5)
- **68**: PHP (7.4.1)
- **72**: Ruby (2.7.0)

### Test Case Input/Output Format
- Input và output phải match với format mà code của student expect
- Multiline input: sử dụng `\n` để phân tách
- Array format: có thể dùng JSON array `[1,2,3]` hoặc comma-separated `1,2,3`
- Cần consistent format giữa input, expected_output và code logic

### Hidden Test Cases
- Student không thấy expected_output của hidden test cases trước khi submit
- Chỉ thấy result (passed/failed) sau khi submit
- Dùng để test edge cases mà student không biết trước

### Permissions
- **Admin/Instructor**: Có thể create, update, delete questions và test cases
- **Student**: Chỉ có thể get quiz và submit answers
