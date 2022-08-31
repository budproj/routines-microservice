interface ConditionalTypeInfo {
  dependsOn: string;
  type: string;
  roadblock?: string;
  value_range?: number;
}

interface FormQuestion {
  id: string;
  type: string;
  heading: string;
  content?: string;
  conditional?: ConditionalTypeInfo;
}

export default interface RoutineForm {
  questions: FormQuestion[];
}
