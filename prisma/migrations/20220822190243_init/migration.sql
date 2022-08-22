-- CreateEnum
CREATE TYPE "Cadence" AS ENUM ('WEEKLY');

-- CreateTable
CREATE TABLE "Routine" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cadence" "Cadence" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" UUID NOT NULL,
    "disabledTeams" TEXT[],

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerGroup" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answerGroupId" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_answerGroupId_fkey" FOREIGN KEY ("answerGroupId") REFERENCES "AnswerGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
