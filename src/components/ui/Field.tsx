import {
  cloneElement,
  createContext,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useContext,
  useId,
} from "react";
import { cn } from "@/lib/utils";

interface FieldContextValue {
  controlId: string;
  descriptionId: string;
  errorId: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  controlId?: string;
  invalid?: boolean;
}

export function Field({
  className,
  controlId,
  invalid = false,
  children,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const resolvedControlId = controlId || `${generatedId}-control`;

  return (
    <FieldContext.Provider
      value={{
        controlId: resolvedControlId,
        descriptionId: `${generatedId}-description`,
        errorId: `${generatedId}-error`,
        invalid,
      }}
    >
      <div className={cn("space-y-1.5", className)} {...props}>
        {children}
      </div>
    </FieldContext.Provider>
  );
}

interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: ReactNode;
}

export function FieldLabel({
  className,
  required = false,
  children,
  ...props
}: FieldLabelProps) {
  const field = useContext(FieldContext);

  return (
    <label
      className={cn(
        "block text-xs font-semibold uppercase tracking-wider text-zinc-400",
        className,
      )}
      htmlFor={props.htmlFor || field?.controlId}
      {...props}
    >
      {children}
      {required && (
        <>
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> Required</span>
        </>
      )}
    </label>
  );
}

interface FieldControlProps {
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean | "true" | "false";
  }>;
}

export function FieldControl({ children }: FieldControlProps) {
  const field = useContext(FieldContext);
  if (!field) return children;

  const describedBy = [
    children.props["aria-describedby"],
    field.descriptionId,
    field.errorId,
  ]
    .filter(Boolean)
    .join(" ");

  return cloneElement(children, {
    id: children.props.id || field.controlId,
    "aria-describedby": describedBy,
    "aria-invalid": children.props["aria-invalid"] ?? field.invalid,
  });
}

export function FieldDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  const field = useContext(FieldContext);
  return (
    <p
      id={props.id || field?.descriptionId}
      className={cn("text-xs leading-relaxed text-zinc-500", className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  const field = useContext(FieldContext);
  return (
    <p
      id={props.id || field?.errorId}
      role="alert"
      className={cn("text-xs leading-relaxed text-danger", className)}
      {...props}
    />
  );
}
