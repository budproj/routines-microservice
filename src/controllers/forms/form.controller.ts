import { Controller, Get, Query } from '@nestjs/common';
import { RoutineFormLangs } from '../../services/constants/form';
import { FormService } from '../../services/form.service';

@Controller('/bud-form')
export class FormControler {
  constructor(private formService: FormService) {}

  @Get()
  async getForm(@Query('intl') intl: RoutineFormLangs) {
    const routineForm = this.formService.getRoutineForm(intl);
    return { questions: routineForm };
  }
}
