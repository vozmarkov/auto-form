import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FormField } from "@/components/ui/form";
import { useForm, useFormContext } from "react-hook-form";
import * as z from "zod";
import { DEFAULT_ZOD_HANDLERS, INPUT_COMPONENTS } from "../config";
import { Dependency, FieldConfig, FieldConfigItem } from "../types";
import {
  beautifyObjectName,
  getBaseSchema,
  getBaseType,
  zodToHtmlInputProps,
} from "../utils";
import AutoFormArray from "./array";
import resolveDependencies from "../dependencies";

function DefaultParent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function AutoFormObject<
  SchemaType extends z.ZodObject<any, any>,
>({
  schema,
  form,
  fieldConfig,
  path = [],
  dependencies = [],
}: {
  schema: SchemaType | z.ZodEffects<SchemaType>;
  form: ReturnType<typeof useForm>;
  fieldConfig?: FieldConfig<z.infer<SchemaType>>;
  path?: string[];
  dependencies?: Dependency<z.infer<SchemaType>>[];
}) {
  const { watch } = useFormContext(); // Use useFormContext to access the watch function

  if (!schema) {
    return null;
  }
  const { shape } = getBaseSchema<SchemaType>(schema) || {};

  if (!shape) {
    return null;
  }

  const handleIfZodNumber = (item: z.ZodAny) => {
    const isZodNumber = (item as any)._def.typeName === "ZodNumber";
    const isInnerZodNumber =
      (item._def as any).innerType?._def?.typeName === "ZodNumber";

    if (isZodNumber) {
      (item as any)._def.coerce = true;
    } else if (isInnerZodNumber) {
      (item._def as any).innerType._def.coerce = true;
    }

    return item;
  };

  function isZodPrimitiveArray(item: z.ZodTypeAny) {
    let isPrimitiveArray = false;
    let isEnumOfPrimitives = false;
    let innerType = item;

    // get the innertype of the ZodAnyType when its parent is a default
    while ("innerType" in innerType._def && (innerType as any)._def.innerType) {
      innerType = innerType._def.innerType;
    }

    // Now check if it is an array and the type of the elements
    if (innerType instanceof z.ZodArray) {
      innerType = innerType._def.type;

      // Check for basic primitives
      isPrimitiveArray =
        innerType instanceof z.ZodString ||
        innerType instanceof z.ZodNumber ||
        innerType instanceof z.ZodBoolean;

      // Check if its enum array
      isEnumOfPrimitives = innerType instanceof z.ZodEnum;
    }

    return { isPrimitiveArray, isEnumOfPrimitives, innerType };
  }

  return (
    <Accordion type="multiple" className="space-y-5 border-none">
      {Object.keys(shape).map((name) => {
        let item = shape[name] as z.ZodAny;
        item = handleIfZodNumber(item) as z.ZodAny;
        const zodBaseType = getBaseType(item);
        const itemName = item._def.description ?? beautifyObjectName(name);
        const key = [...path, name].join(".");

        const {
          isHidden,
          isDisabled,
          isRequired: isRequiredByDependency,
          overrideOptions,
        } = resolveDependencies(dependencies, name, watch);
        if (isHidden) {
          return null;
        }

        if (zodBaseType === "ZodObject") {
          return (
            <AccordionItem value={name} key={key} className="border-none">
              <AccordionTrigger>{itemName}</AccordionTrigger>
              <AccordionContent className="p-2">
                <AutoFormObject
                  schema={item as unknown as z.ZodObject<any, any>}
                  form={form}
                  fieldConfig={
                    (fieldConfig?.[name] ?? {}) as FieldConfig<
                      z.infer<typeof item>
                    >
                  }
                  path={[...path, name]}
                />
              </AccordionContent>
            </AccordionItem>
          );
        }

        let overrideFieldConfig = undefined;

        if (zodBaseType === "ZodArray") {
          const { isPrimitiveArray, isEnumOfPrimitives, innerType } =
            isZodPrimitiveArray(item);
          if (isPrimitiveArray || isEnumOfPrimitives) {
            // override item and fieldConfig for primitive array
            item = innerType as z.ZodAny;
            overrideFieldConfig = {
              ...fieldConfig?.[name],
              fieldType: "selectmultiinput",
              inputProps: {
                ...fieldConfig?.[name]?.inputProps,
                creatable: !isEnumOfPrimitives,
              },
            };
          } else {
            return (
              <AutoFormArray
                key={key}
                name={name}
                item={item as unknown as z.ZodArray<any>}
                form={form}
                fieldConfig={fieldConfig?.[name] ?? {}}
                path={[...path, name]}
              />
            );
          }
        }

        if (zodBaseType === "ZodArray") {
        }

        const fieldConfigItem: FieldConfigItem =
          overrideFieldConfig ?? fieldConfig?.[name] ?? {};
        const zodInputProps = zodToHtmlInputProps(item);
        const isRequired =
          isRequiredByDependency ||
          zodInputProps.required ||
          fieldConfigItem.inputProps?.required ||
          false;

        if (overrideOptions) {
          item = z.enum(overrideOptions) as unknown as z.ZodAny;
        }

        return (
          <FormField
            control={form.control}
            name={key}
            key={key}
            render={({ field }) => {
              const inputType =
                fieldConfigItem.fieldType ??
                DEFAULT_ZOD_HANDLERS[zodBaseType] ??
                "fallback";

              const InputComponent =
                typeof inputType === "function"
                  ? inputType
                  : INPUT_COMPONENTS[inputType];

              const ParentElement =
                fieldConfigItem.renderParent ?? DefaultParent;

              const defaultValue = fieldConfigItem.inputProps?.defaultValue;
              const value = field.value ?? defaultValue ?? "";

              const fieldProps = {
                ...zodToHtmlInputProps(item),
                ...field,
                ...fieldConfigItem.inputProps,
                disabled: fieldConfigItem.inputProps?.disabled || isDisabled,
                ref: undefined,
                value: value,
              };

              if (InputComponent === undefined) {
                return <></>;
              }

              return (
                <ParentElement key={`${key}.parent`}>
                  <InputComponent
                    zodInputProps={zodInputProps}
                    field={field}
                    fieldConfigItem={fieldConfigItem}
                    label={itemName}
                    isRequired={isRequired}
                    zodItem={item}
                    fieldProps={fieldProps}
                    className={fieldProps.className}
                  />
                </ParentElement>
              );
            }}
          />
        );
      })}
    </Accordion>
  );
}
