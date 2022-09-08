import { Injectable } from '@nestjs/common';

import { budRoutineEnForm } from '../shared/providers/form-provider/bud-routine-en';
import { budRoutinePtBrForm } from '../shared/providers/form-provider/bud-routine-ptBR';
import { FormQuestion } from '../types/FormQuestion';

import { RoutineFormLangs } from './constants/form';

export interface FormQuestions {
  questions: FormQuestion[];
}

const routineForms = new Map([
  [RoutineFormLangs.PT_BR, budRoutinePtBrForm],
  [RoutineFormLangs.EN_US, budRoutineEnForm],
]);

@Injectable()
export class FormService {
  getRoutineForm(language: RoutineFormLangs): FormQuestion[] {
    const formQuestions = routineForms.get(language);
    return formQuestions ?? [];
  }
}
