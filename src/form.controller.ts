import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { FormService } from './services/form.service';

@Controller('/bud-form')
export class FormControler {
  constructor(private formService: FormService) {}

  @Get()
  async getForm(@Query('intl') intl: string, @Res() res: Response) {
    const routineForm = this.formService.getForm({ intl: intl });

    return res.json(routineForm);
  }
}
