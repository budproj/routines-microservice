-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_answerGroupId_fkey";

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_answerGroupId_fkey" FOREIGN KEY ("answerGroupId") REFERENCES "AnswerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
