import {
  cn,
  type DialogContentProps,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useResponseDialog,
} from "@xgx/ui";
import { Plus } from "lucide-solid";
import { createMemo, type JSX, Show } from "solid-js";
import { FieldError } from "./field-error";
import { FieldLabel } from "./field-label";
import { useFieldRequired } from "./form-group";
import type { SelectOption } from "./form-select-field";
import type { AnyFieldApi, AnyFormApi, BaseFieldProps } from "./types";

/** Special value for the "Add new" option */
const ADD_NEW_OPTION_VALUE = "__add_new_option__";

export interface CreateDialogProps {
  /** Resolves the dialog with the newly created option */
  onSuccess: (option: SelectOption) => void;
  /** Cancels the dialog */
  onCancel: () => void;
}

export interface FormSelectFieldWithCreateProps extends BaseFieldProps {
  /** The form instance */
  form: AnyFormApi;
  /** Field name (must match a key in the form's default values) */
  name: string;
  /** Options for the select */
  options: SelectOption[];
  /** Text to show when no option is selected */
  emptyText?: string;
  /** Render function for the create dialog content */
  renderCreateDialog: (props: CreateDialogProps) => JSX.Element;
  /** Title for the create dialog */
  createDialogTitle?: string;
  /** Description for the create dialog */
  createDialogDescription?: string;
  /** Label for the create button (default: "Add new") */
  createButtonLabel?: string;
  /** CSS class for the create dialog */
  createDialogClass?: string;
  /** Callback when a new option is created (e.g., to invalidate queries) */
  onCreated?: (option: SelectOption) => void | Promise<void>;
}

/**
 * A select field component with an integrated "Add new" button that opens a dialog.
 * Uses form.Field for reactive field state binding.
 *
 * @example
 * ```tsx
 * <FormSelectFieldWithCreate
 *   form={form}
 *   name="contactTypeId"
 *   label="Contact Type"
 *   options={contactTypeOptions()}
 *   createDialogTitle="Create Contact Type"
 *   renderCreateDialog={({ onSuccess, onCancel }) => (
 *     <CreateContactTypeForm
 *       onSuccess={(newType) => onSuccess({ value: newType.id, label: newType.name })}
 *       onCancel={onCancel}
 *     />
 *   )}
 *   onCreated={async () => {
 *     await queryClient.invalidateQueries({ queryKey: ["contactTypes"] });
 *   }}
 * />
 * ```
 */
export function FormSelectFieldWithCreate(
  props: FormSelectFieldWithCreateProps,
) {
  const isRequired = useFieldRequired(
    () => props.name,
    () => props.required,
  );

  const { showResponseDialog, DialogResponse } = useResponseDialog();

  const handleCreateNew = async (field: AnyFieldApi) => {
    const result = await showResponseDialog<SelectOption | null>({
      title: props.createDialogTitle ?? "Create New",
      description: props.createDialogDescription,
      class: props.createDialogClass ?? "max-w-md w-full",
      content: (dialogProps: DialogContentProps<SelectOption | null>) => (
        <>
          {props.renderCreateDialog({
            onSuccess: async (option) => {
              // Call the onCreated callback if provided (e.g., to invalidate queries)
              await props.onCreated?.(option);
              // Resolve the dialog with the new option
              dialogProps.resolve(option);
            },
            onCancel: () => dialogProps.reject(),
          })}
        </>
      ),
    });

    if (result) {
      // Set the field value to the newly created option
      field.handleChange(result.value);
      field.handleBlur();
    }
  };

  // Create options list with "Add new" option at the end
  // This ensures the select always has at least one option and can open
  const optionsWithCreate = createMemo(() => [
    ...props.options,
    {
      value: ADD_NEW_OPTION_VALUE,
      label: props.createButtonLabel ?? "Add new",
    },
  ]);

  return (
    <>
      <props.form.Field name={props.name}>
        {(field: () => AnyFieldApi) => {
          const errors = () => field().state.meta.errors;
          const isTouched = () => field().state.meta.isTouched;
          const hasError = () => isTouched() && errors().length > 0;

          const selectedOption = () =>
            props.options.find((opt) => opt.value === field().state.value);

          return (
            <div class={cn("grid w-full items-center gap-1.5", props.class)}>
              <Show when={props.label || props.description}>
                <div class="flex flex-col gap-0.5">
                  <Show when={props.label}>
                    <FieldLabel required={isRequired()}>
                      {props.label}
                    </FieldLabel>
                  </Show>
                  <Show when={props.description}>
                    <p class="text-xs text-muted-foreground">
                      {props.description}
                    </p>
                  </Show>
                </div>
              </Show>

              <Select<SelectOption>
                value={selectedOption()}
                onChange={(option) => {
                  if (option?.value === ADD_NEW_OPTION_VALUE) {
                    // Handle "Add new" option - open dialog instead of selecting
                    handleCreateNew(field());
                    return;
                  }
                  field().handleChange(option?.value);
                  field().handleBlur();
                }}
                options={optionsWithCreate()}
                optionValue="value"
                optionTextValue="label"
                optionDisabled="disabled"
                disabled={props.disabled}
                placeholder={
                  props.placeholder ?? props.label ?? props.emptyText
                }
                itemComponent={(itemProps) => {
                  const isAddNew =
                    itemProps.item.rawValue.value === ADD_NEW_OPTION_VALUE;
                  return (
                    <SelectItem
                      item={itemProps.item}
                      class={cn(
                        isAddNew &&
                          "text-primary font-medium border-t mt-1 pt-1",
                      )}
                    >
                      <span class="flex items-center gap-2">
                        <Show when={isAddNew}>
                          <Plus class="size-4" />
                        </Show>
                        {itemProps.item.rawValue.label}
                      </span>
                    </SelectItem>
                  );
                }}
              >
                <SelectTrigger
                  class={cn(hasError() && "border-destructive")}
                  onBlur={() => field().handleBlur()}
                >
                  <SelectValue<SelectOption>>
                    {(state) => state.selectedOption()?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>

              <FieldError errors={isTouched() ? errors() : []} />
            </div>
          );
        }}
      </props.form.Field>
      <DialogResponse />
    </>
  );
}
