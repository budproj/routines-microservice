import { RoutineFormLangs } from './constants/form';
import { FormService } from './form.service';

import { budRoutineEnForm } from '../shared/providers/form-provider/bud-routine-en';
import { budRoutinePtBrForm } from '../shared/providers/form-provider/bud-routine-ptBR';

let routineForm: FormService;

describe('Form Service', () => {
  beforeEach(() => {
    routineForm = new FormService();
  });

  describe('getForm', () => {
    it('should return the form in english', () => {
      const returnedForm = routineForm.getRoutineForm(RoutineFormLangs.EN_US);
      expect(returnedForm).toEqual(budRoutineEnForm);
    });

    it('should return the form in portuguese', () => {
      const returnedForm = routineForm.getRoutineForm(RoutineFormLangs.PT_BR);
      expect(returnedForm).toEqual(budRoutinePtBrForm);
    });

    it('should return an empty array if the intl is other than en/pt-br', () => {
      const returnedForm = routineForm.getRoutineForm(
        'other' as RoutineFormLangs,
      );
      expect(returnedForm).toEqual([]);
    });
  });
});
