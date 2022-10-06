import { AnswerGroup, Answer } from '@prisma/client';
export interface AnswerGroupWithAnswers extends AnswerGroup {
  answers?: Answer[];
}
