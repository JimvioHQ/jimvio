/** Server-side quiz payload sanitizer. Never send answer keys to students. */

const ANSWER_KEY_FIELDS = [
  "correctAnswer",
  "correct_answer",
  "answer",
  "answers",
  "correct",
  "solution",
  "expected",
] as const;

export function stripQuizAnswerKey(questions: unknown): unknown[] {
  if (!Array.isArray(questions)) return [];
  return questions.map((question) => {
    if (!question || typeof question !== "object") return question;
    const copy = { ...(question as Record<string, unknown>) };
    for (const field of ANSWER_KEY_FIELDS) {
      delete copy[field];
    }
    if (Array.isArray(copy.choices)) {
      copy.choices = copy.choices.map((choice) => {
        if (!choice || typeof choice !== "object") return choice;
        const next = { ...(choice as Record<string, unknown>) };
        delete next.correct;
        delete next.isCorrect;
        delete next.is_correct;
        return next;
      });
    }
    return copy;
  });
}

export function quizPayloadForViewer(quiz: Record<string, unknown>, isStaff: boolean) {
  if (isStaff) return quiz;
  return {
    ...quiz,
    questions: stripQuizAnswerKey(quiz.questions),
  };
}

export function unauthorizedQuizAccessDenied(input: {
  isStaff: boolean;
  enrolled: boolean;
  sameCourse: boolean;
}): boolean {
  if (input.isStaff) return false;
  return !input.enrolled || !input.sameCourse;
}
