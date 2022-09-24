import { Answer } from '@prisma/client';

export interface AnswerWithHiddenFieldInfo extends Answer {
  hidden?: boolean;
}
