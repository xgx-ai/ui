import type { ComponentProps, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { splitProps } from "./split-props";

export type PolymorphicProps<T extends ValidComponent, Props extends object = {}> = Props &
  Omit<ComponentProps<T>, keyof Props | "as"> & {
    as?: T;
  };

type PolymorphicElementProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  { class?: string | undefined }
>;

export const PolymorphicElement = <T extends ValidComponent = "div">(
  props: PolymorphicElementProps<T>,
) => {
  const [local, others] = splitProps(props, ["as"]);
  return <Dynamic component={local.as ?? "div"} {...others} />;
};
