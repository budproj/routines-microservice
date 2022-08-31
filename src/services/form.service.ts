import { Injectable } from '@nestjs/common';

import { budRoutineEnForm } from '../shared/providers/form-provider/bud-routine-en';
import { budRoutinePtBrForm } from '../shared/providers/form-provider/bud-routine-ptBR';
import { RoutineFormLangs } from './constants/form';
import RoutineForm from './dtos/get-form.dto';

interface getRoutineForm {
  intl: RoutineFormLangs | string;
}

@Injectable()
export class FormService {
  getForm({ intl }: getRoutineForm): RoutineForm | [] {
    if (intl === RoutineFormLangs.PT_BR)
      return { questions: budRoutinePtBrForm };
    if (intl === RoutineFormLangs.EN_US)
      return {
        questions: budRoutineEnForm,
      };
    return [];
  }
}
