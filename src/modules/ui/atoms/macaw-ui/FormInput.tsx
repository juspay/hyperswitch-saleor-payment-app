import {
  Input as $Input,
  Select as $Select,
  type InputProps as $InputProps,
  type SelectProps as $SelectProps,
} from "@saleor/macaw-ui";
import {
  type UseControllerProps,
  type FieldPath,
  type FieldValues,
  useController,
} from "react-hook-form";

export type FormInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = UseControllerProps<TFieldValues, TName> & $InputProps;

export function FormInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: FormInputProps<TFieldValues, TName>) {
  const { field, fieldState } = useController<TFieldValues, TName>(props);

  return (
    <$Input
      error={!!fieldState.error?.message}
      {...props}
      {...field}
      helperText={fieldState.error?.message || props.helperText}
      onChange={(e) => {
        field.onChange(e);
        props.onChange?.(e);
      }}
      onFocus={(e) => {
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        field.onBlur();
        props.onBlur?.(e);
      }}
    />
  );
}

export type SelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TOption = any,
  TValue = any,
> = UseControllerProps<TFieldValues, TName> & $SelectProps<TOption, TValue>;

export function SelectInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: SelectProps<TFieldValues, TName>) {
  const { field, fieldState } = useController<TFieldValues, TName>(props);

  return (
    <$Select
      error={!!fieldState.error?.message}
      {...props}
      {...field}
      helperText={fieldState.error?.message || props.helperText}
      onChange={(e) => {
        field.onChange(e.value);
        props.onChange?.(e.value);
      }}
      onFocus={(e) => {
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        field.onBlur();
        props.onBlur?.(e);
      }}
    />
  );
}
