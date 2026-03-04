export interface MeasurementField {
  key: string;
  label: string;
  unit: string;
  color: string;
}

export interface FieldSection {
  key: string;
  title: string;
  fields: MeasurementField[];
}

const GENERAL_FIELDS: MeasurementField[] = [
  { key: 'weight_kg', label: 'Peso (kg)', unit: 'kg', color: 'hsl(20, 100%, 60%)' },
  { key: 'body_fat_pct', label: 'Grasa (%)', unit: '%', color: 'hsl(40, 90%, 55%)' },
];

const UPPER_FIELDS: MeasurementField[] = [
  { key: 'neck_cm', label: 'Cuello', unit: 'cm', color: 'hsl(180, 60%, 50%)' },
  { key: 'chest_cm', label: 'Pecho', unit: 'cm', color: 'hsl(200, 80%, 55%)' },
  { key: 'bicep_right_contracted_cm', label: 'Bíceps D. contraído', unit: 'cm', color: 'hsl(130, 60%, 50%)' },
  { key: 'bicep_right_relaxed_cm', label: 'Bíceps D. relajado', unit: 'cm', color: 'hsl(140, 50%, 55%)' },
  { key: 'bicep_left_contracted_cm', label: 'Bíceps I. contraído', unit: 'cm', color: 'hsl(160, 60%, 50%)' },
  { key: 'bicep_left_relaxed_cm', label: 'Bíceps I. relajado', unit: 'cm', color: 'hsl(170, 50%, 55%)' },
];

const CORE_FIELDS: MeasurementField[] = [
  { key: 'waist_cm', label: 'Cintura', unit: 'cm', color: 'hsl(340, 80%, 55%)' },
  { key: 'abdomen_cm', label: 'Abdomen', unit: 'cm', color: 'hsl(0, 70%, 55%)' },
  { key: 'hip_cm', label: 'Cadera', unit: 'cm', color: 'hsl(320, 60%, 55%)' },
];

const LOWER_FIELDS: MeasurementField[] = [
  { key: 'subgluteal_right_cm', label: 'Pliegue subglúteo D.', unit: 'cm', color: 'hsl(270, 60%, 60%)' },
  { key: 'thigh_right_relaxed_cm', label: 'Muslo D. relajado', unit: 'cm', color: 'hsl(250, 55%, 58%)' },
  { key: 'thigh_right_contracted_cm', label: 'Muslo D. contraído', unit: 'cm', color: 'hsl(240, 55%, 60%)' },
  { key: 'thigh_left_relaxed_cm', label: 'Muslo I. relajado', unit: 'cm', color: 'hsl(230, 55%, 58%)' },
  { key: 'thigh_left_contracted_cm', label: 'Muslo I. contraído', unit: 'cm', color: 'hsl(220, 55%, 60%)' },
  { key: 'calf_right_cm', label: 'Gemelo D.', unit: 'cm', color: 'hsl(290, 50%, 55%)' },
  { key: 'calf_left_cm', label: 'Gemelo I.', unit: 'cm', color: 'hsl(300, 50%, 55%)' },
];

export const FIELD_SECTIONS: FieldSection[] = [
  { key: 'upper', title: '💪 Tren Superior', fields: UPPER_FIELDS },
  { key: 'core', title: '🔥 Core', fields: CORE_FIELDS },
  { key: 'lower', title: '🦵 Tren Inferior', fields: LOWER_FIELDS },
];

export const ALL_FIELDS: MeasurementField[] = [
  ...GENERAL_FIELDS,
  ...UPPER_FIELDS,
  ...CORE_FIELDS,
  ...LOWER_FIELDS,
];
