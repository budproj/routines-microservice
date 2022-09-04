-- CreateTable
CREATE TABLE "healthCheck" (
    "id" UUID NOT NULL,

    CONSTRAINT "healthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineSettings" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "disabledTeams" TEXT[],
    "cron" TEXT NOT NULL,

    CONSTRAINT "RoutineSettings_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "RoutineSettings_companyId_key" ON "RoutineSettings"("companyId");

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_answerGroupId_fkey" FOREIGN KEY ("answerGroupId") REFERENCES "AnswerGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
