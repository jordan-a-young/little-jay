import {
  use,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ComboBox as AriaCombobox,
  Input as AriaInput,
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover,
  ComboBoxStateContext,
} from "react-aria-components/ComboBox";
import { Group } from "react-aria-components/Group";
import type { InputProps } from "../input/index.js";
import { FieldContext, useFieldControl } from "../field/context.js";
import { formControlClasses } from "../form-control/styles.js";

export type ComboboxOption = { value: string; label: string; disabled?: boolean };
export type ComboboxProps = Omit<
  InputProps,
  | "value"
  | "defaultValue"
  | "onChange"
  | "type"
  | "role"
  | "list"
  | "children"
  | "dangerouslySetInnerHTML"
  | "aria-autocomplete"
  | "aria-controls"
  | "aria-activedescendant"
  | "aria-expanded"
> & {
  options: readonly ComboboxOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  triggerLabel?: string;
  clearLabel?: string;
  emptyMessage?: string;
  requiredMessage?: string;
  portalContainer?: HTMLElement | null;
};

type StateBridge = { close: () => void };
type ComboboxQuery =
  | { text: null; reset?: boolean }
  | { text: string; selection: string | null; reset?: never };

/** Measures the explicit input trigger rather than the Combobox group's inherited width. */
const inputPopoverStyle = { "--trigger-width": "" } as CSSProperties;

function ComboboxStateBridge({ reference }: { reference: { current: StateBridge | null } }) {
  const state = use(ComboBoxStateContext);
  useLayoutEffect(() => {
    if (!state) return;
    const bridge = { close: () => state.setOpen(false) };
    reference.current = bridge;
    return () => {
      if (reference.current === bridge) reference.current = null;
    };
  }, [state, reference]);
  return null;
}

