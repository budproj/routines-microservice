import { RoutineFormLangs } from './constants/form';
import { FormService } from './form.service';

import { budRoutineEnForm } from '../shared/providers/form-provider/bud-routine-en';
import { budRoutinePtBrForm } from '../shared/providers/form-provider/bud-routine-ptBR';
import RoutineForm from './dtos/get-form.dto';

let routineForm: FormService;
let routineEnForm: RoutineForm;
let routinePtBrForm: RoutineForm;

describe('Form Service', () => {
  beforeEach(() => {
    routineForm = new FormService();
    routineEnForm = {
      questions: budRoutineEnForm,
    };

    routinePtBrForm = {
      questions: budRoutinePtBrForm,
    };
  });

  describe('getForm', () => {
    it('should return the form in english', () => {
      const returnedForm = routineForm.getForm({
        intl: RoutineFormLangs.EN_US,
      });

      expect(returnedForm).toEqual(routineEnForm);
    });
    it('should return the form in portuguese', () => {
      const returnedForm = routineForm.getForm({
        intl: RoutineFormLangs.PT_BR,
      });

      expect(returnedForm).toEqual(routinePtBrForm);
    });
    it('should return an empty array if the intl is other than en/pt-br', () => {
      const returnedForm = routineForm.getForm({
        intl: 'other',
      });

      expect(returnedForm).toEqual([]);
    });
  });
});
