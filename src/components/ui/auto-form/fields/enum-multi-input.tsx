"use client";
import { FormControl, FormItem, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import MultipleSelector, { Option } from "../../multiple-selector";
import AutoFormLabel from "../common/label";
import AutoFormTooltip from "../common/tooltip";
import { AutoFormInputComponentProps } from "../types";
import { getBaseSchema } from "../utils";

export default function AutoFormEnumMultiInput({
  label,
  isRequired,
  field,
  fieldConfigItem,
  zodItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  console.log("baseValuesbaseValuesbaseValues", fieldProps);

  const {
    emptyIndicator,
    creatable,
    placeholder,
    ...fieldPropsWithoutEmptyIndicator
  } = fieldProps;
  let options: Option[] = [];

  // if its not creatable, then it would mean the field is primitive enum array type
  if (!creatable) {
    const baseValues = (getBaseSchema(zodItem) as unknown as z.ZodEnum<any>)
      ._def.values;
    if (!Array.isArray(baseValues)) {
      for (const [k, v] of Object.entries(baseValues || {})) {
        const val = v as string;
        options.push({ value: val, label: val });
      }
    } else {
      options = baseValues.map((val) => ({ value: val, label: val }));
    }
  }

  const handleOnChange = (options: Option[]) => {
    const values = options.map((option) => option.value);
    field.onChange(values);
  };

  return (
    <div className="flex flex-row items-center space-x-2">
      <FormItem className="flex w-full flex-row items-center justify-start space-x-2">
        <div className="flex w-full flex-col gap-2">
          <AutoFormLabel label={label} isRequired={isRequired} />
          <FormControl>
            <MultipleSelector
              {...field}
              {...fieldPropsWithoutEmptyIndicator}
              value={(field.value || []).map((val: any) => ({
                value: val,
                label: val,
              }))}
              onChange={handleOnChange}
              defaultOptions={options}
              creatable={creatable}
              placeholder={
                placeholder || creatable ? "Type to create" : "Search..."
              }
              emptyIndicator={
                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                  {emptyIndicator || creatable
                    ? "Start typing to create an option"
                    : "No options found"}
                </p>
              }
            />
          </FormControl>
          <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
          <FormMessage />
        </div>
      </FormItem>
    </div>
  );
}