/** Selects one known local option; query text is presentation and is never the submitted value. */
export function Combobox({
  options,
  value,
  defaultValue = null,
  onValueChange,
  ref,
  id,
  name,
  form,
  disabled,
  required,
  readOnly,
  hidden,
  className = "",
  triggerLabel = "Show options",
  clearLabel = "Clear selection",
  emptyMessage = "No matching options.",
  requiredMessage = "Choose an available option.",
  portalContainer,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...inputProps
}: ComboboxProps) {
  const fieldContext = use(FieldContext);
  const field = useFieldControl({
    id,
    disabled,
    required,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
  });
  const identifier = useId();
  const inputId = field.id ?? `lj-combobox-${identifier}`;
  const inputReference = useRef<HTMLInputElement>(null);
  const stateReference = useRef<StateBridge | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [query, setQuery] = useState<ComboboxQuery>({ text: null });
  const [nativeDisabled, setNativeDisabled] = useState(false);
  const suppressChanges = useRef(false);
  const ownedValidity = useRef<string | null>(null);
  const controlled = value !== undefined;
  const requestedValue = controlled ? value : uncontrolledValue;
  const selected = options.find((option) => option.value === requestedValue);
  const selectedValue = selected?.value ?? null;
  if (query.text !== null && query.selection !== selectedValue) setQuery({ text: null });
  const effectiveDisabled = Boolean(field.disabled || nativeDisabled);
  const effectiveLabelledBy = labelledBy ?? (ariaLabel ? undefined : fieldContext?.labelId);
  const resetConfiguration = useRef({ controlled, defaultValue, options });

  useImperativeHandle(ref, () => inputReference.current!, []);
  useLayoutEffect(() => {
    resetConfiguration.current = { controlled, defaultValue, options };
  });

  useLayoutEffect(() => {
    const input = inputReference.current;
    if (!input) return;
    const syncDisabled = () => setNativeDisabled(input.matches(":disabled"));
    syncDisabled();
    const observer = new MutationObserver(syncDisabled);
    observer.observe(input, { attributes: true, attributeFilter: ["disabled"] });
    for (let ancestor = input.parentElement; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor.tagName === "FIELDSET") {
        observer.observe(ancestor, {
          attributes: true,
          attributeFilter: ["disabled"],
          childList: true,
          subtree: true,
        });
      }
    }
    return () => observer.disconnect();
  }, [field.disabled, form]);

  useLayoutEffect(() => {
    if (hidden || effectiveDisabled || readOnly) stateReference.current?.close();
  }, [hidden, effectiveDisabled, readOnly]);

  useLayoutEffect(() => {
    const input = inputReference.current;
    if (!input?.willValidate) return;
    const previous = ownedValidity.current;
    if (input.validity.customError && input.validationMessage !== previous) return;
    const message = field.required && (!selected || selected.disabled) ? requiredMessage : "";
    input.setCustomValidity(message);
    ownedValidity.current = message || null;
  }, [field.required, selected, requiredMessage, query, effectiveDisabled, readOnly]);

  useLayoutEffect(() => {
    const root = inputReference.current?.getRootNode();
    if (!root) return;
    let subscribed = true;
    let pending: Event[] = [];
    function handleReset(event: Event) {
      pending.push(event);
      if (suppressChanges.current) return;
      suppressChanges.current = true;
      queueMicrotask(() => {
        if (!subscribed) return;
        const resets = pending;
        pending = [];
        if (
          resets.some(
            (reset) => !reset.defaultPrevented && reset.target === inputReference.current?.form,
          )
        ) {
          const configuration = resetConfiguration.current;
          if (!configuration.controlled) {
            const baseline = configuration.options.find(
              (option) => option.value === configuration.defaultValue,
            );
            setUncontrolledValue(baseline?.value ?? null);
          }
          stateReference.current?.close();
          setQuery({ text: null, reset: true });
        }
        suppressChanges.current = false;
      });
    }
    root.addEventListener("reset", handleReset, true);
    return () => {
      subscribed = false;
      root.removeEventListener("reset", handleReset, true);
    };
  }, []);

  const values = new Set<string>();
  for (const option of options) {
    if (
      typeof option.value !== "string" ||
      typeof option.label !== "string" ||
      !option.label.trim() ||
      values.has(option.value)
    ) {
      throw new TypeError(
        "Combobox requires unique string option values and nonblank string labels",
      );
    }
    values.add(option.value);
  }
  if (![triggerLabel, clearLabel, emptyMessage, requiredMessage].every((label) => label.trim())) {
    throw new TypeError("Combobox requires nonblank control labels and messages");
  }

  function canChange() {
    return (
      !suppressChanges.current &&
      !hidden &&
      !readOnly &&
      !field.disabled &&
      !inputReference.current?.matches(":disabled")
    );
  }
  function select(next: string | null) {
    if (!canChange()) return;
    if (next !== null && !options.some((option) => option.value === next && !option.disabled))
      return;
    setQuery({ text: null });
    if (next === selectedValue) return;
    if (!controlled) setUncontrolledValue(next);
    onValueChange?.(next);
  }

  return (
    <>
      <AriaCombobox
        id={inputId}
        value={selectedValue}
        inputValue={
          query.text !== null && query.selection === selectedValue
            ? query.text
            : (selected?.label ?? "")
        }
        onChange={(next) => {
          if (next === null || typeof next === "string") select(next);
        }}
        onInputChange={(text) => {
          if (!canChange()) return;
          setQuery({ text, selection: selectedValue });
          if (text === "" && selectedValue !== null) {
            if (!controlled) setUncontrolledValue(null);
            onValueChange?.(null);
          }
        }}
        selectionMode="single"
        menuTrigger={query.reset || hidden || effectiveDisabled || readOnly ? "manual" : "input"}
        allowsCustomValue={false}
        allowsEmptyCollection
        disabledKeys={options.filter((option) => option.disabled).map((option) => option.value)}
        isDisabled={effectiveDisabled}
        isReadOnly={readOnly}
        isRequired={field.required}
        isInvalid={field["aria-invalid"] === true || field["aria-invalid"] === "true"}
        validationBehavior="aria"
        form={form}
        hidden={hidden}
        aria-label={ariaLabel}
        aria-labelledby={effectiveLabelledBy}
        aria-describedby={field["aria-describedby"]}
        className="lj-combobox"
      >
        <ComboboxStateBridge reference={stateReference} />
        <Group className="lj-combobox-group">
          <AriaInput
            {...inputProps}
            ref={inputReference}
            disabled={field.disabled ?? false}
            readOnly={readOnly}
            required={field.required}
            aria-invalid={field["aria-invalid"]}
            className={`${formControlClasses} pe-[calc(88px+0.75rem)] lj-combobox-input ${className}`}
          />
          <AriaButton
            slot={null}
            type="button"
            aria-label={clearLabel}
            excludeFromTabOrder
            isDisabled={effectiveDisabled || readOnly || (!selected && !query.text)}
            className="lj-combobox-button lj-combobox-clear"
            onPress={() => {
              if (!canChange()) return;
              select(null);
              inputReference.current?.focus();
            }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </AriaButton>
          <AriaButton
            type="button"
            aria-label={triggerLabel}
            excludeFromTabOrder
            isDisabled={effectiveDisabled || readOnly}
            className="lj-combobox-button lj-combobox-trigger"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M3 5h10l-5 6z" />
            </svg>
          </AriaButton>
        </Group>
        {!hidden && !effectiveDisabled && !readOnly && (
          <Popover
            className="lj-combobox-popover"
            triggerRef={inputReference}
            style={inputPopoverStyle}
            offset={4}
            UNSTABLE_portalContainer={portalContainer ?? undefined}
          >
            <ListBox<ComboboxOption>
              items={options}
              className="lj-combobox-list"
              renderEmptyState={() => <span className="lj-combobox-empty">{emptyMessage}</span>}
            >
              {(option) => (
                <ListBoxItem
                  id={option.value}
                  textValue={option.label}
                  isDisabled={option.disabled}
                  className="lj-combobox-option"
                >
                  {option.label}
                </ListBoxItem>
              )}
            </ListBox>
          </Popover>
        )}
      </AriaCombobox>
      {name !== undefined && (
        <input
          type="hidden"
          name={name}
          form={form}
          value={selectedValue ?? ""}
          disabled={Boolean(field.disabled || selected?.disabled)}
          readOnly
        />
      )}
    </>
  );
}
