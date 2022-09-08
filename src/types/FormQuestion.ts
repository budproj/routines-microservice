interface ConditionalTypeInfo {
  dependsOn: string;
  type: string;
  roadblock?: string;
  value_range?: number;
}

export interface FormQuestion {
  id: string;
  type: string;
  heading: string;
  content?: string;
  conditional?: ConditionalTypeInfo;
}
