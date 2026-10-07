export type FormFieldElement =
  | HTMLTextAreaElement
  | HTMLInputElement
  | HTMLSelectElement;

export interface AdvancedOptionsProps {
  customHeaders: string;
  onChange: (e: React.ChangeEvent<FormFieldElement>) => void;
}
