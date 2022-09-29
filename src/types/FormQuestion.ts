export interface ValueRangeProperties {
  steps: number;
  labels: {
    left: string;
    center: string;
    right: string;
  };
}
export interface ConditionalTypeInfo {
  dependsOn: string;
  type: string;
  roadblock?: boolean;
  value_range?: number;
}

export interface FormQuestion {
  id: string;
  type: string;
  required?: boolean;
  heading: string;
  content?: string;
  conditional?: ConditionalTypeInfo;
  properties?: ValueRangeProperties;
}
