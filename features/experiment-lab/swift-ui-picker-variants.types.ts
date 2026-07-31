export type NoteDisplayMode = 'original' | 'plain' | 'bullets';

export type NoteDisplayModeOption = {
  label: string;
  value: NoteDisplayMode;
};

export type SwiftUIPickerVariantsProps = {
  options: readonly NoteDisplayModeOption[];
  value: NoteDisplayMode;
  onChange: (value: NoteDisplayMode) => void;
  tintColor: string;
};
